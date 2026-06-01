import { retrieve } from "@/lib/retrieve";
import { getUserContext } from "@/lib/session";

export const runtime = "nodejs";

// 권한 범위(로그인 세션의 부서/역할) 안에서 질문 관련 문서 청크 top-k 를 반환.
export async function GET(req: Request) {
  const user = await getUserContext();
  if (!user) return new Response("unauthorized", { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return Response.json({ hits: [] });
  const hits = await retrieve(q, user, 6);
  return Response.json({ hits });
}
