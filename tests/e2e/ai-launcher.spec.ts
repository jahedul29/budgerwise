import { test, expect } from '@playwright/test';
import { TEST_USER } from '../fixtures/auth';
import {
  lockedAccessState,
  trialAccessState,
  fullAccessState,
  exceededAccessState,
  lockedTrialConsumedAccessState,
  usageSummary,
} from '../fixtures/api-mocks';
import { mockFullSession } from '../helpers/mock-api';
import { loginAndNavigate } from '../helpers/login';

/**
 * Helper: set up a full session with AI access state and navigate to /dashboard.
 * Mocks auth, AI access, and optionally AI usage before page load.
 */
async function setupAndNavigate(
  page: import('@playwright/test').Page,
  aiAccess: unknown,
  aiUsage?: unknown,
) {
  await mockFullSession(page, TEST_USER, aiAccess, aiUsage);
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
}

test.describe('AI Assistant Launcher', () => {
  // ── 1. Locked FAB ──

  test('shows locked FAB with lock badge', async ({ page }) => {
    await setupAndNavigate(page, lockedAccessState());

    const fab = page.getByRole('button', { name: 'AI Assistant' });
    await expect(fab).toBeVisible();

    // The lock badge is a child of the FAB container; verify the Lock icon is present.
    // The Lock icon lives in a sibling div within the same parent as the button.
    // We look for the lock badge element inside the FAB's parent container.
    const lockBadge = fab.locator('..').locator('.lucide-lock');
    await expect(lockBadge).toBeVisible();
  });

  // ── 2. Locked panel shows demo commands behind frost overlay ──

  test('locked panel shows demo commands behind frost overlay', async ({ page }) => {
    await setupAndNavigate(page, lockedAccessState());

    // Open the locked panel
    await page.getByRole('button', { name: 'AI Assistant' }).click();

    // Demo command text should be visible (behind the frost overlay)
    await expect(page.getByText('Spent 450 on groceries from cash')).toBeVisible();
    await expect(page.getByText('Create a monthly budget of 5000 for food')).toBeVisible();

    // Frost overlay shows "Unlock AI Commands" text
    await expect(page.getByText('Unlock AI Commands')).toBeVisible();
  });

  // ── 3. Locked panel shows Start Free Trial button when trial available ──

  test('locked panel shows Start Free Trial button when trial available', async ({ page }) => {
    await setupAndNavigate(page, lockedAccessState());

    await page.getByRole('button', { name: 'AI Assistant' }).click();

    await expect(page.getByRole('button', { name: 'Start Free Trial' })).toBeVisible();
  });

  // ── 4. Locked panel shows Request Access when trial consumed ──

  test('locked panel shows Request Access when trial consumed', async ({ page }) => {
    await setupAndNavigate(page, lockedTrialConsumedAccessState());

    await page.getByRole('button', { name: 'AI Assistant' }).click();

    // Should show "Request Access" mailto link
    const requestLink = page.getByRole('link', { name: 'Request Access' });
    await expect(requestLink).toBeVisible();
    await expect(requestLink).toHaveAttribute('href', /^mailto:/);

    // Should show "free trial has ended" text
    await expect(page.getByText('Your free trial has ended')).toBeVisible();
  });

  // ── 5. Trial state shows enabled FAB without lock badge ──

  test('trial state shows enabled FAB without lock badge', async ({ page }) => {
    const trialAccess = trialAccessState();
    await setupAndNavigate(page, trialAccess, trialAccess.usage);

    const fab = page.getByRole('button', { name: 'Open assistant' });
    await expect(fab).toBeVisible();

    // Lock badge should NOT be present on the enabled FAB
    const lockIcon = fab.locator('..').locator('.lucide-lock');
    await expect(lockIcon).toHaveCount(0);
  });

  // ── 6. Trial state shows AI panel with input and quota bar ──

  test('trial state shows AI panel with input and quota bar', async ({ page }) => {
    const trialAccess = trialAccessState();
    await setupAndNavigate(page, trialAccess, trialAccess.usage);

    await page.getByRole('button', { name: 'Open assistant' }).click();

    // Textarea input should be visible
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();

    // Send button (ArrowRight icon button) should be present
    const sendButton = page.locator('button').filter({ has: page.locator('.lucide-arrow-right') });
    await expect(sendButton).toBeVisible();

    // Quota/usage indicator should be visible — shows usage percent text
    await expect(page.getByText(/% of free trial used/)).toBeVisible();
  });

  // ── 7. Full access shows enabled FAB ──

  test('full access shows enabled FAB', async ({ page }) => {
    const fullAccess = fullAccessState();
    await setupAndNavigate(page, fullAccess, fullAccess.usage);

    await page.getByRole('button', { name: 'Open assistant' }).click();

    // Input field should be available
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
  });

  // ── 8. Full access shows quota bar with usage ──

  test('full access shows quota bar with usage', async ({ page }) => {
    const fullAccess = fullAccessState();
    await setupAndNavigate(page, fullAccess, fullAccess.usage);

    await page.getByRole('button', { name: 'Open assistant' }).click();

    // The quota bar should show monthly limit usage text
    await expect(page.getByText(/% of monthly limit/)).toBeVisible();

    // Token usage numbers should be visible (e.g., "50.0K / 500.0K")
    await expect(page.getByText(/50\.0K/)).toBeVisible();
  });

  // ── 9. Input has 200 character limit ──

  test('input has 200 character limit', async ({ page }) => {
    const fullAccess = fullAccessState();
    await setupAndNavigate(page, fullAccess, fullAccess.usage);

    await page.getByRole('button', { name: 'Open assistant' }).click();

    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();

    // Type 250 characters — only 200 should end up in the textarea
    const longText = 'A'.repeat(250);
    await textarea.fill(longText);

    // The textarea has maxLength=200 and an onChange guard; verify the value is capped
    const value = await textarea.inputValue();
    expect(value.length).toBeLessThanOrEqual(200);
  });

  // ── 10. Character counter updates as user types ──

  test('character counter updates as user types', async ({ page }) => {
    const fullAccess = fullAccessState();
    await setupAndNavigate(page, fullAccess, fullAccess.usage);

    await page.getByRole('button', { name: 'Open assistant' }).click();

    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();

    // The counter only shows when input length > 150, so type enough characters
    const text = 'B'.repeat(160);
    await textarea.fill(text);

    // Counter should show "160/200"
    await expect(page.getByText('160/200')).toBeVisible();

    // Type more to verify it updates
    await textarea.fill('C'.repeat(195));
    await expect(page.getByText('195/200')).toBeVisible();
  });

  // ── 11. Send button is disabled when input is empty ──

  test('send button is disabled when input is empty', async ({ page }) => {
    const fullAccess = fullAccessState();
    await setupAndNavigate(page, fullAccess, fullAccess.usage);

    await page.getByRole('button', { name: 'Open assistant' }).click();

    // The send button uses the ArrowRight icon
    const sendButton = page.locator('button').filter({ has: page.locator('.lucide-arrow-right') });
    await expect(sendButton).toBeVisible();

    // With empty input, the send button should be disabled
    await expect(sendButton).toBeDisabled();
  });

  // ── 12. Send button is enabled when input has text ──

  test('send button is enabled when input has text', async ({ page }) => {
    const fullAccess = fullAccessState();
    await setupAndNavigate(page, fullAccess, fullAccess.usage);

    await page.getByRole('button', { name: 'Open assistant' }).click();

    const textarea = page.locator('textarea');
    await textarea.fill('Spent 100 on food');

    const sendButton = page.locator('button').filter({ has: page.locator('.lucide-arrow-right') });
    await expect(sendButton).toBeEnabled();
  });

  // ── 13. Exceeded quota shows blocked state ──

  test('exceeded quota shows blocked state', async ({ page }) => {
    const exceeded = exceededAccessState();
    await setupAndNavigate(page, exceeded, exceeded.usage);

    await page.getByRole('button', { name: 'Open assistant' }).click();

    // Should show the blocked message
    await expect(page.getByText('Monthly limit reached')).toBeVisible();
    await expect(
      page.getByText(/Your AI token quota has been used up this month/),
    ).toBeVisible();
  });

  // ── 14. Exceeded quota disables input ──

  test('exceeded quota disables input', async ({ page }) => {
    const exceeded = exceededAccessState();
    await setupAndNavigate(page, exceeded, exceeded.usage);

    await page.getByRole('button', { name: 'Open assistant' }).click();

    // When quotaBlocked is true, the entire input bar is conditionally hidden
    // ({!quotaBlocked && <div>...input...</div>}), so the textarea should not exist.
    const textarea = page.locator('textarea');
    await expect(textarea).toHaveCount(0);

    // The send button should also not be present
    const sendButton = page.locator('button').filter({ has: page.locator('.lucide-arrow-right') });
    await expect(sendButton).toHaveCount(0);
  });
});
