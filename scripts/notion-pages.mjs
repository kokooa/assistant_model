import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

function titleOf(r) {
  if (Array.isArray(r.title)) return r.title.map((t) => t.plain_text).join(""); // database
  const props = r.properties ?? {};
  for (const v of Object.values(props)) {
    if (v?.type === "title" && Array.isArray(v.title)) return v.title.map((t) => t.plain_text).join("");
  }
  return "(제목 없음)";
}

const res = await notion.search({ page_size: 50 });
if (!res.results.length) {
  console.log("접근 가능한 페이지가 없어요 — 통합(integration)에 페이지를 '연결(Connections)' 했는지 확인하세요.");
} else {
  console.log(`토큰으로 접근 가능한 항목 ${res.results.length}개:\n`);
  for (const r of res.results) {
    console.log(`[${r.object}] ${titleOf(r)}`);
    console.log(`   id:  ${r.id}`);
    console.log(`   url: ${r.url}\n`);
  }
}
