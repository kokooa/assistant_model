import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createDepartmentAction, deleteDepartmentAction } from "@/app/_actions/admin";
import { SyncControl } from "./SyncControl";
import { UserList } from "./UserList";
import "./admin.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 인라인 SVG 아이콘 — 외부 의존성 없음.
const Ico = {
  back: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
  ),
  sparkle: () => (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.9 5.2a4 4 0 0 0 2.4 2.4L21.5 12l-5.2 1.9a4 4 0 0 0-2.4 2.4L12 21.5l-1.9-5.2a4 4 0 0 0-2.4-2.4L2.5 12l5.2-1.9a4 4 0 0 0 2.4-2.4L12 2.5z" /></svg>
  ),
  users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M17 8.5a3 3 0 0 1 0 5.8M19.5 20a5.6 5.6 0 0 0-3.5-5" /></svg>
  ),
  building: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V7l7-4 7 4v14" /><path d="M3 21h18" /><path d="M9 21v-5h4v5" /><path d="M7 10h.01M13 10h.01M7 13.5h.01M13 13.5h.01" /></svg>
  ),
  buildingSm: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V7l7-4 7 4v14" /><path d="M3 21h18" /></svg>
  ),
  doc: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 16.5h4" /></svg>
  ),
  notion: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5 14 4.2 20 5v14l-6 .8L4 18.5z" /><path d="M8 8.5v7l5-.4" /></svg>
  ),
  plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
  ),
  x: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
  ),
};

const DEPT_COLORS = ["var(--ac-acc)", "oklch(0.62 0.15 200)", "oklch(0.66 0.15 145)", "oklch(0.66 0.15 60)", "oklch(0.66 0.16 320)"];
const AVATAR_GRADS = [
  "var(--ac-grad)",
  "linear-gradient(142deg,oklch(0.62 0.15 200),oklch(0.55 0.16 222))",
  "linear-gradient(142deg,oklch(0.64 0.15 145),oklch(0.56 0.15 165))",
  "linear-gradient(142deg,oklch(0.68 0.15 60),oklch(0.58 0.16 45))",
  "linear-gradient(142deg,oklch(0.66 0.17 320),oklch(0.55 0.18 300))",
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "관리자",
  DEPT_ADMIN: "부서 관리자",
  MEMBER: "구성원",
};

