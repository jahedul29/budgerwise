import { test, expect } from '@playwright/test';
import { TEST_USER } from '../fixtures/auth';
import {
  fullAccessState,
  exceededAccessState,
  trialAccessState,
  usageSummary,
  unlimitedUsageSummary,
  successfulParseResult,
} from '../fixtures/api-mocks';
import { mockFullSession, mockApiRoute, mockApiRouteWithHandler } from '../helpers/mock-api';
import { loginAndNavigate } from '../helpers/login';

/**
 * Token system E2E tests.
 *
 * These tests verify that the AI assistant correctly displays token usage,
 * enforces quota limits, handles 429/403 responses, refreshes access state
 * after parse requests, and supports unlimited and trial user flows.
 *
 * All API routes are mocked — no real backend is required.
 */

const COMMAND_TEXT = 'spent 450 on groceries from cash';

/** Set up session mocks and navigate to /dashboard. */
async function setupAndNavigate(
  page: import('@playwright/test').Page,
  aiAccess: unknown,
  aiUsage?: unknown,
) {
  await mockFullSession(page, TEST_USER, aiAccess, aiUsage);

  // Mock data endpoints the dashboard hooks may call
  await mockApiRoute(page, '/api/accounts', []);
  await mockApiRoute(page, '/api/categories', []);
  await mockApiRoute(page, '/api/budgets', []);
  await mockApiRoute(page, '/api/transactions', []);

  await loginAndNavigate(page, TEST_USER, '/dashboard');
}

/** Open the AI assistant panel by clicking the FAB, then wait for the textarea. */
async function openAssistantPanel(page: import('@playwright/test').Page) {
  const fab = page.locator('button[aria-label="Open assistant"]');
  await fab.click();

  const textarea = page.locator('textarea[placeholder="What would you like to do?"]');
  await expect(textarea).toBeVisible({ timeout: 5_000 });
  return textarea;
}

/** Locate the send button (last button in the input row, containing the ArrowRight icon). */
function getSendButton(page: import('@playwright/test').Page) {
  return page
    .locator('textarea[placeholder="What would you like to do?"]')
    .locator('..')
    .locator('..')
    .locator('button')
    .last();
}

