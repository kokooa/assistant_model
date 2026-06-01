"use client";

import { useState, useTransition } from "react";
import { syncNotionAction } from "@/app/_actions/admin";

interface DeptOption { id: string; name: string }

const Refresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-3.5-7.1" />
    <path d="M21 4v5h-5" />
  </svg>
);

export function SyncControl({
  depts,
  defaultRoot,
  lastSyncLabel,
  totalChunks,
}: {
  depts: DeptOption[];
  defaultRoot: string;
  lastSyncLabel: string;
  totalChunks: number;
}) {
  const [scope, setScope] = useState("GLOBAL");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          try {
            await syncNotionAction(fd);
            setMsg("백그라운드에서 시작됐어요. 서버 콘솔에서 진행 확인.");
          } catch (e) {
            setMsg(`실행 실패: ${e instanceof Error ? e.message : String(e)}`);
          }
        })
      }
    >
      <div className="ac-sync-grid">
        <div className="ac-fld-group">
          <span className="ac-lbl-mono">Scope</span>
          <div className="ac-sel-wrap">
            <select
              name="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="ac-sel"
              disabled={pending}
            >
              <option value="GLOBAL">전체 공개 (GLOBAL)</option>
              <option value="DEPARTMENT">부서 한정 (DEPARTMENT)</option>
            </select>
          </div>
        </div>
        <div className="ac-fld-group">
          <span className="ac-lbl-mono">부서</span>
          <div className="ac-sel-wrap">
            <select
              name="department"
              defaultValue=""
              className="ac-sel"
              disabled={pending || scope !== "DEPARTMENT"}
            >
              <option value="">— 선택 —</option>
              {depts.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="ac-fld-group" style={{ marginTop: 14 }}>
        <span className="ac-lbl-mono">Root Page ID (선택)</span>
        <input
          type="text"
          name="rootPageId"
          placeholder={defaultRoot ? `${defaultRoot} (env 기본값)` : "예: 36f9f1fe-1a6d-..."}
          className="ac-field ac-root-id"
          disabled={pending}
        />
      </div>

      <p className="ac-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
        비워두면 환경변수 NOTION_ROOT_PAGE_ID 기본값을 사용해요.
      </p>

      <div className="ac-sync-foot">
        <button type="submit" className="ac-btn ac-btn-dark" disabled={pending}>
          <Refresh /> {pending ? "시작 중…" : "동기화 실행"}
        </button>
        <span className="ac-last">
          마지막 동기화 <b>{lastSyncLabel}</b> · {totalChunks} 조각
        </span>
        {msg && <span className="ac-last" style={{ color: "var(--ac-ink-3)" }}>{msg}</span>}
      </div>
    </form>
  );
}
