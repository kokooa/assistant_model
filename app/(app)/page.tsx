import { Suspense } from "react";
import { HomeAsk } from "@/app/_components/HomeAsk";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const u = session?.user;
  const user = u?.email
    ? { name: u.name ?? null, email: u.email, department: u.department ?? null }
    : null;

  return (
    <Suspense fallback={null}>
      <HomeAsk user={user} />
    </Suspense>
  );
}
