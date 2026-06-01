import { prisma } from "./prisma";
import { embed, toVectorLiteral } from "./embed";
import { search as bigramSearch, type SearchHit, type UserContext } from "./rag";

// pgvector 색인에 데이터가 있으면 임베딩 검색, 없으면 기존 bigram(content/ 파일)으로 폴백.
// 권한 필터: 전부 GLOBAL 시작 — 부서/역할 조건은 후속을 위해 미리 걸어둠.

interface ChunkRow {
  doc_id: string;
  doc_title: string;
  doc_url: string | null;
  heading: string | null;
  content: string;
  block_id: string | null;
  scope: string;
  score: number;
}

// 근거가 된 블록까지 스크롤되는 Notion 딥링크: 페이지URL#블록ID(대시 제거).
function anchoredUrl(docUrl: string | null, blockId: string | null): string {
  if (!docUrl) return "";
  if (!blockId) return docUrl;
  return `${docUrl}#${blockId.replace(/-/g, "")}`;
}

async function indexCount(): Promise<number> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>("SELECT count(*)::bigint AS n FROM chunks");
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function searchVector(query: string, user: UserContext, k = 6): Promise<SearchHit[]> {
  const qv = toVectorLiteral(await embed(query));
  const rows = await prisma.$queryRawUnsafe<ChunkRow[]>(
    `SELECT doc_id, doc_title, doc_url, heading, content, block_id, scope,
            1 - (embedding <=> $1::vector) AS score
       FROM chunks
      WHERE scope = 'GLOBAL'
         OR (scope = 'DEPARTMENT' AND department = $2)
         OR $3 = 'ADMIN'
      ORDER BY embedding <=> $1::vector
      LIMIT $4`,
    qv,
    user.department,
    user.role,
    k
  );
  return rows.map((r) => ({
    docId: r.doc_id,
    title: r.doc_title,
    type: "Notion",
    path: anchoredUrl(r.doc_url, r.block_id),
    heading: r.heading ?? "",
    snippet: r.content.replace(/\s+/g, " ").slice(0, 140),
    content: r.content,
    score: Math.round(Number(r.score) * 1000) / 1000,
    locked: r.scope !== "GLOBAL",
  }));
}

// 라우트가 호출하는 단일 진입점.
export async function retrieve(query: string, user: UserContext, k = 6): Promise<SearchHit[]> {
  if ((await indexCount()) > 0) {
    try {
      return await searchVector(query, user, k);
    } catch {
      // 임베딩/DB 문제 시 bigram 폴백
    }
  }
  return bigramSearch(query, user, k);
}
