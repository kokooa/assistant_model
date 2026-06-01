import { auth } from "@/auth";

// 페이지 보호: 미로그인 시 /login 으로. /api 는 각 라우트가 자체 401 처리하므로 제외.
export default auth;

export const config = {
  matcher: ["/((?!api|login|_next/static|_next/image|favicon.ico).*)"],
};
