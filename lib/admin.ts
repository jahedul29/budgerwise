import { auth } from './auth';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase();

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!ADMIN_EMAIL || !email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

export async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email;
  if (!session?.user || !isAdminEmail(email)) {
    return null;
  }
  return session;
}
