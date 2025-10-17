// lib/auth.ts
import NextAuth from "next-auth";
import type { NextAuthConfig, User, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { AdapterUser } from "@auth/core/adapters";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import bcrypt from "bcryptjs";

// Ensure Node runtime (Prisma + bcrypt don't work on Edge)
export const runtime = "nodejs";

type Role = "ADMIN" | "LEADER" | "USER";

const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

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

        // Return a shape that includes role; NextAuth will merge onto JWT
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          role: (user.role ?? "USER") as Role,
        } as unknown as User; // minimal cast so callbacks get `user.role`
      },
    }),
  ],

  callbacks: {
    // Params typed for NextAuth v5
    async jwt({
      token,
      user,
    }: {
      token: JWT;
      user?: AdapterUser | User | null;
    }): Promise<JWT> {
      // On sign-in, propagate role from `user` to the token
      if (user) {
        (token as Record<string, unknown>)["role"] =
          ((user as unknown as Record<string, unknown>)["role"] as Role | undefined) ?? "USER";
      }
      return token;
    },

    async session({
      session,
      token,
      user, // not used for JWT sessions, but part of the signature
    }: {
      session: Session;
      token: JWT;
      user: AdapterUser | User | undefined;
      newSession?: unknown;
      trigger?: "update";
    }): Promise<Session> {
      if (session.user) {
        (session.user as Record<string, unknown>)["role"] =
          ((token as unknown as Record<string, unknown>)["role"] as Role | undefined) ?? "USER";
      }
      return session;
    },

    async redirect({
      url,
      baseUrl,
    }: {
      url: string;
      baseUrl: string;
    }): Promise<string> {
      try {
        const u = new URL(url);
        const b = new URL(baseUrl);
        return u.origin === b.origin ? url : baseUrl;
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
