// SSO 신원 산출물. 모든 agent / GatewayClient 호출에 관통.
// 권한 판정은 AXHub gateway 가 authoritative. 앱은 신원을 정확히 전달하는 것이 임무.
// Q3 (SSO 형식) 확정되면 token 필드의 의미가 명확해짐 — JWT Bearer / 검증된 헤더 / 기타.

export type Channel = "web";

export interface UserContext {
  userId: string;
  roles: ReadonlyArray<string>;
  token: string;
  channel: Channel;
}
