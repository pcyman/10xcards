# View Implementation Plan: Login View

## 1. Overview

The Login View provides authentication functionality for returning users to access their flashcard decks. It consists of a simple form with email and password fields, implementing secure authentication through Supabase. The view prioritizes security with generic error messages, includes accessible form controls, and provides visual feedback during the authentication process. Authenticated users are automatically redirected to the main decks interface.

## 2. View Routing

**Primary Route**: `/login`

**Access Control**:
- Public route (no authentication required)
- Server-side check: If user is already authenticated, redirect to `/decks`
- Redirect target after successful login: `/decks`

**Implementation Location**:
- Page: `src/pages/login.astro`
- API Endpoint: `src/pages/api/auth/login.ts`

## 3. Component Structure

```
src/pages/login.astro (Astro Page Component)
└── src/components/LoginForm.tsx (React Interactive Component)
    ├── Email Input Field (Shadcn/ui Input)
    │   └── Label with ARIA attributes
    ├── Password Input Field (Shadcn/ui Input)
    │   ├── Label with ARIA attributes
    │   └── Password Toggle Button (show/hide)
    ├── Submit Button (Shadcn/ui Button)
    ├── Error Message Display (conditional)
    └── Link to Registration Page
```

**Component Files**:
- `src/pages/login.astro` - Main page wrapper with layout
- `src/components/LoginForm.tsx` - Interactive React form component
- `src/components/ui/input.tsx` - Shadcn/ui input component (existing)
- `src/components/ui/button.tsx` - Shadcn/ui button component (existing)
- `src/components/ui/label.tsx` - Shadcn/ui label component (existing)

## 4. Component Details

### 4.1 LoginPage (login.astro)

**Component Description**:
Main Astro page component that serves as the container for the login view. Handles server-side authentication check and provides the page layout.

**Main Elements**:
- `<Layout>` component wrapper for consistent page structure
- Authentication state check (server-side)
- `<LoginForm>` React component (client:load directive)
- SEO meta tags (title: "Login - 10xCards")

**Handled Interactions**:
- None (delegated to child components)

**Handled Validation**:
- Server-side: Check if user is authenticated
  - If `Astro.locals.session` exists, redirect to `/decks`
  - Prevents authenticated users from accessing login page

**Types**:
- None (uses Astro.locals.session from middleware)

**Props**:
- None (top-level page component)

---

### 4.2 LoginForm (LoginForm.tsx)

**Component Description**:
React component that manages the login form state, validation, and submission. Handles user input, displays errors, and communicates with the authentication API.

**Main Elements**:
- `<form>` element with semantic HTML
- `<Label>` and `<Input>` for email field
- `<Label>` and `<Input>` for password field with toggle button
- `<Button>` for form submission
- Conditional error message display (below form)
- Link to registration page (`/register`)

**Handled Interactions**:
1. **Form submission**:
   - Triggered by submit button click or Enter key
   - Validates form data
   - Calls login API endpoint
   - Handles success (redirect) or error (display message)

2. **Input change** (email and password):
   - Updates form state
   - Clears field-level errors
   - Clears API error message

3. **Password visibility toggle**:
   - Toggles between password (masked) and text (visible) input type
   - Updates button icon and ARIA label

4. **Navigation to register**:
   - Clicking link navigates to `/register` page

