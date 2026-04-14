import { test, expect } from '@playwright/test';
import { TEST_ADMIN, TEST_SUPERADMIN } from '../fixtures/auth';
import {
  adminUsersList,
  adminStats,
  lockedAccessState,
  roleResponse,
} from '../fixtures/api-mocks';
import { mockAuth, mockApiRoute, mockApiRouteWithHandler } from '../helpers/mock-api';

/**
 * Helper: set up all the mocks needed for the admin users page and navigate to it.
 */
async function setupAdminUsersPage(
  page: import('@playwright/test').Page,
  user = TEST_SUPERADMIN,
) {
  await mockAuth(page, user);
  await mockApiRoute(page, '/api/assistant/access', lockedAccessState());
  await mockApiRoute(page, '/api/admin/stats', adminStats());
  await mockApiRoute(page, '/api/admin/ai-usage-summary', {
    month: '2026-04',
    totalTokensUsed: 0,
    totalRequests: 0,
    activeAiUsers: 0,
    globalSettings: {},
  });

  // Default users list — intercept all GET requests to /api/admin/users
  await mockApiRoute(page, '/api/admin/users', adminUsersList(), { method: 'GET' });

  // AI config GET (for user detail modal)
  await mockApiRouteWithHandler(page, '/api/admin/users/*/ai-config', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          aiAssistantEnabled: true,
          aiEntitlementType: 'full',
          aiTrialAvailable: false,
          aiTrialStartedAt: null,
          aiTrialConsumedAt: null,
          aiTrialTokenLimit: 100_000,
          aiTrialTokensUsed: 0,
          aiTrialCompleted: true,
          aiUseCustomTokenLimit: false,
          aiMonthlyTokenLimit: null,
          aiUnlimited: false,
          aiHardStop: null,
        }),
      });
    } else {
      return route.fallback();
    }
  });

  await page.goto('/admin/users', { waitUntil: 'networkidle' });
}

