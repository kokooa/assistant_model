import { auth } from "@/auth";
import type { UserContext } from "@/lib/rag";

// 로그인 세션 → 검색 권한 컨텍스트. 미로그인 시 null (라우트에서 401 처리).
export async function getUserContext(): Promise<UserContext | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.email) return null;
  return {
    name: u.name ?? u.email,
    department: u.department ?? "",
    role: u.role ?? "MEMBER",
  };
}
