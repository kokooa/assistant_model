"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CmdPalette } from "./CmdPalette";

export function Shell({ children }: { children: ReactNode }) {
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
