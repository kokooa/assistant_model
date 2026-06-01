import type { SearchHit } from "./rag";

// Phase 3 LLM 클라이언트. 기본 제공자 = Google Gemini API (서버 사이드 전용, API 키 노출 금지).
// 로컬 Ollama 로 되돌리려면 LLM_PROVIDER=ollama.
const PROVIDER = process.env.LLM_PROVIDER ?? "gemini";

// Gemini
const GEMINI_KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

// Ollama (fallback)
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.LLM_MODEL ?? "qwen2.5:7b";

const SYSTEM = `너는 'modle', 사내 지식 어시스턴트야. 아래 <출처> 블록의 내용만 근거로 한국어로 답해.
규칙:
- <출처>에 질문과 관련된 내용이 조금이라도 있으면 반드시 그 내용을 바탕으로 구체적으로 답해. 출처에 단서가 있는데도 모른다고 하지 마.
- 질문이 "되나요?/가능한가요?" 형태면 출처 내용으로 "예/아니오"를 먼저 밝히고 근거를 덧붙여. (예: 출처에 "이월 안 됩니다"가 있으면 "이월되지 않습니다"라고 답해.)
- 단, 예/아니오 단정은 <출처>가 질문의 바로 그 대상을 다룰 때만 해. 출처가 다른 주제(예: 복지포인트)만 다루고 질문 대상(예: 연차)을 직접 언급하지 않으면, 그 사실을 질문 대상에 옮겨 적용하지 말고 "사내 문서에서 찾지 못했어요"라고만 답해.
- 정말로 <출처> 어디에도 관련 내용이 전혀 없을 때만 "사내 문서에서 찾지 못했어요"라고 말해.
- 출처에 없는 사실을 지어내지는 마.
- 근거로 사용한 문장 끝에 [1], [2] 형식으로 출처 번호를 표기해.
- 간결하고 정확하게, 필요하면 목록으로 정리해.`;

function buildSources(hits: SearchHit[]): string {
  if (hits.length === 0) return "(관련 문서 없음)";
  return hits
    .map((h, i) => `[${i + 1}] ${h.title} › ${h.heading}\n${h.content ?? h.snippet}`)
    .join("\n\n");
}

function userPrompt(question: string, hits: SearchHit[]): string {
  return `<출처>\n${buildSources(hits)}\n</출처>\n\n질문: ${question}`;
}

// 근거 청크를 컨텍스트로 주입하고 답변 토큰을 순차적으로 yield.
export async function* streamGroundedAnswer(
  question: string,
  hits: SearchHit[]
): AsyncGenerator<string> {
  if (PROVIDER === "ollama") {
    yield* streamOllama(question, hits);
    return;
  }
  yield* streamGemini(question, hits);
}

// ── Google Gemini (SSE 스트리밍) ──
async function* streamGemini(question: string, hits: SearchHit[]): AsyncGenerator<string> {
  if (!GEMINI_KEY) {
    throw new Error(
      "GEMINI_API_KEY 가 .env(.local) 에 필요해요. Google AI Studio(aistudio.google.com/apikey)에서 발급하세요."
    );
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: userPrompt(question, hits) }] }],
    generationConfig: { temperature: 0.2 },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Gemini API 에 연결하지 못했어요. 네트워크 상태를 확인해 주세요.");
  }
  if (res.status === 429) {
    throw new Error(
      "Gemini 생성 쿼터가 없어요 (429). 이 API 키의 무료 생성 한도가 0이라, Google Cloud 프로젝트에 결제(billing)를 활성화해야 답변 생성이 동작해요. (검색·임베딩은 정상)"
    );
  }
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Gemini API 오류 (${res.status}). 모델 '${GEMINI_MODEL}'/API 키를 확인해 주세요. ${detail.slice(0, 200)}`
    );
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
      const s = line.trim();
      if (!s.startsWith("data:")) continue;
      const json = s.slice(5).trim();
      if (!json || json === "[DONE]") continue;
      try {
        const j = JSON.parse(json);
        const parts = j?.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          const text = parts.map((p: { text?: string }) => p.text ?? "").join("");
          if (text) yield text;
        }
      } catch {
        // 불완전한 JSON 라인은 무시
      }
    }
  }
}

// ── 로컬 Ollama (fallback, native /api/chat 스트리밍) ──
async function* streamOllama(question: string, hits: SearchHit[]): AsyncGenerator<string> {
  const body = {
    model: OLLAMA_MODEL,
    stream: true,
    options: { temperature: 0.2, num_ctx: 8192 },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt(question, hits) },
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
    throw new Error(`Ollama 응답 오류 (${res.status}). 모델 '${OLLAMA_MODEL}'이 받아져 있는지 확인해 주세요.`);
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
