// AXHub 연결 설정의 단일 출처. swap 포인트 4개 중 3개가 여기 모임.
// 빈 값 fallback:
//  - gateway.endpoint === ""  → GatewayClient 가 stub mode (mock 응답 + audit 만)
//  - ai.baseUrl === ""        → Anthropic SDK 기본값 (api.anthropic.com) → 실제 운영 전엔 ai.apiKey 도 비워 호출 자체를 차단
//  - capabilities.length === 0 → PreToolUse 가 모든 도구 deny → agent 는 LLM-only 응답

export interface AxhubConfig {
  gateway: {
    endpoint: string;
  };
  ai: {
    baseUrl: string;
    apiKey: string;
  };
  capabilities: ReadonlyArray<string>;
}

function parseCapabilities(raw: string | undefined): ReadonlyArray<string> {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export const axhubConfig: AxhubConfig = {
  gateway: {
    endpoint: process.env.AXHUB_GATEWAY_URL ?? "",
  },
  ai: {
    baseUrl: process.env.AXHUB_AI_API_URL ?? "",
    apiKey: process.env.AXHUB_AI_API_KEY ?? "",
  },
  capabilities: parseCapabilities(process.env.AXHUB_CAPABILITIES),
};
