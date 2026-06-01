import { prisma } from "./prisma.ts";

// ADMIN_EMAILS env (comma 구분) 에 적힌 이메일은 첫 upsert 시 ADMIN 으로 생성.
// 기존 user 의 role 은 절대 덮어쓰지 않는다 (관리 UI 의 변경과 충돌 방지).
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// 회사 도메인 첫 로그인 시 DB User 자동 생성. 이미 있으면 update:{} 로 손대지 않음.
export async function ensureUser(email: string, name?: string | null) {
  const e = email.toLowerCase();
  const isBootstrapAdmin = adminEmails().includes(e);
  return prisma.user.upsert({
    where: { email: e },
    update: {},
    create: {
      email: e,
      name: name?.trim() || e,
      role: isBootstrapAdmin ? "ADMIN" : "MEMBER",
    },
    include: { department: true },
  });
}