test.describe('Token system', () => {
  // ── 1. Full access user sees quota bar with usage info ──

  test('full access user sees quota bar with usage info', async ({ page }) => {
    const access = fullAccessState(50_000); // 50k used of 500k
    await setupAndNavigate(page, access, access.usage);

    await page.getByRole('button', { name: 'Open assistant' }).click();

    // Quota bar should show percentage text — 50k/500k = 10%
    await expect(page.getByText(/10% of monthly limit/)).toBeVisible({ timeout: 5_000 });

    // Token counts should be visible: "50.0K / 500.0K"
    await expect(page.getByText(/50\.0K/)).toBeVisible();
    await expect(page.getByText(/500\.0K/)).toBeVisible();

    // The progress bar element should exist (the inner colored div with a width style)
    const progressBar = page.locator('.h-1.rounded-full .h-full.rounded-full');
    await expect(progressBar).toBeVisible();
  });

  // ── 2. Parse request succeeds within limit ──

  test('parse request succeeds within limit', async ({ page }) => {
    const access = fullAccessState();
    await setupAndNavigate(page, access, access.usage);

    await mockApiRoute(page, '/api/assistant/parse', successfulParseResult(), {
      method: 'POST',
    });

    const textarea = await openAssistantPanel(page);
    await textarea.fill(COMMAND_TEXT);

    const sendButton = getSendButton(page);
    await sendButton.click();

    // Wait for the parse response
    await page.waitForResponse((resp) => resp.url().includes('/api/assistant/parse'));

    // A successful parse with all fields resolved triggers "Transaction form ready" toast
    // and closes the panel (no blocked state).
    await expect(page.getByText('Transaction form ready')).toBeVisible({ timeout: 5_000 });
  });

  // ── 3. 429 response blocks further input ──

  test('429 response blocks further input', async ({ page }) => {
    const access = fullAccessState();
    await setupAndNavigate(page, access, access.usage);

    // Mock parse to return 429 with exceeded usage
    const exceededUsage = usageSummary(500_000, 500_000);
    await mockApiRoute(
      page,
      '/api/assistant/parse',
      {
        error: 'Monthly AI token limit reached',
        blockedReason: 'monthly_limit_reached',
        usage: exceededUsage,
      },
      { status: 429, method: 'POST' },
    );

    // After the 429, refreshAccessState will be called — mock it to return exceeded
    const exceeded = exceededAccessState();
    await page.route('**/api/assistant/access', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(exceeded),
      });
    });

    const textarea = await openAssistantPanel(page);
    await textarea.fill(COMMAND_TEXT);

    const sendButton = getSendButton(page);
    await sendButton.click();

    await page.waitForResponse((resp) => resp.url().includes('/api/assistant/parse'));

    // After 429, the component sets quotaBlocked = true which hides the input bar
    // and shows the blocked message
    await expect(page.getByText('Monthly limit reached')).toBeVisible({ timeout: 5_000 });

    // The textarea should no longer be visible (input bar is conditionally hidden)
    const textareaAfter = page.locator('textarea');
    await expect(textareaAfter).toHaveCount(0);
  });

  // ── 4. Quota exceeded shows blocked message ──

  test('quota exceeded shows blocked message', async ({ page }) => {
    const exceeded = exceededAccessState();
    await setupAndNavigate(page, exceeded, exceeded.usage);

    await page.getByRole('button', { name: 'Open assistant' }).click();

    // The blocked state message should be visible
    await expect(page.getByText('Monthly limit reached')).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText(/Your AI token quota has been used up this month/),
    ).toBeVisible();

    // The contact administrator message should also be visible
    await expect(
      page.getByText(/Contact your administrator for more/),
    ).toBeVisible();

    // Input area should not be rendered when quotaBlocked is true
    const textarea = page.locator('textarea');
    await expect(textarea).toHaveCount(0);
  });

  // ── 5. Usage recording refreshes quota after parse ──

  test('usage recording refreshes quota after parse', async ({ page }) => {
    const access = fullAccessState();
    await setupAndNavigate(page, access, access.usage);

    await mockApiRoute(page, '/api/assistant/parse', successfulParseResult(), {
      method: 'POST',
    });

    // Track calls to /api/assistant/access with a counter
    let accessCallCount = 0;
    await page.route('**/api/assistant/access', async (route) => {
      accessCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fullAccessState()),
      });
    });

    const textarea = await openAssistantPanel(page);

    // Wait for the initial access refresh when panel opens
    await page.waitForTimeout(500);
    const countBeforeParse = accessCallCount;

    await textarea.fill(COMMAND_TEXT);

    const sendButton = getSendButton(page);
    await sendButton.click();

    // Wait for the parse response
    await page.waitForResponse((resp) => resp.url().includes('/api/assistant/parse'));

    // After parse completes, refreshAccessState() is called in the finally block.
    // Give it time to complete.
    await page.waitForTimeout(1_000);

    // The access endpoint should have been called again after the parse
    expect(accessCallCount).toBeGreaterThan(countBeforeParse);
  });

  // ── 6. Monthly aggregate shown in usage bar ──

  test('monthly aggregate shown in usage bar', async ({ page }) => {
    // Use specific values: 200k used of 500k = 40%
    const access = fullAccessState(200_000);
    await setupAndNavigate(page, access, usageSummary(200_000, 500_000));

    await page.getByRole('button', { name: 'Open assistant' }).click();

    // The usage bar text should reflect the aggregate: "40% of monthly limit"
    await expect(page.getByText(/40% of monthly limit/)).toBeVisible({ timeout: 5_000 });

    // Token numbers: "200.0K / 500.0K"
    await expect(page.getByText(/200\.0K/)).toBeVisible();
    await expect(page.getByText(/500\.0K/)).toBeVisible();

    // The progress bar's inner div should have width reflecting the usage
    const progressInner = page.locator('.h-1.rounded-full .h-full.rounded-full');
    await expect(progressInner).toBeVisible();
    await expect(progressInner).toHaveAttribute('style', /width:\s*40%/);
  });

  // ── 7. Unlimited user never sees quota block ──

  test('unlimited user never sees quota block', async ({ page }) => {
    // Build an access state for an unlimited user — enabled, no blockedReason
    const unlimitedAccess = {
      enabled: true,
      launcherVisible: true,
      entitlementType: 'full' as const,
      trialAvailable: false,
      trialEnabled: true,
      trialStartedAt: null,
      trialConsumedAt: null,
      trialTokenLimit: 100_000,
      trialTokensUsed: 0,
      trialRemaining: 100_000,
      blockedReason: null,
      usage: unlimitedUsageSummary(),
    };
    await setupAndNavigate(page, unlimitedAccess, unlimitedUsageSummary());

    await page.getByRole('button', { name: 'Open assistant' }).click();

    // The textarea should be visible (not blocked)
    const textarea = page.locator('textarea[placeholder="What would you like to do?"]');
    await expect(textarea).toBeVisible({ timeout: 5_000 });

    // "Monthly limit reached" message should NOT be present
    await expect(page.getByText('Monthly limit reached')).toHaveCount(0);

    // The quota bar should NOT be visible for unlimited users
    // (quota bar only renders when !quota.isUnlimited && tokenLimit > 0)
    await expect(page.getByText(/% of monthly limit/)).toHaveCount(0);

    // The input should be enabled and ready for commands
    await expect(textarea).toBeEnabled();
  });

  // ── 8. Trial user sees trial token quota ──

  test('trial user sees trial token quota', async ({ page }) => {
    // 20k used of 100k trial = 20%
    const trialAccess = trialAccessState(20_000);
    await setupAndNavigate(page, trialAccess, trialAccess.usage);

    await page.getByRole('button', { name: 'Open assistant' }).click();

    // The quota bar should show trial-specific text: "20% of free trial used"
    await expect(page.getByText(/20% of free trial used/)).toBeVisible({ timeout: 5_000 });

    // Token counts should reflect trial bucket: "20.0K / 100.0K"
    await expect(page.getByText(/20\.0K/)).toBeVisible();
    await expect(page.getByText(/100\.0K/)).toBeVisible();

    // The textarea should be visible (trial is active, not exhausted)
    const textarea = page.locator('textarea[placeholder="What would you like to do?"]');
    await expect(textarea).toBeVisible();
  });

  // ── 9. Trial exhausted transitions to locked state ──

  test('trial exhausted transitions to locked state', async ({ page }) => {
    const trialAccess = trialAccessState(20_000);
    await setupAndNavigate(page, trialAccess, trialAccess.usage);

    // Mock parse to return 403 with trial_exhausted error
    await mockApiRoute(
      page,
      '/api/assistant/parse',
      { error: 'Your free trial has been exhausted' },
      { status: 403, method: 'POST' },
    );

    // After 403, refreshAccessState will be called — return a locked/trial-consumed state
    const lockedState = {
      enabled: false,
      launcherVisible: true,
      entitlementType: 'locked' as const,
      trialAvailable: false,
      trialEnabled: true,
      trialStartedAt: '2025-01-01T00:00:00.000Z',
      trialConsumedAt: '2025-01-02T00:00:00.000Z',
      trialTokenLimit: 100_000,
      trialTokensUsed: 100_000,
      trialRemaining: 0,
      blockedReason: 'trial_exhausted',
      usage: null,
    };
    await page.route('**/api/assistant/access', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(lockedState),
      });
    });

    const textarea = await openAssistantPanel(page);
    await textarea.fill(COMMAND_TEXT);

    const sendButton = getSendButton(page);
    await sendButton.click();

    await page.waitForResponse((resp) => resp.url().includes('/api/assistant/parse'));

    // The 403 handler calls refreshAccessState() which returns a locked state.
    // A toast error should appear with the trial exhaustion message.
    await expect(
      page.getByText(/free trial has been exhausted|AI assistant access not enabled/),
    ).toBeVisible({ timeout: 5_000 });
  });
});
