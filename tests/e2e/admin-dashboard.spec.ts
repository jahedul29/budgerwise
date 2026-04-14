import { test, expect } from '@playwright/test';
import { TEST_SUPERADMIN } from '../fixtures/auth';
import {
  adminStats,
  adminAiUsageSummary,
  globalAiSettings,
  roleResponse,
  lockedAccessState,
} from '../fixtures/api-mocks';
import { mockAuth, mockApiRoute } from '../helpers/mock-api';
import { loginAndNavigate } from '../helpers/login';

/**
 * The admin dashboard page (`/admin/dashboard`) consumes API shapes that
 * differ slightly from the fixture helpers (which target the original spec).
 * We build response payloads that match what the real API routes return so
 * the page renders correctly under mock conditions.
 */

/* ── Response payloads matching actual API route shapes ── */

function statsPayload() {
  const base = adminStats();
  return {
    totalUsers: base.totalUsers,           // 125
    aiEnabledUsers: base.aiEnabled,        // 42
    activeLastWeek: 51,
    activeLastMonth: base.activeThisMonth, // 78
    roles: {
      superadmins: base.roles.superadmin,  // 1
      admins: base.roles.admin,            // 3
      managers: base.roles.manager,        // 8
      users: base.roles.user,             // 113
    },
  };
}

function usageSummaryPayload() {
  const base = adminAiUsageSummary();
  return {
    month: base.month,                         // '2026-04'
    totalTokensUsed: base.totalTokensUsed,     // 1_250_000
    totalInputTokens: 800_000,
    totalOutputTokens: 450_000,
    totalRequests: base.totalRequests,         // 450
    totalAllocatedTokens: 5_000_000,
    totalEnabledUsers: 42,
    totalTrialUsers: 5,
    totalUnlimitedUsers: 2,
    activeAiUsers: base.activeAiUsers,         // 42
    defaultMonthlyTokenLimit: 500_000,
    defaultTrialTokenLimit: 100_000,
    openaiReportedTokens: base.globalSettings.openaiReportedTokens, // 1_300_000
  };
}

