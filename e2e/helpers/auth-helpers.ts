import { Page, expect } from '@playwright/test';
import { TEST_USER, type TestUser } from '../fixtures/test-users';

/**
 * Authentication helper functions for e2e tests
 *
 * These helpers provide reusable functions for common authentication operations
 * to reduce code duplication across test files.
 */

/**
 * Login with the provided credentials
 *
 * @param page - Playwright page object
 * @param user - User credentials (defaults to TEST_USER)
 * @returns Promise that resolves when login is complete
 */
export async function login(page: Page, user: TestUser = TEST_USER): Promise<void> {
  // Navigate to login page if not already there
  if (!page.url().includes('/login')) {
    await page.goto('/login');
  }

  // Fill login form using type() to trigger React onChange events
  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');

  await emailInput.click();
  await emailInput.clear();
  await emailInput.type(user.email, { delay: 10 });

  await passwordInput.click();
  await passwordInput.clear();
  await passwordInput.type(user.password, { delay: 10 });

  // Submit form
  await page.getByRole('button', { name: /log in/i }).click();

  // Wait for redirect to deck list
  await page.waitForURL('/decks', { timeout: 10000 });
}

/**
 * Logout the current user
 *
 * @param page - Playwright page object
 * @returns Promise that resolves when logout is complete
 */
export async function logout(page: Page): Promise<void> {
  // Navigate to decks page if not already there
  if (!page.url().includes('/decks')) {
    await page.goto('/decks');
  }

  // Click logout button
  await page.getByRole('button', { name: /log out|logout/i }).click();

  // Wait for redirect to login page
  await page.waitForURL('/login', { timeout: 10000 });
}

/**
 * Check if user is logged in
 *
 * @param page - Playwright page object
 * @returns Promise that resolves to true if logged in, false otherwise
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const sessionData = await page.evaluate(() => {
    return localStorage.getItem('session');
  });

  return sessionData !== null;
}

/**
 * Get the current session from localStorage
 *
 * @param page - Playwright page object
 * @returns Promise that resolves to the session object or null
 */
export async function getSession(page: Page): Promise<any | null> {
  const sessionData = await page.evaluate(() => {
    return localStorage.getItem('session');
  });

  if (!sessionData) {
    return null;
  }

  return JSON.parse(sessionData);
}

/**
 * Clear the current session
 *
 * @param page - Playwright page object
 * @returns Promise that resolves when session is cleared
 */
export async function clearSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('session');
  });
}

/**
 * Verify user is on the deck list page
 *
 * @param page - Playwright page object
 * @returns Promise that resolves when verification is complete
 */
export async function verifyOnDeckListPage(page: Page): Promise<void> {
  // Verify URL
  await expect(page).toHaveURL('/decks');

  // Verify deck list heading is visible
  await expect(
    page.getByRole('heading', { name: /decks|my decks/i })
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Verify user is on the login page
 *
 * @param page - Playwright page object
 * @returns Promise that resolves when verification is complete
 */
export async function verifyOnLoginPage(page: Page): Promise<void> {
  // Verify URL
  await expect(page).toHaveURL(/\/login/);

  // Verify login form is visible
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
}

/**
 * Fill login form without submitting
 *
 * @param page - Playwright page object
 * @param user - User credentials
 * @returns Promise that resolves when form is filled
 */
export async function fillLoginForm(
  page: Page,
  user: TestUser = TEST_USER
): Promise<void> {
  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');

  await emailInput.click();
  await emailInput.clear();
  await emailInput.type(user.email, { delay: 10 });

  await passwordInput.click();
  await passwordInput.clear();
  await passwordInput.type(user.password, { delay: 10 });
}

/**
 * Verify session is stored in localStorage
 *
 * @param page - Playwright page object
 * @returns Promise that resolves when verification is complete
 */
export async function verifySessionStored(page: Page): Promise<void> {
  const sessionData = await page.evaluate(() => {
    return localStorage.getItem('session');
  });

  expect(sessionData).not.toBeNull();

  const session = JSON.parse(sessionData || '{}');
  expect(session).toHaveProperty('access_token');
  expect(session).toHaveProperty('refresh_token');
  expect(session).toHaveProperty('expires_at');
}