**Handled Validation**:
1. **Email Field**:
   - Required: Must not be empty
   - Format: Must match email regex pattern `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
   - Validation trigger: On form submit (before API call)
   - Error message: "Please enter a valid email address"

2. **Password Field**:
   - Required: Must not be empty
   - Validation trigger: On form submit (before API call)
   - Error message: "Password is required"

3. **Form-Level Validation**:
   - Both fields must pass validation before API call
   - Display first encountered error or all errors simultaneously

**Types**:
- `LoginFormData` - Form state interface
- `FormFieldError` - Field-level error messages
- `LoginRequest` - API request DTO
- `LoginSuccessResponse` - API success response DTO
- `LoginError` - API error response DTO

**Props**:
- None (standalone component)

---

### 4.3 Email Input Field

**Component Description**:
Shadcn/ui Input component configured for email input with proper labeling and accessibility attributes.

**Main Elements**:
- `<Label>` with `htmlFor` attribute linking to input
- `<Input>` with type="email"

**Handled Interactions**:
- `onChange`: Updates formData.email state
- `onBlur`: Can trigger validation (optional)

**Handled Validation**:
- HTML5 email validation (type="email")
- Custom validation in parent component

**Types**:
- Standard HTML input props from Shadcn/ui

**Props**:
```typescript
{
  id: "email",
  type: "email",
  value: formData.email,
  onChange: handleEmailChange,
  disabled: isSubmitting,
  autoFocus: true,
  autoComplete: "email",
  "aria-invalid": !!errors.email,
  "aria-describedby": errors.email ? "email-error" : undefined
}
```

---

### 4.4 Password Input Field

**Component Description**:
Shadcn/ui Input component configured for password input with visibility toggle functionality and proper accessibility attributes.

**Main Elements**:
- `<Label>` with `htmlFor` attribute
- `<div>` wrapper with relative positioning
- `<Input>` with dynamic type (password/text)
- `<Button>` (icon button) for visibility toggle positioned absolutely

**Handled Interactions**:
- `onChange`: Updates formData.password state
- Toggle button `onClick`: Switches password visibility

**Handled Validation**:
- Required field validation in parent component

**Types**:
- Standard HTML input props from Shadcn/ui

**Props**:
```typescript
{
  id: "password",
  type: showPassword ? "text" : "password",
  value: formData.password,
  onChange: handlePasswordChange,
  disabled: isSubmitting,
  autoComplete: "current-password",
  "aria-invalid": !!errors.password,
  "aria-describedby": errors.password ? "password-error" : undefined
}
```

---

### 4.5 Password Toggle Button

**Component Description**:
Icon button that toggles password visibility between masked and visible text.

**Main Elements**:
- `<Button>` with variant="ghost" and size="icon"
- Icon component (Eye or EyeOff from lucide-react)

**Handled Interactions**:
- `onClick`: Toggles showPassword state

**Handled Validation**:
- None

**Types**:
- Standard button props from Shadcn/ui

**Props**:
```typescript
{
  type: "button",
  variant: "ghost",
  size: "icon",
  onClick: togglePasswordVisibility,
  "aria-label": showPassword ? "Hide password" : "Show password",
  tabIndex: -1
}
```

---

### 4.6 Submit Button

**Component Description**:
Primary action button that submits the login form with loading state indication.

**Main Elements**:
- `<Button>` component with loading spinner (conditional)
- Button text: "Log in" or "Logging in..."

**Handled Interactions**:
- `onClick`: Submits form (handled by form onSubmit)

**Handled Validation**:
- None (validation handled in form submission)

**Types**:
- Standard button props from Shadcn/ui

**Props**:
```typescript
{
  type: "submit",
  className: "w-full",
  disabled: isSubmitting,
  children: isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Logging in...
    </>
  ) : "Log in"
}
```

---

### 4.7 Error Message Display

**Component Description**:
Conditional alert component that displays authentication or validation errors below the form.

**Main Elements**:
- Conditional rendering based on `apiError` state
- `<div>` with error styling (red background, border, text)
- Error icon (optional)
- Error message text

**Handled Interactions**:
- None (display only)

**Handled Validation**:
- None (displays validation results)

**Types**:
```typescript
{
  message: string;
  type?: "error" | "warning" | "info";
}
```

**Props**:
```typescript
{
  message: apiError,
  type: "error",
  role: "alert",
  "aria-live": "polite"
}
```

## 5. Types

### 5.1 LoginFormData (ViewModel)

**Purpose**: Represents the current state of form field values.

```typescript
interface LoginFormData {
  email: string;    // User's email address (used as username)
  password: string; // User's password (plain text in form state)
}
```

**Field Breakdown**:
- `email`: `string` - Email address entered by user, serves as username
- `password`: `string` - Password in plain text (only in memory, sent securely to server)

---

### 5.2 FormFieldError (ViewModel)

**Purpose**: Tracks validation error messages for individual form fields.

```typescript
interface FormFieldError {
  email?: string;    // Error message for email field
  password?: string; // Error message for password field
}
```

**Field Breakdown**:
- `email`: `string | undefined` - Validation error for email (e.g., "Please enter a valid email address")
- `password`: `string | undefined` - Validation error for password (e.g., "Password is required")

---

### 5.3 LoginRequest (DTO - Request)

**Purpose**: Request payload sent to login API endpoint.

```typescript
interface LoginRequest {
  email: string;    // User's email for authentication
  password: string; // User's password for authentication
}
```

**Field Breakdown**:
- `email`: `string` - Email address submitted for authentication
- `password`: `string` - Password submitted for authentication

**API Endpoint**: `POST /api/auth/login`

---

### 5.4 LoginSuccessResponse (DTO - Response)

**Purpose**: Response returned from successful login API call.

```typescript
interface LoginSuccessResponse {
  user: {
    id: string;      // Unique user identifier (UUID)
    email: string;   // User's email address
  };
  session: {
    access_token: string;  // JWT access token
    refresh_token: string; // JWT refresh token
    expires_at: number;    // Unix timestamp for expiration
  };
}
```

**Field Breakdown**:
- `user`: Object containing authenticated user information
  - `user.id`: `string` - Unique identifier (UUID) for the user
  - `user.email`: `string` - Confirmed email address of authenticated user
- `session`: Object containing session tokens and metadata
  - `session.access_token`: `string` - JWT token for API authentication
  - `session.refresh_token`: `string` - JWT token for refreshing expired access tokens
  - `session.expires_at`: `number` - Unix timestamp indicating when session expires

**HTTP Status**: `200 OK`

**Note**: Tokens are automatically stored in httpOnly cookies by Supabase client.

---

### 5.5 LoginError (DTO - Error Response)

**Purpose**: Error response returned from failed login API call.

```typescript
interface LoginError {
  error: {
    message: string; // Human-readable error message
    code: string;    // Error code for programmatic handling
    field?: string;  // Optional field name for validation errors
  };
}
```

**Field Breakdown**:
- `error`: Object containing error details
  - `error.message`: `string` - User-friendly error message to display
  - `error.code`: `string` - Machine-readable error code (e.g., "INVALID_CREDENTIALS", "VALIDATION_ERROR")
  - `error.field`: `string | undefined` - Specific field name if validation error (e.g., "email", "password")

**Possible HTTP Status Codes**:
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid credentials
- `429 Too Many Requests` - Rate limiting
- `500 Internal Server Error` - Server error

**Example Error Responses**:

Invalid Credentials (401):
```json
{
  "error": {
    "message": "Invalid username or password",
    "code": "INVALID_CREDENTIALS"
  }
}
```

Validation Error (400):
```json
{
  "error": {
    "message": "Please enter a valid email address",
    "code": "VALIDATION_ERROR",
    "field": "email"
  }
}
```

---

### 5.6 LoginFormState (ViewModel)

**Purpose**: Complete state interface for LoginForm component (internal state management).

```typescript
interface LoginFormState {
  formData: LoginFormData;    // Current form field values
  errors: FormFieldError;     // Field-level validation errors
  isSubmitting: boolean;      // Loading state during authentication
  apiError: string | null;    // Server-side authentication error
  showPassword: boolean;      // Password visibility toggle state
}
```

**Field Breakdown**:
- `formData`: `LoginFormData` - Current values of email and password fields
- `errors`: `FormFieldError` - Object containing validation errors for each field
- `isSubmitting`: `boolean` - True when authentication request is in progress
- `apiError`: `string | null` - Error message from API (e.g., "Invalid username or password")
- `showPassword`: `boolean` - True when password should be visible (text), false when masked (password)

**Note**: This is an internal type for component state management, not exposed as props.

## 6. State Management

### 6.1 State Management Strategy

The Login View uses **component-level state management** with React hooks. No global state management (Context, Redux) is required as the login state is local to the form component and doesn't need to be shared.

### 6.2 State Implementation

**Primary Approach**: Direct `useState` hooks within `LoginForm` component

**State Variables**:

```typescript
const [formData, setFormData] = useState<LoginFormData>({
  email: '',
  password: ''
});

