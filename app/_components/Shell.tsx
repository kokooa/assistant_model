"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CmdPalette } from "./CmdPalette";

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // 물어보기(홈)·설정은 사이드바·전역 헤더 없이 풀폭 독립 화면.
  if (pathname === "/" || pathname === "/settings") {
    return (
      <>
        {children}
        {cmdOpen && <CmdPalette onClose={() => setCmdOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="app" data-sb="glass">
        <Sidebar />
        <div className="main">
          <Header onOpenCmd={() => setCmdOpen(true)} />
          {children}
        </div>
      </div>
      {cmdOpen && <CmdPalette onClose={() => setCmdOpen(false)} />}
    </>
  );
}
