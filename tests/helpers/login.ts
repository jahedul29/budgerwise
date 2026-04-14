/**
 * Login helper — navigates to a page with mocked auth context.
 *
 * Since we intercept the NextAuth session endpoint, we don't need a real
 * login flow. We just set up mocks and navigate.
 */

import { type Page } from '@playwright/test';
import { type MockUser } from '../fixtures/auth';
import { mockAuth } from './mock-api';

/**
 * Navigate to a page as a logged-in user.
 * Sets up auth mocks before navigation so the layout server component
 * doesn't redirect to /login.
 *
 * NOTE: Since the app layout is a server component that calls `auth()`,
 * we intercept the session at the network level. The server-side `auth()`
 * reads cookies, not our route mock — so the dev server must be configured
 * to allow test access, OR we test pages that handle auth client-side.
 *
 * For E2E tests that mock API routes, we navigate and let the client-side
 * hooks (`useStableUser`, `useUserRole`) consume our mocked endpoints.
 */
export async function loginAndNavigate(
  page: Page,
  user: MockUser,
  path: string,
) {
  await mockAuth(page, user);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}
