"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { logout } from "@/app/_actions/session";
import type { SearchHit } from "@/lib/rag";
import "./workspace.css";

interface RailUser {
  name: string | null;
  email: string;
  department: string | null;
}

type Phase = "search" | "ground" | "write";

interface Msg {
  who: "user" | "ai";
  text: string;
  hits?: SearchHit[];
  done?: boolean;
  phase?: Phase;
}

interface SessionMeta { id: string; title: string; updatedAt: number }
const SESS_KEY = "modle.sessions";
const sessKey = (id: string) => `modle.session.${id}`;

const SUGGESTIONS: { cat: string; color: string; q: string }[] = [
  { cat: "근태", color: "var(--cat-attend)", q: "연차 휴가는 다음 해로 이월할 수 있나요?" },
  { cat: "경비", color: "var(--cat-expense)", q: "법인카드 정산은 어떤 절차로 진행하나요?" },
  { cat: "IT 지원", color: "var(--cat-it)", q: "사내 VPN 접속이 안 될 때 어떻게 하나요?" },
  { cat: "복지", color: "var(--cat-welfare)", q: "재택근무는 어떻게 신청하나요?" },
];

const FOLLOWUPS = [
  "이월된 연차는 언제까지 써야 하나요?",
  "연차를 수당으로 정산받을 수 있나요?",
  "팀 리드 승인은 어떻게 요청하나요?",
];

const Sparkle = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.9 5.2a4 4 0 0 0 2.4 2.4L21.5 12l-5.2 1.9a4 4 0 0 0-2.4 2.4L12 21.5l-1.9-5.2a4 4 0 0 0-2.4-2.4L2.5 12l5.2-1.9a4 4 0 0 0 2.4-2.4L12 2.5z" /></svg>
);
const Ico = {
  plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  gear: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" /></svg>,
  logoutIc: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>,
  shield: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" /></svg>,
  send: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>,
};

function relTime(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return d === 1 ? "어제" : `${d}일 전`;
}

function renderAnswer(text: string): ReactNode {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((line, li) => (
      <p key={li}>
        {line.split(/(\[\d+\]|\*\*[^*]+\*\*)/g).map((part, pi) => {
          const cite = part.match(/^\[(\d+)\]$/);
          if (cite) return <sup key={pi} className="ws-cite-sup">{cite[1]}</sup>;
          const bold = part.match(/^\*\*([^*]+)\*\*$/);
          if (bold) return <mark key={pi} className="ws-mark-hl">{bold[1]}</mark>;
          return <span key={pi}>{part}</span>;
        })}
      </p>
    ));
}

