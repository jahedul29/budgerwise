import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserRole } from '@/lib/admin';

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ role: 'user' });
  }

  const role = await getUserRole(email);
  return NextResponse.json({ role });
}
