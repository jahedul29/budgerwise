'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

type CachedUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

const CACHE_KEY = 'budgetwise_cached_user';

function readCachedUser(): CachedUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedUser;
  } catch {
    return null;
  }
}

function writeCachedUser(user: CachedUser) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(user));
  } catch {
    // Ignore storage quota/private mode issues.
  }
}

export function clearCachedUserProfile() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}

export function useStableUser() {
  const { data: session, status } = useSession();
  const [cachedUser, setCachedUser] = useState<CachedUser | null>(null);

  useEffect(() => {
    setCachedUser(readCachedUser());
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    const nextUser: CachedUser = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    };

    setCachedUser(nextUser);
    writeCachedUser(nextUser);
  }, [session?.user]);

  const user = useMemo(() => {
    if (session?.user) return session.user;
    return cachedUser ?? null;
  }, [session?.user, cachedUser]);

  return {
    user,
    userId: user?.id,
    status,
    hasLiveSession: Boolean(session?.user),
  };
}
