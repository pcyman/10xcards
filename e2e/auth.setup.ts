import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * Authentication setup file for Playwright tests
 *
 * This file handles authentication state management for e2e tests.
 * It can be used to create authenticated sessions that are reused across tests.
 */

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

/**
 * Setup authenticated state for tests
 *
 * This setup project logs in once and saves the authentication state.
 * Other tests can then reuse this state without logging in again.
 */
setup('authenticate', async ({ page }) => {
  // This is a placeholder - actual implementation depends on whether
  // you want to reuse auth state or login in each test

  // Example: Login and save state
  // await page.goto('/login');
  // await page.getByLabel('Email').fill('test@example.com');
  // await page.getByLabel('Password').fill('testpassword');
  // await page.getByRole('button', { name: /log in/i }).click();
  // await page.waitForURL('/decks');
  // await page.context().storageState({ path: authFile });
});
