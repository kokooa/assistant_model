import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEPARTMENTS = ["People Ops", "Finance", "Engineering"];

// 테스트 유저 — Google 로그인 시 이메일로 매칭해 부서/역할을 부여한다.
const USERS = [
  { email: "kokooa@jocodingax.ai", name: "코쿠아", role: "MEMBER", dept: "People Ops" },
  { email: "admin@jocodingax.ai", name: "관리자", role: "ADMIN", dept: "Engineering" },
  { email: "finance@jocodingax.ai", name: "재무팀원", role: "MEMBER", dept: "Finance" },
];

async function main() {
  const deptId = {};
  for (const name of DEPARTMENTS) {
    const d = await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
    deptId[name] = d.id;
  }
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, departmentId: deptId[u.dept] },
      create: { email: u.email, name: u.name, role: u.role, departmentId: deptId[u.dept] },
    });
  }
  console.log(`시드 완료: 부서 ${DEPARTMENTS.length}개, 유저 ${USERS.length}명`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
