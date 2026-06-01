import Link from "next/link";
import { auth } from "@/auth";
import { logout } from "@/app/_actions/session";
import "./settings.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "관리자",
  DEPT_ADMIN: "부서 관리자",
  MEMBER: "구성원",
};

const Ico = {
  back: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
  ),
  sparkle: () => (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.9 5.2a4 4 0 0 0 2.4 2.4L21.5 12l-5.2 1.9a4 4 0 0 0-2.4 2.4L12 21.5l-1.9-5.2a4 4 0 0 0-2.4-2.4L2.5 12l5.2-1.9a4 4 0 0 0 2.4-2.4L12 2.5z" /></svg>
  ),
  users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M17 8.5a3 3 0 0 1 0 5.8M19.5 20a5.6 5.6 0 0 0-3.5-5" /></svg>
  ),
  arrow: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  logoutIc: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>
  ),
};

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;
  const initial = (user?.name ?? user?.email ?? "?").trim().charAt(0).toUpperCase();
  const isAdmin = user?.role === "ADMIN";
  const roleLabel = user?.role ? (ROLE_LABEL[user.role] ?? user.role) : "—";

  return (
    <div className="settings-page">
      <div className="sp-bg" />

      <header className="sp-topbar">
        <Link className="sp-back" href="/">
          <Ico.back /> 둘러보기
        </Link>
        <div className="sp-tag">
          <span className="sp-mark"><Ico.sparkle /></span>
          <b>AI 어시스턴트</b>
        </div>
      </header>

      <main className="sp-wrap">
        <div className="sp-hero">
          <h1>설정</h1>
          <p>내 계정과 <span className="sp-em">권한 범위</span>를 확인해요.</p>
        </div>

        {/* 계정 */}
        <section className="sp-card">
          <span className="sp-sec-lbl">계정</span>
          {user ? (
            <>
              <div className="sp-acct">
                <div className="sp-ava">{initial}</div>
                <div>
                  <div className="sp-name">{user.name ?? user.email}</div>
                  <div className="sp-mail">{user.email}</div>
                </div>
              </div>
              <div className="sp-divider" />
              <div className="sp-info-row">
                <span className="k">부서</span>
                <span className="v">{user.department ?? "—"}</span>
              </div>
              <div className="sp-info-row">
                <span className="k">권한</span>
                {isAdmin ? (
                  <span className="sp-role-pill"><span className="d" />{roleLabel}</span>
                ) : (
                  <span className="v">{roleLabel}</span>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: "16px 0", fontSize: 13, color: "var(--sp-ink-4)" }}>
              로그인 정보를 불러올 수 없어요. 다시 로그인해 주세요.
            </div>
          )}
        </section>

        {/* 관리 — ADMIN 만 노출 */}
        {isAdmin && (
          <Link className="sp-card sp-link-card" href="/settings/admin">
            <div className="sp-sec-wrap"><span className="sp-sec-lbl">관리</span></div>
            <div className="sp-link-row">
              <span className="sp-ic"><Ico.users /></span>
              <div className="sp-txt">
                <div className="t">유저 · 부서</div>
                <div className="s">사용자, 부서, 지식 동기화 관리</div>
              </div>
              <span className="sp-arrow"><Ico.arrow /></span>
            </div>
          </Link>
        )}

        <form action={logout}>
          <button type="submit" className="sp-logout"><Ico.logoutIc /> 로그아웃</button>
        </form>
      </main>
    </div>
  );
}
