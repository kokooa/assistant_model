import { signIn } from "@/auth";
import { I } from "@/app/_components/icons";
import styles from "./login.module.css";

const CHIPS = [
  { c: styles.t1, label: "출산휴가 규정" },
  { c: styles.t2, label: "재택근무 신청" },
  { c: styles.t3, label: "복지 포인트" },
  { c: styles.t4, label: "경조사 휴가" },
  { c: styles.t5, label: "연차 이월" },
  { c: styles.t6, label: "경비 처리 한도" },
  { c: styles.t7, label: "사내 공지 요약" },
  { c: styles.t8, label: "병가 진단서" },
];

function Dot() {
  return (
    <span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Z" />
      </svg>
    </span>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.9 6.1C12.2 13.2 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.8-9.9 6.8-17.4z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.7-2.9-.7-4.7s.3-3.3.7-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.3-5.7c-2 1.4-4.7 2.3-7.7 2.3-6.4 0-11.8-3.7-13.6-9.8l-7.9 6.1C6.4 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.wrap}>
      <div className={styles.glow} />
      <div className={styles.grid} />
      <div className={styles.horizon} />

      {CHIPS.map((chip) => (
        <div key={chip.label} className={`${styles.float} ${chip.c}`}>
          <Dot />
          {chip.label}
        </div>
      ))}

      <main className={styles.page}>
        <header className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.mark}>{I.sparkle({ size: 16 })}</div>
            <div className={styles.wm}>
              AI 어시스턴트<small>사내 지식 기반</small>
            </div>
          </div>
          <span className={styles.pill}>
            <span className={styles.dot} />AI 온라인
          </span>
        </header>

        <section className={styles.center}>
          <div className={styles.hero}>
            <h1>
              언제든지,
              <br />
              <span className={styles.swap}>무엇이든</span> 물어보세요
              <span className={styles.period}>.</span>
            </h1>
            <p>회사의 정책·문서·공지를, 내 권한 범위 안에서 근거와 함께.</p>
            <div className={styles.cta}>
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/" });
                }}
                style={{ width: "100%" }}
              >
                <button type="submit" className={styles.google}>
                  <GoogleIcon />
                  Google로 계속하기
                </button>
              </form>
              <span className={styles.note}>사내 계정으로 로그인하면 권한 범위가 적용돼요</span>
            </div>
          </div>
        </section>
      </main>

      <div className={`${styles.corner} ${styles.bl}`}>
        <span className={styles.dotOk} />로컬 · 비공개
      </div>
      <div className={`${styles.corner} ${styles.br}`}>AI 어시스턴트 · 사내 지식</div>
    </div>
  );
}
