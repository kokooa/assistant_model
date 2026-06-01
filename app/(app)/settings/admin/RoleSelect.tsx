"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateUserRoleAction } from "@/app/_actions/admin";

const ROLES = [
  { value: "ADMIN", label: "관리자" },
  { value: "DEPT_ADMIN", label: "부서 관리자" },
  { value: "MEMBER", label: "구성원" },
];

export function RoleSelect({ userId, value }: { userId: string; value: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);

  return (
    <form ref={formRef} action={(fd) => start(() => updateUserRoleAction(fd))}>
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        value={val}
        disabled={pending}
        className="set-tbl-select"
        onChange={(e) => {
          setVal(e.target.value);
          formRef.current?.requestSubmit();
        }}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
    </form>
  );
}
