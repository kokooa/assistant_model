import { search } from "@/lib/rag";
import { getUserContext } from "@/lib/session";
import { streamGroundedAnswer } from "@/lib/llm";

export const runtime = "nodejs";

// 질문 → (로그인 권한)검색 → 근거 주입 → LLM 답변 스트리밍.
// 응답은 NDJSON 스트림: {type:"sources"} 한 줄 먼저, 이어서 {type:"delta"} 토큰들, {type:"done"}.
export async function POST(req: Request) {
  const user = await getUserContext();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { q } = await req.json().catch(() => ({ q: "" }));
  const question = typeof q === "string" ? q.trim() : "";
  if (!question) return new Response("missing q", { status: 400 });

  const hits = await search(question, user, 6);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      send({ type: "sources", hits });
      try {
        for await (const delta of streamGroundedAnswer(question, hits)) {
          send({ type: "delta", text: delta });
        }
        send({ type: "done" });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "LLM 호출 실패" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
