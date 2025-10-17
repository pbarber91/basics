// lib/auth.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db"; // see optional singleton below (or use new PrismaClient())
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  // IMPORTANT: Credentials requires JWT strategy in v5
  session: { strategy: "jwt" },
    trustHost: true,

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user) return null;
        const ok = await bcrypt.compare(creds.password, user.password);
        if (!ok) return null;

        // Return a minimal user object for the JWT
        return { id: user.id, email: user.email, name: user.name, role: user.role } as any;
      },
    }),
  ],

  pages: { signIn: "/signin" },

  callbacks: {
    // Put role into the JWT
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role ?? "USER";
      return token;
    },
    // Expose role on the session
    async session({ session, token }) {
      if (session.user && token?.role) (session.user as any).role = token.role;
      return session;
    },
     async redirect({ url, baseUrl }) {
    // Allow relative URLs
    if (url.startsWith("/")) return `${baseUrl}${url}`;
    // Allow same-origin absolute URLs
    try {
      const u = new URL(url);
      if (u.origin === baseUrl) return url;
    } catch {}
    // Fallback after sign-in/sign-out
    return `${baseUrl}/program`;
  },
  },
};

export const { auth, handlers: { GET, POST } } = NextAuth(authOptions);
