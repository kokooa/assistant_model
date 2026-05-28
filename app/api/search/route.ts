import { search, MOCK_USER } from "@/lib/rag";

export const runtime = "nodejs";

// Phase 2: 권한 범위 안에서 질문과 관련된 사내 문서 청크 top-k 를 반환.
// 사용자 컨텍스트는 아직 MOCK_USER. Phase 4 에서 next-auth 세션으로 교체.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return Response.json({ hits: [] });
  const hits = await search(q, MOCK_USER, 6);
  return Response.json({ hits });
}
