import { sessionIdentityProvider } from "@/lib/seam/IdentityProvider";

export const runtime = "nodejs";

// Phase 5: retrieve 책임이 AXHub gateway 로 이관되어 이 endpoint 는 stub.
// 기존 UI (HomeAsk/Assistant) 가 /api/search?q=... 를 호출해 hits 미리보기를
// 표시하므로 401/400 호환을 위해 그대로 두되 항상 빈 hits 반환. 추후 UI 가
// agent 의 도구 호출 결과로 재설계되면 함께 제거.

export async function GET(req: Request) {
  const user = await sessionIdentityProvider.resolve();
  if (!user) return new Response("unauthorized", { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return Response.json({ hits: [] });
  return Response.json({ hits: [] });
}
