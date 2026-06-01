"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  const [val, setVal] = useState(value ?? "");
  // 서버에서 새로 받은 값으로 동기화. 같은 row 가 unmount 안 되더라도 표시값이 stale 되지 않게.
  useEffect(() => { setVal(value ?? ""); }, [value]);

  return (
    <form ref={formRef} action={(fd) => start(() => updateUserDepartmentAction(fd))}>
      <input type="hidden" name="userId" value={userId} />
      <select
        name="departmentId"
        value={val}
        disabled={pending}
        className="set-tbl-select"
        onChange={(e) => {
          setVal(e.target.value);
          formRef.current?.requestSubmit();
        }}
      >
        <option value="">—</option>
        {options.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
    </form>
  );
}