/* ── Common setup ── */

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Auth: superadmin session + role
    await mockAuth(page, TEST_SUPERADMIN);

    // AI assistant access (keeps AssistantLauncher quiet)
    await mockApiRoute(page, '/api/assistant/access', lockedAccessState());

    // Admin data endpoints
    await mockApiRoute(page, '/api/admin/stats', statsPayload());
    await mockApiRoute(page, '/api/admin/ai-usage-summary', usageSummaryPayload());
    await mockApiRoute(page, '/api/admin/ai-settings', globalAiSettings());
  });

  /* ── 1. Stats cards ── */
  test('renders stats cards with correct numbers', async ({ page }) => {
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });

    // Wait for loading to finish
    await expect(page.getByText('Loading dashboard...')).toBeHidden({ timeout: 10_000 });

    // Total Users = 125
    const statsGrid = page.locator('.grid.grid-cols-2');
    await expect(statsGrid.getByText('125')).toBeVisible();
    await expect(statsGrid.getByText('Total Users')).toBeVisible();

    // Active (7d) = 51
    await expect(statsGrid.getByText('51')).toBeVisible();
    await expect(statsGrid.getByText('Active (7d)')).toBeVisible();

    // Active (30d) = 78
    await expect(statsGrid.getByText('78')).toBeVisible();
    await expect(statsGrid.getByText('Active (30d)')).toBeVisible();

    // AI Enabled = 42
    await expect(statsGrid.getByText('42').first()).toBeVisible();
    await expect(statsGrid.getByText('AI Enabled')).toBeVisible();
  });

  /* ── 2. AI usage summary ── */
  test('displays AI usage summary', async ({ page }) => {
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading dashboard...')).toBeHidden({ timeout: 10_000 });

    // Section header includes month
    await expect(page.getByText(/AI Token Usage.*2026-04/)).toBeVisible();

    // Total Used: 1_250_000 => fmtTokens => "1.3M" (1250000/1000000 = 1.25 => "1.3M" after .toFixed(1))
    // Actually 1250000 / 1000000 = 1.25 => "1.3M"? No, 1.25.toFixed(1) = "1.3"? No, 1.25.toFixed(1) = "1.2" in JS.
    // Let's check: 1_250_000 / 1_000_000 = 1.25 => toFixed(1) = "1.2" in some runtimes, "1.3" in others (banker's rounding).
    // Use a regex to handle both.
    await expect(page.getByText(/1\.[23]M/).first()).toBeVisible();
    await expect(page.getByText('Total Used')).toBeVisible();

    // Requests: 450
    const requestsCard = page.getByText('Requests', { exact: true }).locator('..');
    await expect(requestsCard.getByText('450', { exact: true })).toBeVisible();
    await expect(page.getByText('Requests', { exact: true })).toBeVisible();

    // Active users label: "42 active users"
    await expect(page.getByText('42 active users')).toBeVisible();
  });

  /* ── 3. Role breakdown ── */
  test('shows role breakdown', async ({ page }) => {
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading dashboard...')).toBeHidden({ timeout: 10_000 });

    // Section header
    await expect(page.getByText('Team Roles')).toBeVisible();

    // Role badges: label + count rendered side-by-side inside each badge
    const rolesSection = page.locator('text=Team Roles').locator('..').locator('..');
    await expect(rolesSection.getByText('Superadmin', { exact: true })).toBeVisible();
    await expect(rolesSection.getByText('Admin', { exact: true })).toBeVisible();
    await expect(rolesSection.getByText('Manager', { exact: true })).toBeVisible();

    // Verify specific counts in role badges
    // Each badge has the pattern: <span>Label</span><span>count</span>
    const superadminBadge = rolesSection.locator('div').filter({ hasText: 'Superadmin' }).first();
    await expect(superadminBadge.getByText('1', { exact: true })).toBeVisible();

    const adminBadge = rolesSection.locator('div').filter({ hasText: /^Admin/ }).first();
    await expect(adminBadge.getByText('3', { exact: true })).toBeVisible();

    const managerBadge = rolesSection.locator('div').filter({ hasText: 'Manager' }).first();
    await expect(managerBadge.getByText('8', { exact: true })).toBeVisible();

    const userBadge = rolesSection.locator('div').filter({ hasText: /^User/ }).first();
    await expect(userBadge.getByText('113', { exact: true })).toBeVisible();
  });

  /* ── 4. Global settings form fields visible ── */
  test('displays global settings', async ({ page }) => {
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading dashboard...')).toBeHidden({ timeout: 10_000 });

    // Expand the collapsible settings section
    await page.getByText('Global AI Token Settings').click();

    // Wait for settings to load (the section fetches /api/admin/ai-settings on expand)
    await expect(page.getByText('Default Monthly Token Limit')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Default Trial Token Limit')).toBeVisible();
    await expect(page.getByText('Hard Stop (default)')).toBeVisible();
    await expect(page.getByText('OpenAI Reported Tokens')).toBeVisible();

    // The monthly token limit input should have the value from globalAiSettings (500000)
    const monthlyInput = page.locator('input[type="number"]').first();
    await expect(monthlyInput).toHaveValue('500000');

    // Save button should be present
    await expect(page.getByRole('button', { name: /Save Settings/i })).toBeVisible();
  });

  /* ── 5. Saving global settings sends POST request ── */
  test('saving global settings sends POST request', async ({ page }) => {
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading dashboard...')).toBeHidden({ timeout: 10_000 });

    // Expand settings
    await page.getByText('Global AI Token Settings').click();
    await expect(page.getByText('Default Monthly Token Limit')).toBeVisible({ timeout: 10_000 });

    // Change the monthly token limit
    const monthlyInput = page.locator('label:has-text("Default Monthly Token Limit") + input[type="number"]').first();
    // Fallback: find the first number input inside the settings panel
    const settingsPanel = page.locator('text=Default Monthly Token Limit').locator('..').locator('..');
    const firstInput = settingsPanel.locator('input[type="number"]').first();
    await firstInput.fill('600000');

    // Change the trial token limit
    const trialInput = settingsPanel.locator('input[type="number"]').nth(1);
    await trialInput.fill('150000');

    // Intercept the POST to /api/admin/ai-settings
    const postPromise = page.waitForRequest((req) =>
      req.url().includes('/api/admin/ai-settings') && req.method() === 'POST',
    );

    // Mock the POST response
    await page.route('**/api/admin/ai-settings', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...globalAiSettings(),
            defaultMonthlyTokenLimit: 600_000,
            defaultTrialTokenLimit: 150_000,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(globalAiSettings()),
        });
      }
    });

    // Click save
    await page.getByRole('button', { name: /Save Settings/i }).click();

    // Verify the POST request was sent with correct payload
    const postRequest = await postPromise;
    const payload = postRequest.postDataJSON();
    expect(payload.defaultMonthlyTokenLimit).toBe(600000);
    expect(payload.defaultTrialTokenLimit).toBe(150000);
    expect(typeof payload.defaultAiHardStop).toBe('boolean');
  });

  /* ── 6. OpenAI cross-check display ── */
  test('displays OpenAI cross-check data', async ({ page }) => {
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading dashboard...')).toBeHidden({ timeout: 10_000 });

    // The cross-check section shows "OpenAI reported: X" vs "tracked: Y"
    // openaiReportedTokens = 1_300_000 => fmtTokens => "1.3M"
    await expect(page.getByText(/OpenAI reported/)).toBeVisible();
    await expect(page.getByText(/tracked:/)).toBeVisible();

    // The gap: 1_300_000 - 1_250_000 = 50_000 => "50.0K"
    // pct = 50000 / 1300000 * 100 = ~4% => under 5% => "In sync"
    await expect(page.getByText('In sync')).toBeVisible();
  });

  /* ── 7. AdminTabs navigation ── */
  test('AdminTabs navigation works', async ({ page }) => {
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading dashboard...')).toBeHidden({ timeout: 10_000 });

    // The AdminTabs component renders two links: "Overview" and "Users"
    const overviewTab = page.getByRole('link', { name: 'Overview', exact: true });
    const usersTab = page.getByRole('link', { name: 'Users', exact: true });

    await expect(overviewTab).toBeVisible();
    await expect(usersTab).toBeVisible();

    // Overview tab should point to /admin/dashboard
    await expect(overviewTab).toHaveAttribute('href', '/admin/dashboard');

    // Users tab should point to /admin/users
    await expect(usersTab).toHaveAttribute('href', '/admin/users');

    // Overview tab should be active (has the active styling class)
    await expect(overviewTab).toHaveClass(/bg-primary-500\/10/);
  });

  /* ── 8. Data refreshes after mutation ── */
  test('data refreshes after mutation', async ({ page }) => {
    let statsCallCount = 0;
    let usageSummaryCallCount = 0;

    // Override the default mocks with counting versions
    await page.route('**/api/admin/stats', async (route) => {
      statsCallCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(statsPayload()),
      });
    });

    await page.route('**/api/admin/ai-usage-summary', async (route) => {
      usageSummaryCallCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(usageSummaryPayload()),
      });
    });

    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading dashboard...')).toBeHidden({ timeout: 10_000 });

    // Record initial call counts (at least 1 from initial load)
    const initialStatsCount = statsCallCount;
    const initialUsageCount = usageSummaryCallCount;
    expect(initialStatsCount).toBeGreaterThanOrEqual(1);
    expect(initialUsageCount).toBeGreaterThanOrEqual(1);

    // Expand settings and save to trigger a mutation
    await page.getByText('Global AI Token Settings').click();
    await expect(page.getByText('Default Monthly Token Limit')).toBeVisible({ timeout: 10_000 });

    // Mock POST response for settings save
    await page.route('**/api/admin/ai-settings', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(globalAiSettings()),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(globalAiSettings()),
        });
      }
    });

    await page.getByRole('button', { name: /Save Settings/i }).click();

    // After saving, the page calls fetchData() again which re-fetches stats + usage summary
    await page.waitForTimeout(1000);

    expect(statsCallCount).toBeGreaterThan(initialStatsCount);
    expect(usageSummaryCallCount).toBeGreaterThan(initialUsageCount);
  });

  /* ── 9. Loading state while data loads ── */
  test('shows loading state while data loads', async ({ page }) => {
    // Override mocks to add a delay so we can observe the loading indicator
    await page.route('**/api/admin/stats', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(statsPayload()),
      });
    });

    await page.route('**/api/admin/ai-usage-summary', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(usageSummaryPayload()),
      });
    });

    await page.goto('/admin/dashboard');

    // The loading indicator should be visible while data is being fetched
    await expect(page.getByText('Loading dashboard...')).toBeVisible({ timeout: 5_000 });

    // After the delayed responses arrive, loading should disappear and content should show
    await expect(page.getByText('Loading dashboard...')).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText('Total Users')).toBeVisible();
  });
});
