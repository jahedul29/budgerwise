import { useEffect, useState } from 'react';
import type { UserRole } from '@/types';

let cachedRole: UserRole | null = null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(cachedRole);

  useEffect(() => {
    if (cachedRole) {
      setRole(cachedRole);
      return;
    }

    fetch('/api/auth/role')
      .then((res) => res.json())
      .then((data) => {
        const r = data?.role ?? 'user';
        cachedRole = r;
        setRole(r);
      })
      .catch(() => setRole('user'));
  }, []);

  const isAdmin = role === 'superadmin' || role === 'admin' || role === 'manager';
  const isSuperAdmin = role === 'superadmin';

  return { role, isAdmin, isSuperAdmin };
}
