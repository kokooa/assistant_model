"use client";

import { useRouter } from "next/navigation";
import { I } from "./_components/icons";
import {
  SUGGESTED_PROMPTS,
  BRIEFING_LINES,
  RECENT_CONVERSATIONS,
} from "./_data/mock";

export default function Home() {
  const router = useRouter();
  const ask = (text: string) => router.push(`/ask?q=${encodeURIComponent(text)}`);

  return (
    <div className="page">
      <div className="page-inner">
        {/* HERO */}
        <section className="hero">
          <div className="hero-l">
            <div className="hero-greet">2026년 5월 28일 목요일</div>
            <h1 className="hero-name">안녕하세요, 준 님.</h1>
            <p className="hero-summary">
              궁금한 사내 정보를 자연어로 물어보세요. <mark>휴가·근무 규정·복지</mark>부터
              사내 문서까지, modle이 <mark>권한 범위 안에서 근거와 함께</mark> 답해드려요.
              아래 예시를 눌러 바로 시작해 보세요.
            </p>
            <div className="hero-prompts">
              {SUGGESTED_PROMPTS.map((p) => (
                <button key={p.label} className="prompt-chip" onClick={() => ask(p.label)}>
                  {I[p.icon]({ size: 13 })} {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="hero-r">
            <div className="hero-r-title">오늘의 브리핑</div>
            <div className="tick-list">
              {BRIEFING_LINES.map((line, i) => (
                <div key={i} className="tick">
                  <span className="tick-dot" style={{ borderColor: "var(--acc)" }} />
                  <span className="tick-label">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STAT TILES */}
        <div className="grid grid-12" style={{ marginBottom: 16 }}>
          <div className="col-4 card">
            <div className="stat">
              <div className="stat-label">{I.database({ size: 13 })} 검색 가능한 문서</div>
              <div className="stat-value">47</div>
              <div className="stat-delta">정책 · 핸드북 · 공지 · 안내</div>
            </div>
          </div>
          <div className="col-4 card">
            <div className="stat">
              <div className="stat-label">{I.sparkle({ size: 13 })} 이번 주 질문</div>
              <div className="stat-value">12</div>
              <div className="stat-delta up">{I.arrowUp({ size: 11 })} 평균 응답 4초</div>
            </div>
          </div>
          <div className="col-4 card">
            <div className="stat">
              <div className="stat-label">{I.lock({ size: 13 })} 내 권한 범위</div>
              <div className="stat-value" style={{ color: "oklch(0.45 0.12 275)" }}>People Ops</div>
              <div className="stat-delta">전사 공개 + 부서 문서 열람</div>
            </div>
          </div>
        </div>

        {/* RECENT + HOW TO ASK */}
        <div className="grid grid-12">
          <div className="col-8 card card-hover">
            <div className="card-head">
              <div className="card-title">{I.clock({ size: 14 })} 최근 대화</div>
              <button className="btn btn-ghost" onClick={() => router.push("/ask")}>
                물어보기 {I.chevronRight({ size: 13 })}
              </button>
            </div>
            <div>
              {RECENT_CONVERSATIONS.map((c) => (
                <div key={c.id} className="doc-item" onClick={() => ask(c.title)}>
                  <div className="doc-thumb">{I.sparkle({ size: 14 })}</div>
                  <div>
                    <div className="doc-title">{c.title}</div>
                    <div className="doc-meta">
                      <span>{c.cat}</span>
                      <span>{c.snippet}</span>
                    </div>
                  </div>
                  <span className="thread-dept">{c.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="col-4 card card-hover">
            <div className="card-head">
              <div className="card-title">{I.spark({ size: 14 })} 이렇게 물어보세요</div>
            </div>
            <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "올해 연차 며칠까지 이월돼?",
                "배우자 출산휴가 신청 방법",
                "경조사 휴가 일수 정리해줘",
                "복지 포인트 어디에 쓸 수 있어?",
              ].map((q) => (
                <button
                  key={q}
                  className="prompt-chip"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  onClick={() => ask(q)}
                >
                  {I.chevronRight({ size: 12 })} {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