export function HomeAsk({ user = null }: { user?: RailUser | null }) {
  const seed = useSearchParams().get("q");
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const seeded = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

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
          try { ev = JSON.parse(line); } catch { continue; }
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
      patchAi({ text: "LLM에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.", done: true });
    } finally {
      setSending(false);
    }
  };

  const newChat = () => {
    if (sending) return;
    setMessages([]);
    setCurrentId(null);
    setQ("");
  };

  const openSession = (id: string) => {
    if (sending || id === currentId) return;
    try {
      const raw = localStorage.getItem(sessKey(id));
      setMessages(raw ? JSON.parse(raw) : []);
    } catch {
      setMessages([]);
    }
    setCurrentId(id);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESS_KEY);
      if (raw) setSessions(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

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
        try { localStorage.setItem(SESS_KEY, JSON.stringify(next)); } catch { /* noop */ }
        return next;
      });
    } catch { /* noop */ }
  }, [messages, sending, currentId]);

  useEffect(() => {
    if (seed && !seeded.current) {
      seeded.current = true;
      send(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(q);
  };

  const initial = (user?.name ?? user?.email ?? "?").trim().charAt(0).toUpperCase();
  const hasMessages = messages.length > 0;

  return (
    <div className="workspace">
      <div className="ws-app">
        {/* Sidebar */}
        <aside className="ws-sb">
          <button className="ws-new" onClick={newChat} disabled={sending}>
            <Ico.plus /> 새 대화
          </button>

          <div className="ws-sec">대화 기록</div>
          {sessions.length === 0 && (
            <div style={{ padding: "12px", fontSize: 12, color: "var(--ink-4)", lineHeight: 1.5 }}>
              아직 기록이 없어요.<br />질문하면 자동으로 저장돼요.
            </div>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              className={"ws-conv" + (s.id === currentId ? " active" : "")}
              onClick={() => openSession(s.id)}
            >
              <div className="t">{s.title}</div>
              <div className="m">{relTime(s.updatedAt)}</div>
            </button>
          ))}

          <div className="ws-sb-foot">
            {user && (
              <div className="ws-me">
                <div className="ava">{initial}</div>
                <div>
                  <div className="n">{user.name ?? user.email}</div>
                  <div className="d">{user.department ?? "—"}</div>
                </div>
              </div>
            )}
            <div className="ws-me-actions">
              <Link href="/settings" className="ws-me-btn"><Ico.gear /> 설정</Link>
              <form action={logout} style={{ display: "contents" }}>
                <button type="submit" className="ws-me-btn"><Ico.logoutIc /> 로그아웃</button>
              </form>
            </div>
          </div>
        </aside>

        {/* Main */}
        <section className="ws-main">
          <div className="ws-main-bg" />
          <header className="ws-hdr">
            <div className="ws-hdr-brand">
              <span className="mark"><Sparkle /></span>
              <div>
                <div className="bt">AI 어시스턴트</div>
                <div className="bs">사내 지식 기반</div>
              </div>
            </div>
            <div className="ws-online"><span className="dot" /> 온라인</div>
          </header>

          <div className="ws-body" ref={bodyRef}>
            {hasMessages ? (
              <div className="ws-msgs">
                {messages.map((m, i) => (
                  m.who === "user" ? (
                    <div key={i} className="ws-msg-user">{m.text}</div>
                  ) : (
                    <div key={i} className="ws-msg-ai">
                      {!m.done && !m.text && (
                        <span className="ws-phase">
                          {m.phase === "search" && "사내 문서 검색 중…"}
                          {m.phase === "ground" && "근거 정리 중…"}
                          {m.phase === "write" && "답변 작성 중…"}
                        </span>
                      )}
                      {m.text && renderAnswer(m.text)}
                      {m.hits && m.hits.length > 0 && (
                        <div className="ws-srcs">
                          <div className="ws-srcs-head">출처 {m.hits.length}건</div>
                          {m.hits.map((h, hi) => (
                            <a
                              key={hi}
                              className="ws-src"
                              href={h.path || "#"}
                              target={h.path?.startsWith("http") ? "_blank" : undefined}
                              rel="noreferrer"
                            >
                              <span className="ws-src-n">{hi + 1}</span>
                              <span className="ws-src-body">
                                <span className="ws-src-title">{h.title} {h.heading && `· ${h.heading}`}</span>
                                <span className="ws-src-meta">
                                  {h.type}{h.locked ? " · 제한" : ""} · 관련도 {Math.round(h.score * 100)}%
                                </span>
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                      {m.done && i === messages.length - 1 && (
                        <div className="ws-followups">
                          {FOLLOWUPS.map((f) => (
                            <button key={f} className="ws-followup" onClick={() => send(f)} disabled={sending}>
                              {f}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div className="ws-center">
                <div className="ws-bigmark"><Sparkle /></div>
                <h1 className="ws-greet"><span className="em">무엇이든</span> 물어보세요<span className="dot">.</span></h1>
                <p className="ws-greet-sub">사내 규정·제도·업무 매뉴얼에서 찾아 <b>출처와 함께</b> 답해드려요.</p>

                <div className="ws-sug-lbl"><span className="dot" /> 추천 질문</div>
                <div className="ws-sugs">
                  {SUGGESTIONS.map((s) => (
                    <button key={s.q} className="ws-sug" onClick={() => send(s.q)} disabled={sending}>
                      <div className="cat"><span className="d" style={{ background: s.color }} />{s.cat}</div>
                      <div className="q">{s.q}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="ws-composer">
            <form onSubmit={onSubmit} className="ws-composer-inner">
              <div className="ws-input-box">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="무엇이든 물어보세요"
                  disabled={sending}
                />
                <button type="submit" className="ws-send" disabled={sending || !q.trim()}>
                  <Ico.send />
                </button>
              </div>
              <p className="ws-composer-note"><Ico.shield /> 답변마다 출처를 함께 표시합니다</p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
