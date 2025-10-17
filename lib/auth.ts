// lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import bcrypt from "bcryptjs";

// Keep auth on Node runtime so bcrypt/Prisma are happy
export const runtime = "nodejs";

type Role = "ADMIN" | "LEADER" | "USER";

const config = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" as const },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = (creds?.email ?? "").toString().toLowerCase().trim();
        const password = (creds?.password ?? "").toString();
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, password: true, role: true },
        });
        if (!user || !user.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          role: (user.role ?? "USER") as Role,
        } as unknown as Record<string, unknown>;
      },
    }),
  ],

  callbacks: {
    // Type the destructured params explicitly to avoid implicit any
    async jwt(
      {
        token,
        user,
      }: {
        token: Record<string, unknown>;
        user?: Record<string, unknown> | null;
      }
    ) {
      if (user) {
        token["role"] = (user["role"] as Role | undefined) ?? "USER";
      }
      return token;
    },

    async session(
      {
        session,
        token,
      }: {
        session: { user?: Record<string, unknown> | null };
        token: Record<string, unknown>;
      }
    ) {
      if (session.user) {
        session.user["role"] = (token["role"] as Role | undefined) ?? "USER";
      }
      return session;
    },

    async redirect(
      {
        url,
        baseUrl,
      }: {
        url: string;
        baseUrl: string;
      }
    ) {
      try {
        const u = new URL(url);
        const b = new URL(baseUrl);
        if (u.origin === b.origin) return url;
        return baseUrl;
      } catch {
        return baseUrl;
      }
    },
  },

  pages: {
    signIn: "/signin",
  },
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(config);
