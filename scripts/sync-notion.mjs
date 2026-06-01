import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { PrismaClient } from "@prisma/client";
import { embed, toVectorLiteral } from "../lib/embed.ts";

// Notion 루트 페이지에서 자식 페이지를 재귀 크롤 → 청킹 → 임베딩 → pgvector 색인.
// 필요 env: NOTION_TOKEN, NOTION_ROOT_PAGE_ID (또는 --root <pageId>)
// 사용:
//   node --env-file=.env --env-file=.env.local scripts/sync-notion.mjs                # GLOBAL
//   node --env-file=.env --env-file=.env.local scripts/sync-notion.mjs \
//        --scope DEPARTMENT --department "Finance" --root <pageId>
const args = process.argv.slice(2);
function getFlag(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : undefined;
}

const token = process.env.NOTION_TOKEN;
const root = getFlag("root") ?? process.env.NOTION_ROOT_PAGE_ID;
const scope = (getFlag("scope") ?? "GLOBAL").toUpperCase();
const department = getFlag("department") ?? null;

if (!token || !root) {
  console.error("NOTION_TOKEN / NOTION_ROOT_PAGE_ID 가 .env(.local) 에 필요해요.");
  console.error("notion.so/my-integrations 에서 토큰 발급 + 루트 페이지를 integration 에 연결하세요.");
  process.exit(1);
}
if (!["GLOBAL", "DEPARTMENT"].includes(scope)) {
  console.error("--scope 는 GLOBAL 또는 DEPARTMENT 여야 해요.");
  process.exit(1);
}
if (scope === "DEPARTMENT" && !department) {
  console.error("--scope DEPARTMENT 는 --department <부서명> 이 필요해요. (예: --department \"Finance\")");
  process.exit(1);
}

const notion = new Client({ auth: token });
const n2m = new NotionToMarkdown({ notionClient: notion });
const prisma = new PrismaClient();

// notion-to-md MdBlock 트리에서 heading 블록 id 를 본문 순서대로 수집.
// chunkMarkdown 이 마크다운 heading 을 만나는 순서와 동일하게 매칭된다.
function collectHeadingIds(blocks) {
  const ids = [];
  const walk = (arr) => {
    for (const b of arr) {
      if (typeof b.type === "string" && b.type.startsWith("heading") && b.blockId) ids.push(b.blockId);
      if (Array.isArray(b.children) && b.children.length) walk(b.children);
    }
  };
  walk(blocks);
  return ids;
}

function chunkMarkdown(md, headingIds = [], maxLen = 1200) {
  const chunks = [];
  let heading = "개요";
  let blockId = null;
  let hIdx = 0;
  let buf = [];
  const flush = () => {
    const text = buf.join("\n").trim();
    if (!text) {
      buf = [];
      return;
    }
    if (text.length <= maxLen) {
      chunks.push({ heading, text, blockId });
    } else {
      let cur = "";
      for (const para of text.split(/\n\n+/)) {
        if (cur && (cur + "\n\n" + para).length > maxLen) {
          chunks.push({ heading, text: cur.trim(), blockId });
          cur = para;
        } else {
          cur = cur ? cur + "\n\n" + para : para;
        }
      }
      if (cur.trim()) chunks.push({ heading, text: cur.trim(), blockId });
    }
    buf = [];
  };
  for (const line of md.split("\n")) {
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) {
      flush();
      heading = h[1].trim();
      blockId = headingIds[hIdx++] ?? null;
    } else {
      buf.push(line);
    }
  }
  flush();
  return chunks;
}

function pageTitle(page) {
  const props = page.properties ?? {};
  for (const v of Object.values(props)) {
    if (v?.type === "title" && Array.isArray(v.title) && v.title.length) {
      return v.title.map((t) => t.plain_text).join("");
    }
  }
  return "제목 없음";
}

// 자식 페이지/DB 재귀 수집 (id 중복 제거, 깊이 제한)
async function collectPageIds(rootId, maxDepth = 4) {
  const seen = new Set();
  const order = [];
  async function walk(id, depth) {
    if (seen.has(id) || depth > maxDepth) return;
    seen.add(id);
    order.push(id);
    let cursor;
    do {
      const res = await notion.blocks.children.list({ block_id: id, start_cursor: cursor, page_size: 100 });
      for (const b of res.results) {
        if (b.type === "child_page") {
          await walk(b.id, depth + 1);
        } else if (b.type === "child_database") {
          let dc;
          do {
            const q = await notion.databases.query({ database_id: b.id, start_cursor: dc, page_size: 100 });
            for (const row of q.results) await walk(row.id, depth + 1);
            dc = q.has_more ? q.next_cursor ?? undefined : undefined;
          } while (dc);
        }
      }
      cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
    } while (cursor);
  }
  await walk(rootId, 0);
  return order;
}

async function main() {
  const scopeLabel = scope === "DEPARTMENT" ? `DEPARTMENT(${department})` : "GLOBAL";
  console.log(`Notion 페이지 수집 중… (scope=${scopeLabel}, root=${root})`);
  const ids = await collectPageIds(root);
  console.log(`페이지 ${ids.length}개 발견. 색인 시작…`);
  let total = 0;
  for (const id of ids) {
    let page;
    try {
      page = await notion.pages.retrieve({ page_id: id });
    } catch {
      continue;
    }
    const title = pageTitle(page);
    const url = page.url ?? `https://www.notion.so/${id.replace(/-/g, "")}`;
    const mdblocks = await n2m.pageToMarkdown(id);
    const md = n2m.toMarkdownString(mdblocks).parent ?? "";
    const parts = chunkMarkdown(md, collectHeadingIds(mdblocks));

    await prisma.$executeRawUnsafe("DELETE FROM chunks WHERE doc_id = $1", id);
    for (const c of parts) {
      const emb = toVectorLiteral(await embed(`${title} ${c.heading}\n${c.text}`));
      await prisma.$executeRawUnsafe(
        `INSERT INTO chunks (doc_id, doc_title, doc_url, heading, content, block_id, scope, department, embedding)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::vector)`,
        id,
        title,
        url,
        c.heading,
        c.text,
        c.blockId,
        scope,
        department,
        emb
      );
      total++;
    }
    console.log(`  ✓ ${title} — ${parts.length} chunks`);
  }
  console.log(`완료: 페이지 ${ids.length}개, chunk ${total}개 색인됨. (scope=${scopeLabel})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
