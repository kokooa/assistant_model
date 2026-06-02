import { axhubConfig } from "@/lib/config/axhub";
import type { UserContext } from "./UserContext";
import type { AuditLogger } from "./AuditLogger";

// 도구/connector 호출의 유일한 출구. AXHub gateway 가 실제 권한 판정 + connector 실행.
// 앱쪽 책임은: capability 화이트리스트 + audit + UserContext 전달.
//
// stub mode (endpoint === "") 에서는 mock 응답 반환. 운영 swap 시 endpoint 만 채우면 됨.

export class GatewayDenyError extends Error {
  constructor(public readonly capability: string) {
    super(`capability not allowed: ${capability}`);
    this.name = "GatewayDenyError";
  }
}

export interface GatewayInvokeResult {
  ok: boolean;
  data: unknown;
  stubbed: boolean;
}

export class GatewayClient {
  constructor(
    private readonly endpoint: string,
    private readonly allowed: ReadonlySet<string>,
    private readonly audit: AuditLogger,
  ) {}

  async invoke(
    user: UserContext,
    capability: string,
    args: unknown,
  ): Promise<GatewayInvokeResult> {
    if (!this.allowed.has(capability)) {
      this.audit.log(user, "tool.deny", { capability });
      throw new GatewayDenyError(capability);
    }
    this.audit.log(user, "tool.invoke", { capability });

    if (this.endpoint === "") {
      return {
        ok: true,
        data: { _stub: true, capability, note: "AXHub gateway endpoint 미설정 — stub 응답" },
        stubbed: true,
      };
    }

    const res = await fetch(`${this.endpoint}/v1/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
        "X-Axhub-User-Id": user.userId,
      },
      body: JSON.stringify({ capability, args }),
    });

    if (!res.ok) {
      this.audit.log(user, "tool.error", { capability, status: res.status });
      return { ok: false, data: { error: `gateway status ${res.status}` }, stubbed: false };
    }

    const data = await res.json();
    return { ok: true, data, stubbed: false };
  }
}

export function buildDefaultGatewayClient(audit: AuditLogger): GatewayClient {
  return new GatewayClient(
    axhubConfig.gateway.endpoint,
    new Set(axhubConfig.capabilities),
    audit,
  );
}
