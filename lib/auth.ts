// lib/auth.ts
import NextAuth from "next-auth";
import type { AuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import bcrypt from "bcryptjs";

// Optional, to avoid Edge warnings when using bcrypt/Prisma
export const runtime = "nodejs";

type Role = "ADMIN" | "LEADER" | "USER";

const authConfig = {
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
          // We need password + role for auth; `password` should exist in your schema
          select: { id: true, email: true, name: true, password: true, role: true },
        });

        if (!user || !user.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        // return *only* what NextAuth needs on the User object, include role for callbacks
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
      // On sign in, copy role from returned user -> token
      if (user) {
        (token as Record<string, unknown>)["role"] =
          (user as Record<string, unknown>)["role"] ?? "USER";
      }
      return token;
    },

    async session({ session, token }) {
      // Expose role onto the session.user object
      if (session.user) {
        (session.user as Record<string, unknown>)["role"] =
          (token as Record<string, unknown>)["role"] ?? "USER";
      }
      return session;
    },

    // Optional: keep redirects tidy
    async redirect({ url, baseUrl }) {
      try {
        const u = new URL(url);
        const b = new URL(baseUrl);
        // allow same-origin or relative
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
} satisfies AuthConfig;

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);
