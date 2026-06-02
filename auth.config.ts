import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";
import Google from "next-auth/providers/google";

// Edge-safe: prisma 등 Node-only 모듈 의존 금지. middleware 에서 이 설정으로 NextAuth 를 생성한다.
// DB 가 필요한 jwt callback / Credentials provider 는 auth.ts 에서 확장한다.
const ALLOWED_DOMAIN = "jocodingax.ai";

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { hd: ALLOWED_DOMAIN } },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
    signIn({ user, profile }) {
      const email = (user.email ?? profile?.email)?.toLowerCase();
      return !!email && email.split("@")[1] === ALLOWED_DOMAIN;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as Role | undefined;
        session.user.department = (token.department as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
