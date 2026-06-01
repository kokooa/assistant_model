import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

// Phase 2 지식 레이어. pgvector + 실임베딩이 준비되면 search() 내부의
// 점수 계산만 임베딩 코사인 유사도로 교체하면 된다. 코퍼스 로드·청킹·권한
// 필터는 백엔드와 무관하게 동일하게 쓰인다.

export type Role = "ADMIN" | "DEPT_ADMIN" | "MEMBER";
export type Scope = "GLOBAL" | "DEPARTMENT";

export interface UserContext {
  name: string;
  department: string;
  role: Role;
}

export const MOCK_USER: UserContext = {
  name: "준 김",
  department: "People Ops",
  role: "MEMBER",
};

export interface DocMeta {
  id: string;
  title: string;
  type: string;
  category: string;
  owner: string;
  scope: Scope;
  department?: string;
  updatedAt?: string;
  path: string;
}

export interface Chunk {
  doc: DocMeta;
  heading: string;
  text: string;
  idx: number;
}

export interface SearchHit {
  docId: string;
  title: string;
  type: string;
  path: string;
  heading: string;
  snippet: string;        // UI 표시용 짧은 미리보기
  content?: string;       // LLM 근거용 전체 청크 본문
  score: number;
  locked: boolean;
}

const CONTENT_DIR = join(process.cwd(), "content");

// 권한 우선 검색: 생성 이전 단계에서 범위 밖 문서를 아예 제외한다.
export function canAccess(doc: DocMeta, user: UserContext): boolean {
  if (doc.scope === "GLOBAL") return true;
  if (user.role === "ADMIN") return true;
  return doc.department != null && doc.department === user.department;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  if (!raw.startsWith("---")) return { meta: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of raw.slice(3, end).trim().split("\n")) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  const body = raw.slice(end + 4).replace(/^\n+/, "");
  return { meta, body };
}

function chunkMarkdown(body: string): { heading: string; text: string }[] {
  const chunks: { heading: string; text: string }[] = [];
  let heading = "개요";
  let buf: string[] = [];
  const flush = () => {
    const text = buf.join("\n").trim();
    if (text) chunks.push({ heading, text });
    buf = [];
  };
  for (const line of body.split("\n")) {
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) {
      flush();
      heading = h[1].trim();
    } else {
      buf.push(line);
    }
  }
  flush();
  return chunks;
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.name.endsWith(".md")) out.push(full);
  }
  return out;
}

let corpusCache: Chunk[] | null = null;

export async function loadCorpus(): Promise<Chunk[]> {
  if (corpusCache) return corpusCache;
  const chunks: Chunk[] = [];
  for (const file of await walk(CONTENT_DIR)) {
    const { meta, body } = parseFrontmatter(await readFile(file, "utf8"));
    const rel = relative(CONTENT_DIR, file);
    const doc: DocMeta = {
      id: meta.id || rel,
      title: meta.title || rel,
      type: meta.type || "문서",
      category: meta.category || "기타",
      owner: meta.owner || "",
      scope: meta.scope === "DEPARTMENT" ? "DEPARTMENT" : "GLOBAL",
      department: meta.department || undefined,
      updatedAt: meta.updatedAt,
      path: rel,
    };
    chunkMarkdown(body).forEach((c, idx) =>
      chunks.push({ doc, heading: c.heading, text: c.text, idx })
    );
  }
  corpusCache = chunks;
  return chunks;
}

// 한글 친화 어휘 점수: 조사/공백 변화에 강하도록 문자 bigram 코사인 유사도 사용.
function bigrams(s: string): string[] {
  const t = s.toLowerCase().replace(/\s+/g, "");
  if (t.length < 2) return t ? [t] : [];
  const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
  return out;
}

function termFreq(grams: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const g of grams) m.set(g, (m.get(g) || 0) + 1);
  return m;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [k, v] of a) {
    const w = b.get(k);
    if (w) dot += v * w;
  }
  let na = 0;
  for (const v of a.values()) na += v * v;
  let nb = 0;
  for (const v of b.values()) nb += v * v;
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function search(
  query: string,
  user: UserContext,
  k = 6
): Promise<SearchHit[]> {
  const chunks = await loadCorpus();
  const qv = termFreq(bigrams(query));
  return chunks
    .filter((c) => canAccess(c.doc, user))
    .map((c) => ({ c, score: cosine(qv, termFreq(bigrams(`${c.heading} ${c.text}`))) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ c, score }) => ({
      docId: c.doc.id,
      title: c.doc.title,
      type: c.doc.type,
      path: c.doc.path,
      heading: c.heading,
      snippet: c.text.replace(/\s+/g, " ").slice(0, 140),
      content: c.text,
      score: Math.round(score * 1000) / 1000,
      locked: c.doc.scope !== "GLOBAL",
    }));
}
