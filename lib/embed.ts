// 임베딩 클라이언트. 기본 제공자 = Google Gemini (text-embedding-004, 768차원).
// 로컬 bge-m3(Ollama)로 되돌리려면 EMBED_PROVIDER=ollama (이 경우 pgvector 차원은 1024).
const PROVIDER = process.env.EMBED_PROVIDER ?? "gemini";

// Gemini
const GEMINI_KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001";
const EMBED_DIM = 768; // pgvector chunks.embedding 컬럼 차원과 일치해야 함

// Ollama (fallback)
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_EMBED_MODEL = process.env.EMBED_MODEL ?? "bge-m3"; // 1024차원

export async function embed(text: string): Promise<number[]> {
  if (PROVIDER === "ollama") return embedOllama(text);
  return embedGemini(text);
}

async function embedGemini(text: string): Promise<number[]> {
  if (!GEMINI_KEY) {
    throw new Error(
      "GEMINI_API_KEY 가 .env(.local) 에 필요해요. Google AI Studio(aistudio.google.com/apikey)에서 발급하세요."
    );
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
      body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: EMBED_DIM }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini 임베딩 실패 (${res.status}). 모델 '${GEMINI_EMBED_MODEL}'/API 키 확인. ${detail.slice(0, 200)}`);
  }
  const j = (await res.json()) as { embedding?: { values?: number[] } };
  const values = j.embedding?.values;
  if (!Array.isArray(values)) throw new Error("Gemini 임베딩 응답에 벡터가 없어요.");
  return values;
}

async function embedOllama(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: text }),
  });
  if (!res.ok) {
    throw new Error(`임베딩 실패 (${res.status}). Ollama 실행 + '${OLLAMA_EMBED_MODEL}' 모델 확인.`);
  }
  const j = (await res.json()) as { embedding?: number[] };
  if (!j.embedding) throw new Error("임베딩 응답에 벡터가 없어요.");
  return j.embedding;
}

// pgvector literal: [0.1,0.2,...]
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}
