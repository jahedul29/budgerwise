/**
 * Auth fixtures — fake session cookie & mock session endpoint.
 *
 * We intercept the NextAuth session endpoint so the client-side code
 * believes a user is logged in without hitting a real OAuth provider.
 */

export interface MockUser {
  id: string;
  name: string;
  email: string;
  image: string;
  role: 'superadmin' | 'admin' | 'manager' | 'user';
}

export const TEST_USER: MockUser = {
  id: 'test-user-001',
  name: 'Test User',
  email: 'testuser@budgetwise.app',
  image: '',
  role: 'user',
};

export const TEST_ADMIN: MockUser = {
  id: 'test-admin-001',
  name: 'Admin User',
  email: 'admin@budgetwise.app',
  image: '',
  role: 'admin',
};

export const TEST_SUPERADMIN: MockUser = {
  id: 'test-superadmin-001',
  name: 'Super Admin',
  email: 'superadmin@budgetwise.app',
  image: '',
  role: 'superadmin',
};

export function sessionPayload(user: MockUser) {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
