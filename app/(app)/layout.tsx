import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Shell } from "@/app/_components/Shell";

// 앱 본체는 Shell(사이드바·헤더·⌘K)로 감싼다. /login 은 이 그룹 밖이라 Shell 없이 풀스크린.
// 비로그인은 여기서 /login 으로 redirect. (Next.js 16 + Turbopack 과 middleware 가 충돌해 layout 단 보호로 우회.)
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <Shell>{children}</Shell>;
}