const [errors, setErrors] = useState<FormFieldError>({});

const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

const [apiError, setApiError] = useState<string | null>(null);

const [showPassword, setShowPassword] = useState<boolean>(false);
```

### 6.3 State Update Functions

**Form Data Updates**:
```typescript
const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData(prev => ({ ...prev, email: e.target.value }));
  setErrors(prev => ({ ...prev, email: undefined }));
  setApiError(null);
};

const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData(prev => ({ ...prev, password: e.target.value }));
  setErrors(prev => ({ ...prev, password: undefined }));
  setApiError(null);
};
```

**Password Visibility Toggle**:
```typescript
const togglePasswordVisibility = () => {
  setShowPassword(prev => !prev);
};
```

### 6.4 Custom Hook Option (Alternative)

For cleaner component code, state management can be extracted into a custom hook:

**File**: `src/hooks/useLoginForm.ts`

```typescript
export const useLoginForm = () => {
  // State declarations (same as above)

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: FormFieldError = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        window.location.href = '/decks';
      } else {
        const errorData: LoginError = await response.json();
        setApiError(errorData.error.message);
      }
    } catch (error) {
      setApiError('Network error. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    isSubmitting,
    apiError,
    showPassword,
    handleEmailChange,
    handlePasswordChange,
    togglePasswordVisibility,
    handleSubmit
  };
};
```

**Usage in Component**:
```typescript
const LoginForm = () => {
  const {
    formData,
    errors,
    isSubmitting,
    apiError,
    showPassword,
    handleEmailChange,
    handlePasswordChange,
    togglePasswordVisibility,
    handleSubmit
  } = useLoginForm();

  // Component JSX...
};
```

### 6.5 Recommendation

**Use custom hook** (`useLoginForm`) for better:
- Code organization and reusability
- Testing (hook logic can be tested separately)
- Separation of concerns (business logic vs presentation)

## 7. API Integration

### 7.1 Endpoint Information

**Endpoint**: `POST /api/auth/login`
**File**: `src/pages/api/auth/login.ts`
**Access**: Public (unauthenticated users only)
**Authentication Method**: Supabase Auth (`signInWithPassword`)

### 7.2 Request Format

**Request Type**: `LoginRequest`

```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**HTTP Headers**:
```
Content-Type: application/json
```

**Request Body Example**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Frontend Implementation**:
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: formData.email,
    password: formData.password
  })
});
```

### 7.3 Response Formats

#### Success Response (200 OK)

**Response Type**: `LoginSuccessResponse`

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
```

**Response Body Example**:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": 1704123600
  }
}
```

**Note**: Session tokens are automatically stored in httpOnly cookies by Supabase client.

#### Error Response - Invalid Credentials (401 Unauthorized)

**Response Type**: `LoginError`

```typescript
interface LoginError {
  error: {
    message: "Invalid username or password";
    code: "INVALID_CREDENTIALS";
  };
}
```

**Response Body Example**:
```json
{
  "error": {
    "message": "Invalid username or password",
    "code": "INVALID_CREDENTIALS"
  }
}
```

#### Error Response - Validation Error (400 Bad Request)

**Response Type**: `LoginError`

```typescript
interface LoginError {
  error: {
    message: string;
    code: "VALIDATION_ERROR";
    field?: string;
  };
}
```

**Response Body Example**:
```json
{
  "error": {
    "message": "Please enter a valid email address",
    "code": "VALIDATION_ERROR",
    "field": "email"
  }
}
```

#### Error Response - Server Error (500 Internal Server Error)

**Response Type**: `LoginError`

```typescript
interface LoginError {
  error: {
    message: string;
    code: "SERVER_ERROR";
  };
}
```

**Response Body Example**:
```json
{
  "error": {
    "message": "An error occurred. Please try again later.",
    "code": "SERVER_ERROR"
  }
}
```

### 7.4 Frontend API Call Implementation

**Complete Flow**:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // 1. Validate form
  if (!validateForm()) {
    return;
  }

  // 2. Set loading state
  setIsSubmitting(true);
  setApiError(null);

  try {
    // 3. Call API
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password
      } as LoginRequest)
    });

    // 4. Handle success
    if (response.ok) {
      const data: LoginSuccessResponse = await response.json();
      // Session is stored in cookies automatically
      // Redirect to main application
      window.location.href = '/decks';
      return;
    }

    // 5. Handle error responses
    const errorData: LoginError = await response.json();

    switch (response.status) {
      case 401:
        setApiError('Invalid username or password');
        break;
      case 400:
        if (errorData.error.field) {
          setErrors(prev => ({
            ...prev,
            [errorData.error.field!]: errorData.error.message
          }));
        } else {
          setApiError(errorData.error.message);
        }
        break;
      case 500:
        setApiError('An error occurred. Please try again later.');
        break;
      default:
        setApiError('An unexpected error occurred.');
    }

  } catch (error) {
    // 6. Handle network errors
    console.error('Login error:', error);
    setApiError('Network error. Please check your connection.');

  } finally {
    // 7. Clear loading state
    setIsSubmitting(false);
  }
};
```

### 7.5 Backend Endpoint Implementation Notes

The backend endpoint (`src/pages/api/auth/login.ts`) should:
1. Mark route as dynamic: `export const prerender = false;`
2. Parse and validate request body
3. Call `context.locals.supabase.auth.signInWithPassword({ email, password })`
4. Handle Supabase Auth responses
5. Set session cookies (handled automatically by Supabase)
6. Return appropriate response with status codes

## 8. User Interactions

### 8.1 Page Load Interaction

**User Action**: User navigates to `/login` page

**System Behavior**:
1. Server-side check: Is user already authenticated?
   - If `Astro.locals.session` exists → Redirect to `/decks`
   - If not authenticated → Render login page
2. Page renders with empty form
3. Auto-focus on email input field
4. Check for URL parameters (e.g., session expired message)

**Expected Outcome**: User sees empty login form with email field focused

---

### 8.2 Email Input Interaction

**User Action**: User types in email field

**System Behavior**:
1. Update `formData.email` state with input value
2. Clear any existing email field error (`errors.email = undefined`)
3. Clear any existing API error (`apiError = null`)
4. No validation performed until form submit

