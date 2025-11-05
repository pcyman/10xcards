# Authentication System Architecture Specification

**Project:** AI Flashcard Learning Platform
**Version:** 1.0
**Date:** 2025-11-05
**Status:** Technical Specification

---

## Table of Contents

1. [Overview](#1-overview)
2. [User Interface Architecture](#2-user-interface-architecture)
3. [Backend Logic](#3-backend-logic)
4. [Authentication System](#4-authentication-system)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
6. [Security Considerations](#6-security-considerations)
7. [Implementation Dependencies](#7-implementation-dependencies)

---

## 1. Overview

### 1.1 Purpose

This specification defines the authentication architecture for implementing user registration, login, logout, and persistent session management using Supabase Auth integrated with Astro SSR.

### 1.2 Requirements Coverage

This specification addresses the following user stories from the PRD:

- **US-001**: User Registration - Create account with email/password, no verification
- **US-002**: User Login - Authenticate with credentials, create session
- **US-003**: User Logout - Terminate session, secure cleanup
- **US-004**: Persistent Authentication - Maintain session across browser sessions

### 1.3 Architecture Principles

- **Server-First Authentication**: All auth operations processed server-side via Supabase Auth
- **Cookie-Based Sessions**: HTTP-only cookies for secure session management
- **Progressive Enhancement**: Forms work without JavaScript, enhanced with React
- **Route Protection**: Middleware-based authentication checking
- **Stateless Session Validation**: Every request validates session via Supabase Auth

### 1.4 Technology Integration

- **Supabase Auth**: Authentication service with email/password provider
- **Astro SSR**: Server-side rendering with middleware for auth state
- **React 19**: Interactive forms with client-side validation
- **Tailwind CSS 4**: Styling for auth forms and UI components
- **Shadcn/ui**: Base components for forms, buttons, and inputs

---

## 2. User Interface Architecture

### 2.1 Page Structure

#### 2.1.1 Unauthenticated Pages

**Login Page** (`src/pages/auth/login.astro`)

- **Purpose**: User authentication entry point
- **Route**: `/auth/login`
- **Access**: Public only (redirects authenticated users to dashboard)
- **Layout**: Minimal layout without navigation
- **Components**:
  - `LoginForm` (React component)
  - Error message display
  - Link to registration page
- **Server-Side Logic**:
  - Check for existing session, redirect if authenticated
  - Pass error/success messages from URL params to component

**Registration Page** (`src/pages/auth/register.astro`)

- **Purpose**: New user account creation
- **Route**: `/auth/register`
- **Access**: Public only (redirects authenticated users to dashboard)
- **Layout**: Minimal layout without navigation
- **Components**:
  - `RegisterForm` (React component)
  - Error message display
  - Link to login page
- **Server-Side Logic**:
  - Check for existing session, redirect if authenticated
  - Pass validation errors from URL params to component

#### 2.1.2 Authenticated Pages

**Dashboard Page** (`src/pages/dashboard/index.astro`)

- **Purpose**: Main authenticated landing page showing user's decks
- **Route**: `/dashboard`
- **Access**: Authenticated only (redirects to login if not authenticated)
- **Layout**: Authenticated layout with navigation and logout
- **Components**:
  - Navigation header with user info and logout button
  - Deck list component
  - "Create Deck" action button
- **Server-Side Logic**:
  - Verify session via middleware
  - Fetch user's decks data
  - Pass user object to layout

**Protected Routes** (Existing and Future)

All routes under `/dashboard/*` require authentication:
- `/dashboard/decks/[deckId]` - Deck detail view
- `/dashboard/decks/[deckId]/study` - Study session
- `/dashboard/decks/[deckId]/flashcards/new` - Create flashcard

### 2.2 Layout Architecture

#### 2.2.1 Unauthenticated Layout (`src/layouts/UnauthLayout.astro`)

**Purpose**: Minimal layout for login/register pages

**Structure**:
```
<html>
  <head>
    - Meta tags
    - Title: "Login | 10xCards" or "Register | 10xCards"
    - Favicon
    - Global styles
  </head>
  <body>
    <main class="auth-container">
      - Centered card layout
      - <slot /> for page content
      - Footer with links (optional)
    </main>
  </body>
</html>
```

**Styling**:
- Centered vertically and horizontally
- Max width 400px for forms
- Card-based design with shadow
- Responsive mobile layout

**Props**:
```typescript
interface Props {
  title: string;
  description?: string;
}
```

#### 2.2.2 Authenticated Layout (`src/layouts/AuthenticatedLayout.astro`)

**Purpose**: Full layout with navigation for authenticated pages

**Structure**:
```
<html>
  <head>
    - Meta tags
    - Title with page context
    - Favicon
    - Global styles
  </head>
  <body>
    <Header>
      - App logo/name
      - Navigation links
      - User menu with logout
    </Header>
    <main class="app-container">
      - Sidebar navigation (optional)
      - <slot /> for page content
    </main>
    <Footer>
      - Copyright
      - Links (if needed)
    </Footer>
  </body>
</html>
```

**Props**:
```typescript
interface Props {
  title: string;
  user: {
    id: string;
    email: string;
  };
}
```

**Server-Side Requirements**:
- Receives user object from middleware
- Must validate session before rendering
- Provides logout button/link in header

**Components Used**:
- `UserMenu` (React) - Dropdown with user email and logout
- `NavigationHeader` (Astro) - Top navigation bar

### 2.3 React Components

#### 2.3.1 RegisterForm Component (`src/components/auth/RegisterForm.tsx`)

**Purpose**: Interactive registration form with client-side validation

**Props**:
```typescript
interface RegisterFormProps {
  initialError?: string;
  redirectTo?: string;
}
```

**State Management**:
```typescript
interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;
  errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  };
}
```

**Validation Rules**:

Email Validation:
- Required field
- Valid email format (RFC 5322 basic validation)
- Error: "Please enter a valid email address"
- No uniqueness check on client (handled server-side)

Password Validation:
- Minimum 8 characters
- Error messages:
  - "Password must be at least 8 characters"

Confirm Password Validation:
- Must match password field
- Error: "Passwords do not match"

**Form Behavior**:

1. **Real-time Validation**: Validate on blur for each field
2. **Submit Validation**: Validate all fields before submission
3. **Loading State**: Disable form and show spinner during submission
4. **Server Errors**: Display error message above form on failure
5. **Accessibility**:
   - Form labels with `htmlFor` attributes
   - ARIA error messages linked to inputs
   - Focus management on error states
   - Submit button disabled during submission with `aria-busy`

**Form Submission**:
- Method: POST
- Action: `/api/auth/register`
- Content-Type: `application/json`
- On Success: Redirect to `/dashboard`
- On Failure: Display error message, re-enable form

**Error Display Scenarios**:
- "Email already registered. Please login instead."
- "Password does not meet security requirements"
- "Registration failed. Please try again."
- Network error: "Unable to connect. Please check your internet connection."

#### 2.3.2 LoginForm Component (`src/components/auth/LoginForm.tsx`)

**Purpose**: Interactive login form with client-side validation

**Props**:
```typescript
interface LoginFormProps {
  initialError?: string;
  redirectTo?: string;
}
```

**State Management**:
```typescript
interface FormState {
  email: string;
  password: string;
  isSubmitting: boolean;
  errors: {
    email?: string;
    password?: string;
    form?: string;
  };
}
```

**Validation Rules**:

Email Validation:
- Required field
- Basic format check (non-empty, contains @)
- Error: "Please enter your email address"

Password Validation:
- Required field
- No strength checking (any password accepted for login)
- Error: "Please enter your password"

**Form Behavior**:

1. **Minimal Client Validation**: Only check for non-empty fields
2. **Submit Validation**: Validate all fields before submission
3. **Loading State**: Disable form and show spinner during submission
4. **Server Errors**: Display error without revealing whether email or password was incorrect
5. **Accessibility**: Same as RegisterForm

**Form Submission**:
- Method: POST
- Action: `/api/auth/login`
- Content-Type: `application/json`
- On Success: Redirect to `/dashboard` or `redirectTo` param
- On Failure: Display generic error message

**Error Display**:
- Generic message: "Invalid email or password"
- Network error: "Unable to connect. Please check your internet connection."
- No distinction between non-existent user and wrong password (security best practice)

#### 2.3.3 UserMenu Component (`src/components/auth/UserMenu.tsx`)

**Purpose**: Dropdown menu with user info and logout action

**Props**:
```typescript
interface UserMenuProps {
  userEmail: string;
}
```

**Structure**:
- Trigger: User email or avatar (shows first letter of email)
- Dropdown Content:
  - User email (non-interactive, muted text)
  - Divider
  - "Settings" link (future enhancement, disabled in MVP)
  - "Logout" button

**Logout Behavior**:
- On Click: POST request to `/api/auth/logout`
- Loading State: Show spinner, disable button
- On Success: Redirect to `/auth/login`
- On Error: Show error toast/message

**Shadcn/ui Components Used**:
- `DropdownMenu`
- `DropdownMenuTrigger`
- `DropdownMenuContent`
- `DropdownMenuItem`
- `DropdownMenuSeparator`

**Accessibility**:
- Keyboard navigation support
- `aria-label` for dropdown trigger
- Focus management
- Escape key closes dropdown

#### 2.3.4 LogoutButton Component (`src/components/auth/LogoutButton.tsx`)

**Purpose**: Standalone logout button for alternate layouts

**Props**:
```typescript
interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}
```

**Behavior**:
- Same logout logic as UserMenu
- Can be styled differently based on props
- Shows loading spinner during logout

**Usage Context**:
- Mobile navigation menu
- Settings page
- Alternate layouts where UserMenu doesn't fit

### 2.4 Form Validation Architecture

#### 2.4.1 Client-Side Validation

**Purpose**: Provide immediate feedback, reduce server load

**Implementation**:
- Custom validation hooks: `useFormValidation`
- Zod schemas for validation rules (shared with server)
- Real-time validation on blur events
- Pre-submit validation check

**Validation Hook Structure**:
```typescript
// src/hooks/useFormValidation.ts
interface ValidationHook<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  handleChange: (field: keyof T, value: string) => void;
  handleBlur: (field: keyof T) => void;
  validateAll: () => boolean;
  resetForm: () => void;
}
```

**Validation Schemas**:
```typescript
// src/lib/validation/auth.schemas.ts
export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().min(1, "Please enter your email address"),
  password: z.string().min(1, "Please enter your password"),
});
```

#### 2.4.2 Server-Side Validation

**Purpose**: Enforce security, handle business logic validation

**Implementation**:
- Same Zod schemas used on client
- Additional checks not suitable for client (email uniqueness)
- Sanitization of inputs
- Protection against injection attacks

**Validation Flow**:
1. Parse request body
2. Validate against Zod schema
3. Check business rules (e.g., email uniqueness)
4. Return detailed errors for debugging (internal) or generic errors (client)

### 2.5 Error Handling and User Feedback

#### 2.5.1 Error Types

**Validation Errors**:
- Display inline below affected field
- Red text with error icon
- Focus on first error field
- Clear on user correction

**Authentication Errors**:
- Display at top of form in error banner
- Generic message for security
- Dismissible by user
- Auto-dismiss after navigation

**Network Errors**:
- Display in error banner
- Include retry action button
- Different styling (orange/yellow)
- More descriptive message

**Server Errors**:
- Display generic message to user
- Log detailed error server-side
- Provide support contact info
- Include error tracking ID (future enhancement)

#### 2.5.2 Success Feedback

**Registration Success**:
- Automatic redirect to dashboard
- Optional: Welcome toast on dashboard
- Pre-populate user data

**Login Success**:
- Automatic redirect to original destination or dashboard
- No additional feedback needed (smooth transition)

**Logout Success**:
- Redirect to login page
- Optional: "You have been logged out" message
- Clear all local state

#### 2.5.3 Loading States

**Form Submission**:
- Disable all form inputs
- Disable submit button
- Show spinner inside submit button
- Change button text to "Registering..." or "Logging in..."
- Maintain button width to prevent layout shift

**Page Transitions**:
- Use Astro View Transitions for smooth navigation
- Show loading indicator for longer requests
- Maintain scroll position where appropriate

### 2.6 Accessibility Requirements

#### 2.6.1 WCAG 2.1 Level AA Compliance

**Keyboard Navigation**:
- All form inputs accessible via Tab key
- Submit with Enter key
- Skip links for screen readers
- Focus visible indicators

**Screen Reader Support**:
- Semantic HTML elements (`<form>`, `<label>`, `<input>`)
- ARIA labels for icon buttons
- ARIA live regions for dynamic error messages
- ARIA invalid state for fields with errors

**Visual Accessibility**:
- Color contrast ratio 4.5:1 minimum
- Error indication not relying solely on color
- Focus indicators visible with 3:1 contrast
- Text resizable up to 200% without loss of functionality

**Form Accessibility**:
- Labels associated with inputs via `htmlFor`
- Required fields marked with `aria-required="true"`
- Error messages linked via `aria-describedby`
- Password visibility toggle button with clear label

#### 2.6.2 Component-Specific Accessibility

**RegisterForm**:
- Form landmark with `<form role="form" aria-label="Registration form">`
- Password strength indicator with `aria-live="polite"`
- Show/hide password button with `aria-label="Toggle password visibility"`

**LoginForm**:
- Form landmark with `<form role="form" aria-label="Login form">`
- "Forgot password?" link clearly labeled (disabled in MVP)

**UserMenu**:
- Menu button with `aria-haspopup="true"`
- Menu items with proper roles
- Current selection indicated with `aria-current`

---

## 3. Backend Logic

### 3.1 API Endpoint Architecture

#### 3.1.1 Register Endpoint

**Endpoint**: `POST /api/auth/register`
**File**: `src/pages/api/auth/register.ts`
**Access**: Public (unauthenticated only)

**Request Contract**:
```typescript
// Request Body
interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

// Headers
Content-Type: application/json
```

**Response Contracts**:

Success (201 Created):
```typescript
interface RegisterSuccessResponse {
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

// Cookies Set:
// - sb-access-token (HTTP-only, Secure, SameSite=Lax)
// - sb-refresh-token (HTTP-only, Secure, SameSite=Lax)
```

Validation Error (400 Bad Request):
```typescript
interface RegisterValidationError {
  error: {
    message: string;
    field?: string;
    code: "VALIDATION_ERROR";
  };
}

// Examples:
{
  error: {
    message: "Email is required",
    field: "email",
    code: "VALIDATION_ERROR"
  }
}
```

Conflict Error (409 Conflict):
```typescript
interface RegisterConflictError {
  error: {
    message: "Email already registered",
    code: "EMAIL_ALREADY_EXISTS";
  };
}
```

Server Error (500 Internal Server Error):
```typescript
interface RegisterServerError {
  error: {
    message: "Registration failed. Please try again.",
    code: "INTERNAL_ERROR";
  };
}
```

**Processing Logic**:

1. **Request Validation**:
   - Check Content-Type is application/json
   - Parse request body with error handling
   - Validate against Zod schema `registerSchema`
   - Return 400 with validation errors if invalid

2. **Business Logic Validation**:
   - Check if email already exists (implicit in Supabase Auth)
   - No additional uniqueness check needed

3. **User Creation**:
   - Call `supabase.auth.signUp()` with email and password
   - Handle Supabase Auth errors:
     - User already registered → 409 Conflict
     - Weak password → 400 Validation Error
     - Rate limit exceeded → 429 Too Many Requests
     - Service unavailable → 503 Service Unavailable

4. **Session Creation**:
   - Supabase Auth automatically creates session
   - Extract access_token and refresh_token from response
   - Set HTTP-only cookies with tokens
   - Cookie settings:
     - `httpOnly: true`
     - `secure: true` (production only)
     - `sameSite: "lax"`
     - `path: "/"`
     - `maxAge: 7 days` (refresh token), `maxAge: 1 hour` (access token)

5. **Response**:
   - Return 201 with user object and session info
   - Redirect handled client-side

**Error Handling Strategy**:
- Log all errors server-side with context
- Return generic errors to client for security
- Track error rates for monitoring
- Implement rate limiting (future enhancement)

**Security Considerations**:
- Passwords never logged or stored plainly
- Email verification disabled (per MVP requirements)
- Rate limiting on endpoint (future: 5 requests per minute per IP)
- CSRF protection via same-site cookies

#### 3.1.2 Login Endpoint

**Endpoint**: `POST /api/auth/login`
**File**: `src/pages/api/auth/login.ts`
**Access**: Public (unauthenticated only)

**Request Contract**:
```typescript
// Request Body
interface LoginRequest {
  email: string;
  password: string;
}

// Headers
Content-Type: application/json
```

**Response Contracts**:

Success (200 OK):
```typescript
interface LoginSuccessResponse {
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

// Cookies Set: (same as register)
```

Authentication Error (401 Unauthorized):
```typescript
interface LoginAuthError {
  error: {
    message: "Invalid email or password",
    code: "INVALID_CREDENTIALS";
  };
}
```

Validation Error (400 Bad Request):
```typescript
interface LoginValidationError {
  error: {
    message: string;
    field?: string;
    code: "VALIDATION_ERROR";
  };
}
```

Server Error (500):
```typescript
// Same as register endpoint
```

**Processing Logic**:

1. **Request Validation**:
   - Parse and validate request body
   - Check for non-empty email and password
   - Return 400 if validation fails

2. **Authentication**:
   - Call `supabase.auth.signInWithPassword({ email, password })`
   - Handle Supabase Auth responses:
     - Success → Extract session
     - Invalid credentials → 401 Unauthorized
     - Email not confirmed → N/A (email confirmation disabled)
     - Rate limited → 429 Too Many Requests

3. **Session Creation**:
   - Same cookie handling as register endpoint
   - Set both access and refresh tokens

4. **Response**:
   - Return 200 with user and session info
   - Generic error message on failure (security)

**Error Handling**:
- Do not distinguish between "user not found" and "wrong password"
- Log failed attempts for security monitoring
- Implement login attempt rate limiting (future)

**Security Considerations**:
- Timing-safe comparison (handled by Supabase)
- Account lockout after X failed attempts (future)
- Log suspicious activity patterns
- No password hints or suggestions

#### 3.1.3 Logout Endpoint

**Endpoint**: `POST /api/auth/logout`
**File**: `src/pages/api/auth/logout.ts`
**Access**: Authenticated only

**Request Contract**:
```typescript
// No request body needed
// Authentication via cookies
```

**Response Contracts**:

Success (200 OK):
```typescript
interface LogoutSuccessResponse {
  message: "Logged out successfully";
}

// Cookies Cleared:
// - sb-access-token (deleted)
// - sb-refresh-token (deleted)
```

Unauthorized (401):
```typescript
interface LogoutUnauthorizedError {
  error: {
    message: "Not authenticated",
    code: "UNAUTHORIZED";
  };
}
```

**Processing Logic**:

1. **Session Verification**:
   - Extract access token from cookies
   - Verify token is valid (handled by middleware)
   - Return 401 if no valid session

2. **Logout Operation**:
   - Call `supabase.auth.signOut()`
   - Invalidate refresh token server-side
   - Clear session from Supabase Auth

3. **Cookie Cleanup**:
   - Delete access_token cookie
   - Delete refresh_token cookie
   - Set both with `maxAge: 0` and empty value

4. **Response**:
   - Return 200 with success message
   - Client handles redirect to login page

**Error Handling**:
- Gracefully handle already logged-out sessions
- Log logout events for audit trail
- Clear cookies even if Supabase logout fails

#### 3.1.4 Session Refresh Endpoint

**Endpoint**: `POST /api/auth/refresh`
**File**: `src/pages/api/auth/refresh.ts`
**Access**: Public (uses refresh token)

**Purpose**: Refresh expired access token using refresh token

**Request Contract**:
```typescript
// No request body
// Refresh token from cookies
```

**Response Contracts**:

Success (200 OK):
```typescript
interface RefreshSuccessResponse {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

// Updated Cookies
```

Unauthorized (401):
```typescript
interface RefreshUnauthorizedError {
  error: {
    message: "Invalid refresh token",
    code: "INVALID_REFRESH_TOKEN";
  };
}
```

**Processing Logic**:

1. **Extract Refresh Token**:
   - Get refresh_token from cookies
   - Return 401 if missing

2. **Refresh Session**:
   - Call `supabase.auth.refreshSession({ refresh_token })`
   - Supabase validates token and issues new tokens

3. **Update Cookies**:
   - Set new access_token
   - Set new refresh_token (may be rotated)
   - Update expiration times

4. **Response**:
   - Return new session data
   - Client can retry original request

**Usage**:
- Called automatically by middleware when access token expires
- Can be called explicitly by client on 401 responses
- Implements token rotation for security (Supabase feature)

#### 3.1.5 Current User Endpoint

**Endpoint**: `GET /api/auth/me`
**File**: `src/pages/api/auth/me.ts`
**Access**: Authenticated only

**Purpose**: Get current user information for client-side state

**Response Contracts**:

Success (200 OK):
```typescript
interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    created_at: string;
  };
}
```

Unauthorized (401):
```typescript
interface CurrentUserUnauthorizedError {
  error: {
    message: "Not authenticated",
    code: "UNAUTHORIZED";
  };
}
```

**Processing Logic**:

1. **Session Verification**:
   - Middleware validates session
   - Extract user from context.locals

2. **User Data**:
   - Get user from `supabase.auth.getUser()`
   - Return sanitized user object

3. **Response**:
   - Return user data
   - No sensitive information included

**Usage**:
- Called by client to verify session status
- Used to populate user menu
- Can be polled for session validation

### 3.2 Middleware Architecture

#### 3.2.1 Authentication Middleware

**File**: `src/middleware/index.ts` (extended)

**Purpose**: Validate sessions, refresh tokens, protect routes

**Middleware Flow**:

```typescript
// Import the server client factory from supabase.client.ts
import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "../db/supabase.client";

// High-level flow
export const onRequest = defineMiddleware(async (context, next) => {
  // 1. Initialize Supabase client with cookie handling
  const supabase = createServerClient(context);

  // 2. Attach to context
  context.locals.supabase = supabase;

  // 3. Get session from cookies
  const session = await getSession(supabase);

  // 4. Attach user to context if authenticated
  if (session?.user) {
    context.locals.user = session.user;
  }

  // 5. Check route protection
  const { pathname } = context.url;
  const isProtected = isProtectedRoute(pathname);
  const isAuthRoute = isAuthenticationRoute(pathname);

  // 6. Handle protected routes
  if (isProtected && !session) {
    return redirectToLogin(context);
  }

  // 7. Handle auth routes (redirect if already logged in)
  if (isAuthRoute && session) {
    return redirectToDashboard(context);
  }

  // 8. Continue to route handler
  return next();
});
```

**Note**: The `createServerClient` function is imported from `src/db/supabase.client.ts` where it's defined with cookie storage handlers. See section 4.1.2 for the complete implementation.

**Key Functions**:

**getSession**:
```typescript
// Gets session from cookies, refreshes if expired
async function getSession(supabase: SupabaseClient) {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Session error:", error);
    return null;
  }

  return session;
}
```

**isProtectedRoute**:
```typescript
// Checks if route requires authentication
function isProtectedRoute(pathname: string): boolean {
  const protectedPaths = [
    '/dashboard',
    '/api/decks',
    '/api/flashcards',
  ];

  return protectedPaths.some(path => pathname.startsWith(path));
}
```

**isAuthenticationRoute**:
```typescript
// Checks if route is login/register
function isAuthenticationRoute(pathname: string): boolean {
  const authPaths = ['/auth/login', '/auth/register'];
  return authPaths.includes(pathname);
}
```

**redirectToLogin**:
```typescript
// Redirects to login with return URL
function redirectToLogin(context: APIContext): Response {
  const returnUrl = encodeURIComponent(context.url.pathname + context.url.search);
  return context.redirect(`/auth/login?redirect=${returnUrl}`, 302);
}
```

**redirectToDashboard**:
```typescript
// Redirects authenticated users away from auth pages
function redirectToDashboard(context: APIContext): Response {
  return context.redirect('/dashboard', 302);
}
```

#### 3.2.2 Cookie Management

**Cookie Names**:
- `sb-access-token`: JWT access token
- `sb-refresh-token`: Refresh token for session renewal

**Cookie Configuration**:
```typescript
interface CookieOptions {
  httpOnly: boolean;    // true - prevents XSS attacks
  secure: boolean;      // true in production
  sameSite: 'lax';      // prevents CSRF
  path: '/';            // available to all routes
  maxAge: number;       // 3600 (1 hour) for access, 604800 (7 days) for refresh
}
```

**Cookie Helpers**:

**getCookie**:
```typescript
function getCookie(context: APIContext, name: string): string | null {
  return context.cookies.get(name)?.value ?? null;
}
```

**setCookie**:
```typescript
function setCookie(
  context: APIContext,
  name: string,
  value: string,
  options?: Partial<CookieOptions>
): void {
  context.cookies.set(name, value, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    ...options,
  });
}
```

**removeCookie**:
```typescript
function removeCookie(context: APIContext, name: string): void {
  context.cookies.delete(name, {
    path: '/',
  });
}
```

### 3.3 Server-Side Rendering Updates

#### 3.3.1 Authenticated Page Template

**Pattern for all protected Astro pages**:

```typescript
---
// src/pages/dashboard/index.astro
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.astro';

// Middleware ensures user exists, but type-check for safety
const user = Astro.locals.user;

if (!user) {
  // This should never happen due to middleware, but handle gracefully
  return Astro.redirect('/auth/login');
}

// Fetch user-specific data
const supabase = Astro.locals.supabase;
const { data: decks, error } = await supabase
  .from('decks')
  .select('*')
  .order('updated_at', { ascending: false });

if (error) {
  console.error('Error fetching decks:', error);
  // Handle error appropriately
}

// Mark as non-prerendered (SSR)
export const prerender = false;
---

<AuthenticatedLayout title="Dashboard" user={user}>
  <!-- Page content -->
</AuthenticatedLayout>
```

#### 3.3.2 API Route Template

**Pattern for authenticated API endpoints**:

```typescript
// src/pages/api/decks/index.ts
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals, request }) => {
  // Check authentication
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({
      error: {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED'
      }
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Access Supabase client
  const supabase = locals.supabase;

  // Perform operation (RLS automatically filters by user)
  const { data, error } = await supabase
    .from('decks')
    .select('*');

  if (error) {
    console.error('Database error:', error);
    return new Response(JSON.stringify({
      error: {
        message: 'Failed to fetch decks',
        code: 'DATABASE_ERROR'
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### 3.4 Input Validation and Sanitization

#### 3.4.1 Validation Schemas

**Location**: `src/lib/validation/auth.schemas.ts`

**Schemas**:

```typescript
import { z } from 'zod';

// Email validation
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email is too long');

// Password validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

// Registration schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

#### 3.4.2 Validation Helper

**Location**: `src/lib/validation/validator.ts`

```typescript
import { z } from 'zod';
import type { APIContext } from 'astro';

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

/**
 * Validates request body against Zod schema
 * Returns structured validation result
 */
export async function validateRequest<T>(
  context: APIContext,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await context.request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        errors[path] = issue.message;
      });

      return {
        success: false,
        errors,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      errors: {
        _form: 'Invalid request body',
      },
    };
  }
}

/**
 * Creates validation error response
 */
export function createValidationErrorResponse(
  errors: Record<string, string>
): Response {
  return new Response(JSON.stringify({
    error: {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      fields: errors,
    },
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

#### 3.4.3 Sanitization

**XSS Protection**:
- Astro automatically escapes HTML in templates
- React sanitizes JSX content
- API responses are JSON (no HTML injection)
- Content-Security-Policy headers (future enhancement)

**SQL Injection Protection**:
- Supabase client uses parameterized queries
- No raw SQL in application code
- RLS policies enforce access control

**Input Sanitization**:
- Trim whitespace from email/password inputs
- No need to sanitize passwords (hashed by Supabase)
- Email format validated by Zod

### 3.5 Error Handling Architecture

#### 3.5.1 Error Response Structure

**Standard Error Response**:
```typescript
interface ErrorResponse {
  error: {
    message: string;       // User-facing message
    code: string;          // Machine-readable code
    field?: string;        // Field name for validation errors
    fields?: Record<string, string>;  // Multiple field errors
    trackingId?: string;   // Error tracking ID (future)
  };
}
```

**Error Codes**:
```typescript
enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',

  // Resource errors (404)
  NOT_FOUND = 'NOT_FOUND',

  // Conflict errors (409)
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Service errors (503)
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
```

#### 3.5.2 Error Handler Utility

**Location**: `src/lib/errors/handler.ts`

```typescript
interface ErrorHandlerOptions {
  logError?: boolean;
  exposeDetails?: boolean;
}

/**
 * Handles errors and returns appropriate Response
 */
export function handleError(
  error: unknown,
  context: string,
  options: ErrorHandlerOptions = { logError: true, exposeDetails: false }
): Response {
  // Log error for debugging
  if (options.logError) {
    console.error(`[${context}]`, error);
  }

  // Handle Supabase errors
  if (isSupabaseError(error)) {
    return handleSupabaseError(error, options.exposeDetails);
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return handleValidationError(error);
  }

  // Handle known application errors
  if (error instanceof ApplicationError) {
    return createErrorResponse(
      error.message,
      error.code,
      error.statusCode
    );
  }

  // Generic server error
  return createErrorResponse(
    'An unexpected error occurred. Please try again.',
    ErrorCode.INTERNAL_ERROR,
    500
  );
}

/**
 * Creates error response with standard structure
 */
function createErrorResponse(
  message: string,
  code: string,
  status: number,
  additionalData?: Record<string, unknown>
): Response {
  return new Response(JSON.stringify({
    error: {
      message,
      code,
      ...additionalData,
    },
  }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

#### 3.5.3 Logging Strategy

**Development Environment**:
- Log all errors to console with full stack traces
- Log request details (body, headers, params)
- No sanitization of sensitive data

**Log Levels**:
- ERROR: Auth failures, database errors, unexpected exceptions
- WARN: Validation failures, rate limit hits
- INFO: Successful auth operations (login, logout)
- DEBUG: Session refresh, middleware operations (dev only)

### 3.6 Type System Updates

#### 3.6.1 Astro Locals Extension

**File**: `src/env.d.ts` (update)

```typescript
/// <reference types="astro/client" />

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './db/database.types';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user: {
        id: string;
        email: string;
      } | null;
    }
  }
}
```

#### 3.6.2 Auth Types

**File**: `src/types/auth.types.ts` (new)

```typescript
// User type from Supabase Auth
export interface User {
  id: string;
  email: string;
  created_at: string;
}

// Session type
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

// Auth state for client-side
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
```

---

## 4. Authentication System

### 4.1 Supabase Auth Integration

#### 4.1.1 Configuration

**Supabase Project Settings**:

Authentication Providers:
- Email/Password: Enabled
- Email Confirmation: Disabled (per MVP requirements)
- Email OTP: Disabled
- Phone: Disabled
- Social Providers: Disabled (future enhancement)

Auth Settings:
- JWT Expiry: 3600 seconds (1 hour)
- Refresh Token Rotation: Enabled
- Refresh Token Reuse Interval: 10 seconds
- JWT Secret: Auto-generated by Supabase
- Site URL: Environment-specific (http://localhost:3000, production URL)
- Redirect URLs: Whitelisted routes for OAuth (future)

Password Requirements (enforced by Supabase):
- Minimum length: 8 characters
- No maximum length limit enforced by Supabase (application enforces 128)
- Character requirements handled by application validation

#### 4.1.2 Supabase Client Initialization

**Location**: `src/db/supabase.client.ts` (update)

Current implementation creates a single client instance. For authentication, we need both:
1. **Anonymous Client**: For public operations (no auth required)
2. **Server Client Factory**: For per-request clients with cookie handling

**Updated Structure**:

```typescript
// src/db/supabase.client.ts

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { APIContext } from 'astro';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

// Anonymous client for server-side operations without auth context
// Used in API routes that don't need authentication
export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

/**
 * Creates a Supabase client configured for server-side auth
 * Uses cookies for session storage
 * Implements automatic token refresh
 *
 * This function should be called in middleware and authenticated routes
 * to create a client that can read/write session cookies
 */
export function createServerClient(
  context: APIContext
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: {
        getItem: (key: string) => {
          return context.cookies.get(key)?.value ?? null;
        },
        setItem: (key: string, value: string) => {
          context.cookies.set(key, value, {
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
          });
        },
        removeItem: (key: string) => {
          context.cookies.delete(key, {
            path: '/',
          });
        },
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Not using OAuth in MVP
    },
  });
}
```

#### 4.1.3 Auth Operations

**Registration**:
```typescript
// In register endpoint
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    emailRedirectTo: undefined, // No email confirmation
    data: {
      // Optional user metadata (future)
    },
  },
});

if (error) {
  // Handle error (duplicate email, weak password, etc.)
}

// data.user - created user object
// data.session - session with tokens
```

**Login**:
```typescript
// In login endpoint
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password,
});

if (error) {
  // Handle error (invalid credentials, etc.)
}

// data.user - authenticated user
// data.session - session with tokens
```

**Logout**:
```typescript
// In logout endpoint
const { error } = await supabase.auth.signOut();

if (error) {
  // Handle error (already logged out, etc.)
  // Still clear cookies
}

// Clear session cookies
```

**Session Retrieval**:
```typescript
// In middleware or page
const { data: { session }, error } = await supabase.auth.getSession();

// session contains user and tokens if authenticated
// null if not authenticated
```

**Session Refresh**:
```typescript
// In refresh endpoint or middleware
const { data, error } = await supabase.auth.refreshSession({
  refresh_token: refreshToken,
});

// data.session - new session with refreshed tokens
```

**Get User**:
```typescript
// In authenticated pages/API routes
const { data: { user }, error } = await supabase.auth.getUser();

// user object with id, email, created_at
// Uses access token to validate
```

#### 4.1.4 Error Handling for Supabase Auth

**Common Supabase Auth Errors**:

| Error Message | Cause | HTTP Status | Application Handling |
|--------------|-------|-------------|----------------------|
| User already registered | Email exists | 409 | "Email already registered" |
| Invalid login credentials | Wrong email/password | 401 | "Invalid email or password" |
| Password should be at least 8 characters | Weak password | 400 | Pass through validation error |
| Email rate limit exceeded | Too many requests | 429 | "Too many requests. Try again later" |
| Refresh token not found | Invalid refresh token | 401 | Clear session, redirect to login |
| JWT expired | Access token expired | 401 | Attempt refresh, then redirect |

**Error Detection Utility**:

```typescript
// src/lib/supabase/errors.ts

export function isSupabaseAuthError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error
  );
}

export function getAuthErrorMessage(error: unknown): string {
  if (!isSupabaseAuthError(error)) {
    return 'An unexpected error occurred';
  }

  const authError = error as { message: string; status: number };

  // Map Supabase errors to user-friendly messages
  const errorMap: Record<string, string> = {
    'User already registered': 'Email already registered. Please login instead.',
    'Invalid login credentials': 'Invalid email or password',
    'Email rate limit exceeded': 'Too many requests. Please try again later.',
    'Password should be at least 8 characters': 'Password must be at least 8 characters',
  };

  return errorMap[authError.message] ?? authError.message;
}

export function getAuthErrorCode(error: unknown): string {
  if (!isSupabaseAuthError(error)) {
    return 'INTERNAL_ERROR';
  }

  const authError = error as { message: string };

  // Map to error codes
  const codeMap: Record<string, string> = {
    'User already registered': 'EMAIL_ALREADY_EXISTS',
    'Invalid login credentials': 'INVALID_CREDENTIALS',
    'Email rate limit exceeded': 'RATE_LIMIT_EXCEEDED',
  };

  return codeMap[authError.message] ?? 'AUTHENTICATION_ERROR';
}
```

### 4.2 Session Management

#### 4.2.1 Session Lifecycle

**Session Creation**:
1. User registers or logs in
2. Supabase Auth creates session with access and refresh tokens
3. Application stores tokens in HTTP-only cookies
4. User redirected to dashboard
5. All subsequent requests include cookies automatically

**Session Validation**:
1. Every request passes through middleware
2. Middleware extracts tokens from cookies
3. Supabase Auth validates access token
4. If valid, user object attached to request context
5. If expired, attempt automatic refresh
6. If refresh fails, redirect to login

**Session Refresh**:
1. Access token expires after 1 hour
2. Middleware detects expiration
3. Uses refresh token to get new access token
4. Updates both tokens in cookies
5. Request continues with new tokens
6. Transparent to user (no logout)

**Session Termination**:
1. User clicks logout
2. Request sent to logout endpoint
3. Supabase Auth invalidates refresh token
4. Application clears all cookies
5. User redirected to login page
6. All protected routes now inaccessible

**Automatic Expiration**:
- Access token: 1 hour (enforced by Supabase)
- Refresh token: 7 days (default, configurable)
- After 7 days of inactivity, user must login again
- Refresh token rotation prevents theft

#### 4.2.2 Token Storage Strategy

**Cookies vs. Local Storage**:

Using Cookies:
- HTTP-only flag prevents XSS attacks
- Secure flag ensures HTTPS only (production)
- SameSite=Lax prevents CSRF
- Automatic inclusion in requests
- Server-side access for SSR

Not Using Local Storage:
- Vulnerable to XSS attacks
- JavaScript can access tokens
- Not suitable for sensitive data
- Requires manual token management

**Cookie Configuration**:

Access Token Cookie:
- Name: `sb-access-token`
- HttpOnly: true
- Secure: true (production)
- SameSite: Lax
- Path: /
- Max-Age: 3600 (1 hour)

Refresh Token Cookie:
- Name: `sb-refresh-token`
- HttpOnly: true
- Secure: true (production)
- SameSite: Lax
- Path: /
- Max-Age: 604800 (7 days)

#### 4.2.3 Refresh Token Rotation

**Purpose**: Prevent token theft and replay attacks

**Implementation** (handled by Supabase):
1. When refresh token used, Supabase issues new refresh token
2. Old refresh token invalidated after short grace period
3. Application must use new refresh token for next refresh
4. Stolen tokens become useless after legitimate refresh

**Detection of Token Theft**:
- If old refresh token reused after new one issued → Possible theft
- Supabase can be configured to revoke all sessions for that user
- Application should implement additional monitoring (future)

**Grace Period**:
- Supabase default: 10 seconds reuse interval
- Allows for race conditions in distributed systems
- After grace period, old token is completely invalid

#### 4.2.4 Concurrent Session Handling

**MVP Approach**: Allow multiple concurrent sessions
- User can be logged in on multiple devices
- Each device has independent session
- No session limit enforced
- Logout on one device doesn't affect others

**Future Enhancement**: Session management dashboard
- View active sessions
- Revoke specific sessions
- "Logout everywhere" functionality

### 4.3 Route Protection

#### 4.3.1 Protected Route Patterns

**Dashboard Routes** (require authentication):
- `/dashboard/*` - All dashboard pages
- `/dashboard/decks/[deckId]/*` - Deck detail and sub-pages
- `/dashboard/settings/*` - User settings (future)

**API Routes** (require authentication):
- `/api/decks/*` - All deck operations
- `/api/flashcards/*` - All flashcard operations (except those under decks)
- `/api/auth/logout` - Logout endpoint
- `/api/auth/me` - Current user endpoint

**Public Routes** (no authentication):
- `/` - Landing page
- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/api/auth/login` - Login endpoint
- `/api/auth/register` - Registration endpoint
- `/api/auth/refresh` - Token refresh endpoint

**Redirect Routes** (redirect authenticated users):
- `/auth/login` → `/dashboard` if logged in
- `/auth/register` → `/dashboard` if logged in

#### 4.3.2 Protection Implementation

**Middleware-Based Protection**:

```typescript
// In middleware
function isProtectedRoute(pathname: string): boolean {
  const protectedPatterns = [
    /^\/dashboard/,
    /^\/api\/decks/,
    /^\/api\/flashcards/,
    /^\/api\/auth\/(logout|me)/,
  ];

  return protectedPatterns.some(pattern => pattern.test(pathname));
}

function shouldRedirectAuthenticated(pathname: string): boolean {
  return ['/auth/login', '/auth/register'].includes(pathname);
}
```

**Page-Level Protection** (defense in depth):

```typescript
// In protected Astro page
---
const user = Astro.locals.user;

if (!user) {
  // Middleware should prevent this, but handle gracefully
  return Astro.redirect('/auth/login');
}
---
```

**API Route Protection**:

```typescript
// In API route
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({
      error: { message: 'Unauthorized', code: 'UNAUTHORIZED' }
    }), { status: 401 });
  }

  // Continue with operation
};
```

#### 4.3.3 Redirect Flow

**Unauthenticated Access to Protected Route**:
1. User navigates to `/dashboard/decks/123`
2. Middleware detects no valid session
3. Redirects to `/auth/login?redirect=%2Fdashboard%2Fdecks%2F123`
4. User logs in
5. Login handler reads `redirect` param
6. Redirects to original destination `/dashboard/decks/123`

**Authenticated Access to Auth Routes**:
1. User navigates to `/auth/login`
2. Middleware detects valid session
3. Redirects to `/dashboard`
4. Smooth navigation, no login form shown

**Return URL Handling**:

```typescript
// In login form submission
async function handleSubmit(formData: LoginInput) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(formData),
  });

  if (response.ok) {
    // Check for redirect parameter
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get('redirect') ?? '/dashboard';

    // Navigate to destination
    window.location.href = redirectTo;
  }
}
```

**Security Consideration**:
- Validate redirect URL is internal (not external)
- Prevent open redirect vulnerability

```typescript
// URL validation helper
function isValidRedirect(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}
```

### 4.4 Security Implementation

#### 4.4.1 Password Security

**Hashing**:
- Handled entirely by Supabase Auth
- Uses bcrypt algorithm with salt
- Application never stores or handles plain passwords
- Password comparison done by Supabase

**Password Requirements**:
- Minimum 8 characters (enforced by client and server)
- Maximum 128 characters (prevent DOS via long inputs)

**No Password Storage**:
- Passwords never logged
- Not included in error messages
- Not stored in localStorage or cookies
- Transmitted only over HTTPS

**Future Enhancements**:
- Password strength meter on client
- Compromised password checking (HaveIBeenPwned API)
- Password history (prevent reuse)

#### 4.4.2 XSS Prevention

**Output Encoding**:
- Astro escapes all dynamic content automatically
- React escapes JSX content
- No `dangerouslySetInnerHTML` used
- All user input sanitized before display

**Content Security Policy** (future):
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://supabase.co;
```

**Cookie Protection**:
- HttpOnly flag prevents JavaScript access
- Secure flag enforces HTTPS
- No sensitive data in non-HttpOnly cookies

#### 4.4.3 CSRF Prevention

**SameSite Cookies**:
- All auth cookies use SameSite=Lax
- Prevents cookies from being sent with cross-origin requests
- Blocks CSRF attacks on state-changing operations

**Future Enhancement - CSRF Tokens**:
- Generate token on form render
- Include in hidden form field
- Validate on form submission
- Rotate token after each request

#### 4.4.4 Rate Limiting

**MVP Approach**: Rely on Supabase Auth rate limiting
- Built-in rate limiting on auth endpoints
- Default: 30 requests per hour per email
- Returns 429 Too Many Requests when exceeded

**Future Enhancement - Application-Level**:
- Redis-based rate limiter
- Per-IP rate limiting: 100 requests per 15 minutes
- Per-user rate limiting: 500 requests per hour
- Exponential backoff for repeated failures

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635789600
```

#### 4.4.5 SQL Injection Prevention

**Protection Mechanisms**:
- Supabase client uses parameterized queries
- No raw SQL strings constructed from user input
- Row Level Security enforces access control
- Database constraints prevent invalid data

**RLS Policies**:
- Already implemented in migration
- Automatically filter queries by user_id
- Prevent access to other users' data
- No application-level filtering needed

#### 4.4.6 Session Fixation Prevention

**Protection Mechanisms**:
- New session created on login (Supabase Auth behavior)
- Old session invalidated
- Session ID regenerated after authentication
- No session ID accepted from URL parameters

#### 4.4.7 Brute Force Prevention

**MVP Protection**:
- Supabase Auth rate limiting
- Account lockout not implemented

**Future Enhancements**:
- Account lockout after 5 failed attempts
- Lockout duration: 15 minutes
- CAPTCHA after 3 failed attempts
- Email notification of suspicious activity
- Account recovery process

---

## 5. Data Flow Diagrams

### 5.1 Registration Flow

```
User → Register Page → RegisterForm (React)
  ↓
  Validates input (client-side)
  ↓
  POST /api/auth/register
  ↓
Register Endpoint:
  ↓
  1. Parse request body
  2. Validate with Zod schema
  3. Call supabase.auth.signUp()
  4. Handle errors (duplicate email, etc.)
  5. Extract session tokens
  6. Set HTTP-only cookies
  7. Return user + session
  ↓
RegisterForm:
  ↓
  1. Receive success response
  2. Redirect to /dashboard
  ↓
Dashboard Page:
  ↓
  1. Middleware validates session
  2. Loads user data
  3. Renders authenticated layout
```

### 5.2 Login Flow

```
User → Login Page → LoginForm (React)
  ↓
  Validates input (client-side)
  ↓
  POST /api/auth/login
  ↓
Login Endpoint:
  ↓
  1. Parse request body
  2. Validate with Zod schema
  3. Call supabase.auth.signInWithPassword()
  4. Handle errors (invalid credentials)
  5. Extract session tokens
  6. Set HTTP-only cookies
  7. Return user + session
  ↓
LoginForm:
  ↓
  1. Receive success response
  2. Read redirect parameter
  3. Redirect to destination (or /dashboard)
  ↓
Protected Page:
  ↓
  1. Middleware validates session
  2. Loads user-specific data
  3. Renders authenticated content
```

### 5.3 Logout Flow

```
User → UserMenu → Clicks "Logout"
  ↓
  POST /api/auth/logout
  ↓
Logout Endpoint:
  ↓
  1. Get session from cookies
  2. Call supabase.auth.signOut()
  3. Clear HTTP-only cookies
  4. Return success response
  ↓
UserMenu:
  ↓
  1. Receive success response
  2. Redirect to /auth/login
  ↓
Login Page:
  ↓
  1. Middleware detects no session
  2. Allows access to login page
  3. Renders login form
```

### 5.4 Session Refresh Flow

```
User → Navigates to protected route
  ↓
Middleware:
  ↓
  1. Extract access token from cookies
  2. Call supabase.auth.getSession()
  3. Token expired?
  ↓
  YES:
    ↓
    4. Extract refresh token
    5. Call supabase.auth.refreshSession()
    6. Receive new tokens
    7. Update cookies
    8. Attach user to context
    9. Continue to route
  ↓
  NO:
    ↓
    4. Session valid
    5. Attach user to context
    6. Continue to route
  ↓
Protected Page:
  ↓
  1. Access user from context
  2. Render authenticated content
```

### 5.5 Route Protection Flow

```
User → Requests /dashboard/decks/123
  ↓
Middleware:
  ↓
  1. Check if route protected
  2. YES: Check session
  ↓
  Session valid?
  ↓
  YES:
    ↓
    3. Attach user to context
    4. Continue to route handler
    ↓
    Route Handler:
      ↓
      5. Load deck data (filtered by RLS)
      6. Render deck page
  ↓
  NO:
    ↓
    3. Build redirect URL with return path
    4. Redirect to /auth/login?redirect=%2Fdashboard%2Fdecks%2F123
    ↓
    Login Page:
      ↓
      5. User logs in
      6. Redirect to /dashboard/decks/123
```

---

## 6. Security Considerations

### 6.1 Threat Model

#### 6.1.1 Identified Threats

**Credential Theft**:
- Phishing attacks
- Keyloggers
- Man-in-the-middle (MITM)
- Database breach (passwords hashed)

**Session Hijacking**:
- Cookie theft via XSS
- Cookie theft via network sniffing
- Session fixation

**Unauthorized Access**:
- Brute force attacks
- Credential stuffing
- Privilege escalation

**Data Leakage**:
- Cross-user data access
- API information disclosure
- Error message information disclosure

#### 6.1.2 Mitigations

| Threat | Mitigation | Implementation Status |
|--------|------------|----------------------|
| Password theft | Bcrypt hashing by Supabase | ✅ Implemented |
| XSS | HttpOnly cookies, output encoding | ✅ Implemented |
| CSRF | SameSite cookies | ✅ Implemented |
| MITM | HTTPS enforcement | ⏳ Production only |
| SQL Injection | Parameterized queries, RLS | ✅ Implemented |
| Brute force | Rate limiting (Supabase) | ✅ Implemented |
| Session hijacking | Token rotation, short expiry | ✅ Implemented |
| Credential stuffing | Rate limiting | ⏳ Future enhancement |
| Information disclosure | Generic error messages | ✅ Implemented |
| Cross-user access | RLS policies | ✅ Implemented |

### 6.2 Compliance Considerations

#### 6.2.2 Security Best Practices

**OWASP Top 10 Coverage**:
1. ✅ Injection: Parameterized queries, input validation
2. ✅ Broken Authentication: Strong session management, Supabase Auth
3. ✅ Sensitive Data Exposure: HTTPS, HttpOnly cookies, password hashing
4. ✅ XML External Entities (XXE): Not applicable (no XML processing)
5. ✅ Broken Access Control: RLS, middleware protection
6. ⏳ Security Misconfiguration: Environment-based configs, CSP headers (future)
7. ✅ Cross-Site Scripting (XSS): Output encoding, HttpOnly cookies
8. ⏳ Insecure Deserialization: Not applicable (JSON only)
9. ⏳ Using Components with Known Vulnerabilities: Dependency scanning (future)
10. ⏳ Insufficient Logging & Monitoring: Error tracking service (future)

### 6.3 Security Testing Requirements

#### 6.3.1 Manual Testing Checklist

**Authentication**:
- [ ] Register with valid credentials succeeds
- [ ] Register with duplicate email fails
- [ ] Register with weak password fails
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails
- [ ] Login with non-existent email fails (same error as invalid password)
- [ ] Logout clears session and cookies
- [ ] Session persists across browser refreshes
- [ ] Session expires after inactivity

**Authorization**:
- [ ] Unauthenticated access to /dashboard redirects to login
- [ ] Authenticated access to /auth/login redirects to dashboard
- [ ] User can only access own decks
- [ ] User can only access own flashcards
- [ ] API returns 401 for unauthenticated requests
- [ ] API returns 403 for unauthorized resource access

**Security**:
- [ ] Cookies have HttpOnly flag
- [ ] Cookies have Secure flag (production)
- [ ] Cookies have SameSite=Lax
- [ ] Password field has type="password"
- [ ] Password not visible in network requests (encrypted in transit)
- [ ] XSS attempts are escaped in output
- [ ] CSRF attempts are blocked by SameSite cookies

#### 6.3.2 Automated Testing (future)

**Unit Tests**:
- Validation schema tests
- Middleware route protection tests
- Error handler tests

**Integration Tests**:
- Register → Login → Dashboard flow
- Login → Logout → Login flow
- Token refresh flow
- Protected route access tests

**Security Tests**:
- OWASP ZAP scanning
- Dependency vulnerability scanning (npm audit)
- Penetration testing (manual or automated)

---

## 7. Implementation Dependencies

### 7.1 Required Dependencies

#### 7.1.1 NPM Packages

Already Installed:
- `@supabase/supabase-js` - Supabase client library
- `astro` - Astro framework
- `react` & `react-dom` - React library
- `zod` - Schema validation

New Dependencies:
```bash
# None required - all necessary packages already installed
```

Optional Dependencies (future enhancements):
```bash
npm install @supabase/auth-helpers-shared  # Helper utilities for auth
npm install @supabase/auth-ui-react        # Pre-built auth UI components (if needed)
```

#### 7.1.2 Shadcn/ui Components

Required Components (install with npx shadcn@latest add):
- `button` - ✅ Already installed
- `input` - Required for form fields
- `label` - Required for form labels
- `form` - React Hook Form integration (optional)
- `card` - For auth page layouts
- `dropdown-menu` - For user menu
- `alert` - For error messages
- `spinner` or `loading` - Loading indicators
- `toast` - Success/error notifications (optional)

Installation commands:
```bash
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
npx shadcn@latest add dropdown-menu
npx shadcn@latest add alert
```

### 7.2 Environment Variables

#### 7.2.1 Required Variables

Already Configured:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon/public key

Additional Variables (if needed):
- None required for MVP authentication

#### 7.2.2 Production Environment Variables

Production-Specific:
- `SUPABASE_URL` - Production Supabase URL
- `SUPABASE_KEY` - Production Supabase key
- `APP_URL` - Production app URL (for redirects)

Optional:
- `SENTRY_DSN` - Error tracking (future)
- `REDIS_URL` - Rate limiting (future)

### 7.3 Database Migrations

#### 7.3.1 Required Migrations

No additional migrations required for authentication:
- Supabase Auth uses built-in `auth.users` table
- Existing `decks`, `flashcards`, `reviews` tables already reference `auth.users(id)`
- RLS policies already implemented

#### 7.3.2 Verification Steps

Verify existing migration includes:
- [x] Foreign key references to `auth.users(id)`
- [x] RLS policies using `auth.uid()`
- [x] Cascade deletes from `auth.users` to application tables

### 7.4 Configuration Updates

#### 7.4.1 Astro Configuration

No changes required to `astro.config.mjs`:
- SSR already enabled (`output: "server"`)
- Node adapter already configured
- Middleware already set up

#### 7.4.2 TypeScript Configuration

Update `src/env.d.ts`:
- [x] Add `user` to `App.Locals` interface

Create new types file:
- [ ] `src/types/auth.types.ts` - Auth-specific types

#### 7.4.3 Supabase Configuration

Supabase Dashboard Settings:
1. **Authentication > Providers**:
   - Enable Email provider
   - Disable email confirmation
   - Disable email OTP

2. **Authentication > Settings**:
   - Site URL: `http://localhost:3000` (dev), production URL (prod)
   - JWT expiry: Default 3600 seconds
   - Enable token refresh rotation

3. **Authentication > URL Configuration**:
   - Redirect URLs: Add allowed redirect destinations

### 7.5 File Structure

#### 7.5.1 New Files to Create

**Pages**:
- `src/pages/auth/login.astro` - Login page
- `src/pages/auth/register.astro` - Registration page
- `src/pages/dashboard/index.astro` - Dashboard page

**API Routes**:
- `src/pages/api/auth/register.ts` - Registration endpoint
- `src/pages/api/auth/login.ts` - Login endpoint
- `src/pages/api/auth/logout.ts` - Logout endpoint
- `src/pages/api/auth/refresh.ts` - Token refresh endpoint
- `src/pages/api/auth/me.ts` - Current user endpoint

**Layouts**:
- `src/layouts/UnauthLayout.astro` - Unauthenticated pages layout
- `src/layouts/AuthenticatedLayout.astro` - Authenticated pages layout

**Components**:
- `src/components/auth/RegisterForm.tsx` - Registration form
- `src/components/auth/LoginForm.tsx` - Login form
- `src/components/auth/UserMenu.tsx` - User dropdown menu
- `src/components/auth/LogoutButton.tsx` - Logout button

**Libraries**:
- `src/lib/validation/auth.schemas.ts` - Zod validation schemas
- `src/lib/validation/validator.ts` - Validation helper
- `src/lib/errors/handler.ts` - Error handling utility
- `src/lib/supabase/errors.ts` - Supabase error utilities

**Types**:
- `src/types/auth.types.ts` - Auth-specific TypeScript types

**Hooks**:
- `src/hooks/useFormValidation.ts` - Form validation hook (optional)

#### 7.5.2 Files to Modify

**Existing Files**:
- `src/middleware/index.ts` - Add authentication logic
- `src/db/supabase.client.ts` - Add server client factory function
- `src/env.d.ts` - Add `user` to Locals
- `src/types.ts` - Add auth DTOs (if needed)
- `src/pages/index.astro` - Update to redirect based on auth status

**Existing Layouts**:
- `src/layouts/Layout.astro` - May need auth-aware modifications

### 7.6 Implementation Phases

#### Phase 1: Core Authentication (Priority: Critical)
1. Add server client factory function to `src/db/supabase.client.ts`
2. Update middleware with session management
3. Create register and login API endpoints
4. Create RegisterForm and LoginForm components
5. Create auth pages (login, register)
6. Test basic registration and login flows

#### Phase 2: Session Management (Priority: Critical)
1. Implement token refresh endpoint
2. Add session validation to middleware
3. Implement logout endpoint
4. Create LogoutButton component
5. Test session persistence and expiration

#### Phase 3: Route Protection (Priority: High)
1. Implement route protection in middleware
2. Create authenticated layout
3. Update existing pages to require auth
4. Test protected route access
5. Test redirect flows

#### Phase 4: User Experience (Priority: High)
1. Create UserMenu component
2. Implement error handling and display
3. Add loading states
4. Implement accessibility features
5. Test complete user journeys

#### Phase 5: Polish & Security (Priority: Medium)
1. Implement validation on all forms
2. Add comprehensive error messages
3. Security review and testing
4. Performance optimization
5. Documentation

---

## 8. Testing Strategy

### 8.1 Manual Testing Scenarios

#### 8.1.1 Happy Paths

**Scenario 1: New User Registration and First Login**
1. Navigate to /auth/register
2. Enter valid email and password
3. Submit form
4. Verify redirect to /dashboard
5. Verify user is logged in
6. Navigate to /auth/login
7. Verify redirect to /dashboard (already authenticated)

**Scenario 2: Returning User Login**
1. Navigate to /auth/login
2. Enter registered email and password
3. Submit form
4. Verify redirect to /dashboard
5. Verify user's decks are displayed
6. Close browser
7. Reopen and navigate to /dashboard
8. Verify still logged in (session persisted)

**Scenario 3: Logout and Re-login**
1. User logged in on /dashboard
2. Click logout in user menu
3. Verify redirect to /auth/login
4. Verify cookies cleared (dev tools)
5. Attempt to navigate to /dashboard
6. Verify redirect back to /auth/login
7. Log in again
8. Verify successful authentication

#### 8.1.2 Error Paths

**Scenario 1: Registration with Existing Email**
1. Navigate to /auth/register
2. Enter email that already exists
3. Submit form
4. Verify error message: "Email already registered"
5. Verify form remains populated (except password)
6. Click "Login instead" link
7. Verify navigation to /auth/login

**Scenario 2: Login with Invalid Credentials**
1. Navigate to /auth/login
2. Enter non-existent email
3. Enter any password
4. Submit form
5. Verify error message: "Invalid email or password"
6. Retry with correct email, wrong password
7. Verify same error message (security)

**Scenario 3: Registration with Weak Password**
1. Navigate to /auth/register
2. Enter valid email
3. Enter weak password (e.g., "password")
4. Verify client-side validation error
5. Correct password
6. Submit form
7. Verify successful registration

#### 8.1.3 Edge Cases

**Scenario 1: Session Expiration**
1. User logs in
2. Wait 1 hour (or modify token expiry for testing)
3. Perform action requiring authentication
4. Verify automatic token refresh (should be transparent)
5. Verify action completes successfully

**Scenario 2: Concurrent Sessions**
1. Log in on Browser A
2. Log in on Browser B (same user)
3. Verify both sessions work
4. Log out on Browser A
5. Verify Browser B still authenticated

**Scenario 3: Direct URL Access**
1. Not logged in
2. Navigate directly to /dashboard/decks/123
3. Verify redirect to /auth/login?redirect=%2Fdashboard%2Fdecks%2F123
4. Log in
5. Verify redirect to /dashboard/decks/123

### 8.2 Security Testing

#### 8.2.1 Authentication Tests

- [ ] Cannot register with SQL injection in email
- [ ] Cannot register with XSS payload in email
- [ ] Password is not visible in network requests
- [ ] Password is not logged server-side
- [ ] Failed login attempts are rate limited
- [ ] Session cookies are HttpOnly
- [ ] Session cookies are Secure (production)
- [ ] Session cookies are SameSite=Lax

#### 8.2.2 Authorization Tests

- [ ] User A cannot access User B's decks
- [ ] User A cannot access User B's flashcards
- [ ] API endpoints return 401 when not authenticated
- [ ] API endpoints return 403 when accessing others' resources
- [ ] RLS policies prevent cross-user data access

#### 8.2.3 Session Tests

- [ ] Session expires after expected time
- [ ] Refresh token rotation works correctly
- [ ] Old refresh tokens cannot be reused
- [ ] Logout invalidates refresh token
- [ ] Expired session redirects to login

---

## 9. Appendix

### 9.1 API Endpoint Summary

| Method | Endpoint | Auth Required | Purpose |
|--------|----------|---------------|---------|
| POST | /api/auth/register | No | Create new user account |
| POST | /api/auth/login | No | Authenticate user |
| POST | /api/auth/logout | Yes | End user session |
| POST | /api/auth/refresh | No* | Refresh access token |
| GET | /api/auth/me | Yes | Get current user info |

*Uses refresh token from cookies

### 9.2 Page Route Summary

| Route | Auth Required | Purpose |
|-------|---------------|---------|
| / | No | Landing page |
| /auth/login | No (redirects if authenticated) | User login |
| /auth/register | No (redirects if authenticated) | User registration |
| /dashboard | Yes | Main authenticated page |
| /dashboard/decks/[id] | Yes | Deck detail view |

### 9.3 Cookie Summary

| Name | Type | Max-Age | HttpOnly | Secure | SameSite | Purpose |
|------|------|---------|----------|--------|----------|---------|
| sb-access-token | JWT | 3600s | Yes | Yes* | Lax | Access token for API requests |
| sb-refresh-token | String | 604800s | Yes | Yes* | Lax | Refresh token for session renewal |

*In production only

### 9.4 Error Code Reference

| Code | HTTP Status | Description | User Message |
|------|-------------|-------------|--------------|
| VALIDATION_ERROR | 400 | Input validation failed | "Please check your input" |
| INVALID_CREDENTIALS | 401 | Wrong email/password | "Invalid email or password" |
| UNAUTHORIZED | 401 | Not authenticated | "Please log in to continue" |
| SESSION_EXPIRED | 401 | Access token expired | "Your session has expired. Please log in again." |
| EMAIL_ALREADY_EXISTS | 409 | Duplicate email | "Email already registered. Please login instead." |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests | "Too many requests. Please try again later." |
| INTERNAL_ERROR | 500 | Server error | "An unexpected error occurred. Please try again." |

### 9.5 Accessibility Checklist

- [ ] All forms have labels
- [ ] All form inputs have associated labels via htmlFor
- [ ] Error messages are announced to screen readers
- [ ] Focus management on form errors
- [ ] Keyboard navigation works for all interactive elements
- [ ] Color contrast meets WCAG AA standards
- [ ] Password visibility toggle is keyboard accessible
- [ ] Loading states are announced to screen readers
- [ ] Semantic HTML elements used throughout

---

## 10. Conclusion

This specification provides a comprehensive architecture for implementing authentication in the AI Flashcard Learning Platform. The design prioritizes:

1. **Security**: Using Supabase Auth with industry-standard practices
2. **User Experience**: Smooth flows with clear error messages
3. **Simplicity**: Minimal complexity suitable for MVP
4. **Compatibility**: Integration with existing Astro/React/Supabase stack
5. **Scalability**: Foundation for future enhancements

The implementation follows the existing project conventions (CLAUDE.md) and satisfies all requirements from the PRD (US-001 through US-004).

### Next Steps

1. Review this specification with stakeholders
2. Clarify any ambiguities or questions
3. Begin Phase 1 implementation (Core Authentication)
4. Test each phase before proceeding to next
5. Iterate based on feedback and testing results
