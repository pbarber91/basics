// lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import bcrypt from "bcryptjs";

// Use Node runtime so bcrypt/Prisma don't hit Edge warnings
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

        // include role for jwt callback
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
    async jwt({ token, user }) {
      if (user) {
        (token as Record<string, unknown>)["role"] =
          (user as Record<string, unknown>)["role"] ?? "USER";
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>)["role"] =
          (token as Record<string, unknown>)["role"] ?? "USER";
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
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
