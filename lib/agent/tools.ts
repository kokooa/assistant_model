import type Anthropic from "@anthropic-ai/sdk";

// AXHub capability 문자열 → Anthropic Tool schema 변환.
//
// 1차 PR 은 generic schema (args 통째 object) 만 노출. capability 가 실제 채워지면
// 각 capability 별 description + input schema 를 여기서 정확하게 정의 — agent 가
// 어떤 인자를 넣어야 하는지 LLM 이 알 수 있도록.
//
// tool name 매핑: Anthropic 은 tool name 패턴 [a-zA-Z0-9_-]+ 만 허용 — capability
// 의 dot 을 double underscore 로 변환 (capability "messaging.send_email" → tool
// "messaging__send_email"). 호출 시 역변환.

export function toolNameFromCapability(capability: string): string {
  return capability.replace(/\./g, "__");
}

export function capabilityFromToolName(toolName: string): string {
  return toolName.replace(/__/g, ".");
}

export function capabilitiesAsTools(
  capabilities: ReadonlyArray<string>,
): Anthropic.Messages.Tool[] {
  return capabilities.map((cap) => ({
    name: toolNameFromCapability(cap),
    description: `AXHub capability: ${cap}`,
    input_schema: {
      type: "object" as const,
      properties: {
        args: {
          type: "object" as const,
          description: "capability 호출 인자 (capability schema 미정 — 자유 형식)",
        },
      },
    },
  }));
}
