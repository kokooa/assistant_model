import type { ReactNode } from "react";
import { Shell } from "@/app/_components/Shell";

// 앱 본체는 Shell(사이드바·헤더·⌘K)로 감싼다. /login 은 이 그룹 밖이라 Shell 없이 풀스크린.
export default function AppLayout({ children }: { children: ReactNode }) {
  return <Shell>{children}</Shell>;
}
