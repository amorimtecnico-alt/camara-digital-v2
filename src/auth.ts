import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { env } from "@/lib/env";
import { getInternalUserByEmail, validateCredentialsUser } from "@/modules/auth/user-access";

export const { auth, handlers, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "");
        const password = String(credentials?.password ?? "");
        const result = await validateCredentialsUser(email, password);

        if (!result.user) {
          return null;
        }

        return {
          email: result.user.email,
          id: result.user.id,
          name: result.user.name,
          role: result.user.role,
        };
      },
    }),
    Google({
      clientId: env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === "google") {
        const email = profile?.email ?? user.email;
        const internalUser = email ? await getInternalUserByEmail(email) : null;

        if (!internalUser) {
          return "/login?error=Seu%20e-mail%20foi%20autenticado%20com%20Google,%20mas%20n%C3%A3o%20possui%20acesso%20ao%20sistema.";
        }

        if (!internalUser.active) {
          return "/login?error=Seu%20usu%C3%A1rio%20est%C3%A1%20inativo.%20Procure%20um%20administrador.";
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;

      if (email) {
        const internalUser = await getInternalUserByEmail(email);

        if (internalUser) {
          token.email = internalUser.email;
          token.name = internalUser.name;
          token.role = internalUser.role;
          token.sub = internalUser.id;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email ?? session.user.email ?? "";
        session.user.id = token.sub ?? "";
        session.user.name = token.name ?? session.user.name ?? "";
        session.user.role = typeof token.role === "string" ? token.role : "";
      }

      return session;
    },
  },
  secret: env.AUTH_SECRET,
});