**Expected Outcome**: Email value updates in state, previous errors cleared

---

### 8.3 Password Input Interaction

**User Action**: User types in password field

**System Behavior**:
1. Update `formData.password` state with input value
2. Password displays as masked dots (type="password")
3. Clear any existing password field error (`errors.password = undefined`)
4. Clear any existing API error (`apiError = null`)
5. No validation performed until form submit

**Expected Outcome**: Password value updates in state, previous errors cleared

---

### 8.4 Password Visibility Toggle Interaction

**User Action**: User clicks eye icon button next to password field

**System Behavior**:
1. Toggle `showPassword` state (true ↔ false)
2. Update password input type:
   - If `showPassword = true` → type="text" (password visible)
   - If `showPassword = false` → type="password" (password masked)
3. Update button icon:
   - If showing → Display "EyeOff" icon
   - If hiding → Display "Eye" icon
4. Update button ARIA label:
   - If showing → "Hide password"
   - If hiding → "Show password"

**Expected Outcome**: Password visibility toggles, icon updates, password field type changes

---

### 8.5 Form Submission Interaction (Submit Button Click)

**User Action**: User clicks "Log in" button

**Trigger**: Same as Form Submission via Enter key (section 8.6)

**System Behavior**: See section 8.6 for complete flow

**Expected Outcome**: Form validation and submission process begins

---

### 8.6 Form Submission Interaction (Enter Key)

**User Action**: User presses Enter key while form has focus

**System Behavior**:

**Phase 1: Validation**
1. Prevent default form submission
2. Validate email field:
   - Check if empty → Set error: "Email is required"
   - Check email format → Set error: "Please enter a valid email address"
3. Validate password field:
   - Check if empty → Set error: "Password is required"
4. If validation fails:
   - Display field-level errors below respective inputs
   - Stop submission process
   - Return early

**Phase 2: API Call** (if validation passes)
1. Set loading state:
   - `isSubmitting = true`
   - Submit button shows loading spinner
   - Submit button text changes to "Logging in..."
   - Form inputs become disabled
2. Clear any previous API errors
3. Send POST request to `/api/auth/login`
4. Wait for response

**Phase 3: Success Handling**
1. Receive 200 OK response
2. Session cookies are automatically set by Supabase
3. Redirect to `/decks` using `window.location.href`
4. Loading state clears (page unloads)

**Phase 4: Error Handling**
1. Receive error response (401, 400, 500)
2. Parse error response body
3. Display appropriate error message:
   - 401 → "Invalid username or password" (form-level)
   - 400 → Field-specific or form-level error
   - 500 → "An error occurred. Please try again later."
   - Network error → "Network error. Please check your connection."
4. Clear loading state:
   - `isSubmitting = false`
   - Submit button returns to normal
   - Form inputs re-enabled
5. User can edit form and retry

**Expected Outcome**:
- Success: User redirected to `/decks` with active session
- Failure: Error message displayed, user can retry

---

### 8.7 Navigation to Registration Interaction

**User Action**: User clicks "Create an account" link

**System Behavior**:
1. Browser navigates to `/register` page
2. Current form state is lost (no persistence needed)
3. No API calls made

**Expected Outcome**: User sees registration page

---

### 8.8 Session Expired Scenario

**User Action**: User is redirected to login page after session expiration

**System Behavior**:
1. URL may contain query parameter (e.g., `?expired=true`)
2. Page checks for parameter on load
3. If found, display info message: "Your session has expired. Please log in again."
4. Message displays above form (non-blocking)
5. User proceeds with normal login flow

**Expected Outcome**: User sees session expiration notice and can log in again

## 9. Conditions and Validation

### 9.1 Client-Side Form Validation

#### 9.1.1 Email Field Validation

**Component**: `LoginForm` → Email Input

**Validation Conditions**:

1. **Required Field Check**:
   - Condition: `formData.email.trim() === ''`
   - Error Message: `"Email is required"`
   - Validation Trigger: Form submit
   - UI Effect:
     - Red border on input field
     - Error message displayed below field
     - `aria-invalid="true"` set on input

2. **Email Format Check**:
   - Condition: `!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)`
   - Error Message: `"Please enter a valid email address"`
   - Validation Trigger: Form submit (after required check passes)
   - UI Effect: Same as above

**Implementation**:
```typescript
const validateEmail = (): string | undefined => {
  if (!formData.email.trim()) {
    return 'Email is required';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    return 'Please enter a valid email address';
  }
  return undefined;
};
```

**Error Clearing**:
- Trigger: User types in email field
- Action: Clear `errors.email` immediately

---

#### 9.1.2 Password Field Validation

**Component**: `LoginForm` → Password Input

**Validation Conditions**:

1. **Required Field Check**:
   - Condition: `formData.password.trim() === ''`
   - Error Message: `"Password is required"`
   - Validation Trigger: Form submit
   - UI Effect:
     - Red border on input field
     - Error message displayed below field
     - `aria-invalid="true"` set on input

**Implementation**:
```typescript
const validatePassword = (): string | undefined => {
  if (!formData.password.trim()) {
    return 'Password is required';
  }
  return undefined;
};
```

**Error Clearing**:
- Trigger: User types in password field
- Action: Clear `errors.password` immediately

---

#### 9.1.3 Form-Level Validation

**Component**: `LoginForm`

**Validation Conditions**:

1. **All Fields Valid**:
   - Condition: No field-level validation errors exist
   - Action: Proceed with API call

2. **Any Field Invalid**:
   - Condition: One or more field validation errors
   - Action: Display errors, prevent API call

**Implementation**:
```typescript
const validateForm = (): boolean => {
  const newErrors: FormFieldError = {};

  const emailError = validateEmail();
  if (emailError) {
    newErrors.email = emailError;
  }

  const passwordError = validatePassword();
  if (passwordError) {
    newErrors.password = passwordError;
  }

  setErrors(newErrors);

  // Return true if no errors
  return Object.keys(newErrors).length === 0;
};
```

---

### 9.2 Server-Side Validation (API Endpoint)

**Component**: API endpoint `/api/auth/login`

