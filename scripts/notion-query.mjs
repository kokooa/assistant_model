import { PrismaClient } from "@prisma/client";
import { embed, toVectorLiteral } from "../lib/embed.ts";
import { streamGroundedAnswer } from "../lib/llm.ts";

// retrieve.ts(앱용, 확장자 없는 import)는 raw node 에서 해석 안 되므로 동일 로직을 인라인.
const prisma = new PrismaClient();
const q = process.argv[2] ?? "연차 며칠이고 어떻게 신청해?";

const qv = toVectorLiteral(await embed(q));
const rows = await prisma.$queryRawUnsafe(
  `SELECT doc_title, doc_url, heading, content, 1 - (embedding <=> $1::vector) AS score
     FROM chunks ORDER BY embedding <=> $1::vector LIMIT 6`,
  qv
);
const hits = rows.map((r) => ({
  docId: r.doc_url ?? "",
  title: r.doc_title,
  type: "Notion",
  path: r.doc_url ?? "",
  heading: r.heading ?? "",
  snippet: String(r.content).replace(/\s+/g, " ").slice(0, 140),
  score: Math.round(Number(r.score) * 1000) / 1000,
  locked: false,
}));

console.log(`Q: ${q}\n\n출처(벡터 검색):`);
hits.forEach((h, i) => console.log(`  [${i + 1}] ${h.score}  ${h.title} › ${h.heading}`));

process.stdout.write("\n답변:\n");
for await (const d of streamGroundedAnswer(q, hits)) process.stdout.write(d);
console.log();

await prisma.$disconnect();
process.exit(0);
