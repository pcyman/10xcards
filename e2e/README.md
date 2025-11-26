# E2E Tests for 10xCards

This directory contains end-to-end (e2e) tests for the 10xCards application using Playwright.

## Test Coverage

### Login Flow (`login.spec.ts`)

Tests for **US-002: User Login** user story:

- **Form Rendering**: Verifies login form displays correctly with email, password fields, and submit button
- **Validation**: Tests client-side validation for empty fields and invalid email format
- **Authentication**: Tests successful login and failed login with invalid credentials
- **Redirection**: Verifies redirect to `/decks` after successful login (US-006)
- **Session Management**: Tests session persistence across page refreshes
- **UI State**: Tests password visibility toggle and submit button disabled state
- **Security**: Verifies error messages don't reveal whether email or password was incorrect
- **Accessibility**: Tests keyboard navigation and ARIA attributes

## Prerequisites

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Test User

The tests automatically load credentials from `.env.test` in the project root.

**Current credentials** (from `.env.test`):
- **Email**: `user@mail.com`
- **Password**: `12345678`

#### Option A: Create Test User in Supabase (Recommended)

Create a test user in your Supabase instance with the credentials above:

You can create this user through:
1. Supabase Dashboard → Authentication → Users → Add User
2. Or using the Supabase CLI
3. Or by registering through your application's registration page

#### Option B: Use Environment Variables

Set custom test credentials via environment variables:

```bash
# .env.test or .env.local
E2E_TEST_EMAIL=your-test-user@example.com
E2E_TEST_PASSWORD=YourTestPassword123!
```

#### Option C: Mock API Responses (Advanced)

Use Playwright's request interception to mock the authentication API. This is useful for CI/CD environments where you don't want to rely on external services.

See `login.spec.ts` for examples of how to implement this approach.

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Tests in UI Mode (Recommended for Development)

```bash
npm run test:e2e:ui
```

This opens Playwright's interactive UI where you can:
- See tests running in real-time
- Debug failing tests
- Inspect DOM and network requests
- Time-travel through test execution

### Run Tests in Debug Mode

```bash
npm run test:e2e:debug
```

### Run Specific Test File

```bash
npx playwright test e2e/login.spec.ts
```

### Run Specific Test

```bash
npx playwright test e2e/login.spec.ts -g "should successfully login"
```

### Run Tests in Headed Mode

```bash
npx playwright test --headed
```

## Test Structure

```
e2e/
├── README.md                    # This file
├── login.spec.ts               # Login flow tests
├── auth.setup.ts               # Authentication setup (optional)
└── fixtures/
    └── test-users.ts           # Test user credentials and fixtures
```

## Configuration

Playwright configuration is located in `playwright.config.ts` at the project root.

Key settings:
- **Base URL**: `http://localhost:3000`
- **Dev Server**: Automatically starts with `npm run dev`
- **Browsers**: Chromium, Firefox, WebKit
- **Retries**: 2 retries on CI, 0 on local
- **Timeout**: 30 seconds per test

## Writing New Tests

### 1. Create a New Test File

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/your-page');
  });

  test('should do something', async ({ page }) => {
    // Your test code
  });
});
```

### 2. Use Test Fixtures

Import test data from `fixtures/test-users.ts`:

```typescript
import { TEST_USER, INVALID_CREDENTIALS } from './fixtures/test-users';

test('example', async ({ page }) => {
  await page.getByLabel(/email/i).fill(TEST_USER.email);
  await page.getByLabel(/password/i).fill(TEST_USER.password);
});
```

### 3. Follow Best Practices

- **Use role-based selectors**: `page.getByRole('button', { name: /submit/i })`
- **Use label selectors**: `page.getByLabel(/email/i)`
- **Avoid brittle selectors**: Don't use CSS classes or IDs that might change
- **Wait for navigation**: Use `page.waitForURL()` instead of arbitrary timeouts
- **Test user behavior**: Focus on what users see and do, not implementation details

## Debugging Failed Tests

### 1. Run in UI Mode

```bash
npm run test:e2e:ui
```

### 2. View Test Traces

Traces are automatically captured on test failure. View them with:

```bash
npx playwright show-report
```

### 3. Use Debug Mode

```bash
npm run test:e2e:debug
```

This opens Playwright Inspector where you can:
- Step through test execution
- Pause and resume
- Inspect page state at each step

### 4. Take Screenshots

Add screenshots to your tests:

```typescript
await page.screenshot({ path: 'screenshot.png' });
```

## CI/CD Integration

### GitHub Actions

The tests are configured to run in CI with the following features:

- Automatic retries on failure (2 retries)
- Test reports uploaded as artifacts
- Traces captured on failure
- Tests run in parallel across browsers

Example workflow configuration (add to `.github/workflows/test.yml`):

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Tests Fail with "Login failed"

- Verify the test user exists in Supabase
- Check credentials match those in `fixtures/test-users.ts` or environment variables
- Ensure Supabase is running and accessible
- Check `SUPABASE_URL` and `SUPABASE_KEY` environment variables

### Tests Timeout

- Increase timeout in `playwright.config.ts`
- Check if dev server is running (`npm run dev`)
- Verify network connectivity to Supabase

### "Element not found" Errors

- Check if the page has loaded completely
- Verify selectors match the actual page structure
- Use `await page.pause()` to inspect page state during test

### Browser Launch Fails

Install Playwright browsers:

```bash
npx playwright install
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Test Generator](https://playwright.dev/docs/codegen)
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)