function relTime(d: Date | null): string {
  if (!d) return "없음";
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  return day === 1 ? "어제" : `${day}일 전`;
}

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") notFound();

  const [users, depts, chunkRows, docCountRows, lastSyncRows] = await Promise.all([
    prisma.user.findMany({
      include: { department: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.department.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.$queryRawUnsafe<{ scope: string; department: string | null; n: bigint }[]>(
      "SELECT scope, department, count(*)::bigint AS n FROM chunks GROUP BY scope, department ORDER BY scope, department"
    ),
    prisma.$queryRawUnsafe<{ n: bigint }[]>(
      "SELECT count(DISTINCT doc_id)::bigint AS n FROM chunks"
    ),
    prisma.$queryRawUnsafe<{ last_sync: Date | null }[]>(
      "SELECT max(updated_at) AS last_sync FROM chunks"
    ),
  ]);
  const totalChunks = chunkRows.reduce((s, r) => s + Number(r.n), 0);
  const totalDocs = Number(docCountRows[0]?.n ?? 0);
  const lastSync = lastSyncRows[0]?.last_sync ?? null;
  const defaultRoot = process.env.NOTION_ROOT_PAGE_ID ?? "";
  const deptOptions = depts.map((d) => ({ id: d.id, name: d.name }));

  // 동기화 카드 헤더 pill — 가장 큰 scope/dept 분포 표시
  const topDist = chunkRows[0];
  const pillKey = topDist ? `${topDist.scope}${topDist.department ? "·" + topDist.department : ""}` : "GLOBAL";
  const pillVal = topDist ? Number(topDist.n) : 0;

  return (
    <div className="admin-console">
      <div className="ac-bg" />

      <header className="ac-topbar">
        <Link className="ac-back" href="/settings">
          <Ico.back /> 설정
        </Link>
        <div className="ac-tag">
          <span className="ac-mark"><Ico.sparkle /></span>
          <b>관리</b>
        </div>
      </header>

      <main className="ac-wrap">
        <div className="ac-hero">
          <h1>관리</h1>
          <p>사용자·부서·지식 동기화를 <span className="ac-em">한 곳에서</span> 관리해요.</p>
        </div>

        <section className="ac-stats">
          <div className="ac-card ac-stat">
            <span className="ac-glyph"><Ico.users /></span>
            <span className="ac-cap">
              <span className="ac-dot" style={{ background: "var(--ac-acc)" }} />
              <span className="ac-lbl">유저</span>
            </span>
            <div className="ac-num">{users.length}</div>
            <div className="ac-sub">활성 계정 · 권한 적용됨</div>
          </div>
          <div className="ac-card ac-stat">
            <span className="ac-glyph"><Ico.building /></span>
            <span className="ac-cap">
              <span className="ac-dot" style={{ background: "oklch(0.62 0.15 200)" }} />
              <span className="ac-lbl">부서</span>
            </span>
            <div className="ac-num">{depts.length}</div>
            <div className="ac-sub">
              {depts.length === 0 ? "아직 부서가 없어요" : depts.map((d) => d.name).join(" · ")}
            </div>
          </div>
          <div className="ac-card ac-stat">
            <span className="ac-glyph"><Ico.doc /></span>
            <span className="ac-cap">
              <span className="ac-dot" style={{ background: "oklch(0.66 0.15 145)" }} />
              <span className="ac-lbl">문서 종류</span>
            </span>
            <div className="ac-num">{totalDocs}</div>
            <div className="ac-sub">{totalChunks} 하위문서</div>
          </div>
        </section>

        <div className="ac-grid">
          <div className="ac-col-l">
            {/* 부서 */}
            <section className="ac-card">
              <div className="ac-card-head">
                <div className="ac-title"><span className="ac-ic"><Ico.buildingSm /></span>부서</div>
              </div>
              <div className="ac-card-body">
                <form action={createDepartmentAction} className="ac-add-row">
                  <input type="text" name="name" required placeholder="새 부서 이름" className="ac-field" />
                  <button type="submit" className="ac-btn ac-btn-acc"><Ico.plus /> 추가</button>
                </form>

                <div className="ac-list-head"><span>이름</span><span>멤버</span><span /></div>
                {depts.length === 0 && (
                  <div style={{ padding: "16px 4px", fontSize: 13, color: "var(--ac-ink-4)" }}>
                    아직 부서가 없어요. 위에서 추가해 주세요.
                  </div>
                )}
                {depts.map((d, i) => (
                  <div className="ac-row" key={d.id}>
                    <div className="ac-dept-name">
                      <span className="ac-sq" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                      {d.name}
                    </div>
                    <div className="ac-member-ct"><b>{d._count.users}</b>명</div>
                    {d._count.users === 0 ? (
                      <form action={deleteDepartmentAction}>
                        <input type="hidden" name="departmentId" value={d.id} />
                        <button type="submit" className="ac-x" title={`${d.name} 삭제`} aria-label={`${d.name} 삭제`}>
                          <Ico.x />
                        </button>
                      </form>
                    ) : (
                      <span className="ac-x" aria-hidden style={{ opacity: 0.35, cursor: "default" }}>—</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Notion 동기화 */}
            <section className="ac-card">
              <div className="ac-card-head">
                <div className="ac-title">
                  <span className="ac-ic"><Ico.notion /></span>
                  <span className="ac-lbl-mono" style={{ fontSize: "11.5px", color: "var(--ac-ink)" }}>NOTION 동기화</span>
                </div>
                <span className="ac-badge-pill">
                  <span className="k">{pillKey}</span>
                  <span className="v">{pillVal}</span>
                </span>
              </div>
              <div className="ac-card-body">
                <SyncControl
                  depts={deptOptions}
                  defaultRoot={defaultRoot}
                  lastSyncLabel={relTime(lastSync)}
                  totalChunks={totalChunks}
                />
              </div>
            </section>
          </div>

          <UserList
            users={users.map((u, i) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              departmentId: u.departmentId,
              role: u.role,
              avatarGrad: AVATAR_GRADS[i % AVATAR_GRADS.length],
            }))}
            depts={deptOptions}
          />
        </div>
      </main>
    </div>
  );
}
