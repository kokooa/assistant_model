import { PrismaClient } from "@prisma/client";

// ensureUser 검증: 가상 이메일로 ADMIN_EMAILS 부트스트랩, idempotency, 기존 user 보존 확인.
// 사용: node --env-file=.env --env-file=.env.local scripts/bootstrap-check.mjs

const ADMIN_EMAIL = "bootstrap-admin@jocodingax.ai";
const MEMBER_EMAIL = "bootstrap-member@jocodingax.ai";

// ADMIN_EMAILS 를 이 스크립트 범위 안에서만 강제 — env 우선 적용되도록 import 전에 set.
process.env.ADMIN_EMAILS = `${ADMIN_EMAIL},some-other@jocodingax.ai`;
const { ensureUser } = await import("../lib/auth.ts");

const prisma = new PrismaClient();
let failed = 0;

async function expect(label, actual, expected) {
  const ok = actual === expected;
  if (ok) console.log(`  ✓ ${label}  (=${expected})`);
  else {
    console.log(`  ✗ ${label}  기대=${expected} 실제=${actual}`);
    failed++;
  }
}

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, MEMBER_EMAIL] } } });
}

async function main() {
  await cleanup(); // 이전 실패가 남긴 row 제거

  console.log("── ADMIN_EMAILS 부트스트랩 ──");
  const a = await ensureUser(ADMIN_EMAIL, "Bootstrap Admin");
  await expect("ADMIN_EMAILS 신규 → ADMIN", a.role, "ADMIN");

  console.log("\n── 일반 도메인 신규 → MEMBER ──");
  const m = await ensureUser(MEMBER_EMAIL, "Bootstrap Member");
  await expect("ADMIN_EMAILS 외 신규 → MEMBER", m.role, "MEMBER");

  console.log("\n── idempotency ──");
  const a2 = await ensureUser(ADMIN_EMAIL.toUpperCase(), "다른 이름");
  await expect("같은 이메일(대소문자 무시) → 같은 id", a2.id, a.id);
  await expect("두 번째 호출도 role 유지", a2.role, "ADMIN");

  console.log("\n── 기존 user 의 role 보존 ──");
  await prisma.user.update({ where: { id: a.id }, data: { role: "MEMBER" } });
  const a3 = await ensureUser(ADMIN_EMAIL, "Bootstrap Admin");
  await expect("관리 UI 가 MEMBER 로 바꾼 뒤 재로그인 → MEMBER 유지", a3.role, "MEMBER");

  await cleanup();
  console.log(failed === 0 ? "\n전부 통과 ✅" : `\n실패 ${failed}건 ❌`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await cleanup().catch(() => {});
    await prisma.$disconnect();
    process.exit(1);
  });
