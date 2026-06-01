"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { I, type IconName } from "./icons";

interface CmdItem {
  grp: string;
  ic: IconName;
  label: string;
  meta: string;
  action?: () => void;
}

export function CmdPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const go = (href: string) => {
    router.push(href);
    onClose();
  };
  const ask = (text: string) => go(`/?q=${encodeURIComponent(text)}`);

  const items: CmdItem[] = (
    [
      {
        grp: "물어보기",
        ic: "sparkle",
        label: q ? `modle에게 물어보기: "${q}"` : "새 대화 시작하기",
        meta: "↵",
        action: () => (q ? ask(q) : go("/")),
      },
      { grp: "이동", ic: "home", label: "홈으로", meta: "G H", action: () => go("/") },
      { grp: "이동", ic: "settings", label: "설정", meta: "G S", action: () => go("/settings") },
      { grp: "추천 질문", ic: "umbrella", label: "출산휴가는 며칠이야?", meta: "", action: () => ask("출산휴가는 며칠이야?") },
      { grp: "추천 질문", ic: "doc", label: "재택근무 신청 어떻게 해?", meta: "", action: () => ask("재택근무 신청 어떻게 해?") },
      { grp: "추천 질문", ic: "calendar", label: "연차 이월 되나요?", meta: "", action: () => ask("연차 이월 되나요?") },
    ] as CmdItem[]
  ).filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase()));

  const grouped: Record<string, CmdItem[]> = {};
  items.forEach((i) => {
    (grouped[i.grp] ||= []).push(i);
  });

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.action?.();
    }
  };

  let idx = -1;
  return (
    <div className="cmd-back" onClick={onClose}>
      <div className="cmd" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input">
          {I.search({ size: 16 })}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder="물어보거나 어디로든 이동하세요…"
          />
          <span className="ai-pill">AI</span>
          <span className="kbd">esc</span>
        </div>
        <div className="cmd-list">
          {Object.entries(grouped).map(([grp, list]) => (
            <div key={grp}>
              <div className="cmd-grp">{grp}</div>
              {list.map((i) => {
                idx++;
                const me = idx;
                return (
                  <div
                    key={me}
                    className={`cmd-item ${me === active ? "active" : ""}`}
                    onMouseEnter={() => setActive(me)}
                    onClick={() => i.action?.()}
                  >
                    <span className="cmd-ic">{I[i.ic]({ size: 15 })}</span>
                    <span>{i.label}</span>
                    <span className="cmd-meta">{i.meta}</span>
                  </div>
                );
              })}
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)", fontSize: 13 }}>
              일치하는 항목이 없어요. Enter를 누르면 modle에게 물어봐요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
