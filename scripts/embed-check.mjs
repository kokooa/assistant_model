import { embed, toVectorLiteral } from "../lib/embed.ts";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const docs = [
  { id: "_t1", title: "휴가 규정", heading: "출산휴가", text: "출산 전후로 총 90일이 보장되며 분할 사용이 가능하다." },
  { id: "_t2", title: "근무 규정", heading: "재택근무", text: "재택근무는 주 2일까지 가능하며 팀장 승인이 필요하다." },
  { id: "_t3", title: "복지", heading: "복지 포인트", text: "연 120만 포인트를 도서·건강 등에 쓸 수 있다." },
];

async function main() {
  const dim = (await embed("차원 확인")).length;
  console.log("임베딩 차원:", dim);

  for (const d of docs) {
    const emb = toVectorLiteral(await embed(`${d.title} ${d.heading} ${d.text}`));
    await prisma.$executeRawUnsafe(
      `INSERT INTO chunks (doc_id,doc_title,doc_url,heading,content,scope,embedding) VALUES ($1,$2,'',$3,$4,'GLOBAL',$5::vector)`,
      d.id, d.title, d.heading, d.text, emb
    );
  }

  const q = toVectorLiteral(await embed("출산휴가 며칠이고 어떻게 신청해?"));
  const rows = await prisma.$queryRawUnsafe(
    `SELECT doc_title, heading, round((1-(embedding<=>$1::vector))::numeric,4) AS sim
       FROM chunks WHERE doc_id LIKE '_t%' ORDER BY embedding<=>$1::vector`,
    q
  );
  console.log('\nQ: "출산휴가 며칠이고 어떻게 신청해?" — 유사도 순위:');
  for (const r of rows) console.log(`  ${r.sim}  ${r.doc_title} › ${r.heading}`);

  await prisma.$executeRawUnsafe("DELETE FROM chunks WHERE doc_id LIKE '_t%'");
  console.log("\n(테스트 행 정리 완료)");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