**Validation Conditions** (enforced by backend):

1. **Request Body Parsing**:
   - Condition: Valid JSON in request body
   - Failure: Return 400 with "Invalid request format"

2. **Email Presence**:
   - Condition: `email` field exists and is non-empty string
   - Failure: Return 400 with "Email is required"

3. **Password Presence**:
   - Condition: `password` field exists and is non-empty string
   - Failure: Return 400 with "Password is required"

4. **Email Format** (optional server validation):
   - Condition: Email matches basic format
   - Failure: Return 400 with "Invalid email format"

---

### 9.3 Authentication Validation

**Component**: Supabase Auth Service

**Validation Conditions**:

1. **Credentials Match**:
   - Condition: Email and password combination exists in database
   - Success: Return 200 with user and session
   - Failure: Return 401 with "Invalid username or password"

2. **Account Status**:
   - Condition: Account is active (not disabled)
   - Failure: Return 401 (handled by Supabase)

**Note**: Email confirmation is disabled per PRD requirements

---

### 9.4 UI State Conditions

#### 9.4.1 Submit Button State

**Component**: Submit Button

**Disabled Condition**:
- `isSubmitting === true`
- UI Effect: Button disabled, shows loading spinner

**Enabled Condition**:
- `isSubmitting === false`
- UI Effect: Button clickable, shows "Log in" text

---

#### 9.4.2 Form Inputs State

**Component**: Email and Password Inputs

**Disabled Condition**:
- `isSubmitting === true`
- UI Effect: Inputs disabled (greyed out)

**Enabled Condition**:
- `isSubmitting === false`
- UI Effect: Inputs active and editable

---

#### 9.4.3 Error Message Display

**Component**: Error Message Display

**Display Condition**:
- `apiError !== null`
- UI Effect: Error alert visible below form

**Hidden Condition**:
- `apiError === null`
- UI Effect: No error message shown

---

### 9.5 Redirect Conditions

#### 9.5.1 Pre-Login Redirect (Server-Side)

**Component**: `login.astro` page

**Redirect Condition**:
- `Astro.locals.session` exists (user is authenticated)
- Action: Redirect to `/decks` before rendering form
- Method: `Astro.redirect('/decks')`

**No Redirect Condition**:
- `Astro.locals.session` is null/undefined
- Action: Render login form

---

#### 9.5.2 Post-Login Redirect (Client-Side)

**Component**: `LoginForm` submit handler

**Redirect Condition**:
- API response status is 200 OK
- Action: `window.location.href = '/decks'`
- Timing: Immediately after successful response

**No Redirect Condition**:
- API response status is not 200
- Action: Display error message, remain on login page

---

### 9.6 Accessibility Conditions

#### 9.6.1 ARIA Invalid State

**Components**: Email and Password Inputs

**Condition for `aria-invalid="true"`**:
- Email: `errors.email !== undefined`
- Password: `errors.password !== undefined`

**Condition for `aria-invalid="false"` or omitted**:
- No validation error for field

---

#### 9.6.2 ARIA Describedby Association

**Components**: Email and Password Inputs

**Condition for `aria-describedby` attribute**:
- Error message exists for field
- Value: ID of error message element
- Example: `aria-describedby="email-error"`

**Condition for omitting attribute**:
- No error message for field

---

### 9.7 Validation Summary Table

| Field | Validation | Trigger | Error Message | UI Effect |
|-------|-----------|---------|---------------|-----------|
| Email | Required | Submit | "Email is required" | Red border, error text |
| Email | Format | Submit | "Please enter a valid email address" | Red border, error text |
| Password | Required | Submit | "Password is required" | Red border, error text |
| Form | Auth Failed | API Response | "Invalid username or password" | Alert below form |
| Form | Server Error | API Response | "An error occurred..." | Alert below form |
| Form | Network Error | Fetch Catch | "Network error..." | Alert below form |

## 10. Error Handling

### 10.1 Client-Side Validation Errors

#### 10.1.1 Empty Email Field

