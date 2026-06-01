"use client";

import { updateUserDepartmentAction } from "@/app/_actions/admin";

interface DeptOption { id: string; name: string }

export function DepartmentSelect({
  userId,
  value,
  options,
}: {
  userId: string;
  value: string | null;
  options: DeptOption[];
}) {
  return (
    <form action={updateUserDepartmentAction}>
      <input type="hidden" name="userId" value={userId} />
      <div className="ac-sel-wrap">
        <select
          key={value ?? "_"}
          name="departmentId"
          defaultValue={value ?? ""}
          className="ac-sel"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          <option value="">—</option>
          {options.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
    </form>
  );
}
