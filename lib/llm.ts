import type { SearchHit } from "./rag";

// Phase 3 LLM 클라이언트. 지금은 로컬 Ollama(OpenAI 비호환 native /api/chat 스트리밍).
// 제공자를 바꾸려면 OLLAMA_BASE_URL/LLM_MODEL 환경변수만 교체하면 된다.
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const MODEL = process.env.LLM_MODEL ?? "qwen2.5:7b";

const SYSTEM = `너는 'modle', 사내 지식 어시스턴트야. 아래 <출처> 블록 안의 내용만 근거로 한국어로 답해.
규칙:
- 출처에 없는 내용은 절대 지어내지 마. 근거가 없으면 "사내 문서에서 찾지 못했어요"라고 솔직히 말해.
- 근거로 사용한 문장 끝에 출처 번호를 [1], [2] 형식으로 표기해.
- 간결하고 정확하게, 필요하면 목록으로 정리해.`;

function buildSources(hits: SearchHit[]): string {
  if (hits.length === 0) return "(관련 문서 없음)";
  return hits
    .map((h, i) => `[${i + 1}] ${h.title} › ${h.heading}\n${h.snippet}`)
    .join("\n\n");
}

// 근거 청크를 컨텍스트로 주입하고 답변 토큰을 순차적으로 yield.
export async function* streamGroundedAnswer(
  question: string,
  hits: SearchHit[]
): AsyncGenerator<string> {
  const body = {
    model: MODEL,
    stream: true,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `<출처>\n${buildSources(hits)}\n</출처>\n\n질문: ${question}`,
      },
    ],
  };

  let res: Response;
  try {
    res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Ollama에 연결하지 못했어요 (http://localhost:11434). 'ollama serve' 실행 여부를 확인해 주세요."
    );
  }
  if (!res.ok || !res.body) {
    throw new Error(`Ollama 응답 오류 (${res.status}). 모델 '${MODEL}'이 받아져 있는지 확인해 주세요.`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const j = JSON.parse(line);
        const content = j?.message?.content;
        if (typeof content === "string" && content) yield content;
      } catch {
        // 불완전한 JSON 라인은 무시
      }
    }
  }
}
