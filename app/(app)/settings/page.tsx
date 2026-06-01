import Link from "next/link";
import { auth } from "@/auth";
import { I } from "@/app/_components/icons";
import { logout } from "@/app/_actions/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "관리자",
  DEPT_ADMIN: "부서 관리자",
  MEMBER: "구성원",
};

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;
  const initial = (user?.name ?? user?.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className="set">
      <header className="set-top">
        <Link className="set-back" href="/">← 물어보기</Link>
        <span className="set-brand">
          <span className="set-brand-mark">{I.sparkle({ size: 15 })}</span>
          AI 어시스턴트
        </span>
      </header>

      <main className="set-main">
        <h1 className="set-title">설정</h1>

        <section className="set-card">
          <div className="set-label">계정</div>
          {user ? (
            <>
              <div className="set-acct">
                <div className="set-avatar">{initial}</div>
                <div className="set-acct-info">
                  <div className="set-acct-name">{user.name ?? user.email}</div>
                  <div className="set-acct-mail">{user.email}</div>
                </div>
              </div>
              <div className="set-rows">
                <div className="set-row">
                  <span className="set-row-k">부서</span>
                  <span className="set-row-v">{user.department ?? "—"}</span>
                </div>
                <div className="set-row">
                  <span className="set-row-k">권한</span>
                  <span className="set-row-v">{ROLE_LABEL[user.role ?? ""] ?? user.role ?? "—"}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="set-empty">로그인 정보를 불러올 수 없어요. 다시 로그인해 주세요.</div>
          )}
        </section>

        {user?.role === "ADMIN" && (
          <Link className="set-card set-link-card" href="/settings/admin">
            <div className="set-label">관리</div>
            <div className="set-row">
              <span className="set-row-k">유저 · 부서</span>
              <span className="set-row-v">→</span>
            </div>
          </Link>
        )}

        <form action={logout}>
          <button type="submit" className="set-logout">{I.lock({ size: 15 })} 로그아웃</button>
        </form>
      </main>
    </div>
  );
}