test.describe('Admin Users Page', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  // ── Test 1 ─────────────────────────────────────────────────────────────
  test('loads and displays user list', async ({ page }) => {
    await setupAdminUsersPage(page);

    // All three fixture users should be visible.
    await expect(page.getByText('Alice Johnson')).toBeVisible();
    await expect(page.getByText('Bob Smith')).toBeVisible();
    await expect(page.getByText('Carol Davis')).toBeVisible();
  });

  // ── Test 2 ─────────────────────────────────────────────────────────────
  test('search input filters users', async ({ page }) => {
    let capturedUrl = '';
    await mockAuth(page, TEST_SUPERADMIN);
    await mockApiRoute(page, '/api/assistant/access', lockedAccessState());
    await mockApiRoute(page, '/api/admin/stats', adminStats());
    await mockApiRoute(page, '/api/admin/ai-usage-summary', {
      month: '2026-04',
      totalTokensUsed: 0,
      totalRequests: 0,
      activeAiUsers: 0,
      globalSettings: {},
    });

    // Intercept users API and capture the URL.
    await mockApiRouteWithHandler(page, '/api/admin/users', async (route) => {
      capturedUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(adminUsersList()),
      });
    });

    await page.goto('/admin/users', { waitUntil: 'networkidle' });

    // Type a search term (the page debounces by 250ms before making the request).
    const searchInput = page.getByPlaceholder(/search by name/i);
    await searchInput.fill('alice');

    // Wait for the debounced request.
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');

    // The captured URL should include the search query param.
    expect(capturedUrl).toContain('q=alice');
  });

  // ── Test 3 ─────────────────────────────────────────────────────────────
  test('AI status filter works', async ({ page }) => {
    let capturedUrl = '';
    await mockAuth(page, TEST_SUPERADMIN);
    await mockApiRoute(page, '/api/assistant/access', lockedAccessState());
    await mockApiRoute(page, '/api/admin/stats', adminStats());
    await mockApiRoute(page, '/api/admin/ai-usage-summary', {
      month: '2026-04',
      totalTokensUsed: 0,
      totalRequests: 0,
      activeAiUsers: 0,
      globalSettings: {},
    });

    await mockApiRouteWithHandler(page, '/api/admin/users', async (route) => {
      capturedUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(adminUsersList()),
      });
    });

    await page.goto('/admin/users', { waitUntil: 'networkidle' });

    // Click the "AI On" filter button.
    await page.getByRole('button', { name: 'AI On' }).click();

    // Wait for the request to fire.
    await page.waitForLoadState('networkidle');

    expect(capturedUrl).toContain('aiStatus=enabled');
  });

  // ── Test 4 ─────────────────────────────────────────────────────────────
  test('toggling AI for a user sends toggle request', async ({ page }) => {
    await setupAdminUsersPage(page);

    let togglePayload: Record<string, unknown> | null = null;
    let toggleUrl = '';

    // Intercept the toggle-ai POST endpoint.
    await mockApiRouteWithHandler(page, '/api/admin/users/*/toggle-ai', async (route) => {
      toggleUrl = route.request().url();
      togglePayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Bob has AI off — the toggle button text is "AI Off".
    // Find Bob's row and click the toggle button within it.
    const bobRow = page.locator('div').filter({ hasText: 'Bob Smith' }).filter({ hasText: 'bob@test.com' });
    const toggleButton = bobRow.getByRole('button', { name: /AI Off/i }).first();
    await toggleButton.click();

    // Wait for the POST to complete.
    await page.waitForLoadState('networkidle');

    expect(toggleUrl).toContain('/toggle-ai');
    expect(togglePayload).toEqual({ enabled: true });
  });

  // ── Test 5 ─────────────────────────────────────────────────────────────
  test('bulk enable AI shows two-step confirm', async ({ page }) => {
    await setupAdminUsersPage(page);

    // The bulk action buttons only appear when filters are active.
    // Click the "AI On" filter to activate filters.
    await page.getByRole('button', { name: 'AI On' }).click();
    await page.waitForLoadState('networkidle');

    // Click "Bulk enable" button.
    await page.getByRole('button', { name: /Bulk enable/i }).click();

    // The confirm step should now appear.
    await expect(page.getByText(/Enable AI for filtered users/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  // ── Test 6 ─────────────────────────────────────────────────────────────
  test('bulk enable AI second step sends requests', async ({ page }) => {
    await setupAdminUsersPage(page);

    let bulkPayload: Record<string, unknown> | null = null;

    // Mock the bulk-ai endpoint.
    await mockApiRouteWithHandler(page, '/api/admin/users/bulk-ai', async (route) => {
      bulkPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ updated: 3 }),
      });
    });

    // Activate a filter so bulk actions appear.
    await page.getByRole('button', { name: 'AI On' }).click();
    await page.waitForLoadState('networkidle');

    // Step 1: click bulk enable.
    await page.getByRole('button', { name: /Bulk enable/i }).click();

    // Step 2: confirm.
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.waitForLoadState('networkidle');

    expect(bulkPayload).not.toBeNull();
    expect((bulkPayload as unknown as Record<string, unknown>).action).toBe('set_ai');
    expect((bulkPayload as unknown as Record<string, unknown>).enabled).toBe(true);
  });

  // ── Test 7 ─────────────────────────────────────────────────────────────
  test('clicking a user opens detail modal', async ({ page }) => {
    await setupAdminUsersPage(page);

    // Click on Alice's row to open the detail modal.
    await page.getByText('Alice Johnson').click();

    // The modal should show the user name and email.
    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Alice Johnson')).toBeVisible();
    await expect(modal.getByText('alice@test.com')).toBeVisible();
  });

  // ── Test 8 ─────────────────────────────────────────────────────────────
  test('per-user AI config save sends POST', async ({ page }) => {
    await setupAdminUsersPage(page);

    let configPayload: Record<string, unknown> | null = null;
    let configPostUrl = '';

    // Intercept the ai-config POST (need to override the GET handler from setup).
    await page.route('**/api/admin/users/*/ai-config', async (route) => {
      if (route.request().method() === 'POST') {
        configPostUrl = route.request().url();
        configPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        // GET — return the config fixture.
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            aiAssistantEnabled: true,
            aiEntitlementType: 'full',
            aiTrialAvailable: false,
            aiTrialStartedAt: null,
            aiTrialConsumedAt: null,
            aiTrialTokenLimit: 100_000,
            aiTrialTokensUsed: 0,
            aiTrialCompleted: true,
            aiUseCustomTokenLimit: false,
            aiMonthlyTokenLimit: null,
            aiUnlimited: false,
            aiHardStop: null,
          }),
        });
      }
    });

    // Open the modal for Alice.
    await page.getByText('Alice Johnson').click();

    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toBeVisible();

    // Wait for config to load — the "Save Changes" button should appear.
    const saveButton = modal.getByRole('button', { name: /Save Changes/i });
    await expect(saveButton).toBeVisible({ timeout: 5_000 });

    // Toggle the "Unlimited Tokens" checkbox.
    const unlimitedCheckbox = modal.locator('label').filter({ hasText: /Unlimited Tokens/i }).locator('input[type="checkbox"]');
    await unlimitedCheckbox.check();

    // Click save.
    await saveButton.click();
    await page.waitForLoadState('networkidle');

    expect(configPostUrl).toContain('/ai-config');
    expect(configPayload).not.toBeNull();
    expect((configPayload as unknown as Record<string, unknown>).aiUnlimited).toBe(true);
  });

  // ── Test 9 ─────────────────────────────────────────────────────────────
  test('per-user AI config reset sends reset request', async ({ page }) => {
    await setupAdminUsersPage(page);

    let resetPayload: Record<string, unknown> | null = null;

    // Intercept the ai-config POST for the reset action.
    await page.route('**/api/admin/users/*/ai-config', async (route) => {
      if (route.request().method() === 'POST') {
        resetPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            aiAssistantEnabled: true,
            aiEntitlementType: 'full',
            aiTrialAvailable: false,
            aiTrialStartedAt: null,
            aiTrialConsumedAt: null,
            aiTrialTokenLimit: 100_000,
            aiTrialTokensUsed: 0,
            aiTrialCompleted: true,
            aiUseCustomTokenLimit: false,
            aiMonthlyTokenLimit: null,
            aiUnlimited: false,
            aiHardStop: null,
          }),
        });
      }
    });

    // Open the modal for Alice.
    await page.getByText('Alice Johnson').click();

    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toBeVisible();

    // Wait for config to load.
    const resetButton = modal.getByRole('button', { name: /^Reset$/i });
    await expect(resetButton).toBeVisible({ timeout: 5_000 });

    // Click the reset button.
    await resetButton.click();
    await page.waitForLoadState('networkidle');

    expect(resetPayload).not.toBeNull();
    expect((resetPayload as unknown as Record<string, unknown>).resetToDefault).toBe(true);
  });

  // ── Test 10 ────────────────────────────────────────────────────────────
  test('role selector visible only for superadmin', async ({ page }) => {
    // As superadmin, the role section should be visible in the detail modal.
    await setupAdminUsersPage(page, TEST_SUPERADMIN);

    await page.getByText('Alice Johnson').click();
    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toBeVisible();

    // The role section heading should be present.
    await expect(modal.getByText('Role', { exact: false }).first()).toBeVisible({ timeout: 5_000 });
    // The role buttons (user, manager, admin) should exist.
    await expect(modal.getByRole('button', { name: 'User' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Manager' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Admin' })).toBeVisible();

    // Close the modal.
    await modal.locator('button').filter({ has: page.locator('svg') }).first().click();
    await expect(modal).toBeHidden();

    // Now test as regular admin — set up a fresh page.
    const adminPage = page;

    // Re-setup as TEST_ADMIN (role = admin, not superadmin).
    // Clear existing routes and re-mock.
    await adminPage.unrouteAll();
    await setupAdminUsersPage(adminPage, TEST_ADMIN);

    await adminPage.getByText('Alice Johnson').click();
    const adminModal = adminPage.locator('.fixed.inset-0');
    await expect(adminModal).toBeVisible();

    // Wait for the config to load.
    await expect(adminModal.getByRole('button', { name: /Save Changes/i })).toBeVisible({ timeout: 5_000 });

    // The role selector buttons should NOT be visible for a regular admin.
    await expect(adminModal.getByRole('button', { name: 'User' })).toBeHidden();
    await expect(adminModal.getByRole('button', { name: 'Manager' })).toBeHidden();
  });

  // ── Test 11 ────────────────────────────────────────────────────────────
  test('changing role sends role update request', async ({ page }) => {
    await setupAdminUsersPage(page);

    let rolePayload: Record<string, unknown> | null = null;
    let rolePostUrl = '';

    // Intercept the role POST endpoint.
    await mockApiRouteWithHandler(page, '/api/admin/users/*/role', async (route) => {
      rolePostUrl = route.request().url();
      rolePayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(roleResponse('admin')),
      });
    });

    // Open Alice's detail modal (Alice has role: 'user').
    await page.getByText('Alice Johnson').click();
    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toBeVisible();

    // Wait for config to load and role section to appear.
    await expect(modal.getByRole('button', { name: 'Admin' })).toBeVisible({ timeout: 5_000 });

    // Click the "Admin" role button.
    await modal.getByRole('button', { name: 'Admin' }).click();
    await page.waitForLoadState('networkidle');

    expect(rolePostUrl).toContain('/role');
    expect(rolePayload).not.toBeNull();
    expect((rolePayload as unknown as Record<string, unknown>).role).toBe('admin');
  });
});
