# E2E Test Troubleshooting Guide

This document covers common issues encountered when writing and running e2e tests with Playwright for React applications.

## Issue: Tests Not Working with React Controlled Inputs

### Problem

When testing login functionality, the test appeared to fill the email and password fields, but the form submission failed. The fields would be cleared, but no redirect occurred. The application worked fine when used manually.

### Root Cause

**Playwright's `fill()` method doesn't properly trigger React's `onChange` events for controlled components.**

In React, controlled inputs manage their value through component state:

```tsx
<input
  value={formData.email}
  onChange={handleEmailChange}  // Updates state
/>
```

When you use `page.locator('#email').fill('test@example.com')`:
1. The DOM value changes
2. But React's `onChange` handler is **not triggered**
3. The component state remains empty
4. Form validation/submission uses the empty state, not the DOM value

### Solution

Use `type()` instead of `fill()` with these steps:

```typescript
// ❌ WRONG - Doesn't trigger React onChange
await page.locator('#email').fill(TEST_USER.email);
await page.locator('#password').fill(TEST_USER.password);

// ✅ CORRECT - Triggers React onChange properly
const emailInput = page.locator('#email');
const passwordInput = page.locator('#password');

await emailInput.click();
await emailInput.clear();
await emailInput.type(TEST_USER.email, { delay: 10 });

await passwordInput.click();
await passwordInput.clear();
await passwordInput.type(TEST_USER.password, { delay: 10 });
```

### Why This Works

`type()` simulates actual keyboard input character by character:
- Each keystroke triggers React's synthetic events
- `onChange` handlers are called for each character
- Component state updates correctly
- Form validation and submission work as expected

The `{ delay: 10 }` option adds a small delay between keystrokes to better simulate human typing and ensure all events are processed.

## Issue: Test Credentials Not Loading

### Problem

Tests use hardcoded credentials instead of loading from `.env.test`.

### Solution

Ensure `playwright.config.ts` loads environment variables:

```typescript
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.test') });
```

Install dotenv if not already installed:
```bash
npm install --save-dev dotenv
```

## Issue: "ENOENT: no such file or directory, open 'playwright-report/...'"

### Problem

After running tests, the application shows errors trying to load Playwright report assets.

### Root Cause

Playwright's HTML report server runs in the background after tests complete. If you navigate to the same port, the browser caches resources from the report.

### Solution

1. Kill the Playwright report server:
   ```bash
   pkill -f "playwright show-report"
   # or
   lsof -ti:9323 | xargs kill -9
   ```

2. Hard refresh your browser:
   - Chrome/Edge: `Ctrl + Shift + R`
   - Firefox: `Ctrl + F5`

3. Add test artifacts to `.gitignore`:
   ```
   playwright-report/
   test-results/
   playwright/.auth/
   ```

## Issue: Waiting for API Responses

### Problem

Need to verify the login API is called and successful before checking redirect.

### Solution

Set up response listener before clicking submit:

```typescript
const [response] = await Promise.all([
  page.waitForResponse(
    (response) => response.url().includes('/api/auth/login'),
    { timeout: 10000 }
  ),
  submitButton.click(),
]);

// Check if login was successful
if (!response.ok()) {
  const errorText = await response.text();
  throw new Error(`Login failed with status ${response.status()}: ${errorText}`);
}
```

This pattern ensures:
1. The response listener is set up **before** the click
2. Both operations run in parallel
3. You get helpful error messages if login fails

## Issue: Server-Side vs Client-Side Authentication

### Problem

Test expects server-side redirect after login, but auth is stored in localStorage (client-side only).

### Explanation

If your app stores sessions in `localStorage`:
- Server-side redirects won't work (server can't access localStorage)
- Tests checking for immediate server redirects will fail
- This is an architectural limitation, not a test bug

### Solution Options

1. **Skip the test** if server-side redirect isn't implemented:
   ```typescript
   test.skip('should redirect if already logged in', async ({ page }) => {
     // TODO: Requires cookie-based auth for server-side redirect
   });
   ```

2. **Implement cookie-based auth** if server-side redirects are needed

3. **Test client-side redirect instead**:
   ```typescript
   test('should redirect on client when session exists', async ({ page }) => {
     // Set localStorage before navigating
     await page.addInitScript((session) => {
       localStorage.setItem('session', JSON.stringify(session));
     }, mockSession);

     await page.goto('/login');
     // Should be redirected by client-side JavaScript
     await expect(page).toHaveURL('/decks');
   });
   ```

## Best Practices for React Testing

### 1. Always Use `type()` for Controlled Inputs

```typescript
// Pattern for all controlled React inputs
await input.click();
await input.clear();
await input.type(value, { delay: 10 });
```

### 2. Wait for Network Requests

```typescript
// Wait for specific API calls
const response = await page.waitForResponse(
  (resp) => resp.url().includes('/api/endpoint'),
  { timeout: 10000 }
);
```

### 3. Verify State Changes

```typescript
// Check localStorage, cookies, etc.
const session = await page.evaluate(() =>
  localStorage.getItem('session')
);
expect(session).not.toBeNull();
```

### 4. Use Descriptive Error Messages

```typescript
if (!response.ok()) {
  const errorText = await response.text();
  throw new Error(`Login failed with status ${response.status()}: ${errorText}`);
}
```

## Common Patterns

### Login Helper

```typescript
export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');

  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');

  await emailInput.click();
  await emailInput.clear();
  await emailInput.type(user.email, { delay: 10 });

  await passwordInput.click();
  await passwordInput.clear();
  await passwordInput.type(user.password, { delay: 10 });

  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL('/decks', { timeout: 10000 });
}
```

### Form Submission with Validation

```typescript
// Fill form
await fillForm(page, formData);

// Set up listeners before submitting
const [response, navigation] = await Promise.all([
  page.waitForResponse((r) => r.url().includes('/api/submit')),
  page.getByRole('button', { name: /submit/i }).click(),
  page.waitForURL('/success'),  // If redirect expected
]);

// Verify success
expect(response.status()).toBe(200);
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Testing React Apps with Playwright](https://playwright.dev/docs/testing-library)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
