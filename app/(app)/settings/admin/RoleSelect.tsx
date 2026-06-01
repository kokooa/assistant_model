"use client";

import { updateUserRoleAction } from "@/app/_actions/admin";

const ROLES = [
  { value: "ADMIN", label: "관리자" },
  { value: "DEPT_ADMIN", label: "부서 관리자" },
  { value: "MEMBER", label: "구성원" },
];

export function RoleSelect({ userId, value }: { userId: string; value: string }) {
  return (
    <form action={updateUserRoleAction}>
      <input type="hidden" name="userId" value={userId} />
      <select
        key={value}
        name="role"
        defaultValue={value}
        className="set-tbl-select"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
    </form>
  );
}
