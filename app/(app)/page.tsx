import { Suspense } from "react";
import { HomeAsk } from "@/app/_components/HomeAsk";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeAsk />
    </Suspense>
  );
}
