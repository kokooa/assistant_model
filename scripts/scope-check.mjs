import { PrismaClient } from "@prisma/client";
import { embed, toVectorLiteral } from "../lib/embed.ts";

// 권한 인식 검색이 실제로 user context 별로 다른 결과를 내는지 확인.
// dev server / 로그인 없이 retrieve.ts 와 동일한 SQL 을 세 user 로 직접 실행한다.
// 사용:
//   node --env-file=.env --env-file=.env.local scripts/scope-check.mjs "<질문>"
//   (질문 생략 시 "회사 정책" 기본값)

const prisma = new PrismaClient();

const USERS = [
  { label: "kokooa  (People Ops, MEMBER)", department: "People Ops", role: "MEMBER" },
  { label: "finance (Finance,    MEMBER)", department: "Finance", role: "MEMBER" },
  { label: "admin   (Engineering, ADMIN)", department: "Engineering", role: "ADMIN" },
];

const query = process.argv[2] ?? "회사 정책";

async function distribution() {
  return prisma.$queryRawUnsafe(
    `SELECT scope, department, count(*)::int AS n
       FROM chunks GROUP BY scope, department ORDER BY scope, department`
  );
}

async function search(user, qv, k = 6) {
  return prisma.$queryRawUnsafe(
    `SELECT doc_title, scope, department,
            round((1 - (embedding <=> $1::vector))::numeric, 3) AS score
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
}

async function main() {
  const dist = await distribution();
  console.log("── chunks scope 분포 ──");
  if (dist.length === 0) {
    console.log("  (색인 비어 있음 — 먼저 sync-notion.mjs 로 색인하세요)");
    return;
  }
  for (const r of dist) {
    console.log(`  scope=${r.scope.padEnd(10)} dept=${r.department ?? "—"}\t${r.n} chunks`);
  }
  const allGlobal = dist.every((r) => r.scope === "GLOBAL");
  if (allGlobal) {
    console.log(`
⚠ 모든 chunk 가 GLOBAL 이라 권한 필터 차이를 만들 수 없어요. 한 페이지만 잠깐 Finance 로 바꿔서 다시 돌려보세요:

  psql -d modle -c "SELECT DISTINCT doc_title FROM chunks LIMIT 10;"
  psql -d modle -c "UPDATE chunks SET scope='DEPARTMENT', department='Finance' WHERE doc_title='<위 목록 중 하나>';"
  node --env-file=.env --env-file=.env.local scripts/scope-check.mjs "${query}"
  # 검증 끝나면 원복:
  psql -d modle -c "UPDATE chunks SET scope='GLOBAL', department=NULL WHERE doc_title='<위 제목>';"
`);
  }

  const qv = toVectorLiteral(await embed(query));
  console.log(`\n질문: "${query}"`);
  for (const u of USERS) {
    const rows = await search(u, qv);
    console.log(`\n[${u.label}] hit ${rows.length}건`);
    for (const r of rows) {
      const tag = r.scope === "DEPARTMENT" ? `🔒 ${r.department}` : "GLOBAL";
      console.log(`  · ${r.doc_title}  (${tag}, score=${Number(r.score).toFixed(3)})`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
