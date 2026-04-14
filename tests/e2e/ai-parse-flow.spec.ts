import { test, expect } from '@playwright/test';
import { TEST_USER } from '../fixtures/auth';
import {
  fullAccessState,
  usageSummary,
  successfulParseResult,
  ambiguousParseResult,
} from '../fixtures/api-mocks';
import { mockFullSession, mockApiRoute, mockApiRouteWithHandler } from '../helpers/mock-api';
import { loginAndNavigate } from '../helpers/login';

/**
 * AI Assistant parse flow — end-to-end tests.
 *
 * These tests verify the full lifecycle of submitting a command to the
 * AI assistant, receiving a parse result, handling ambiguities, errors,
 * and quota-blocked states.
 */

const COMMAND_TEXT = 'spent 450 on groceries from cash';

/** Set up full session mocks and navigate to the dashboard. */
async function setup(page: import('@playwright/test').Page) {
  await mockFullSession(page, TEST_USER, fullAccessState(), usageSummary());

  // Mock data endpoints that the dashboard/hooks may call
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

  // Wait for the panel textarea to be visible
  const textarea = page.locator('textarea[placeholder="What would you like to do?"]');
  await expect(textarea).toBeVisible({ timeout: 5_000 });
  return textarea;
}

test.describe('AI assistant parse flow', () => {
  test('submitting a command sends POST to /api/assistant/parse', async ({ page }) => {
    await setup(page);

    // Intercept parse route and track requests
    let parseRequestMade = false;
    let requestBody: Record<string, unknown> | null = null;

    await mockApiRouteWithHandler(page, '/api/assistant/parse', async (route) => {
      parseRequestMade = true;
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successfulParseResult()),
      });
    });

    const textarea = await openAssistantPanel(page);

    // Type text and click send
    await textarea.fill(COMMAND_TEXT);
    const sendButton = page.locator('textarea[placeholder="What would you like to do?"]')
      .locator('..').locator('..').locator('button').last();
    await sendButton.click();

    // Wait for the parse request to complete
    await page.waitForResponse((resp) => resp.url().includes('/api/assistant/parse'));

    expect(parseRequestMade).toBe(true);
    expect(requestBody).not.toBeNull();
    const body = requestBody as unknown as Record<string, unknown>;
    expect(body.text).toBe(COMMAND_TEXT);
    expect(body).toHaveProperty('locale');
    expect(body).toHaveProperty('timezone');
    expect(body).toHaveProperty('nowIso');
  });

  test('shows loading state during parsing', async ({ page }) => {
    await setup(page);

    // Delay the parse response so we can observe the loading state
    await mockApiRouteWithHandler(page, '/api/assistant/parse', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successfulParseResult()),
      });
    });

    const textarea = await openAssistantPanel(page);
    await textarea.fill(COMMAND_TEXT);

    // Click the send button
    const sendButton = page.locator('textarea[placeholder="What would you like to do?"]')
      .locator('..').locator('..').locator('button').last();
    await sendButton.click();

    // Verify loading indicator appears — the component shows "Parsing your command" text
    await expect(page.getByText('Parsing your command')).toBeVisible({ timeout: 3_000 });

    // The textarea should be disabled during parsing
    await expect(textarea).toBeDisabled();
  });

  test('successful parse with complete fields opens transaction form', async ({ page }) => {
    await setup(page);

    await mockApiRoute(page, '/api/assistant/parse', successfulParseResult(), { method: 'POST' });

    const textarea = await openAssistantPanel(page);
    await textarea.fill(COMMAND_TEXT);

    // Click the send button
    const sendButton = page.locator('textarea[placeholder="What would you like to do?"]')
      .locator('..').locator('..').locator('button').last();
    await sendButton.click();

    // Wait for the parse response
    await page.waitForResponse((resp) => resp.url().includes('/api/assistant/parse'));

    // On a successful parse with all fields resolved and no ambiguities,
    // the component shows a toast "Transaction form ready" and closes the panel.
    // Verify the toast message appears.
    await expect(page.getByText('Transaction form ready')).toBeVisible({ timeout: 5_000 });
  });

  test('parse result with ambiguities shows resolution options', async ({ page }) => {
    await setup(page);

    await mockApiRoute(page, '/api/assistant/parse', ambiguousParseResult(), { method: 'POST' });

    const textarea = await openAssistantPanel(page);
    await textarea.fill('spent 200 on uber from cash');

    const sendButton = page.locator('textarea[placeholder="What would you like to do?"]')
      .locator('..').locator('..').locator('button').last();
    await sendButton.click();

    await page.waitForResponse((resp) => resp.url().includes('/api/assistant/parse'));

    // The ambiguous parse result should show the ambiguity resolution UI
    // with "Ambiguous: accountId" label
    await expect(page.getByText('Ambiguous: accountId')).toBeVisible({ timeout: 5_000 });

    // Verify the select dropdown with options is present
    const select = page.locator('select').filter({ has: page.locator('option[value="acc-1"]') });
    await expect(select).toBeVisible();

    // Verify both options are present
    await expect(select.locator('option[value="acc-1"]')).toHaveText(/Cash Wallet/);
    await expect(select.locator('option[value="acc-2"]')).toHaveText(/Cash Reserve/);
  });

  test('resolving an ambiguity updates the parse result', async ({ page }) => {
    await setup(page);

    await mockApiRoute(page, '/api/assistant/parse', ambiguousParseResult(), { method: 'POST' });

    const textarea = await openAssistantPanel(page);
    await textarea.fill('spent 200 on uber from cash');

    const sendButton = page.locator('textarea[placeholder="What would you like to do?"]')
      .locator('..').locator('..').locator('button').last();
    await sendButton.click();

    await page.waitForResponse((resp) => resp.url().includes('/api/assistant/parse'));

    // Wait for ambiguity UI
    await expect(page.getByText('Ambiguous: accountId')).toBeVisible({ timeout: 5_000 });

    // Select an option from the ambiguity dropdown
    const select = page.locator('select').filter({ has: page.locator('option[value="acc-1"]') });
    await select.selectOption('acc-1');

    // After resolving, the ambiguity section should disappear
    await expect(page.getByText('Ambiguous: accountId')).toBeHidden({ timeout: 5_000 });
  });

  test('confirmation flow shows confirm button', async ({ page }) => {
    await setup(page);

    await mockApiRoute(page, '/api/assistant/parse', ambiguousParseResult(), { method: 'POST' });

    const textarea = await openAssistantPanel(page);
    await textarea.fill('spent 200 on uber from cash');

    const sendButton = page.locator('textarea[placeholder="What would you like to do?"]')
      .locator('..').locator('..').locator('button').last();
    await sendButton.click();

    await page.waitForResponse((resp) => resp.url().includes('/api/assistant/parse'));

    // Wait for ambiguity UI
    await expect(page.getByText('Ambiguous: accountId')).toBeVisible({ timeout: 5_000 });

    // Resolve the ambiguity
    const select = page.locator('select').filter({ has: page.locator('option[value="acc-1"]') });
    await select.selectOption('acc-1');

    // After resolving ambiguities, the confirm/execute button should be visible.
    // For transaction.add intent, the button text is "Confirm & Add".
    await expect(page.getByRole('button', { name: /Confirm & Add/i })).toBeVisible({ timeout: 5_000 });
  });

  test('403 error shows access denied message', async ({ page }) => {
    await setup(page);

    await mockApiRoute(
      page,
      '/api/assistant/parse',
      { error: 'AI assistant access not enabled' },
      { status: 403, method: 'POST' },
    );

    const textarea = await openAssistantPanel(page);
    await textarea.fill(COMMAND_TEXT);

    const sendButton = page.locator('textarea[placeholder="What would you like to do?"]')
      .locator('..').locator('..').locator('button').last();
    await sendButton.click();

    await page.waitForResponse((resp) => resp.url().includes('/api/assistant/parse'));

    // The 403 handler shows a toast with the error message
    await expect(page.getByText('AI assistant access not enabled')).toBeVisible({ timeout: 5_000 });
  });

  test('429 error shows quota exceeded', async ({ page }) => {
    await setup(page);

    await mockApiRoute(
      page,
      '/api/assistant/parse',
      {
        error: 'Monthly AI token limit reached',
        blockedReason: 'monthly_limit_reached',
        usage: usageSummary(500_000, 500_000),
      },
      { status: 429, method: 'POST' },
    );

    const textarea = await openAssistantPanel(page);
    await textarea.fill(COMMAND_TEXT);

    const sendButton = page.locator('textarea[placeholder="What would you like to do?"]')
      .locator('..').locator('..').locator('button').last();
    await sendButton.click();

    await page.waitForResponse((resp) => resp.url().includes('/api/assistant/parse'));

    // The 429 handler sets quotaBlocked which shows the blocked state:
    // "Monthly limit reached" text in the quota-blocked UI
    await expect(page.getByText('Monthly limit reached')).toBeVisible({ timeout: 5_000 });
  });

  test('parse refreshes access state after completion', async ({ page }) => {
    await setup(page);

    await mockApiRoute(page, '/api/assistant/parse', successfulParseResult(), { method: 'POST' });

    // Track calls to /api/assistant/access
    let accessCallCount = 0;
    // Override the existing access mock to count calls
    await page.route('**/api/assistant/access', async (route) => {
      accessCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fullAccessState()),
      });
    });

    const textarea = await openAssistantPanel(page);

    // Record the access call count after the panel opened (it refreshes on open)
    // Give it a moment to settle
    await page.waitForTimeout(500);
    const countBeforeParse = accessCallCount;

    await textarea.fill(COMMAND_TEXT);

    const sendButton = page.locator('textarea[placeholder="What would you like to do?"]')
      .locator('..').locator('..').locator('button').last();
    await sendButton.click();

    // Wait for the parse response to complete
    await page.waitForResponse((resp) => resp.url().includes('/api/assistant/parse'));

    // Wait for the subsequent access refresh to happen
    await page.waitForTimeout(1_000);

    // After parse completes, refreshAccessState() is called in the finally block,
    // so access call count should have increased
    expect(accessCallCount).toBeGreaterThan(countBeforeParse);
  });
});
