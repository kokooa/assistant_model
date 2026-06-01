import { PrismaClient } from "@prisma/client";
import { setUserRole, setUserDepartment } from "../lib/admin.ts";

// lib/admin.ts 검증: seed 유저 한 명의 role/department 를 잠시 바꿔서 반영 확인 후 원복.
// dev server / 로그인 없이 server action 핵심 로직만 직접 호출.
// 사용: node --env-file=.env --env-file=.env.local scripts/admin-check.mjs

const prisma = new PrismaClient();
const TARGET_EMAIL = "kokooa@jocodingax.ai";
const SWAP_DEPT = "Finance";
let failed = 0;

async function expect(label, actual, expected) {
  const ok = actual === expected;
  if (ok) console.log(`  ✓ ${label}  (=${expected})`);
  else {
    console.log(`  ✗ ${label}  기대=${expected} 실제=${actual}`);
    failed++;
  }
}

async function expectThrows(label, fn) {
  try {
    await fn();
    console.log(`  ✗ ${label}  (예외가 발생해야 하는데 통과됨)`);
    failed++;
  } catch (e) {
    console.log(`  ✓ ${label}  ("${e.message}")`);
  }
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL },
    include: { department: true },
  });
  if (!user) throw new Error(`${TARGET_EMAIL} 시드가 없어요. prisma db seed 먼저.`);

  const originalRole = user.role;
  const originalDeptId = user.departmentId;
  const swapDept = await prisma.department.findUnique({ where: { name: SWAP_DEPT } });
  if (!swapDept) throw new Error(`${SWAP_DEPT} 부서가 없어요.`);

  console.log(`대상: ${TARGET_EMAIL}  (role=${originalRole}, dept=${user.department?.name ?? "—"})\n`);

  console.log("── setUserRole ──");
  await setUserRole(user.id, "DEPT_ADMIN");
  let now = await prisma.user.findUnique({ where: { id: user.id } });
  await expect("DEPT_ADMIN 으로 변경", now.role, "DEPT_ADMIN");
  await setUserRole(user.id, originalRole);
  now = await prisma.user.findUnique({ where: { id: user.id } });
  await expect("원래 역할로 원복", now.role, originalRole);
  await expectThrows("알 수 없는 역할은 throw", () => setUserRole(user.id, "INVALID_ROLE"));

  console.log("\n── setUserDepartment ──");
  await setUserDepartment(user.id, swapDept.id);
  now = await prisma.user.findUnique({ where: { id: user.id } });
  await expect(`${SWAP_DEPT} 부서로 변경`, now.departmentId, swapDept.id);
  await setUserDepartment(user.id, null);
  now = await prisma.user.findUnique({ where: { id: user.id } });
  await expect("부서 해제(null)", now.departmentId, null);
  await setUserDepartment(user.id, originalDeptId);
  now = await prisma.user.findUnique({ where: { id: user.id } });
  await expect("원래 부서로 원복", now.departmentId, originalDeptId);
  await expectThrows("존재하지 않는 부서 id 는 throw", () =>
    setUserDepartment(user.id, "nonexistent_dept_id_xxxxx")
  );

  console.log(failed === 0 ? "\n전부 통과 ✅" : `\n실패 ${failed}건 ❌`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
