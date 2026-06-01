import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Google OAuth (axhub 규약: GOOGLE_CLIENT_ID/SECRET 을 env 로 읽음 — 배포 시 axhub 가
// 회사 관리 자격증명을 주입). 회사 도메인(jocodingax.ai)만 허용. 부서/역할은 DB User 에서.
const ALLOWED_DOMAIN = "jocodingax.ai";

// dev 환경(NODE_ENV!=='production') 한정으로, 시드된 이메일만 통과시키는 가짜 로그인.
// 회사 Google 클라이언트를 로컬에 셋업하지 못한 상태에서 권한별 UI 검증용.
const isDevEnv = process.env.NODE_ENV !== "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { hd: ALLOWED_DOMAIN } },
    }),
    ...(isDevEnv
      ? [
          Credentials({
            id: "dev",
            name: "Dev",
            credentials: { email: { label: "email", type: "text" } },
            async authorize(credentials) {
              const email = String(credentials?.email ?? "").toLowerCase();
              if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) return null;
              const user = await prisma.user.findUnique({ where: { email } });
              if (!user) return null;
              return { id: user.id, email: user.email, name: user.name };
            },
          }),
        ]
      : []),
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
    async jwt({ token }) {
      if (token.email && token.role === undefined) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          include: { department: true },
        });
        token.role = dbUser?.role ?? "MEMBER";
        token.department = dbUser?.department?.name ?? null;
        if (dbUser?.name) token.name = dbUser.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as Role | undefined;
        session.user.department = (token.department as string | null) ?? null;
      }
      return session;
    },
  },
});
