import { auth } from './auth';
import { adminDb, isFirebaseAdminConfigured } from './firebase-admin';
import type { UserRole } from '@/types';

/** Get a user's role from Firestore */
export async function getUserRole(email: string | null | undefined): Promise<UserRole> {
  if (!email) return 'user';
  if (!isFirebaseAdminConfigured || !adminDb) return 'user';

  const normalizedEmail = email.trim().toLowerCase();
  const doc = await adminDb.collection('users').doc(normalizedEmail).get();
  if (!doc.exists) return 'user';

  const role = doc.data()?.role;
  if (role === 'superadmin' || role === 'admin' || role === 'manager') return role;
  return 'user';
}

/** Require at least manager-level access. Returns session + role or null. */
export async function requireAdmin(): Promise<{
  user: { id?: string; email?: string | null; name?: string | null; image?: string | null };
  role: UserRole;
} | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!session?.user || !email) return null;

  const role = await getUserRole(email);
  if (role === 'user') return null;

  return { user: session.user, role };
}

/** Require superadmin role (for role management) */
export async function requireSuperAdmin(): Promise<{
  user: { id?: string; email?: string | null; name?: string | null; image?: string | null };
  role: UserRole;
} | null> {
  const result = await requireAdmin();
  if (!result) return null;
  if (result.role !== 'superadmin') return null;
  return result;
}
