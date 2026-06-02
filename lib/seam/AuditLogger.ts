import type { UserContext } from "./UserContext";

// 채널·유저·도구·입력·결과 요약 기록. 지금은 console 으로 sink.
// 운영 swap 시 외부 로그 backend (AXHub audit / Datadog 등) 로 sink 교체.

export type AuditEvent =
  | "tool.invoke"
  | "tool.deny"
  | "tool.error"
  | "agent.start"
  | "agent.complete";

export interface AuditLogger {
  log(user: UserContext | null, event: AuditEvent, payload: Record<string, unknown>): void;
}

export const consoleAuditLogger: AuditLogger = {
  log(user, event, payload) {
    const line = {
      ts: new Date().toISOString(),
      event,
      userId: user?.userId ?? null,
      channel: user?.channel ?? null,
      ...payload,
    };
    console.log("[audit]", JSON.stringify(line));
  },
};
