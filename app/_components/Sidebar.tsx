"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, type NavItem } from "../_data/mock";
import { I } from "./icons";

function isActive(pathname: string, href: string): boolean {
  const base = href.split("?")[0];
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(base + "/");
}

export function Sidebar() {
  const pathname = usePathname();

  const groups = {
    workspace: NAV.filter((n) => n.group === "workspace"),
    knowledge: NAV.filter((n) => n.group === "knowledge"),
    more: NAV.filter((n) => n.group === "more"),
  };

  const item = (n: NavItem) => (
    <Link
      key={n.id}
      href={n.href}
      className="nav-item"
      aria-current={isActive(pathname, n.href) ? "true" : undefined}
    >
      <span className="nav-ic">{I[n.icon]({ size: 17, stroke: 1.6 })}</span>
      <span className="nav-label">{n.label}</span>
      {n.badge && <span className="nav-badge">{n.badge}</span>}
    </Link>
  );

  // 항목이 없는 섹션은 헤더를 숨긴다.
  const section = (label: string, items: NavItem[]) =>
    items.length > 0 ? (
      <>
        <div className="sb-section">{label}</div>
        {items.map(item)}
      </>
    ) : null;

  return (
    <aside className="sb">
      <div className="sb-head">
        <div className="brand-mark">m</div>
        <div className="brand-wm">
          modle<small>사내 지식 AI</small>
        </div>
      </div>

      <nav className="sb-nav">
        {section("워크스페이스", groups.workspace)}
        {section("지식", groups.knowledge)}
        {section("더보기", groups.more)}
      </nav>

      <div className="sb-foot">
        <div className="org">
          <div className="org-logo">AX</div>
          <div className="org-info">
            <div className="org-name">우리회사</div>
            <div className="org-tier">
              <span className="dot-ok" /> 임직원 4,820명
            </div>
          </div>
          <span className="sb-chev">{I.chevron({ size: 14 })}</span>
        </div>
        <div className="security-strip">
          {I.shield({ size: 13 })}
          <span>사내 전용 · 암호화 · 권한 인식</span>
        </div>
      </div>
    </aside>
  );
}
