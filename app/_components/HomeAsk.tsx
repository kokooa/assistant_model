"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { I } from "@/app/_components/icons";
import { logout } from "@/app/_actions/session";
import type { SearchHit } from "@/lib/rag";

interface RailUser {
  name: string | null;
  email: string;
  department: string | null;
}

// 왼쪽 레일의 대화 기록 세션 (localStorage 저장).
interface SessionMeta {
  id: string;
  title: string;
  updatedAt: number;
}
const SESS_KEY = "modle.sessions";
const sessKey = (id: string) => `modle.session.${id}`;

function relTime(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return d === 1 ? "어제" : `${d}일 전`;
}

type Phase = "search" | "ground" | "write";

interface Msg {
  who: "user" | "ai";
  text: string;
  hits?: SearchHit[];
  done?: boolean;
  phase?: Phase;
}

// 추천 질문 (대기화면 2×2 그리드)
const RECO: { cat: string; q: string }[] = [
  { cat: "근태", q: "연차 휴가는 다음 해로 이월할 수 있나요?" },
  { cat: "경비", q: "법인카드 정산은 어떤 절차로 진행하나요?" },
  { cat: "IT 지원", q: "사내 VPN 접속이 안 될 때 어떻게 하나요?" },
  { cat: "복지", q: "재택근무는 어떻게 신청하나요?" },
];

// 출처는 상위 N건만 먼저 보여주고 나머지는 펼치기.
const SRC_PREVIEW = 2;

// 이어서 물어보기 (답변 하단)
const FOLLOWUPS = [
  "이월된 연차는 언제까지 써야 하나요?",
  "연차를 수당으로 정산받을 수 있나요?",
  "팀 리드 승인은 어떻게 요청하나요?",
];

// 문서 타입 → 짧은 mono 태그
function srcTag(type: string): string {
  return (type || "DOC").toUpperCase().slice(0, 6);
}

// 답변 본문: 줄 단위 문단 + [n] 위첨자 인용 + **강조** 하이라이트.
function renderAnswer(text: string): ReactNode {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((line, li) => (
      <p key={li}>
        {line.split(/(\[\d+\]|\*\*[^*]+\*\*)/g).map((part, pi) => {
          const cite = part.match(/^\[(\d+)\]$/);
          if (cite) return <sup key={pi} className="cite-sup">{cite[1]}</sup>;
          const bold = part.match(/^\*\*([^*]+)\*\*$/);
          if (bold) return <mark key={pi} className="mark-hl">{bold[1]}</mark>;
          return <span key={pi}>{part}</span>;
        })}
      </p>
    ));
}

