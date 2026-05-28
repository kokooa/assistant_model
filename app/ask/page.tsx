import { Suspense } from "react";
import { Assistant } from "../_components/Assistant";

export default function AskPage() {
  return (
    <Suspense fallback={null}>
      <Assistant />
    </Suspense>
  );
}
