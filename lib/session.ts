import { auth } from "@/auth";
import type { UserContext } from "@/lib/rag";

// 임시 데모 우회: AUTH_BYPASS=1 이면 미로그인 시 데모 유저로 동작. 다듬기 끝나면 제거.
const DEMO_USER: UserContext = { name: "데모 사용자", department: "People Ops", role: "MEMBER" };

// 로그인 세션 → 검색 권한 컨텍스트. 미로그인 시 null (라우트에서 401 처리).
export async function getUserContext(): Promise<UserContext | null> {
  const session = await auth();
  const u = session?.user;
  if (u?.email) {
    return {
      name: u.name ?? u.email,
      department: u.department ?? "",
      role: u.role ?? "MEMBER",
    };
  }
  if (process.env.AUTH_BYPASS === "1") return DEMO_USER;
  return null;
}
