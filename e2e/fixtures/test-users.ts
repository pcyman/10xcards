/**
 * Test user fixtures for e2e tests
 *
 * These fixtures provide consistent test data across all e2e tests.
 * Make sure these users exist in your test Supabase instance.
 */

export interface TestUser {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Default test user for authentication tests
 *
 * To use this user:
 * 1. Create a user in your Supabase test instance with these credentials
 * 2. Or override with environment variables:
 *    - E2E_TEST_EMAIL
 *    - E2E_TEST_PASSWORD
 */
export const TEST_USER: TestUser = {
  email: process.env.E2E_TEST_EMAIL || 'test@example.com',
  password: process.env.E2E_TEST_PASSWORD || 'Test123!@#',
  displayName: 'Test User',
};

/**
 * Additional test users for multi-user scenarios
 */
export const TEST_USERS = {
  user1: {
    email: process.env.E2E_TEST_USER1_EMAIL || 'user1@example.com',
    password: process.env.E2E_TEST_USER1_PASSWORD || 'User1Pass123!',
    displayName: 'User One',
  },
  user2: {
    email: process.env.E2E_TEST_USER2_EMAIL || 'user2@example.com',
    password: process.env.E2E_TEST_USER2_PASSWORD || 'User2Pass123!',
    displayName: 'User Two',
  },
};

/**
 * Invalid credentials for negative testing
 */
export const INVALID_CREDENTIALS = {
  nonexistent: {
    email: 'nonexistent@example.com',
    password: 'wrongpassword',
  },
  invalidEmail: {
    email: 'not-an-email',
    password: 'somepassword',
  },
  emptyEmail: {
    email: '',
    password: 'somepassword',
  },
  emptyPassword: {
    email: 'test@example.com',
    password: '',
  },
};
