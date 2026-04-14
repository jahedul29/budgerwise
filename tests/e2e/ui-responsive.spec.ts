import { test, expect } from '@playwright/test';
import { TEST_USER, TEST_ADMIN } from '../fixtures/auth';
import { fullAccessState, roleResponse } from '../fixtures/api-mocks';
import { mockAuth, mockApiRoute, mockFullSession } from '../helpers/mock-api';
import { loginAndNavigate } from '../helpers/login';

/* ────────────────────────────────────────────────────────────
 * Footer tests
 * ──────────────────────────────────────────────────────────── */

test.describe('AppFooter', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullSession(page, TEST_USER, fullAccessState());
  });

  test('footer renders with branding and links', async ({ page }) => {
    await loginAndNavigate(page, TEST_USER, '/dashboard');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // BudgetWise branding text
    await expect(footer.getByText('BudgetWise', { exact: false })).toBeVisible();

    // Quick links
    await expect(footer.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Transactions' })).toBeVisible();

    // Resource links
    await expect(footer.getByRole('link', { name: 'Accounts' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Settings' })).toBeVisible();

    // Copyright text
    await expect(footer.getByText('BudgetWise. All rights reserved.')).toBeVisible();
  });

  test('store badge click opens Coming Soon modal', async ({ page }) => {
    await loginAndNavigate(page, TEST_USER, '/dashboard');

    const footer = page.locator('footer');

    // Click the Apple store badge (the button containing "App Store")
    const appleButton = footer.getByRole('button').filter({ hasText: 'App Store' });
    await expect(appleButton).toBeVisible();
    await appleButton.click();

    // Verify modal appears with expected content
    await expect(page.getByText('Native App Coming Soon')).toBeVisible();
    await expect(page.getByText('Progressive Web App')).toBeVisible();
  });

  test('install card shows platform detection hint', async ({ page }) => {
    await loginAndNavigate(page, TEST_USER, '/dashboard');

    // On a desktop viewport, the InstallAppCard should show the desktop hint
    await expect(
      page.getByText("install icon in your browser's address bar"),
    ).toBeVisible();
  });
});

/* ────────────────────────────────────────────────────────────
 * Mobile bottom nav tests
 * ──────────────────────────────────────────────────────────── */

test.describe('Mobile bottom nav', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await mockFullSession(page, TEST_USER, fullAccessState());
  });

  test('mobile shows bottom nav with 5 tabs', async ({ page }) => {
    await loginAndNavigate(page, TEST_USER, '/dashboard');

    const bottomNav = page.locator('nav.fixed');
    await expect(bottomNav).toBeVisible();

    // All 5 tabs should be visible
    await expect(bottomNav.getByText('Home')).toBeVisible();
    await expect(bottomNav.getByText('Transactions')).toBeVisible();
    await expect(bottomNav.getByText('Analytics')).toBeVisible();
    await expect(bottomNav.getByText('Budgets')).toBeVisible();
    await expect(bottomNav.getByText('More')).toBeVisible();
  });

  test('bottom nav active state works', async ({ page }) => {
    await loginAndNavigate(page, TEST_USER, '/transactions');

    const bottomNav = page.locator('nav.fixed');
    await expect(bottomNav).toBeVisible();

    // The Transactions tab link should be active (has primary color class)
    const transactionsLink = bottomNav.getByRole('link', { name: 'Transactions' });
    await expect(transactionsLink).toBeVisible();
    await expect(transactionsLink).toHaveClass(/text-primary-600|text-primary-400/);
  });
});

/* ────────────────────────────────────────────────────────────
 * Desktop sidebar tests
 * ──────────────────────────────────────────────────────────── */

test.describe('Desktop sidebar', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await mockFullSession(page, TEST_USER, fullAccessState());
  });

  test('desktop shows sidebar navigation', async ({ page }) => {
    await loginAndNavigate(page, TEST_USER, '/dashboard');

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Main nav items
    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Transactions' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Analytics' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Budgets' })).toBeVisible();

    // Secondary nav items
    await expect(sidebar.getByRole('link', { name: 'Accounts' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Categories' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('sidebar shows admin link for admin users', async ({ page }) => {
    // Override auth to use admin user
    await mockFullSession(page, TEST_ADMIN, fullAccessState());

    await loginAndNavigate(page, TEST_ADMIN, '/dashboard');

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Admin link should be visible for admin users
    const adminLink = sidebar.getByRole('link', { name: 'Admin' });
    await expect(adminLink).toBeVisible();

    // Crown icon should be in the admin section
    await expect(sidebar.getByText('Admin', { exact: true }).first()).toBeVisible();
  });
});

/* ────────────────────────────────────────────────────────────
 * Dark mode test
 * ──────────────────────────────────────────────────────────── */

test.describe('Dark mode', () => {
  test('dark mode toggle applies dark class', async ({ page }) => {
    await mockFullSession(page, TEST_USER, fullAccessState());

    await loginAndNavigate(page, TEST_USER, '/more/settings');

    // Wait for the settings page to render
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // Find and click the Dark theme button
    const darkButton = page.getByRole('button', { name: /Dark/i }).filter({ hasText: 'Dark' });
    await expect(darkButton).toBeVisible();
    await darkButton.click();

    // Verify the <html> element gets the "dark" class
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);
  });
});
