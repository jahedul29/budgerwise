/**
 * Helpers for intercepting API routes in Playwright.
 *
 * Usage:
 *   await mockApiRoute(page, '/api/assistant/access', lockedAccessState());
 */

import { type Page, type Route } from '@playwright/test';
import { type MockUser, sessionPayload } from '../fixtures/auth';
import { roleResponse } from '../fixtures/api-mocks';

/**
 * Intercept a single API route and return a static JSON payload.
 * Optionally specify status code and method filter.
 */
export async function mockApiRoute(
  page: Page,
  urlPath: string,
  body: unknown,
  options?: { status?: number; method?: string },
) {
  await page.route(`**/api${urlPath.startsWith('/api') ? urlPath.slice(4) : urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`, async (route: Route) => {
    if (options?.method && route.request().method() !== options.method.toUpperCase()) {
      return route.fallback();
    }
    await route.fulfill({
      status: options?.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

/**
 * Intercept an API route and respond with a handler function.
 */
export async function mockApiRouteWithHandler(
  page: Page,
  urlPath: string,
  handler: (route: Route) => Promise<void>,
) {
  const path = urlPath.startsWith('/api') ? urlPath : `/api${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`;
  await page.route(`**${path}`, handler);
}

/**
 * Set up the auth mock so the app believes a user is logged in.
 * Intercepts the NextAuth session endpoint + the role endpoint.
 */
export async function mockAuth(page: Page, user: MockUser) {
  await page.context().addCookies([
    {
      name: 'bw_e2e_auth',
      value: Buffer.from(JSON.stringify(user)).toString('base64url'),
      url: 'http://localhost:3000',
      httpOnly: false,
      sameSite: 'Lax',
    },
  ]);

  // NextAuth session endpoint
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sessionPayload(user)),
    });
  });

  // Role endpoint
  await page.route('**/api/auth/role', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(roleResponse(user.role)),
    });
  });

  // User preferences — return minimal defaults
  await page.route('**/api/preferences*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ currency: 'BDT', theme: 'system' }),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });
}

/**
 * Set up all common mocks for a standard user session.
 * Includes auth + AI access + usage.
 */
export async function mockFullSession(
  page: Page,
  user: MockUser,
  aiAccess: unknown,
  aiUsage?: unknown,
) {
  await mockAuth(page, user);
  await mockApiRoute(page, '/api/assistant/access', aiAccess);
  if (aiUsage) {
    await mockApiRoute(page, '/api/assistant/usage', aiUsage);
  }
}
