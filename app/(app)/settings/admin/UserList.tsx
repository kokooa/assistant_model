"use client";

import { useMemo, useState, useTransition } from "react";
import { batchUpdateUsersAction } from "@/app/_actions/admin";

interface DeptOption { id: string; name: string }
interface UserRow {
  id: string;
  name: string;
  email: string;
  departmentId: string | null;
  role: string;
  avatarGrad: string;
}

const ROLES = [
  { value: "ADMIN", label: "관리자" },
  { value: "DEPT_ADMIN", label: "부서 관리자" },
  { value: "MEMBER", label: "구성원" },
];

interface Draft {
  role: string;
  departmentId: string; // "" === 부서 없음
}

export function UserList({ users, depts }: { users: UserRow[]; depts: DeptOption[] }) {
  const initial = useMemo<Record<string, Draft>>(
    () => Object.fromEntries(users.map((u) => [u.id, { role: u.role, departmentId: u.departmentId ?? "" }])),
    [users]
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const dirty = users.filter((u) => {
    const d = drafts[u.id];
    if (!d) return false;
    return d.role !== u.role || d.departmentId !== (u.departmentId ?? "");
  });

  function update(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setMsg(null);
  }

  function reset() {
    setDrafts(initial);
    setMsg(null);
  }

  function save() {
    if (dirty.length === 0) return;
    const changes = dirty.map((u) => ({
      id: u.id,
      role: drafts[u.id].role,
      departmentId: drafts[u.id].departmentId,
    }));
    const fd = new FormData();
    fd.set("changes", JSON.stringify(changes));
    start(async () => {
      try {
        await batchUpdateUsersAction(fd);
        setMsg(`${dirty.length}명 저장 완료`);
      } catch (e) {
        setMsg(`저장 실패: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }

  return (
    <section className="ac-card">
      <div className="ac-card-head">
        <div className="ac-title">
          <span className="ac-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M17 8.5a3 3 0 0 1 0 5.8M19.5 20a5.6 5.6 0 0 0-3.5-5" /></svg>
          </span>
          유저
        </div>
        <div className="ac-userlist-actions">
          <span className="ac-lbl">총 {users.length}명{dirty.length > 0 ? ` · 변경 ${dirty.length}` : ""}</span>
          {dirty.length > 0 && !pending && (
            <button type="button" className="ac-btn-link" onClick={reset}>되돌리기</button>
          )}
          <button
            type="button"
            className="ac-btn ac-btn-acc ac-btn-sm"
            onClick={save}
            disabled={pending || dirty.length === 0}
          >
            {pending ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
      <div className="ac-card-body">
        {msg && <div className="ac-userlist-msg">{msg}</div>}
        <div className="ac-uhead"><span>이름 / 이메일</span><span>부서</span><span>역할</span></div>
        {users.map((u) => {
          const d = drafts[u.id];
          const isDirty = d.role !== u.role || d.departmentId !== (u.departmentId ?? "");
          return (
            <div className={"ac-urow" + (isDirty ? " is-dirty" : "")} key={u.id}>
              <div className="ac-uperson">
                <div className="ac-uava" style={{ background: u.avatarGrad }}>
                  {(u.name ?? u.email).trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="ac-uname">{u.name}</div>
                  <div className="ac-umail">{u.email}</div>
                </div>
              </div>
              <div className="ac-sel-wrap">
                <select
                  className="ac-sel"
                  value={d.departmentId}
                  onChange={(e) => update(u.id, { departmentId: e.target.value })}
                  disabled={pending}
                >
                  <option value="">—</option>
                  {depts.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="ac-sel-wrap">
                <select
                  className={"ac-sel" + (d.role === "ADMIN" ? " is-admin" : "")}
                  value={d.role}
                  onChange={(e) => update(u.id, { role: e.target.value })}
                  disabled={pending}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
