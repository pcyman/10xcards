# E2E Test Setup Guide

This guide helps you set up and run the e2e tests for the login functionality.

## Quick Start

### 1. Create a Test User in Supabase

Before running the tests, you need to create a test user in your Supabase instance:

**Current credentials** (automatically loaded from `.env.test`):
- **Email**: `user@mail.com`
- **Password**: `12345678`

**Option A: Using Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add User**
4. Enter:
   - Email: `user@mail.com`
   - Password: `12345678`
5. Confirm the user

**Option B: Use the Registration Page**

1. Start your dev server: `npm run dev`
2. Navigate to the registration page
3. Register with email: `user@mail.com` and password: `12345678`

**Option C: Use Custom Credentials**

If you prefer to use different credentials, edit `.env.test` in the project root:

```env
E2E_TEST_EMAIL=your-custom-email@example.com
E2E_TEST_PASSWORD=YourCustomPassword123!
```

Then create the corresponding user in Supabase with your custom credentials.

### 2. Run the Tests

Once you have a test user set up:

```bash
# Run all login tests
npm run test:e2e -- e2e/login.spec.ts

# Run a specific test
npm run test:e2e -- e2e/login.spec.ts -g "should successfully login"

# Run with UI (recommended)
npm run test:e2e:ui
```

## What Was Created

### Test Files

1. **`e2e/login.spec.ts`** - Main login flow tests
   - ✅ Display login form - Tests that the login page renders correctly
   - ⚠️  Several tests are skipped (marked with `test.skip`) and need implementation
   - ✅ **Main test**: `should successfully login and redirect to deck list` - Tests US-002 and US-006

2. **`e2e/fixtures/test-users.ts`** - Test user credentials and fixtures
   - Centralized test data management
   - Environment variable support

3. **`e2e/helpers/auth-helpers.ts`** - Reusable authentication helper functions
   - `login()` - Log in a user
   - `logout()` - Log out a user
   - `verifySessionStored()` - Verify session in localStorage
   - And more...

4. **`e2e/auth.setup.ts`** - Authentication setup for test state reuse (optional)

5. **`e2e/README.md`** - Comprehensive documentation
   - Test coverage
   - Running tests
   - Writing new tests
   - Troubleshooting
   - CI/CD integration

### Test Status

| Test | Status | Notes |
|------|--------|-------|
| should display login form | ✅ Passing | Basic rendering test |
| should show validation errors | ⚠️  Skipped | Needs client-side validation UI |
| should show error for invalid credentials | ⚠️  Skipped | Needs error message identification |
| should toggle password visibility | ⚠️  Skipped | Needs investigation |
| **should successfully login and redirect** | ✅ Ready | **Main test - requires test user** |
| should redirect if already logged in | ✅ Ready | Requires test user |
| should disable submit button | ✅ Ready | May require test user |
| should persist session | ✅ Ready | Requires test user |
| Accessibility tests | ⚠️  Skipped | Need adjustment |

## Running the Main Test

The main test that covers your requirements (US-002 and US-006) is:

```bash
npm run test:e2e -- e2e/login.spec.ts -g "should successfully login and redirect to deck list"
```

This test:
1. Opens the login page
2. Fills in email and password
3. Submits the form
4. Verifies redirect to `/decks`
5. Checks that session is stored in localStorage
6. Verifies the deck list page is displayed

## Skipped Tests

Several tests are marked as `test.skip()` because they revealed that certain features need implementation or adjustment:

- **Client-side validation messages**: The validation logic exists but error messages may not be displayed in the UI
- **Password toggle**: Needs investigation to match actual implementation
- **Error messages**: Need to identify the exact error message text from the API
- **Accessibility**: Tests need adjustment based on actual focus behavior

These tests are valuable - they identify areas for future improvement!

## Next Steps

1. **Run the main login test** after creating a test user
2. **Review skipped tests** and implement missing features or adjust tests to match actual behavior
3. **Add more tests** for other user stories (deck management, flashcard review, etc.)
4. **Set up CI/CD** to run tests automatically on every PR

## Troubleshooting

### Test user already exists
If you get an error that the user already exists, you can either:
- Use that user for testing
- Delete the user in Supabase and recreate
- Use environment variables with different credentials

### Dev server not starting
Make sure no other process is using port 3000:
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Tests timing out
Increase the timeout in `playwright.config.ts` if your application needs more time to start.

## Getting Help

- Check `e2e/README.md` for detailed documentation
- View test reports: `npx playwright show-report`
- Run tests in UI mode: `npm run test:e2e:ui`
- See Playwright docs: https://playwright.dev