// 추론 과정 드롭다운 (완료 후) — 실제 처리 흐름을 단계로 표시.
function ReasonTrace({ hits, open, onToggle }: { hits: SearchHit[]; open: boolean; onToggle: () => void }) {
  const steps = [
    "질문 의도 분석",
    "사내 문서 검색",
    `관련 근거 ${hits.length}건 선별`,
    "출처 기반 답변 작성",
  ];
  return (
    <div className={`reason${open ? " open" : ""}`}>
      <button className="reason-head" onClick={onToggle}>
        <span className="reason-check">{I.check({ size: 13 })}</span>
        <span className="reason-title">추론 과정 · {steps.length}단계</span>
        <span className="reason-chev">{I.chevron({ size: 14 })}</span>
      </button>
      {open && (
        <div className="reason-body">
          {steps.map((s, i) => (
            <div className="reason-step" key={i}>
              <span className="reason-n">{i + 1}</span>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HomeAsk({ user = null }: { user?: RailUser | null }) {
  const seed = useSearchParams().get("q");
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [openReason, setOpenReason] = useState<Set<number>>(new Set());
  const [openSrc, setOpenSrc] = useState<Set<number>>(new Set());
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const seeded = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || sending) return;
    setQ("");
    setSending(true);
    if (!currentId) setCurrentId(globalThis.crypto?.randomUUID?.() ?? `s${Date.now()}`);
    setMessages((m) => [...m, { who: "user", text: t }, { who: "ai", text: "", hits: [], done: false, phase: "search" }]);

    const patchAi = (patch: Partial<Msg>) =>
      setMessages((m) => {
        const copy = m.slice();
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].who === "ai") {
            copy[i] = { ...copy[i], ...patch };
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
          if (ev.type === "sources") patchAi({ hits: ev.hits ?? [], phase: "ground" });
          else if (ev.type === "delta") {
            if (!answer) patchAi({ phase: "write" });
            answer += ev.text ?? "";
            patchAi({ text: answer });
          } else if (ev.type === "error") {
            answer += `${answer ? "\n\n" : ""}⚠️ ${ev.message ?? "LLM 호출 실패"}`;
            patchAi({ text: answer });
          }
        }
      }
      patchAi({ done: true });
    } catch {
      patchAi({ text: "LLM에 연결하지 못했어요. Ollama가 실행 중인지 확인해 주세요.", done: true });
    } finally {
      setSending(false);
    }
  };

  // 마지막 답변 다시 생성: 직전 질문/답변 쌍을 지우고 같은 질문을 재요청.
  const regenerate = (question: string) => {
    if (sending || !question.trim()) return;
    setMessages((m) => {
      const copy = m.slice();
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].who === "ai") { copy.splice(i, 1); break; }
      }
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].who === "user") { copy.splice(i, 1); break; }
      }
      return copy;
    });
    send(question);
  };

  const copyText = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500);
    } catch {
      /* 클립보드 접근 불가 시 무시 */
    }
  };

  const toggleReason = (i: number) =>
    setOpenReason((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const toggleSrc = (i: number) =>
    setOpenSrc((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  // 새 대화 시작 (현재 화면 비우기)
  const newChat = () => {
    if (sending) return;
    setMessages([]);
    setCurrentId(null);
    setQ("");
    setOpenReason(new Set());
    setOpenSrc(new Set());
  };

  // 기록된 세션 열기
  const openSession = (id: string) => {
    if (sending || id === currentId) return;
    try {
      const raw = localStorage.getItem(sessKey(id));
      setMessages(raw ? JSON.parse(raw) : []);
    } catch {
      setMessages([]);
    }
    setCurrentId(id);
    setOpenReason(new Set());
    setOpenSrc(new Set());
  };

  // 세션 삭제
  const deleteSession = (id: string) => {
    try {
      localStorage.removeItem(sessKey(id));
    } catch {
      /* noop */
    }
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem(SESS_KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
    if (id === currentId) {
      setMessages([]);
      setCurrentId(null);
    }
  };

  // 세션 인덱스 로드 (최초 1회)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESS_KEY);
      if (raw) setSessions(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, []);

  // 한 턴이 끝나면(전송 중 아님 + 현재 세션 존재) 메시지 저장 + 인덱스 갱신
  useEffect(() => {
    if (!currentId || sending || messages.length === 0) return;
    try {
      localStorage.setItem(sessKey(currentId), JSON.stringify(messages));
      const title = messages.find((m) => m.who === "user")?.text.slice(0, 40) || "새 대화";
      setSessions((prev) => {
        const next = [
          { id: currentId, title, updatedAt: Date.now() },
          ...prev.filter((s) => s.id !== currentId),
        ].sort((a, b) => b.updatedAt - a.updatedAt);
        try {
          localStorage.setItem(SESS_KEY, JSON.stringify(next));
        } catch {
          /* noop */
        }
        return next;
      });
    } catch {
      /* noop */
    }
  }, [messages, sending, currentId]);

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

  const inputBox = (
    <div className="ask-input">
      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send(q);
          }
        }}
        placeholder="무엇이든 물어보세요"
        rows={1}
      />
      <button className="ask-send" onClick={() => send(q)} disabled={!q.trim() || sending} aria-label="보내기">
        {I.arrowUp({ size: 16, stroke: 2.2 })}
      </button>
    </div>
  );

  return (
    <div className="ask-shell">
      <aside className="ask-rail">
        <button className="rail-new" onClick={newChat} disabled={sending}>
          <span className="rail-new-ic">{I.plus({ size: 15 })}</span> 새 대화
        </button>
        <div className="rail-label">대화 기록</div>
        {sessions.length === 0 ? (
          <div className="rail-empty">아직 대화 기록이 없어요.</div>
        ) : (
          <nav className="rail-list">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`rail-sess${s.id === currentId ? " active" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => openSession(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") openSession(s.id);
                }}
              >
                <span className="rail-sess-main">
                  <span className="rail-sess-t">{s.title}</span>
                  <span className="rail-sess-time">{relTime(s.updatedAt)}</span>
                </span>
                <span
                  className="rail-sess-x"
                  role="button"
                  tabIndex={-1}
                  aria-label="삭제"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(s.id);
                  }}
                >
                  ×
                </span>
              </div>
            ))}
          </nav>
        )}
        <div className="rail-acct">
          {user && (
            <div className="rail-acct-id">
              <span className="rail-acct-avatar">
                {(user.name ?? user.email).charAt(0).toUpperCase()}
              </span>
              <span className="rail-acct-info">
                <span className="rail-acct-name">{user.name ?? user.email}</span>
                {(user.department ?? (user.name ? user.email : null)) && (
                  <span className="rail-acct-sub">
                    {user.department ?? user.email}
                  </span>
                )}
              </span>
            </div>
          )}
          <div className="rail-acct-actions">
            <Link className="rail-acct-btn" href="/settings">
              {I.settings({ size: 15 })} 설정
            </Link>
            <form action={logout}>
              <button type="submit" className="rail-acct-btn">
                {I.lock({ size: 15 })} 로그아웃
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="ask">
      <header className="ask-hdr">
        <div className="ask-brand">
          <span className="ask-brand-mark">{I.sparkle({ size: 16 })}</span>
          <span className="ask-brand-wm">
            <span className="ask-brand-name">AI 어시스턴트</span>
            <span className="ask-brand-sub">사내 지식 기반</span>
          </span>
        </div>
        <span className="ask-status"><span className="ask-status-dot" /> 온라인</span>
      </header>

      {!hasChat ? (
        <div className="ask-body">
          <div className="ask-hero">
            <span className="ask-hero-mark">{I.sparkle({ size: 28 })}</span>
            <h1 className="ask-title">
              <em>무엇이든</em> 물어보세요<span className="ask-title-dot">.</span>
            </h1>
            <p className="ask-sub">
              사내 규정·제도·업무 매뉴얼에서 찾아 <strong>출처와 함께</strong> 답해드려요.
            </p>

            <div className="ask-reco-label">추천 질문</div>
            <div className="ask-grid">
              {RECO.map((r) => (
                <button key={r.q} className="ask-card" onClick={() => send(r.q)}>
                  <span className="ask-cat"><span className="ask-cat-dot" />{r.cat}</span>
                  <span className="ask-card-q">{r.q}</span>
                </button>
              ))}
            </div>

            <div className="ask-input-wrap">{inputBox}</div>
            <div className="ask-foot">{I.shield({ size: 13 })} 답변마다 출처를 함께 표시합니다</div>
          </div>
        </div>
      ) : (
        <>
          <div className="ask-body">
            <div className="ask-thread">
              {messages.map((m, i) => {
                if (m.who === "user") {
                  return <div key={i} className="ask-q">{m.text}</div>;
                }

                const isLast = i === messages.length - 1;
                const stepN = m.hits?.length ?? 0;
                return (
                  <div key={i} className="ask-a">
                    <span className="ask-a-mark">{I.sparkle({ size: 15 })}</span>
                    <div className="ask-a-main">
                      <div className="ask-a-head">
                        <span className="ans-name">AI 어시스턴트</span>
                        <span className="ans-tag">사내 지식 기반</span>
                      </div>

                      {!m.done ? (
                        <div className="reason-live">
                          <span className="typing"><i /><i /><i /></span>
                          {m.phase === "write"
                            ? "답변을 작성하는 중…"
                            : m.phase === "ground"
                            ? `근거 ${stepN}건을 정리하는 중…`
                            : "사내 문서를 찾는 중…"}
                        </div>
                      ) : (
                        <ReasonTrace hits={m.hits ?? []} open={openReason.has(i)} onToggle={() => toggleReason(i)} />
                      )}

                      {m.text && <div className="ask-body-text">{renderAnswer(m.text)}</div>}

                      {m.done && m.hits && m.hits.length > 0 && (() => {
                        const srcOpen = openSrc.has(i);
                        const shown = srcOpen ? m.hits! : m.hits!.slice(0, SRC_PREVIEW);
                        const rest = m.hits!.length - SRC_PREVIEW;
                        return (
                          <div className="ask-src">
                            <div className="ask-mini-label">출처 {m.hits!.length}건</div>
                            <div className="src-list">
                              {shown.map((h, hi) => {
                                const inner = (
                                  <>
                                    <span className="src-n">{hi + 1}</span>
                                    <span className="src-info">
                                      <span className="src-t">{h.title}</span>
                                      <span className="src-m">
                                        {h.heading}
                                        {h.locked ? " · 제한" : ""} · 관련도 {Math.round(h.score * 100)}%
                                      </span>
                                    </span>
                                    <span className="src-tag">{srcTag(h.type)}</span>
                                  </>
                                );
                                return h.path ? (
                                  <a
                                    className="src-card"
                                    key={`${h.docId}-${hi}`}
                                    href={h.path}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={`${h.title} — Notion에서 열기`}
                                  >
                                    {inner}
                                    <span className="src-go">{I.link({ size: 13 })}</span>
                                  </a>
                                ) : (
                                  <div className="src-card" key={`${h.docId}-${hi}`}>{inner}</div>
                                );
                              })}
                            </div>
                            {rest > 0 && (
                              <button
                                className={`src-more${srcOpen ? " open" : ""}`}
                                onClick={() => toggleSrc(i)}
                              >
                                <span>{srcOpen ? "출처 접기" : `출처 ${rest}건 더 보기`}</span>
                                <span className="src-more-chev">{I.chevron({ size: 14 })}</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {m.done && m.text && (
                        <div className="ans-actions">
                          <button className="ans-act" onClick={() => copyText(m.text, i)}>
                            {copiedIdx === i ? I.check({ size: 13 }) : I.copy({ size: 13 })}
                            {copiedIdx === i ? "복사됨" : "복사"}
                          </button>
                          {isLast && (
                            <button
                              className="ans-act"
                              onClick={() => regenerate(messages[i - 1]?.text ?? "")}
                              disabled={sending}
                            >
                              {I.refresh({ size: 13 })} 다시 생성
                            </button>
                          )}
                        </div>
                      )}

                      {m.done && isLast && !sending && (
                        <div className="ask-fu">
                          <div className="ask-mini-label">이어서 물어보기</div>
                          <div className="fu-list">
                            {FOLLOWUPS.map((f) => (
                              <button key={f} className="fu-item" onClick={() => send(f)}>
                                <span className="fu-plus">{I.plus({ size: 14 })}</span>
                                <span>{f}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          </div>
          <div className="ask-dock">
            <div className="ask-dock-inner">{inputBox}</div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
