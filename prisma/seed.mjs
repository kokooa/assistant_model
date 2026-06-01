import { PrismaClient } from "@prisma/client";

// 이 seed 는 dev / 로컬 검증용 데모 데이터 전용이다.
// 운영(NODE_ENV=production)에서는 즉시 종료한다 — 부서는 관리자가 /settings/admin 에서
// 직접 추가하고, 유저는 회사 Google 로그인 시 ensureUser 가 자동 생성한다.
if (process.env.NODE_ENV === "production") {
  console.log(
    "운영 빌드라 seed 데이터를 만들지 않아요. 부서는 /settings/admin 에서, 유저는 Google 로그인 시 자동 생성돼요."
  );
  process.exit(0);
}

const prisma = new PrismaClient();

const DEPARTMENTS = ["People Ops", "Finance", "Engineering"];

// 데모 유저 — dev fake login(/login 의 "개발용 로그인") 으로 들어오는 시드.
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
