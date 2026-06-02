import { sessionIdentityProvider } from "@/lib/seam/IdentityProvider";
import { consoleAuditLogger } from "@/lib/seam/AuditLogger";
import { buildDefaultGatewayClient } from "@/lib/seam/GatewayClient";
import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";

// 채팅 진입점. 인증된 사용자 메시지를 agent loop 으로 넘기고 응답을 NDJSON 으로 stream.
// 응답 형식: {type:"sources",hits:[]} 한 줄(레거시 UI 호환용 — 비어있음),
//          {type:"delta",text:"..."} 토큰들, {type:"done"} 또는 {type:"error",message:"..."}
//
// Phase 5: retrieve/근거 주입은 AXHub gateway 의 capability 호출로 이관됨 — agent 가
// 필요하면 도구로 가져옴. UI 가 sources 를 표시하던 자리는 추후 agent 의 도구 호출
// trace 로 채울 예정.

export async function POST(req: Request) {
  const user = await sessionIdentityProvider.resolve();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { q } = await req.json().catch(() => ({ q: "" }));
  const question = typeof q === "string" ? q.trim() : "";
  if (!question) return new Response("missing q", { status: 400 });

  const gateway = buildDefaultGatewayClient(consoleAuditLogger);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      send({ type: "sources", hits: [] });
      try {
        await runAgent({
          user,
          message: question,
          gateway,
          audit: consoleAuditLogger,
          onTextDelta: (text) => send({ type: "delta", text }),
        });
        send({ type: "done" });
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : "agent 호출 실패",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
