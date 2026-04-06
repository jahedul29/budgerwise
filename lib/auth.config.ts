import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

function getUserKey(email?: string | null) {
  return email?.trim().toLowerCase() ?? null;
}

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userKey as string | undefined) ?? session.user.email?.trim().toLowerCase() ?? token.sub!;
      }
      return session;
    },
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;
      const userKey = getUserKey(email);

      if (userKey) {
        token.userKey = userKey;
      }

      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
} satisfies NextAuthConfig;
