"use client";

import { useState, useTransition } from "react";
import { syncNotionAction } from "@/app/_actions/admin";

interface DeptOption { id: string; name: string }

export function SyncControl({
  depts,
  defaultRoot,
}: {
  depts: DeptOption[];
  defaultRoot: string;
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
            setMsg("동기화 작업이 백그라운드에서 시작됐어요. 진행 로그는 서버 콘솔(axhub log)에서 확인.");
          } catch (e) {
            setMsg(`실행 실패: ${e instanceof Error ? e.message : String(e)}`);
          }
        })
      }
      className="set-sync-form"
    >
      <div className="set-sync-row">
        <label className="set-sync-field">
          <span className="set-sync-k">scope</span>
          <select
            name="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="set-tbl-select"
            disabled={pending}
          >
            <option value="GLOBAL">전체 공개 (GLOBAL)</option>
            <option value="DEPARTMENT">부서 전용 (DEPARTMENT)</option>
          </select>
        </label>

        <label className="set-sync-field">
          <span className="set-sync-k">부서</span>
          <select
            name="department"
            defaultValue=""
            className="set-tbl-select"
            disabled={pending || scope !== "DEPARTMENT"}
          >
            <option value="">— 선택 —</option>
            {depts.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="set-sync-field">
        <span className="set-sync-k">root page id (선택)</span>
        <input
          type="text"
          name="rootPageId"
          placeholder={defaultRoot ? `${defaultRoot} (env 기본값)` : "예: 23a1b2c3d4e5..."}
          className="set-tbl-input"
          disabled={pending}
        />
      </label>

      <div className="set-sync-actions">
        <button type="submit" className="set-tbl-btn" disabled={pending}>
          {pending ? "시작 중…" : "동기화 실행"}
        </button>
        {msg && <span className="set-sync-msg">{msg}</span>}
      </div>
    </form>
  );
}
