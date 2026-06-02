import Anthropic from "@anthropic-ai/sdk";
import { axhubConfig } from "@/lib/config/axhub";
import type { UserContext } from "@/lib/seam/UserContext";
import type { GatewayClient } from "@/lib/seam/GatewayClient";
import type { AuditLogger } from "@/lib/seam/AuditLogger";
import { capabilitiesAsTools, capabilityFromToolName } from "./tools";

// Anthropic SDK 위에 얹은 자체 agent loop.
//  - stream 이벤트로 text delta 를 호출자에게 전달 (UI streaming)
//  - 모델이 tool_use 로 끝나면 GatewayClient 로 capability 위임 → tool_result 를
//    messages 에 append 후 다시 호출. max 8 turn 으로 무한루프 방지.
//  - apiKey/baseUrl 미설정 (= AXHub 미연결) 시 호출 자체를 안 하고 placeholder
//    텍스트를 emit. 운영 swap 후엔 정상 동작.

const MODEL = process.env.AXHUB_AI_MODEL ?? "claude-sonnet-4-5";
const MAX_TURNS = 8;

export interface AgentRunOptions {
  user: UserContext;
  message: string;
  gateway: GatewayClient;
  audit: AuditLogger;
  onTextDelta: (text: string) => void;
}

export async function runAgent(opts: AgentRunOptions): Promise<void> {
  opts.audit.log(opts.user, "agent.start", { messageLen: opts.message.length });

  if (!axhubConfig.ai.apiKey || !axhubConfig.ai.baseUrl) {
    opts.onTextDelta(
      "AXHub AI 단일 API 가 아직 연결되지 않았어요. " +
        "환경변수 AXHUB_AI_API_URL / AXHUB_AI_API_KEY 설정 후 다시 시도해주세요.",
    );
    opts.audit.log(opts.user, "agent.complete", { stub: true });
    return;
  }

  const client = new Anthropic({
    apiKey: axhubConfig.ai.apiKey,
    baseURL: axhubConfig.ai.baseUrl,
  });
  const tools = capabilitiesAsTools(axhubConfig.capabilities);

  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: opts.message },
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      messages,
      tools: tools.length > 0 ? tools : undefined,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        opts.onTextDelta(event.delta.text);
      }
    }

    const finalMessage = await stream.finalMessage();
    messages.push({ role: "assistant", content: finalMessage.content });

    if (finalMessage.stop_reason !== "tool_use") break;

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const block of finalMessage.content) {
      if (block.type !== "tool_use") continue;
      const capability = capabilityFromToolName(block.name);
      try {
        const result = await opts.gateway.invoke(opts.user, capability, block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result.data),
          is_error: !result.ok,
        });
      } catch (err) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: err instanceof Error ? err.message : "tool invocation error",
          is_error: true,
        });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  opts.audit.log(opts.user, "agent.complete", { stub: false });
}
