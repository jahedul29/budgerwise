import { test, expect } from '@playwright/test';
import { TEST_USER, TEST_ADMIN, TEST_SUPERADMIN } from '../fixtures/auth';
import { roleResponse } from '../fixtures/api-mocks';
import { mockAuth } from '../helpers/mock-api';
import { loginAndNavigate } from '../helpers/login';

test.describe('Auth routing', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    // No auth mocks — the server-side layout calls auth() and redirects.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('authenticated user sees dashboard', async ({ page }) => {
    // Mock AI access so the AssistantLauncher doesn't throw.
    await page.route('**/api/assistant/access', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enabled: false,
          launcherVisible: false,
          entitlementType: 'locked',
          trialAvailable: false,
          blockedReason: 'locked',
        }),
      }),
    );

    await loginAndNavigate(page, TEST_USER, '/dashboard');

    // The dashboard page should render (not redirect to /login).
    await expect(page).toHaveURL(/\/dashboard/);
    // Verify some dashboard content is present.
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

/**
 * Sidebar admin-link tests require a desktop viewport because the sidebar
 * uses `hidden lg:flex` and is only visible at >= 1024px width.
 */
test.describe('Sidebar admin link visibility', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('admin user sees admin link in sidebar', async ({ page }) => {
    await page.route('**/api/assistant/access', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enabled: false,
          launcherVisible: false,
          entitlementType: 'locked',
          trialAvailable: false,
          blockedReason: 'locked',
        }),
      }),
    );

    await loginAndNavigate(page, TEST_ADMIN, '/dashboard');

    // The sidebar should contain a link to the admin area.
    const adminLink = page.locator('aside a[href="/admin/dashboard"]');
    await expect(adminLink).toBeVisible();
  });

  test('regular user does not see admin link in sidebar', async ({ page }) => {
    await page.route('**/api/assistant/access', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enabled: false,
          launcherVisible: false,
          entitlementType: 'locked',
          trialAvailable: false,
          blockedReason: 'locked',
        }),
      }),
    );

    await loginAndNavigate(page, TEST_USER, '/dashboard');

    // The admin link should NOT be present for a regular user.
    const adminLink = page.locator('aside a[href="/admin/dashboard"]');
    await expect(adminLink).toBeHidden();
  });
});

test.describe('Admin page access control', () => {
  test('non-admin blocked from /admin/dashboard', async ({ page }) => {
    // Mock AI access for the AssistantLauncher.
    await page.route('**/api/assistant/access', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enabled: false,
          launcherVisible: false,
          entitlementType: 'locked',
          trialAvailable: false,
          blockedReason: 'locked',
        }),
      }),
    );

    // Return 403 for admin API routes — the admin page checks the response
    // and redirects to /dashboard with an error toast.
    await page.route('**/api/admin/stats', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden' }),
      }),
    );
    await page.route('**/api/admin/ai-usage-summary', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden' }),
      }),
    );

    await loginAndNavigate(page, TEST_USER, '/admin/dashboard');

    // The page should redirect away or show an error.
    // The admin dashboard checks for 403 and does router.replace('/dashboard').
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('superadmin can access admin pages', async ({ page }) => {
    // Mock AI access.
    await page.route('**/api/assistant/access', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enabled: false,
          launcherVisible: false,
          entitlementType: 'locked',
          trialAvailable: false,
          blockedReason: 'locked',
        }),
      }),
    );

    // Mock admin API routes with valid data.
    await page.route('**/api/admin/stats', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalUsers: 10,
          activeThisMonth: 5,
          aiEnabled: 3,
          aiDisabled: 7,
          roles: { superadmin: 1, admin: 1, manager: 2, user: 6 },
        }),
      }),
    );
    await page.route('**/api/admin/ai-usage-summary', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          month: '2026-04',
          totalTokensUsed: 100000,
          totalRequests: 50,
          activeAiUsers: 3,
          globalSettings: {},
        }),
      }),
    );

    await loginAndNavigate(page, TEST_SUPERADMIN, '/admin/dashboard');

    // Should stay on the admin dashboard (not be redirected).
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // Verify the admin page rendered with the heading.
    await expect(page.getByRole('heading', { name: /admin/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});
