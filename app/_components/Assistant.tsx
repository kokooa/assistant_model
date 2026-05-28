"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { I } from "./icons";
import {
  THREADS_TODAY,
  THREADS_WEEK,
  THREADS_OLDER,
  SOURCES,
  PERMS,
  FOLLOWUPS,
  type Thread,
} from "../_data/mock";

interface ChatMessage {
  who: "user" | "ai";
  text?: string;
  body?: ReactNode;
  stamp: string;
}

function nowStamp(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function Cite({ n }: { n: number }) {
  return <span className="cite">{n}</span>;
}

function initialMessages(): ChatMessage[] {
  return [
    {
      who: "user",
      text: "출산휴가는 며칠이고 어떻게 신청해? 분할해서 쓸 수도 있어?",
      stamp: "09:31",
    },
    {
      who: "ai",
      stamp: "09:31",
      body: (
        <>
          <p>
            사내 휴가 규정 기준으로 정리하면 이렇습니다. 모두 내가 열람 권한이 있는
            정책 문서에서 찾은 내용이에요.
          </p>

          <h4>
            출산휴가 일수 <Cite n={1} />
            <Cite n={2} />
          </h4>
          <ul>
            <li>
              출산 전후로 <strong>총 90일</strong>(다태아는 120일)이 보장돼요.
              출산 후에 <strong>최소 45일</strong>(다태아 60일) 이상 배치돼야 해요.
            </li>
            <li>
              <strong>분할 사용 가능</strong> — 출산 예정일 44일 전부터 일부를 미리 쓸 수 있어요.
              단, 출산일 이후 연속 기간 요건은 지켜야 해요. <Cite n={1} />
            </li>
            <li>
              최초 60일은 <strong>통상임금 100% 유급</strong>, 이후 30일은 고용보험에서 지원돼요.
              <Cite n={2} />
            </li>
          </ul>

          <h4>신청 방법</h4>
          <ul>
            <li>
              근태 시스템 <code>attendance/leave</code>에서 &ldquo;출산휴가&rdquo;를 선택하고 예정일을 입력해요. <Cite n={4} />
            </li>
            <li>출산 예정일 <strong>30일 전</strong>까지 팀장 승인 요청을 올리는 걸 권장해요. <Cite n={3} /></li>
            <li>증빙(출산 예정 확인서 또는 출생증명서)은 시스템에 첨부하면 돼요.</li>
          </ul>

          <p>
            배우자 출산휴가(10일)는 별도 제도예요. 이어서 안내해 드릴까요?
          </p>
        </>
      ),
    },
  ];
}

function simulateReply(prompt: string): ChatMessage {
  return {
    who: "ai",
    stamp: nowStamp(),
    body: (
      <>
        <p>
          질문 주신 내용을 사내 정책 문서에서 찾아봤어요. 권한 범위 안의 문서만 참고했어요.
        </p>
        <ul>
          <li>배우자 출산휴가는 <strong>10일</strong>(유급)이고, 1회 분할 사용이 가능해요. <Cite n={1} /></li>
          <li>출산일로부터 <strong>90일 이내</strong>에 신청해야 해요. <Cite n={3} /></li>
          <li>근태 시스템에서 &ldquo;배우자 출산휴가&rdquo;로 신청하면 돼요. <Cite n={4} /></li>
        </ul>
        <p>관련 규정 원문을 오른쪽 출처에서 바로 열어볼 수 있어요. 더 궁금한 점이 있나요?</p>
      </>
    ),
  };
}

function ThreadItem({ t, active, onClick }: { t: Thread; active: boolean; onClick: () => void }) {
  return (
    <div className="thread" aria-current={active ? "true" : undefined} onClick={onClick}>
      <div className="thread-info">
        <div className="thread-title">{t.title}</div>
        <div className="thread-snip">{t.snippet}</div>
      </div>
      <span className="thread-dept">{t.cat}</span>
    </div>
  );
}

function RelBar({ val }: { val: number }) {
  return (
    <div style={{ width: 40, height: 3, background: "var(--line)", borderRadius: 2, marginTop: 4 }}>
      <div style={{ width: `${val * 100}%`, height: "100%", background: "var(--acc)", borderRadius: 2 }} />
    </div>
  );
}

function Message({ m }: { m: ChatMessage }) {
  if (m.who === "user") {
    return (
      <div className="msg user">
        <div className="msg-av">JK</div>
        <div>
          <div className="msg-name">
            준 김 <span className="stamp">{m.stamp}</span>
          </div>
          <div className="msg-body">
            {m.text?.split("\n").map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="msg ai">
      <div className="msg-av">m</div>
      <div>
        <div className="msg-name">
          modle
          <span className="stamp">{m.stamp}</span>
          <span className="conf">
            <span className="conf-bar">
              <i className="on" /><i className="on" /><i className="on" /><i className="on" /><i />
            </span>
            높은 신뢰도
          </span>
        </div>
        <div className="msg-body">{m.body}</div>
        <div className="msg-actions">
          <button className="msg-action" title="도움돼요">{I.thumbsUp({ size: 14 })}</button>
          <button className="msg-action" title="아쉬워요">{I.thumbsDown({ size: 14 })}</button>
          <button className="msg-action" title="복사">{I.copy({ size: 14 })}</button>
          <button className="msg-action" title="다시 생성">{I.refresh({ size: 14 })}</button>
          <button className="msg-action" title="공유">{I.link({ size: 14 })}</button>
        </div>
      </div>
    </div>
  );
}

export function Assistant() {
  const params = useSearchParams();
  const seed = params.get("q");

  const [thread, setThread] = useState("t1");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages());
  const chatRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    if (seed) {
      setDraft(seed);
      textRef.current?.focus();
    }
  }, [seed]);

  useEffect(() => {
    const t = textRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 200) + "px";
  }, [draft]);

  const send = () => {
    const text = draft.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { who: "user", text, stamp: nowStamp() }]);
    setDraft("");
    setSending(true);
    setTimeout(() => {
      setMessages((m) => [...m, simulateReply(text)]);
      setSending(false);
    }, 1400);
  };

  const lastIsAi = messages.length > 0 && messages[messages.length - 1].who === "ai";

  return (
    <div className="asst" data-layout="3pane">
      {/* LEFT */}
      <aside className="asst-l">
        <div className="asst-l-head">
          <div className="asst-l-title">대화</div>
          <button
            className="btn"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => {
              setMessages(initialMessages());
              setThread("new");
              textRef.current?.focus();
            }}
          >
            {I.plus({ size: 14 })} 새 대화
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          <div className="thread-grp">오늘</div>
          {THREADS_TODAY.map((t) => (
            <ThreadItem key={t.id} t={t} active={thread === t.id} onClick={() => setThread(t.id)} />
          ))}
          <div className="thread-grp">이번 주</div>
          {THREADS_WEEK.map((t) => (
            <ThreadItem key={t.id} t={t} active={thread === t.id} onClick={() => setThread(t.id)} />
          ))}
          <div className="thread-grp">이전</div>
          {THREADS_OLDER.map((t) => (
            <ThreadItem key={t.id} t={t} active={thread === t.id} onClick={() => setThread(t.id)} />
          ))}
        </div>
      </aside>

      {/* CENTER */}
      <main className="asst-c">
        <div className="asst-c-head">
          <div className="mode-pill">
            <span className="mode-glyph">m</span>
            modle
            {I.chevron({ size: 13 })}
          </div>
          <span className="chip">{I.umbrella({ size: 12 })} HR · 휴가</span>
          <span className="chip">{I.lock({ size: 11 })} 권한 인식</span>
          <span className="chip"><span className="dot-ok" /> 문서 47개 색인됨</span>
          <div style={{ flex: 1 }} />
          <button className="ic-btn" title="기록">{I.clock({ size: 16 })}</button>
          <button className="ic-btn" title="공유">{I.link({ size: 16 })}</button>
          <button className="ic-btn" title="더보기">{I.dots({ size: 16 })}</button>
        </div>

        <div className="chat" ref={chatRef}>
          <div className="chat-inner">
            {messages.map((m, i) => (
              <Message key={i} m={m} />
            ))}
            {sending && (
              <div className="msg ai">
                <div className="msg-av">m</div>
                <div>
                  <div className="msg-name">
                    modle <span className="stamp">검색 중…</span>
                  </div>
                  <div className="msg-body">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-3)", fontSize: 13 }}>
                      <span className="typing"><i /><i /><i /></span>
                      <span>HR 정책 문서 4건을 살펴보고 있어요…</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {!sending && lastIsAi && (
          <div className="suggest-row">
            {FOLLOWUPS.map((f) => (
              <button key={f} className="prompt-chip" onClick={() => setDraft(f)}>
                {f}
              </button>
            ))}
          </div>
        )}

        <div className="composer-wrap">
          <div className="composer">
            <div className="composer-top">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--acc)" }}>
                {I.sparkle({ size: 12 })} modle · HR · 휴가
              </span>
              <span style={{ color: "var(--ink-4)" }}>·</span>
              <span>내가 접근 가능한 사내 정보로만 답해요</span>
              <span style={{ flex: 1 }} />
              <span className="kbd">⇧↵ 줄바꿈</span>
            </div>
            <textarea
              ref={textRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="사내 정보를 물어보세요 — 휴가, 근무 규정, 복지, 문서…"
              rows={1}
            />
            <div className="composer-bar">
              <button className="ic-btn" title="첨부">{I.paperclip({ size: 16 })}</button>
              <button className="ic-btn" title="소스 지정">{I.database({ size: 16 })}</button>
              <button className="ic-btn" title="음성">{I.mic({ size: 16 })}</button>
              <span className="chip" style={{ marginLeft: 4 }}>
                {I.cpu({ size: 11 })} axhub LLM · 사내
              </span>
              <div className="spacer" />
              <span style={{ fontSize: 11, color: "var(--ink-4)", marginRight: 8 }}>{draft.length}/8000</span>
              <button className="send-btn" onClick={send} disabled={!draft.trim() || sending}>
                {I.arrowUp({ size: 15, stroke: 2.2 })}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* RIGHT */}
      <aside className="asst-r">
        <div className="r-sec">
          <div className="r-sec-title">
            <span>출처 · {SOURCES.length}</span>
            <button className="btn btn-ghost" style={{ height: 22, padding: "0 6px", fontSize: 11 }}>
              {I.filter({ size: 11 })}
            </button>
          </div>
          {SOURCES.map((s) => (
            <div key={s.n} className="src">
              <div className="src-num">{s.n}</div>
              <div>
                <div className="src-title">{s.title}</div>
                <div className="src-meta">
                  <span>{s.type}</span>
                  <span>·</span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
                    {s.path}
                  </span>
                  {s.locked && <span className="lock">{I.lock({ size: 10 })}</span>}
                </div>
              </div>
              <div className="src-rel">
                <div style={{ textAlign: "right" }}>{Math.round(s.rel * 100)}%</div>
                <RelBar val={s.rel} />
              </div>
            </div>
          ))}
        </div>

        <div className="r-sec">
          <div className="r-sec-title">권한 범위</div>
          <div className="perm-list">
            {PERMS.map((p, i) => (
              <div key={i} className="perm">
                <span className="perm-check">{I.check({ size: 13 })}</span>
                <div>
                  <div>{p.label}</div>
                  <div className="perm-meta">{p.scope}</div>
                </div>
                <span className="tag ok">열람 가능</span>
              </div>
            ))}
          </div>
        </div>

        <div className="r-sec" style={{ flex: 1 }}>
          <div className="r-sec-title">신뢰도</div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", padding: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 500 }}>높음</div>
              <div className="conf-bar">
                <i className="on" /><i className="on" /><i className="on" /><i className="on" /><i />
              </div>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, margin: "8px 0 0" }}>
              인용한 출처 4건 중 3건이 HR이 관리하는 공식 휴가 규정 문서이고, 최근 60일 내 검토됐어요.
            </p>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="r-sec-title" style={{ margin: "0 0 8px" }}>관련</div>
            <div className="src" style={{ padding: "6px 0" }}>
              <span style={{ color: "var(--ink-3)", marginTop: 2 }}>{I.folder({ size: 14 })}</span>
              <div>
                <div className="src-title">임직원 핸드북 — 휴가</div>
                <div className="src-meta"><span>28쪽 · 색인됨</span></div>
              </div>
              <span style={{ color: "var(--ink-4)" }}>{I.chevronRight({ size: 12 })}</span>
            </div>
            <div className="src" style={{ padding: "6px 0" }}>
              <span style={{ color: "var(--ink-3)", marginTop: 2 }}>{I.umbrella({ size: 14 })}</span>
              <div>
                <div className="src-title">출산·육아 지원 가이드</div>
                <div className="src-meta"><span>FY26 · People Ops</span></div>
              </div>
              <span style={{ color: "var(--ink-4)" }}>{I.chevronRight({ size: 12 })}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
