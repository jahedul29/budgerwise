/**
 * Common selectors used across E2E tests.
 *
 * Using data-testid where available, otherwise descriptive CSS/text selectors.
 * Playwright's `getByRole`, `getByText`, `getByLabel` are preferred in tests
 * but these constants help when selectors are reused across many files.
 */

/* ── Layout ── */
export const SIDEBAR = 'aside';
export const BOTTOM_NAV = 'nav.fixed';
export const APP_FOOTER = 'footer';

/* ── AI Assistant ── */
export const AI_FAB = 'button[aria-label="AI Assistant"], button[aria-label="Open assistant"]';
export const AI_PANEL = '.fixed.z-\\[75\\]';
export const AI_INPUT = 'textarea';
export const AI_SEND_BUTTON = 'button:has-text("Send"), button[type="submit"]';

/* ── Admin ── */
export const ADMIN_LINK = 'a[href="/admin/dashboard"]';
export const ADMIN_TABS = '[role="tablist"]';
