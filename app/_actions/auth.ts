"use server";

import { signIn } from "@/auth";

// dev 환경 한정 가짜 로그인. NODE_ENV==='production' 에서는 auth.ts 에 'dev' provider
// 자체가 등록되지 않아 호출해도 실패한다.
export async function devSignIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  await signIn("dev", { email, redirectTo: "/" });
}
