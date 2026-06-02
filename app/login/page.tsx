import { signIn } from "@/auth";
import { devSignIn } from "@/app/_actions/auth";
import "./login.css";

const Sparkle = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.9 5.2a4 4 0 0 0 2.4 2.4L21.5 12l-5.2 1.9a4 4 0 0 0-2.4 2.4L12 21.5l-1.9-5.2a4 4 0 0 0-2.4-2.4L2.5 12l5.2-1.9a4 4 0 0 0 2.4-2.4L12 2.5z" /></svg>
);
const Shield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" /></svg>
);
const GoogleG = () => (
  <svg viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.8z" />
    <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2a11 11 0 0 0 0 9.8z" />
    <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2 7.1l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4z" />
  </svg>
);

const CHIPS = [
  "출산휴가 규정", "연차 이월", "복지 포인트", "사내 공지 요약",
  "재택근무 신청", "경비 처리 한도", "경조사 휴가", "병가 진단서",
];

const SEEDS = [
  { id: "kokooa", email: "kokooa@jocodingax.ai", dept: "People Ops", role: "MEMBER" },
  { id: "finance", email: "finance@jocodingax.ai", dept: "Finance", role: "MEMBER" },
  { id: "admin", email: "admin@jocodingax.ai", dept: "Engineering", role: "ADMIN" },
];

const isDevEnv = process.env.NODE_ENV !== "production";

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="lp-bg"><div className="lp-glow" /><div className="lp-grid" /></div>

      <div className="lp-brand">
        <span className="lp-mark"><Sparkle /></span>
        <div>
          <div className="lp-bt">AI 어시스턴트</div>
          <div className="lp-bs">사내 지식 기반</div>
        </div>
      </div>
      <div className="lp-status"><span className="d" /> AI 온라인</div>
      <div className="lp-foot">AI 어시스턴트 · 사내 지식</div>

      <div className="lp-chips">
        {CHIPS.map((c, i) => (
          <span className={`lp-chip lp-c${i + 1}`} key={c}><Shield />{c}</span>
        ))}
      </div>

      <main className="lp-stage">
        <h1 className="lp-hero">
          사내 정보,<br />
          <span className="em">무엇이든</span> 물어보세요<span className="dot">.</span>
        </h1>
        <p className="lp-sub">
          회사의 정책·문서·공지를, 내 권한 범위 안에서 <b>근거와 함께</b>.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button type="submit" className="lp-gbtn">
            <GoogleG /> Google로 계속하기
          </button>
        </form>
        <p className="lp-hint">사내 계정으로 로그인하면 권한 범위가 적용돼요.</p>

        {isDevEnv && (
          <>
            <div className="lp-divider">개발용 로그인 · 시드 계정</div>
            <div className="lp-seeds">
              {SEEDS.map((s) => (
                <form key={s.id} action={devSignIn}>
                  <input type="hidden" name="email" value={s.email} />
                  <button type="submit" className="lp-seed">
                    <div className="lp-sn">{s.id}</div>
                    <div className="lp-sm">{s.dept}</div>
                    <span className={"lp-badge " + (s.role === "ADMIN" ? "admin" : "mem")}>{s.role}</span>
                  </button>
                </form>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
