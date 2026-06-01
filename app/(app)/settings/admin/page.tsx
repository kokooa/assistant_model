import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { I } from "@/app/_components/icons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "관리자",
  DEPT_ADMIN: "부서 관리자",
  MEMBER: "구성원",
};

const USERS_COLS = "minmax(0,1fr) 140px 110px";
const DEPTS_COLS = "minmax(0,1fr) 90px";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") notFound();

  const [users, depts] = await Promise.all([
    prisma.user.findMany({
      include: { department: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.department.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="set">
      <header className="set-top">
        <Link className="set-back" href="/settings">← 설정</Link>
        <span className="set-brand">
          <span className="set-brand-mark">{I.sparkle({ size: 15 })}</span>
          관리
        </span>
      </header>

      <main className="set-main">
        <h1 className="set-title">관리</h1>

        <section className="set-card">
          <div className="set-label">유저 ({users.length})</div>
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
                <span className="set-tbl-cell">{u.department?.name ?? "—"}</span>
                <span className="set-tbl-cell"><span className="set-tbl-tag">{ROLE_LABEL[u.role] ?? u.role}</span></span>
              </div>
            ))}
          </div>
        </section>

        <section className="set-card">
          <div className="set-label">부서 ({depts.length})</div>
          <div className="set-tbl">
            <div className="set-tbl-row set-tbl-head" style={{ gridTemplateColumns: DEPTS_COLS }}>
              <span>이름</span>
              <span>멤버</span>
            </div>
            {depts.map((d) => (
              <div key={d.id} className="set-tbl-row" style={{ gridTemplateColumns: DEPTS_COLS }}>
                <span className="set-tbl-name">{d.name}</span>
                <span className="set-tbl-cell">{d._count.users}명</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