**Trigger**: Form submission with empty email
**Detection**: `formData.email.trim() === ''`
**Handling**:
- Set field error: `errors.email = "Email is required"`
- Display error message below email input (red text)
- Add red border to email input
- Set `aria-invalid="true"` on input
- Prevent form submission
- Keep focus on form (don't navigate away)

**User Recovery**:
- User types in email field
- Error clears immediately on input change
- User can submit again

---

#### 10.1.2 Invalid Email Format

**Trigger**: Form submission with malformed email
**Detection**: `!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)`
**Handling**:
- Set field error: `errors.email = "Please enter a valid email address"`
- Display error message below email input (red text)
- Add red border to email input
- Set `aria-invalid="true"` on input
- Prevent form submission

**User Recovery**:
- User corrects email format
- Error clears on input change
- User can submit again

---

#### 10.1.3 Empty Password Field

**Trigger**: Form submission with empty password
**Detection**: `formData.password.trim() === ''`
**Handling**:
- Set field error: `errors.password = "Password is required"`
- Display error message below password input (red text)
- Add red border to password input
- Set `aria-invalid="true"` on input
- Prevent form submission

**User Recovery**:
- User types password
- Error clears on input change
- User can submit again

---

### 10.2 Server-Side Validation Errors (400 Bad Request)

#### 10.2.1 Field-Specific Validation Error

**Trigger**: Server returns 400 with field reference
**Example Response**:
```json
{
  "error": {
    "message": "Invalid email format",
    "code": "VALIDATION_ERROR",
    "field": "email"
  }
}
```

**Handling**:
- Parse response to extract field name
- Set field-specific error: `errors[field] = error.message`
- Display error below affected input
- Clear loading state
- Log error for debugging

**User Recovery**:
- User corrects the field
- Error clears on input change
- User can submit again

---

#### 10.2.2 General Validation Error

**Trigger**: Server returns 400 without field reference
**Example Response**:
```json
{
  "error": {
    "message": "Invalid request data",
    "code": "VALIDATION_ERROR"
  }
}
```

**Handling**:
- Set form-level error: `apiError = error.message`
- Display error message below form (alert box)
- Clear loading state
- Log full error for debugging

**User Recovery**:
- User reviews and corrects form
- Error clears on any input change
- User can submit again

---

### 10.3 Authentication Errors (401 Unauthorized)

#### 10.3.1 Invalid Credentials

**Trigger**: Server returns 401 (email or password incorrect)
**Example Response**:
```json
{
  "error": {
    "message": "Invalid username or password",
    "code": "INVALID_CREDENTIALS"
  }
}
```

**Handling**:
- Set form-level error: `apiError = "Invalid username or password"`
- Display generic error message (security - don't reveal which field is wrong)
- Clear loading state
- Clear password field (optional, for security)
- Keep email field populated
- Log attempt for security monitoring (backend)

**User Recovery**:
- User reviews credentials
- User corrects email or password
- Error clears on any input change
- User can submit again

**Important**: Never reveal whether email or password was incorrect

---

### 10.4 Rate Limiting Errors (429 Too Many Requests)

**Trigger**: Too many login attempts from same IP/user
**Example Response**:
```json
{
  "error": {
    "message": "Too many login attempts. Please try again later.",
    "code": "RATE_LIMIT_EXCEEDED"
  }
}
```

**Handling**:
- Set form-level error: `apiError = error.message`
- Display error message with wait time if provided
- Disable submit button temporarily (optional)
- Clear loading state
- Log rate limit event

**User Recovery**:
- User waits for rate limit to expire
- User tries again after waiting period
- Consider implementing exponential backoff

---

### 10.5 Server Errors (500 Internal Server Error)

**Trigger**: Server encounters internal error
**Example Response**:
```json
{
  "error": {
    "message": "An error occurred. Please try again later.",
    "code": "SERVER_ERROR"
  }
}
```

**Handling**:
- Set form-level error: `apiError = "An error occurred. Please try again later."`
- Display user-friendly error message (hide technical details)
- Clear loading state
- Log full error details to console for debugging
- Consider Sentry/error tracking integration

**User Recovery**:
- User can retry immediately
- If persists, user should contact support
- Form data preserved for retry

---

### 10.6 Network Errors

#### 10.6.1 No Internet Connection

**Trigger**: Fetch API throws network error
**Detection**: `catch` block in fetch call
**Example Error**: `TypeError: Failed to fetch`

**Handling**:
```typescript
catch (error) {
  console.error('Login error:', error);
  setApiError('Network error. Please check your connection.');
  setIsSubmitting(false);
}
```

**User Recovery**:
- User checks internet connection
- User retries when connection restored
- Form data preserved

---

#### 10.6.2 Request Timeout

**Trigger**: Request takes too long (>30 seconds)
**Handling**:
- Implement timeout with AbortController (optional for MVP)
- Display: "Request timed out. Please try again."
- Clear loading state
- Log timeout event

**User Recovery**:
- User retries request
- Form data preserved

---

### 10.7 Session Expired Scenario

**Trigger**: User is redirected to login after session expiration
**Detection**: URL parameter `?expired=true` or similar

**Handling** (in `login.astro`):
```typescript
const sessionExpired = Astro.url.searchParams.get('expired');
```

**UI Display**:
- Show info message (not error): "Your session has expired. Please log in again."
- Display above form in blue/info alert (not red)
- Non-blocking message
- Auto-dismiss after successful login

**User Recovery**:
- User logs in normally
- Message clears after successful authentication
- User redirected to original intended page (or `/decks`)

---

### 10.8 Already Authenticated Scenario

**Trigger**: Authenticated user navigates to `/login`
**Detection**: `Astro.locals.session` exists in server-side check

**Handling** (in `login.astro`):
```typescript
if (Astro.locals.session) {
  return Astro.redirect('/decks');
}
```

**No UI**: User never sees login page, immediately redirected

---

### 10.9 Supabase Service Unavailable

**Trigger**: Supabase service is down or unreachable
**Detection**: API endpoint returns 503 or timeout

**Handling**:
- Display: "Service temporarily unavailable. Please try again shortly."
- Provide retry button
- Clear loading state
- Log service outage

**User Recovery**:
- User waits for service restoration
- User retries
- Consider status page link (future enhancement)

---

### 10.10 Error Display Patterns

#### 10.10.1 Field-Level Errors

**Visual Pattern**:
```
[Label]
[Input with red border]
🔴 Error message in red text
```

**Implementation**:
```tsx
<Label htmlFor="email">Email</Label>
<Input
  id="email"
  type="email"
  value={formData.email}
  onChange={handleEmailChange}
  className={errors.email ? 'border-red-500' : ''}
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && (
  <p id="email-error" className="text-sm text-red-500 mt-1">
    {errors.email}
  </p>
)}
```

---

#### 10.10.2 Form-Level Errors

**Visual Pattern**:
```
[Alert Box with red background]
  ⚠️ Error message text
[/Alert Box]

[Form fields below]
```

**Implementation**:
```tsx
{apiError && (
  <div
    role="alert"
    aria-live="polite"
    className="p-4 mb-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
  >
    {apiError}
  </div>
)}
```

---

### 10.11 Error Logging Strategy

**Client-Side Logging**:
```typescript
// Log errors to console for development
console.error('Login error:', {
  type: 'authentication',
  message: error.message,
  timestamp: new Date().toISOString()
});

// Future: Send to error tracking service
// Sentry.captureException(error);
```

**Backend Logging** (in API endpoint):
```typescript
// Log failed login attempts
console.error('Failed login attempt:', {
  email: requestBody.email,
  error: error.message,
  ip: request.headers.get('x-forwarded-for'),
  timestamp: new Date().toISOString()
});
```

---

### 10.12 Error Handling Summary Table

| Error Type | Status | User Message | User Action | Technical Details |
|-----------|--------|--------------|-------------|-------------------|
| Empty email | - | "Email is required" | Fill email field | Client validation |
| Invalid email format | - | "Please enter a valid email address" | Correct format | Regex validation |
| Empty password | - | "Password is required" | Fill password field | Client validation |
| Invalid credentials | 401 | "Invalid username or password" | Check credentials | Supabase auth |
| Validation error | 400 | Field-specific message | Correct field | Server validation |
| Rate limit | 429 | "Too many attempts. Try later." | Wait and retry | Rate limiter |
| Server error | 500 | "Error occurred. Try again later." | Retry | Internal error |
| Network error | - | "Network error. Check connection." | Check internet, retry | Fetch failure |
| Session expired | - | "Session expired. Please log in." | Log in again | Info message |

## 11. Implementation Steps

### Step 1: Create Type Definitions

**File**: `src/types/auth.ts` (new file)

**Tasks**:
1. Define `LoginFormData` interface
2. Define `FormFieldError` interface
3. Define `LoginRequest` interface
4. Define `LoginSuccessResponse` interface
5. Define `LoginError` interface
6. Export all types

**Code Template**:
```typescript
// src/types/auth.ts

export interface LoginFormData {
  email: string;
  password: string;
}

export interface FormFieldError {
  email?: string;
  password?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginSuccessResponse {
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

export interface LoginError {
  error: {
    message: string;
    code: string;
    field?: string;
  };
}
```

**Validation**: TypeScript compiles without errors

---

### Step 2: Create Custom Hook (useLoginForm)

**File**: `src/hooks/useLoginForm.ts` (new file)

**Tasks**:
1. Import React hooks and types
2. Define state variables (formData, errors, isSubmitting, apiError, showPassword)
3. Implement input change handlers
4. Implement password visibility toggle
5. Implement validation functions
6. Implement form submission handler with API call
7. Implement error handling
8. Return hook interface

**Code Template**:
```typescript
// src/hooks/useLoginForm.ts

import { useState } from 'react';
import type { LoginFormData, FormFieldError, LoginRequest, LoginSuccessResponse, LoginError } from '@/types/auth';

export const useLoginForm = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState<FormFieldError>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormFieldError = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, email: e.target.value }));
    setErrors(prev => ({ ...prev, email: undefined }));
    setApiError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, password: e.target.value }));
    setErrors(prev => ({ ...prev, password: undefined }));
    setApiError(null);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData as LoginRequest)
      });

      if (response.ok) {
        const data: LoginSuccessResponse = await response.json();
        window.location.href = '/decks';
        return;
      }

      const errorData: LoginError = await response.json();

      if (response.status === 401) {
        setApiError('Invalid username or password');
      } else if (response.status === 400 && errorData.error.field) {
        setErrors(prev => ({
          ...prev,
          [errorData.error.field!]: errorData.error.message
        }));
      } else {
        setApiError(errorData.error.message || 'An error occurred. Please try again.');
      }

    } catch (error) {
      console.error('Login error:', error);
      setApiError('Network error. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    isSubmitting,
    apiError,
    showPassword,
    handleEmailChange,
    handlePasswordChange,
    togglePasswordVisibility,
    handleSubmit
  };
};
```

**Validation**: TypeScript compiles, hook logic is sound

---

### Step 3: Create LoginForm Component

**File**: `src/components/LoginForm.tsx` (new file)

**Tasks**:
1. Import React, Shadcn/ui components, and custom hook
2. Import icons (Eye, EyeOff, Loader2 from lucide-react)
3. Use `useLoginForm` hook
4. Render form with semantic HTML
5. Implement email input with label and error display
6. Implement password input with label, toggle, and error display
7. Implement submit button with loading state
8. Implement form-level error display
9. Add link to registration page
10. Ensure proper ARIA attributes

**Code Template**:
```tsx
// src/components/LoginForm.tsx

import React from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoginForm } from '@/hooks/useLoginForm';

export const LoginForm: React.FC = () => {
  const {
    formData,
    errors,
    isSubmitting,
    apiError,
    showPassword,
    handleEmailChange,
    handlePasswordChange,
    togglePasswordVisibility,
    handleSubmit
  } = useLoginForm();

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Log in to 10xCards</h1>

      {apiError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 mb-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
        >
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={handleEmailChange}
            disabled={isSubmitting}
            autoFocus
            autoComplete="email"
            className={errors.email ? 'border-red-500' : ''}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-red-500 mt-1">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handlePasswordChange}
              disabled={isSubmitting}
              autoComplete="current-password"
              className={errors.password ? 'border-red-500' : ''}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={togglePasswordVisibility}
              className="absolute right-0 top-0 h-full px-3"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {errors.password && (
            <p id="password-error" className="text-sm text-red-500 mt-1">
              {errors.password}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            'Log in'
          )}
        </Button>
      </form>

      {/* Link to Registration */}
      <p className="mt-4 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <a href="/register" className="text-blue-600 hover:underline">
          Create an account
        </a>
      </p>
    </div>
  );
};
```

**Validation**:
- Component renders without errors
- All interactive elements respond correctly
- Accessibility attributes present

---

### Step 4: Create Login Page (Astro)

**File**: `src/pages/login.astro` (new file)

**Tasks**:
1. Import Layout component
2. Import LoginForm component
3. Check authentication state (server-side)
4. Redirect authenticated users to `/decks`
5. Set page title and meta tags
6. Render LoginForm with `client:load` directive

**Code Template**:
```astro
---
// src/pages/login.astro

import Layout from '@/layouts/Layout.astro';
import { LoginForm } from '@/components/LoginForm';

// Check if user is already authenticated
if (Astro.locals.session) {
  return Astro.redirect('/decks');
}
---

<Layout title="Login - 10xCards">
  <main class="min-h-screen flex items-center justify-center bg-gray-50">
    <LoginForm client:load />
  </main>
</Layout>
```

**Validation**:
- Page renders correctly
- Authenticated users redirected
- Form is interactive

---

### Step 5: Update Middleware (if needed)

**File**: `src/middleware/index.ts`

**Tasks**:
1. Verify Supabase client is available in `Astro.locals`
2. Ensure session is attached to `Astro.locals`
3. No changes needed if already configured

**Verification**:
```typescript
// Should already exist from auth backend implementation
export const onRequest = async (context, next) => {
  context.locals.supabase = supabaseClient;
  const { data: { session } } = await context.locals.supabase.auth.getSession();
  context.locals.session = session;
  return next();
};
```

---

### Step 6: Test Form Validation

**Tasks**:
1. Submit empty form → Both fields show "required" errors
2. Submit invalid email → Email shows format error
3. Submit valid email, empty password → Password shows required error
4. Type in field with error → Error clears immediately
5. Verify no API call made when validation fails

**Validation Checklist**:
- [ ] Empty email shows error
- [ ] Invalid email format shows error
- [ ] Empty password shows error
- [ ] Errors clear on input change
- [ ] Form submission prevented when invalid

---

### Step 8: Test API Integration

**Tasks**:
1. Submit valid credentials → Redirect to `/decks`
2. Submit invalid credentials → Show "Invalid username or password"
3. Test with network disconnected → Show network error
4. Verify loading state appears during request
5. Verify form re-enables after error

**Test Credentials** (create test user first):
- Valid: test@example.com / ValidPassword123
- Invalid: test@example.com / WrongPassword
- Invalid: nonexistent@example.com / AnyPassword

**Validation Checklist**:
- [ ] Valid login redirects successfully
- [ ] Invalid credentials show generic error
- [ ] Network error handled gracefully
- [ ] Loading state works correctly
- [ ] Form re-enables after error

---

### Step 9: Test Accessibility

**Tasks**:
1. Navigate form using keyboard only (Tab, Enter)
2. Verify focus visible indicators on all elements
3. Test with screen reader (VoiceOver/NVDA)
4. Verify all ARIA attributes present
5. Verify error messages announced to screen reader
6. Test password toggle with keyboard

**Accessibility Checklist**:
- [ ] Tab order is logical
- [ ] Focus indicators visible
- [ ] Labels associated with inputs
- [ ] Error messages linked with aria-describedby
- [ ] aria-invalid set on invalid fields
- [ ] Password toggle accessible via keyboard
- [ ] Form can be submitted with Enter key

---

### Step 10: Test Edge Cases

**Tasks**:
1. Navigate to `/login` while authenticated → Redirect to `/decks`
2. Submit form, immediately try to submit again → Prevented by loading state
3. Toggle password visibility multiple times → Works correctly
4. Paste text into fields → Errors clear, values update
5. Test session expiration flow (if implemented)
6. Test with very long email/password inputs

**Edge Case Checklist**:
- [ ] Authenticated users cannot access login page
- [ ] Double submission prevented
- [ ] Password toggle works reliably
- [ ] Paste works correctly
- [ ] Long inputs handled gracefully

---

### Step 11: Styling and Polish

**Tasks**:
1. Verify consistent spacing (Tailwind classes)
2. Ensure responsive design (mobile, tablet, desktop)
3. Check dark mode support (if applicable)
4. Verify brand colors match design system
6. Verify loading spinner aligns correctly
7. Check error message styling consistency

**Visual Checklist**:
- [ ] Form centered on page
- [ ] Proper spacing between elements
- [ ] Responsive on mobile
- [ ] Consistent with design system
- [ ] Cross-browser compatible

---

### Step 12: Performance Optimization

**Tasks**:
1. Verify form component lazy loads properly (`client:load`)
2. Check bundle size of LoginForm component
3. Ensure no unnecessary re-renders
4. Test with React DevTools
5. Verify no memory leaks

**Performance Checklist**:
- [ ] Component loads quickly
- [ ] No unnecessary re-renders
- [ ] Bundle size acceptable
- [ ] No console warnings

---

### Step 13: Security Review

**Tasks**:
1. Verify password field has type="password" by default
2. Check that error messages are generic (don't reveal if email exists)
3. Verify HTTPS enforced in production (deployment config)
4. Check that credentials sent over secure connection
5. Verify no sensitive data in console logs (production)
6. Ensure session tokens stored in httpOnly cookies

**Security Checklist**:
- [ ] Password masked by default
- [ ] Generic error messages
- [ ] HTTPS enforced
- [ ] No sensitive data in logs
- [ ] Cookies are httpOnly

---

### Step 14: Documentation

**Tasks**:
1. Add JSDoc comments to custom hook
2. Document component props and types
3. Add inline comments for complex logic
4. Update project README with login flow
5. Document environment variables needed

**Documentation Checklist**:
- [ ] Hook documented
- [ ] Component documented
- [ ] Types documented
- [ ] README updated

---

### Step 15: Final Integration Test

**Tasks**:
1. Complete full user flow: navigate to login → enter credentials → redirect to decks
2. Test logout → login flow
3. Test login → logout → login again
4. Verify session persists across browser refresh
5. Test on production-like environment

**Final Checklist**:
- [ ] Complete user flow works end-to-end
- [ ] Session persistence works
- [ ] Production deployment successful
- [ ] All acceptance criteria met (US-002)

---

## Implementation Timeline Estimate

- **Step 1** (Types): 15 minutes
- **Step 2** (API): 45 minutes
- **Step 3** (Hook): 30 minutes
- **Step 4** (Component): 45 minutes
- **Step 5** (Page): 15 minutes
- **Step 6** (Middleware): 10 minutes (verification only)
- **Step 7** (Validation Testing): 20 minutes
- **Step 8** (API Testing): 30 minutes
- **Step 9** (Accessibility Testing): 30 minutes
- **Step 10** (Edge Cases): 20 minutes
- **Step 11** (Styling): 30 minutes
- **Step 12** (Performance): 15 minutes
- **Step 13** (Security): 20 minutes
- **Step 14** (Documentation): 20 minutes
- **Step 15** (Final Testing): 30 minutes

**Total Estimated Time**: ~6 hours

---

## Success Criteria (from US-002)

✅ Login form requires username and password fields
✅ System validates credentials against stored user data
✅ Successful login redirects user to main application interface (`/decks`)
✅ Failed login displays error message: "Invalid username or password"
✅ User session is created upon successful login
✅ Session persists across browser refreshes
✅ System does not reveal whether username or password was incorrect

---

## Additional Notes

- **Browser Support**: Target modern browsers (Chrome, Firefox, Safari, Edge)
- **Mobile Support**: Ensure touch-friendly interface (adequate tap targets)
- **Future Enhancements**:
  - Remember me checkbox
  - Password reset link
  - Social login options
  - Rate limiting UI feedback
  - Remember last logged-in email
- **Testing**: Consider adding unit tests for validation logic and integration tests for form submission
