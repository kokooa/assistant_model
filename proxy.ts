import { NextResponse } from "next/server";
import { auth } from "@/auth";

// 페이지 보호: 미로그인 시 /login 으로. /api 는 각 라우트가 자체 401 처리하므로 제외.
// 임시 데모 우회: AUTH_BYPASS=1 이면 로그인 게이트 비활성화. 다듬기 끝나면 env 제거.
export default process.env.AUTH_BYPASS === "1" ? () => NextResponse.next() : auth;

export const config = {
  matcher: ["/((?!api|login|_next/static|_next/image|favicon.ico).*)"],
};
