import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/auth";
import authConfig from "./auth.config";

// 회사 Google 클라이언트가 로컬에 없을 때 권한별 UI 검증용. NODE_ENV!=='production' 만 활성.
const ALLOWED_DOMAIN = "jocodingax.ai";
const isDevEnv = process.env.NODE_ENV !== "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
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
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token }) {
      if (token.email && token.role === undefined) {
        // 회사 도메인 로그인 시 자동 upsert. ADMIN_EMAILS 에 있는 이메일만 부트스트랩 ADMIN.
        const dbUser = await ensureUser(token.email, token.name);
        token.role = dbUser.role;
        token.department = dbUser.department?.name ?? null;
        if (dbUser.name) token.name = dbUser.name;
      }
      return token;
    },
  },
});
