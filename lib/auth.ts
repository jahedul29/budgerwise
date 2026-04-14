import NextAuth from 'next-auth';
import type { Session } from 'next-auth';
import { cookies } from 'next/headers';
import { authConfig } from './auth.config';
import { adminDb, isFirebaseAdminConfigured } from './firebase-admin';

const E2E_AUTH_COOKIE = 'bw_e2e_auth';

type E2EAuthUser = {
  id: string;
  name: string;
  email: string;
  image: string;
  role?: 'superadmin' | 'admin' | 'manager' | 'user';
};

function isE2EAuthEnabled() {
  return process.env.NODE_ENV !== 'production';
}

export async function getE2EAuthUser(): Promise<E2EAuthUser | null> {
  if (!isE2EAuthEnabled()) return null;

  const cookieStore = await cookies();
  const raw = cookieStore.get(E2E_AUTH_COOKIE)?.value;
  if (!raw) return null;

  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as Partial<E2EAuthUser>;
    if (!parsed.email || !parsed.id || !parsed.name) return null;

    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
      image: parsed.image ?? '',
      role: parsed.role ?? 'user',
    };
  } catch {
    return null;
  }
}

const nextAuth = NextAuth({
  ...authConfig,
  events: {
    async signIn({ user }) {
      if (!isFirebaseAdminConfigured || !adminDb || !user?.email) return;

      const userKey = user.email.trim().toLowerCase();
      const userRef = adminDb.collection('users').doc(userKey);
      const doc = await userRef.get();
      const now = new Date().toISOString();

      if (doc.exists) {
        // Update profile fields on every login
        await userRef.set({
          name: user.name ?? null,
          email: user.email,
          avatar: user.image ?? null,
          lastLoginAt: now,
          updatedAt: now,
        }, { merge: true });
      } else {
        // First-time user — create the profile document
        await userRef.set({
          name: user.name ?? null,
          email: user.email,
          avatar: user.image ?? null,
          aiAssistantEnabled: false,
          aiEntitlementType: 'locked',
          aiTrialAvailable: true,
          aiTrialStartedAt: null,
          aiTrialConsumedAt: null,
          aiTrialTokenLimit: null,
          aiTrialTokensUsed: 0,
          createdAt: now,
          lastLoginAt: now,
          updatedAt: now,
        });
      }
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;

export async function auth(): Promise<Session | null> {
  const e2eUser = await getE2EAuthUser();
  if (e2eUser) {
    return {
      user: {
        id: e2eUser.id,
        name: e2eUser.name,
        email: e2eUser.email,
        image: e2eUser.image,
        role: e2eUser.role,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as Session;
  }

  return nextAuth.auth();
}
