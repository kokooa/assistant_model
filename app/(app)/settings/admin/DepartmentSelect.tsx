"use client";

import { useRef, useTransition } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  return (
    <form ref={formRef} action={(fd) => start(() => updateUserDepartmentAction(fd))}>
      <input type="hidden" name="userId" value={userId} />
      <select
        name="departmentId"
        defaultValue={value ?? ""}
        disabled={pending}
        className="set-tbl-select"
        onChange={() => formRef.current?.requestSubmit()}
      >
        <option value="">—</option>
        {options.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
    </form>
  );
}
