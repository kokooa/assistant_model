"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [val, setVal] = useState(value ?? "");
  useEffect(() => { setVal(value ?? ""); }, [value]);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          await updateUserDepartmentAction(fd);
          // revalidatePath 만으로는 같은 페이지에 머무는 client 의 RSC tree 가
          // 일관되게 새로고침되지 않는 케이스가 있어서 명시 호출.
          router.refresh();
        })
      }
    >
      <input type="hidden" name="userId" value={userId} />
      <select
        // value prop 변화 시 instance 자체를 새로 만들어 stale 표시값을 차단.
        key={value ?? "_"}
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
