"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { I } from "@/app/_components/icons";
import type { SearchHit } from "@/lib/rag";

interface Msg {
  who: "user" | "ai";
  text: string;
}

const PROMPTS: { icon: "umbrella" | "megaphone" | "clock" | "heart"; label: string }[] = [
  { icon: "umbrella", label: "내 휴가 잔여일수" },
  { icon: "megaphone", label: "사내 공지 요약" },
  { icon: "clock", label: "경조사 휴가 규정" },
  { icon: "heart", label: "복지 포인트 사용처" },
];

// 답변 텍스트의 [n] 인용을 작은 배지로 렌더.
function renderAnswer(text: string): ReactNode {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line, li) => (
      <p key={li} style={{ margin: "0 0 8px" }}>
        {line.split(/(\[\d+\])/g).map((part, pi) => {
          const m = part.match(/^\[(\d+)\]$/);
          return m ? <span key={pi} className="cite">{m[1]}</span> : <span key={pi}>{part}</span>;
        })}
      </p>
    ));
}

export function HomeAsk() {
  const seed = useSearchParams().get("q");
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [sending, setSending] = useState(false);
  const seeded = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || sending) return;
    setQ("");
    setSending(true);
    setMessages((m) => [...m, { who: "user", text: t }]);

    const setAnswer = (next: string) =>
      setMessages((m) => {
        const copy = m.slice();
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].who === "ai") {
            copy[i] = { ...copy[i], text: next };
            break;
          }
        }
        return copy;
      });

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: t }),
      });
      if (!res.ok || !res.body) throw new Error("stream-failed");
      setMessages((m) => [...m, { who: "ai", text: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let answer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev: { type?: string; hits?: SearchHit[]; text?: string; message?: string };
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === "sources") setHits(ev.hits ?? []);
          else if (ev.type === "delta") {
            answer += ev.text ?? "";
            setAnswer(answer);
          } else if (ev.type === "error") {
            answer += `${answer ? "\n\n" : ""}⚠️ ${ev.message ?? "LLM 호출 실패"}`;
            setAnswer(answer);
          }
        }
      }
    } catch {
      setMessages((m) => [
        ...m,
        { who: "ai", text: "LLM에 연결하지 못했어요. Ollama가 실행 중인지 확인해 주세요." },
      ]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (seed && !seeded.current) {
      seeded.current = true;
      send(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const hasChat = messages.length > 0;
  const lastIsUser = hasChat && messages[messages.length - 1].who === "user";

  return (
    <div className="page" style={{ overflow: "visible" }}>
      <div className="page-inner ambient-stage" style={{ paddingTop: hasChat ? 24 : 48 }}>
        <div className="ambient-glow" />
        <div className="ambient-grid" />
        <div className="ambient-horizon" />

        <div className="ambient-content">
          {/* Hero greeting — 대화 시작 전만 */}
          {!hasChat && (
            <section style={{ textAlign: "center", padding: "28px 0 8px" }}>
              <div className="page-eyebrow" style={{ marginBottom: 18 }}>
                <span>2026년 5월 28일 · 목요일</span>
              </div>
              <h1 className="page-title" style={{ fontSize: "clamp(38px, 6vw, 72px)", marginBottom: 16 }}>
                안녕하세요, 지원님
                <br />
                <span className="swap">무엇이든</span> 물어보세요<span className="period">.</span>
              </h1>
              <p style={{ fontSize: 15, color: "var(--ink-3)", maxWidth: "44ch", margin: "0 auto", lineHeight: 1.55 }}>
                회사의 정책·문서·공지를, 내 권한 범위 안에서 근거와 함께 답해드려요.
              </p>
            </section>
          )}

          {/* 대화 */}
          {hasChat && (
            <div style={{ maxWidth: 720, margin: "0 auto 20px", display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
              {messages.map((m, i) =>
                m.who === "user" ? (
                  <div
                    key={i}
                    style={{ alignSelf: "flex-end", maxWidth: "80%", background: "var(--acc)", color: "#fff", padding: "10px 14px", borderRadius: 14, lineHeight: 1.5 }}
                  >
                    {m.text}
                  </div>
                ) : (
                  <div key={i} style={{ alignSelf: "flex-start", maxWidth: "100%", color: "var(--ink)", lineHeight: 1.6 }}>
                    {renderAnswer(m.text)}
                  </div>
                )
              )}
              {sending && lastIsUser && (
                <div style={{ alignSelf: "flex-start", color: "var(--ink-3)", fontSize: 13 }}>
                  사내 문서를 살펴보고 있어요…
                </div>
              )}

              {hits.length > 0 && (
                <div className="card" style={{ marginTop: 4 }}>
                  <div className="card-head">
                    <div className="card-title">{I.database({ size: 14 })} 출처 · {hits.length}</div>
                  </div>
                  <div>
                    {hits.map((h, i) => (
                      <div className="row-item" key={`${h.docId}-${i}`}>
                        <span style={{ fontFamily: "var(--mono)", color: "var(--acc)", fontSize: 12 }}>[{i + 1}]</span>
                        <div>
                          <div className="row-title">{h.title}</div>
                          <div className="row-meta">{h.heading} · 관련도 {Math.round(h.score * 100)}%</div>
                        </div>
                        {h.locked && <span style={{ color: "var(--ink-4)" }}>{I.lock({ size: 12 })}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}

          {/* 컴포저 — 항상 */}
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            <div className="composer" style={{ borderRadius: 16 }}>
              <div className="composer-top">
                <span className="chip"><span className="dot-ok" /> 내 권한 적용</span>
                <span className="chip">근거 인용 켬</span>
              </div>
              <textarea
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(q);
                  }
                }}
                placeholder="예) 출산휴가 며칠이야? 재택근무 어떻게 신청해?"
                rows={2}
              />
              <div className="composer-bar">
                <button className="ic-btn" aria-label="첨부">{I.paperclip({ size: 16 })}</button>
                <button className="ic-btn" aria-label="음성">{I.mic({ size: 16 })}</button>
                <span className="chip" style={{ marginLeft: 4 }}>{I.cpu({ size: 11 })} Ollama · 로컬</span>
                <div className="spacer" />
                <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-4)", marginRight: 6 }}>⇧↵ 줄바꿈</span>
                <button className="send-btn" onClick={() => send(q)} disabled={!q.trim() || sending}>
                  {I.arrowUp({ size: 15, stroke: 2.2 })}
                </button>
              </div>
            </div>

            {/* 추천 프롬프트 — 대화 시작 전만 */}
            {!hasChat && (
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
                {PROMPTS.map((p) => (
                  <button key={p.label} className="prompt-chip" onClick={() => send(p.label)}>
                    {I[p.icon]({ size: 12 })} {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 대시보드 카드 — 대화 시작 전만 (빈 상태 랜딩) */}
          {!hasChat && (
            <>
              <div className="meta-bar" style={{ marginTop: 28 }}>
                <div><span className="dot-ok" /> <strong>로컬</strong> · 비공개 처리</div>
                <div>색인 <strong>4,218</strong> 문서 · 마지막 동기화 <strong>2분 전</strong></div>
                <div>응답 모드 · <strong>근거 인용</strong></div>
              </div>

              <div className="stat-row">
                <div className="card stat">
                  <div className="stat-label">남은 연차</div>
                  <div className="stat-value">11.5</div>
                  <div className="stat-delta">총 15일 / 이월 가능</div>
                </div>
                <div className="card stat">
                  <div className="stat-label">대기 결재</div>
                  <div className="stat-value">3</div>
                  <div className="stat-delta up">{I.arrowUp({ size: 10 })} 어제 대비 +1</div>
                </div>
                <div className="card stat">
                  <div className="stat-label">이번 달 질의</div>
                  <div className="stat-value">42</div>
                  <div className="stat-delta">평균 응답 1.8s</div>
                </div>
                <div className="card stat">
                  <div className="stat-label">복지 포인트</div>
                  <div className="stat-value">82,000</div>
                  <div className="stat-delta">9월 만료 12,000</div>
                </div>
              </div>

              <div className="card card-hover" style={{ marginTop: 20 }}>
                <div className="card-head">
                  <div className="card-title">{I.megaphone({ size: 14 })} 최근 공지</div>
                  <span className="card-meta">UPDATED 2 MIN AGO</span>
                </div>
                <div>
                  <div className="ann">
                    <div className="ann-pri high" />
                    <div className="ann-body">
                      <div className="ann-meta">
                        <span className="tag danger">긴급</span>
                        <span>인사팀</span>
                        <span>·</span>
                        <span>오늘 09:12</span>
                      </div>
                      <h4 className="ann-title">2026년 하반기 평가 일정 공지</h4>
                      <p className="ann-desc">자기평가 기간이 6월 3일부터 14일까지 진행됩니다.</p>
                    </div>
                  </div>
                  <div className="ann">
                    <div className="ann-pri info" />
                    <div className="ann-body">
                      <div className="ann-meta">
                        <span className="tag acc">정책</span>
                        <span>총무팀</span>
                        <span>·</span>
                        <span>어제 16:40</span>
                      </div>
                      <h4 className="ann-title">하이브리드 근무 운영 가이드라인 v3 배포</h4>
                      <p className="ann-desc">주 2회 출근 원칙은 유지되며, 팀 합의에 따라 변경 가능합니다.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 32,
                  padding: "0 4px",
                  fontFamily: "var(--mono)",
                  fontSize: 10.5,
                  color: "var(--ink-4)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                <span>modle · 사내 지식 AI</span>
                <span>v2.1.0 · 2026.05.28</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
