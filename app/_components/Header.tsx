"use client";

import { usePathname } from "next/navigation";
import { I } from "./icons";

const TITLES: Record<string, string> = {
  "/": "홈",
  "/ask": "물어보기",
  "/sources": "지식 소스",
};

export function Header({ onOpenCmd }: { onOpenCmd: () => void }) {
  const pathname = usePathname();
  const crumb = TITLES[pathname] ?? "홈";

  return (
    <header className="hdr">
      <div className="hdr-crumbs">
        {I.building({ size: 14 })}
        <span>modle</span>
        <span className="sep">/</span>
        <strong>{crumb}</strong>
      </div>

      <div
        className="search-bar"
        role="button"
        tabIndex={0}
        onClick={onOpenCmd}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpenCmd();
        }}
      >
        <span className="sb-ic">{I.search({ size: 15 })}</span>
        <input
          readOnly
          placeholder="무엇이든 사내 정보로 물어보세요 — 휴가, 규정, 문서…"
          onClick={(e) => {
            e.preventDefault();
            onOpenCmd();
          }}
        />
        <span className="ai-pill">AI</span>
        <span className="kbd">⌘K</span>
      </div>

      <div className="hdr-right">
        <span className="hdr-status">
          <span className="dot-ai" /> AI 온라인
        </span>
        <button className="ic-btn" title="알림">
          {I.bell({ size: 17 })}
          <span className="dot" />
        </button>
        <div className="avatar">JK</div>
      </div>
    </header>
  );
}
