import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { adminDb, isFirebaseAdminConfigured } from './firebase-admin';

export const { handlers, signIn, signOut, auth } = NextAuth({
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
