import { getUserContext as getLegacyUserContext } from "@/lib/session";
import type { UserContext } from "./UserContext";

// 세션 → UserContext. 1차 PR 은 legacy next-auth session 을 wrap.
// Q3 확정 후: AXHub 가 검증해서 주입한 헤더 (예: X-Axhub-User-Id, X-Axhub-Token) 또는
// JWT Bearer 를 직접 파싱하는 형태로 교체. 호출부 (app/api/chat/route.ts) 는 안 바뀜.

export interface IdentityProvider {
  resolve(): Promise<UserContext | null>;
}

export const sessionIdentityProvider: IdentityProvider = {
  async resolve() {
    const legacy = await getLegacyUserContext();
    if (!legacy) return null;
    return {
      // Q3 확정 전: legacy 의 email/이름이 없으므로 임시 식별자.
      // AXHub gateway 의 권한 판정에는 사용 불가 (token 도 빈 문자열).
      userId: legacy.name,
      roles: [legacy.role],
      token: "",
      channel: "web",
    };
  },
};
