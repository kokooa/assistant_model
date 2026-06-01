"use client";

import { updateUserDepartmentAction } from "@/app/_actions/admin";

interface DeptOption { id: string; name: string }

// form action 에 server action 을 직접 prop 으로 — Next 가 FormData 를 자동 전달한다.
// select 는 uncontrolled(defaultValue) + key={value} 로 prop 변화 시 instance 가 새로
// mount 되어 stale 표시값을 차단. useTransition wrapper 와 controlled state 를 끼우면
// 같은 row 에서 빠른 두 번 변경 시 stale 사용자 선택값으로 submit 되는 경우가 있어 제거.
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
      <select
        key={value ?? "_"}
        name="departmentId"
        defaultValue={value ?? ""}
        className="set-tbl-select"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">—</option>
        {options.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
    </form>
  );
}
