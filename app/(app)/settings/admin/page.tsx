import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { I } from "@/app/_components/icons";
import { createDepartmentAction, deleteDepartmentAction } from "@/app/_actions/admin";
import { RoleSelect } from "./RoleSelect";
import { DepartmentSelect } from "./DepartmentSelect";
import { SyncControl } from "./SyncControl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USERS_COLS = "minmax(0,1fr) 160px 130px";
const DEPTS_COLS = "minmax(0,1fr) 70px 56px";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") notFound();

  const [users, depts, chunkRows, docCountRows] = await Promise.all([
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
  ]);
  const totalChunks = chunkRows.reduce((s, r) => s + Number(r.n), 0);
  const totalDocs = Number(docCountRows[0]?.n ?? 0);
  const defaultRoot = process.env.NOTION_ROOT_PAGE_ID ?? "";

  return (
    <div className="set">
      <header className="set-top">
        <Link className="set-back" href="/settings">← 설정</Link>
        <span className="set-brand">
          <span className="set-brand-mark">{I.sparkle({ size: 15 })}</span>
          관리
        </span>
      </header>

      <main className="set-main set-main-wide">
        <h1 className="set-title">관리</h1>

        {/* KPI 카드 — 한눈에 보이는 숫자 3개 */}
        <section className="set-kpis">
          <div className="set-kpi">
            <span className="set-kpi-label">유저</span>
            <span className="set-kpi-n">{users.length}</span>
          </div>
          <div className="set-kpi">
            <span className="set-kpi-label">부서</span>
            <span className="set-kpi-n">{depts.length}</span>
          </div>
          <div className="set-kpi">
            <span className="set-kpi-label">문서 종류</span>
            <span className="set-kpi-n">{totalDocs}</span>
            <span className="set-kpi-sub">{totalChunks} 조각으로 색인</span>
          </div>
        </section>

        {/* 2 column — 좌(부서/동기화) + 우(유저) */}
        <section className="set-grid-2col">
          <div className="set-col">
            <section className="set-card">
              <div className="set-label">부서</div>

              <form action={createDepartmentAction} className="set-tbl-form">
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="새 부서 이름"
                  className="set-tbl-input"
                />
                <button type="submit" className="set-tbl-btn">추가</button>
              </form>

              <div className="set-tbl">
                <div className="set-tbl-row set-tbl-head" style={{ gridTemplateColumns: DEPTS_COLS }}>
                  <span>이름</span>
                  <span>멤버</span>
                  <span></span>
                </div>
                {depts.length === 0 && <div className="set-empty">아직 부서가 없어요. 위에서 추가해 주세요.</div>}
                {depts.map((d) => (
                  <div key={d.id} className="set-tbl-row" style={{ gridTemplateColumns: DEPTS_COLS }}>
                    <span className="set-tbl-name">{d.name}</span>
                    <span className="set-tbl-cell">{d._count.users}명</span>
                    {d._count.users === 0 ? (
                      <form action={deleteDepartmentAction}>
                        <input type="hidden" name="departmentId" value={d.id} />
                        <button type="submit" className="set-tbl-btn-danger" aria-label={`${d.name} 삭제`}>삭제</button>
                      </form>
                    ) : (
                      <span className="set-tbl-cell" aria-hidden>—</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="set-card">
              <div className="set-label">Notion 동기화</div>
              {chunkRows.length > 0 && (
                <ul className="set-sync-dist">
                  {chunkRows.map((r, i) => (
                    <li key={i}>
                      <span className="set-tbl-tag">
                        {r.scope}{r.department ? ` · ${r.department}` : ""}
                      </span>
                      <span className="set-sync-n">{Number(r.n)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <SyncControl depts={depts.map((d) => ({ id: d.id, name: d.name }))} defaultRoot={defaultRoot} />
            </section>
          </div>

          <div className="set-col">
            <section className="set-card">
              <div className="set-label">유저</div>
              <div className="set-tbl">
                <div className="set-tbl-row set-tbl-head" style={{ gridTemplateColumns: USERS_COLS }}>
                  <span>이름 / 이메일</span>
                  <span>부서</span>
                  <span>역할</span>
                </div>
                {users.map((u) => (
                  <div key={u.id} className="set-tbl-row" style={{ gridTemplateColumns: USERS_COLS }}>
                    <div>
                      <div className="set-tbl-name">{u.name}</div>
                      <div className="set-tbl-sub">{u.email}</div>
                    </div>
                    <DepartmentSelect userId={u.id} value={u.departmentId} options={depts.map((d) => ({ id: d.id, name: d.name }))} />
                    <RoleSelect userId={u.id} value={u.role} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
