import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/server/db";
import { verifyPassword } from "@/server/auth/password";
import { rateLimit, ipFromHeaders } from "@/server/rate-limit";

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

const credsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const ip = request ? ipFromHeaders(request.headers) : "unknown";
        const okIp = await rateLimit(`login:ip:${ip}`, 30, 15 * 60);
        const okEmail = await rateLimit(`login:email:${email}`, 8, 15 * 60);
        if (!okIp || !okEmail) throw new RateLimited();

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || user.disabledAt) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;
        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.role = (user as { role?: string }).role ?? "CUSTOMER";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
