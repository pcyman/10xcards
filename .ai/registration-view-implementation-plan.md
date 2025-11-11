# View Implementation Plan: Registration View

## 1. Overview

The Registration View (`/register`) enables new users to create accounts immediately without email verification, providing instant access to the AI Flashcard Learning Platform. The view implements a form-based registration flow with real-time validation, password strength feedback, and accessibility features. Upon successful registration, users are automatically logged in and redirected to the main application interface (`/decks`).

## 2. View Routing

**Path**: `/register`
**Access**: Public (unauthenticated users only)
**Redirect**: Users who are already authenticated will be redirected to `/decks`
**File Location**: `src/pages/register.astro`

The Astro page component should check for existing authentication session and redirect authenticated users before rendering the registration form.

## 3. Component Structure

```
/register (Astro Page)
└── RegisterForm.tsx (React Component)
    ├── <form> (semantic HTML form)
    │   ├── Email Section
    │   │   ├── <label> (associated with input)
    │   │   ├── Input (Shadcn/ui)
    │   │   └── FormErrorMessage (custom)
    │   ├── Password Section
    │   │   ├── <label> (associated with input)
    │   │   ├── Input (Shadcn/ui) [type="password"]
    │   │   ├── PasswordRequirements (custom)
    │   │   └── FormErrorMessage (custom)
    │   ├── Confirm Password Section
    │   │   ├── <label> (associated with input)
    │   │   ├── Input (Shadcn/ui) [type="password"]
    │   │   └── FormErrorMessage (custom)
    │   └── Actions Section
    │       ├── Button (Shadcn/ui) [type="submit"]
    │       └── Link to /login
    └── Toast Container (for notifications)
```

## 4. Component Details

### 4.1 RegisterForm.tsx (Main React Component)

**Component Description**:
The primary form component that orchestrates the entire registration flow. It manages form state, handles user input, validates data in real-time, submits registration requests to the API, and manages error/success states.

**Main Elements**:
- `<form>` element with `onSubmit` handler
- Three input sections (email, password, confirm password)
- Submit button with loading state
- Navigation link to login page
- Toast notification system for feedback

**Handled Interactions**:
- `onChange` events for all input fields (updates form state)
- `onBlur` events for validation on field exit
- `onSubmit` event for form submission
- Password visibility toggle clicks (optional enhancement)

**Handled Validation** (detailed):
1. **Email Field**:
   - Required: Must not be empty or contain only whitespace
   - Format: Must match email regex pattern `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
   - Uniqueness: Validated server-side (409 Conflict response if exists)
   - Validated on: blur and submit

2. **Password Field**:
   - Required: Must not be empty
   - Length: Minimum 8 characters
   - Validated on: blur, submit, and real-time for requirements display

3. **Confirm Password Field**:
   - Required: Must not be empty
   - Match: Must exactly match password field
   - Validated on: blur and submit

4. **Form-level Validation**:
   - All fields must be valid before submission
   - Submit button disabled during API call
   - Prevents multiple simultaneous submissions

**Types**:
- `RegisterFormData` (ViewModel - internal form state)
- `RegisterFormFieldError` (ViewModel - error messages)
- `RegisterRequest` (DTO - API request)
- `RegisterSuccessResponse` (DTO - API success response)
- `RegisterError` (DTO - API error response)

**Props**:
```typescript
interface RegisterFormProps {
  // No props - standalone component
}
```

### 4.2 Input (Shadcn/ui Component)

**Component Description**:
Reusable text input component from Shadcn/ui library. Provides consistent styling, accessibility features, and validation state visualization.

**Main Elements**:
- `<input>` element with appropriate type attribute
- Wrapper div for styling
- Error state styling (red border when invalid)

**Handled Interactions**:
- `onChange`: Passes value changes to parent
- `onBlur`: Triggers validation in parent
- `onFocus`: Updates touched state

**Handled Validation**:
- Visual indication via `aria-invalid` attribute
- Error state styling when validation fails
- Associated with error message via `aria-describedby`

**Types**:
- Standard HTML input attributes
- Additional props: `error?: boolean`, `errorId?: string`

**Props**:
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorId?: string;
}
```

### 4.3 Button (Shadcn/ui Component)

**Component Description**:
Primary action button component from Shadcn/ui. Used for form submission with loading state support.

**Main Elements**:
- `<button>` element with type="submit"
- Loading spinner (when `isLoading` prop is true)
- Button text content

**Handled Interactions**:
- `onClick`: Triggers form submission

**Handled Validation**:
- Disabled when `isLoading` is true
- Disabled when form is invalid (optional)

**Types**:
- Standard HTML button attributes
- Additional props: `isLoading?: boolean`, `variant?: string`

**Props**:
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
}
```

### 4.4 PasswordRequirements (Custom Component)

**Component Description**:
Displays a visual checklist of password requirements with real-time feedback. Shows which requirements are met or unmet as the user types their password.

**Main Elements**:
- `<div>` container with ARIA live region
- Unordered list `<ul>` of requirements
- Each requirement as `<li>` with icon (checkmark or x)
- Conditional styling based on requirement status

**Handled Interactions**:
- None (display-only component, reactive to password prop changes)

**Handled Validation**:
- Real-time checking of password against each requirement
- Visual feedback (green checkmark for met, gray/red x for unmet)
- Does not block submission (validation handled by parent)

**Types**:
- `PasswordRequirement` (ViewModel - requirement definition)

**Props**:
```typescript
interface PasswordRequirementsProps {
  password: string;
  showChecklist?: boolean; // Optional: hide until user focuses password field
}

interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}
```

### 4.5 FormErrorMessage (Custom Component)

**Component Description**:
Displays inline validation error messages below form fields. Implements proper ARIA attributes for accessibility.

**Main Elements**:
- `<div>` or `<span>` with error message text
- Icon (optional alert icon)
- Styled with error color (red)

**Handled Interactions**:
- None (display-only component)

**Handled Validation**:
- Conditionally rendered when error message exists
- Associated with input via `id` prop matching input's `aria-describedby`

**Types**:
- Simple string message

**Props**:
```typescript
interface FormErrorMessageProps {
  id: string;
  message?: string;
  fieldId: string; // For aria-describedby association
}
```

### 4.6 register.astro (Astro Page Component)

**Component Description**:
Server-side rendered page component that serves as the container for the registration view. Handles authentication state checking and provides the page layout.

**Main Elements**:
- Layout wrapper (likely `BaseLayout` or `AuthLayout`)
- RegisterForm component with `client:load` directive
- Page metadata (title, description)

**Handled Interactions**:
- Server-side authentication check
- Redirect logic for authenticated users

**Handled Validation**:
- Session validation (redirect to /decks if authenticated)

**Types**:
- Astro component (no explicit TypeScript interface)

**Props**:
- None (page component)

## 5. Types

### 5.1 RegisterFormData (ViewModel)

```typescript
interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}
```

**Purpose**: Internal form state in the React component.
**Location**: `src/types.ts` or inline in `RegisterForm.tsx`

**Field Breakdown**:
- `email: string` - User's email address input value
- `password: string` - User's password input value
- `confirmPassword: string` - Password confirmation input value

### 5.2 RegisterFormFieldError (ViewModel)

```typescript
interface RegisterFormFieldError {
  email?: string;
  password?: string;
  confirmPassword?: string;
}
```

**Purpose**: Store validation error messages for each form field.
**Location**: `src/types.ts` or inline in `RegisterForm.tsx`

**Field Breakdown**:
- `email?: string` - Optional error message for email field (e.g., "Please enter a valid email address")
- `password?: string` - Optional error message for password field (e.g., "Password must be at least 8 characters")
- `confirmPassword?: string` - Optional error message for confirm password field (e.g., "Passwords do not match")

### 5.3 RegisterRequest (DTO)

```typescript
interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}
```

**Purpose**: Request payload sent to `POST /api/auth/register` endpoint.
**Location**: `src/types.ts`

**Field Breakdown**:
- `email: string` - User's email address to register
- `password: string` - User's chosen password
- `confirmPassword: string` - Password confirmation for validation

### 5.4 RegisterSuccessResponse (DTO)

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
```

**Purpose**: Success response from registration API (201 Created).
**Location**: `src/types.ts`

**Field Breakdown**:
- `user.id: string` - Unique identifier for the newly created user
- `user.email: string` - Registered email address (confirmation)
- `session.access_token: string` - JWT access token for authentication
- `session.refresh_token: string` - JWT refresh token for session renewal
- `session.expires_at: number` - Unix timestamp when access token expires

### 5.5 RegisterError (DTO)

```typescript
interface RegisterError {
  error: {
    message: string;
    code: string;
    field?: string;
  };
}
```

**Purpose**: Error response from registration API (400, 409, 500).
**Location**: `src/types.ts`

**Field Breakdown**:
- `error.message: string` - Human-readable error message for display
- `error.code: string` - Machine-readable error code (e.g., "VALIDATION_ERROR", "EMAIL_ALREADY_EXISTS")
- `error.field?: string` - Optional field name that caused the error (for field-specific errors)

### 5.6 PasswordRequirement (ViewModel)

```typescript
interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}
```

**Purpose**: Define and track individual password requirements.
**Location**: Inline in `PasswordRequirements.tsx` or `src/types.ts`

**Field Breakdown**:
- `id: string` - Unique identifier for the requirement (e.g., "minLength")
- `label: string` - Display text for the requirement (e.g., "At least 8 characters")
- `test: (password: string) => boolean` - Function to test if password meets requirement
- `met: boolean` - Current state of requirement (true if met, false otherwise)

## 6. State Management

### 6.1 State Management Strategy

State management for the Registration View will be handled using React hooks within the `RegisterForm` component. A custom hook `useRegisterForm` will encapsulate all form logic, validation, and API integration for better code organization and reusability.

### 6.2 State Variables

**In RegisterForm Component** (managed by `useRegisterForm` hook):

1. **formData: RegisterFormData**
   - Stores current values of all form fields
   - Initial value: `{ email: "", password: "", confirmPassword: "" }`
   - Updated via: `handleChange` on input events

2. **errors: RegisterFormFieldError**
   - Stores validation error messages for each field
   - Initial value: `{}`
   - Updated via: validation functions on blur and submit

3. **isSubmitting: boolean**
   - Tracks form submission state (prevents multiple submissions)
   - Initial value: `false`
   - Updated via: `handleSubmit` (true on start, false on completion)

4. **touched: Record<string, boolean>**
   - Tracks which fields have been interacted with (for validation timing)
   - Initial value: `{}`
   - Updated via: `handleBlur` events
   - Purpose: Only show errors for fields the user has touched

### 6.3 Custom Hook: useRegisterForm

**Location**: `src/hooks/useRegisterForm.ts` or inline in `RegisterForm.tsx`

**Purpose**: Encapsulate all form logic, validation, and API integration in a reusable hook.

**Hook Structure**:

```typescript
function useRegisterForm() {
  // State declarations
  const [formData, setFormData] = useState<RegisterFormData>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<RegisterFormFieldError>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Please enter a valid email address";
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return "Password is required";
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    return undefined;
  };

  const validateConfirmPassword = (
    password: string,
    confirmPassword: string
  ): string | undefined => {
    if (!confirmPassword) return "Please confirm your password";
    if (password !== confirmPassword) return "Passwords do not match";
    return undefined;
  };

  // Event handlers
  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof RegisterFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    // Validate field on blur
    let error: string | undefined;
    if (field === "email") {
      error = validateEmail(formData.email);
    } else if (field === "password") {
      error = validatePassword(formData.password);
    } else if (field === "confirmPassword") {
      error = validateConfirmPassword(formData.password, formData.confirmPassword);
    }

    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const confirmError = validateConfirmPassword(
      formData.password,
      formData.confirmPassword
    );

    if (emailError || passwordError || confirmError) {
      setErrors({
        email: emailError,
        password: passwordError,
        confirmPassword: confirmError,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      if (!response.ok) {
        const error: RegisterError = await response.json();

        if (error.error.field) {
          setErrors({ [error.error.field]: error.error.message });
        } else {
          // Show toast notification for non-field-specific errors
          toast.error(error.error.message);
        }

        return;
      }

      const data: RegisterSuccessResponse = await response.json();

      // Show success message
      toast.success("Registration successful! Redirecting...");

      // Small delay to show success message
      setTimeout(() => {
        window.location.href = "/decks";
      }, 500);

    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    isSubmitting,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}
```

**Return Values**:
- `formData` - Current form field values
- `errors` - Current validation errors
- `isSubmitting` - Loading state during API call
- `touched` - Fields that have been interacted with
- `handleChange` - Function to update field values
- `handleBlur` - Function to handle field blur (validation)
- `handleSubmit` - Function to handle form submission

## 7. API Integration

### 7.1 Endpoint Details

**Endpoint**: `POST /api/auth/register`
**Method**: POST
**Content-Type**: application/json
**Authentication**: Not required (public endpoint)

### 7.2 Request Format

**Request Type**: `RegisterRequest`

```typescript
interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}
```

**Example Request**:
```json
{
  "email": "user@example.com",
  "password": "securepass123",
  "confirmPassword": "securepass123"
}
```

### 7.3 Response Formats

**Success Response (201 Created)**: `RegisterSuccessResponse`

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
```

**Error Response (400/409/500)**: `RegisterError`

```typescript
interface RegisterError {
  error: {
    message: string;
    code: string;
    field?: string;
  };
}
```

**Error Codes and Meanings**:
- `VALIDATION_ERROR` (400) - Input validation failed
- `EMAIL_ALREADY_EXISTS` (409) - Email is already registered
- `INTERNAL_ERROR` (500) - Server error

### 7.4 Integration Implementation

The API integration is handled in the `handleSubmit` function within the `useRegisterForm` hook:

1. **Prepare Request**:
   - Validate all fields client-side first
   - Create request body with RegisterRequest structure
   - Set Content-Type header to application/json

2. **Make Request**:
   - Use fetch API with POST method
   - Send to `/api/auth/register` endpoint
   - Include credentials for cookie handling

3. **Handle Response**:
   - Check response status
   - Parse JSON response body
   - Handle success (201) or error (400/409/500)

4. **Success Flow**:
   - Store session tokens (handled by backend via cookies)
   - Show success toast notification
   - Redirect to `/decks` after brief delay

5. **Error Flow**:
   - Parse error response
   - Display field-specific errors inline or general errors as toast
   - Keep form data (don't clear) for user to correct

## 8. User Interactions

### 8.1 Email Field Interaction

**User Action**: Types in email field
**System Response**:
- Updates `formData.email` via `handleChange`
- Clears any existing email error message
- No validation until blur

**User Action**: Leaves email field (blur)
**System Response**:
- Marks email as touched
- Validates email format via `validateEmail`
- If invalid, displays error message below field
- Sets `aria-invalid="true"` on input

### 8.2 Password Field Interaction

**User Action**: Types in password field
**System Response**:
- Updates `formData.password` via `handleChange`
- Clears any existing password error message
- Updates PasswordRequirements checklist in real-time
- Shows which requirements are met/unmet

**User Action**: Leaves password field (blur)
**System Response**:
- Marks password as touched
- Validates password strength via `validatePassword`
- If invalid, displays error message below field

### 8.3 Confirm Password Field Interaction

**User Action**: Types in confirm password field
**System Response**:
- Updates `formData.confirmPassword` via `handleChange`
- Clears any existing confirm password error message
- No real-time validation (only on blur)

**User Action**: Leaves confirm password field (blur)
**System Response**:
- Marks confirm password as touched
- Validates match via `validateConfirmPassword`
- If mismatch, displays "Passwords do not match" error

### 8.4 Form Submission Interaction

**User Action**: Clicks "Register" button
**System Response**:
1. Prevents default form submission
2. Validates all fields
3. If validation fails:
   - Shows all validation errors
   - Focuses first invalid field
   - Does not make API call
4. If validation passes:
   - Sets `isSubmitting` to true
   - Disables submit button
   - Shows loading spinner
   - Makes API call
5. On API success:
   - Shows success toast message
   - Redirects to `/decks` after 500ms delay
6. On API error:
   - Shows error message (inline or toast)
   - Re-enables form
   - Sets `isSubmitting` to false

### 8.5 Navigation to Login

**User Action**: Clicks "Already have an account? Login" link
**System Response**:
- Navigates to `/login` page
- Form data is not preserved (user leaves registration flow)

## 9. Conditions and Validation

### 9.1 Email Field Validation

**Conditions Verified**:

1. **Non-empty Requirement**:
   - Check: `email.trim().length === 0`
   - Error Message: "Email is required"
   - Timing: On blur, on submit
   - Component: RegisterForm.tsx, validateEmail function
   - UI Effect: Error message below input, red border, aria-invalid

2. **Valid Format Requirement**:
   - Check: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)`
   - Error Message: "Please enter a valid email address"
   - Timing: On blur, on submit
   - Component: RegisterForm.tsx, validateEmail function
   - UI Effect: Error message below input, red border, aria-invalid

3. **Uniqueness Requirement**:
   - Check: API response (409 Conflict)
   - Error Message: "Email already registered"
   - Timing: On submit (server-side validation)
   - Component: RegisterForm.tsx, handleSubmit function
   - UI Effect: Error message below email input

### 9.2 Password Field Validation

**Conditions Verified**:

1. **Non-empty Requirement**:
   - Check: `password.length === 0`
   - Error Message: "Password is required"
   - Timing: On blur, on submit
   - Component: RegisterForm.tsx, validatePassword function
   - UI Effect: Error message below input, red border

2. **Minimum Length Requirement**:
   - Check: `password.length < 8`
   - Error Message: "Password must be at least 8 characters"
   - Timing: On blur, on submit
   - Component: RegisterForm.tsx, validatePassword function
   - UI Effect: Error message below input, PasswordRequirements shows unmet

3. **Real-time Strength Feedback**:
   - Check: Multiple requirements (length, etc.)
   - Display: PasswordRequirements checklist
   - Timing: Real-time (on change)
   - Component: PasswordRequirements.tsx
   - UI Effect: Green checkmarks for met requirements, gray for unmet

### 9.3 Confirm Password Field Validation

**Conditions Verified**:

1. **Non-empty Requirement**:
   - Check: `confirmPassword.length === 0`
   - Error Message: "Please confirm your password"
   - Timing: On blur, on submit
   - Component: RegisterForm.tsx, validateConfirmPassword function
   - UI Effect: Error message below input, red border

2. **Match Requirement**:
   - Check: `password !== confirmPassword`
   - Error Message: "Passwords do not match"
   - Timing: On blur, on submit
   - Component: RegisterForm.tsx, validateConfirmPassword function
   - UI Effect: Error message below input, red border

### 9.4 Form-Level Conditions

**Conditions Verified**:

1. **All Fields Valid**:
   - Check: No errors in `errors` state object
   - Effect: Enables form submission
   - Timing: Continuous (derived state)
   - Component: RegisterForm.tsx
   - UI Effect: Submit button enabled/disabled

2. **Not Currently Submitting**:
   - Check: `isSubmitting === false`
   - Effect: Allows form submission
   - Timing: During API call
   - Component: RegisterForm.tsx
   - UI Effect: Submit button disabled, loading spinner shown

3. **Authentication State**:
   - Check: User not already authenticated
   - Effect: Allows access to registration page
   - Timing: Server-side on page load
   - Component: register.astro
   - UI Effect: Redirect to `/decks` if authenticated

## 10. Error Handling

### 10.1 Client-Side Validation Errors

**Error Type**: Empty Email
**Detection**: `validateEmail` function on blur/submit
**Handling**:
- Display error message: "Email is required"
- Show below email input field
- Mark input with `aria-invalid="true"`
- Focus remains on email field

**Error Type**: Invalid Email Format
**Detection**: Regex test in `validateEmail` function
**Handling**:
- Display error message: "Please enter a valid email address"
- Show below email input field
- Mark input with `aria-invalid="true"`
- User can correct without resubmitting form

**Error Type**: Empty Password
**Detection**: `validatePassword` function on blur/submit
**Handling**:
- Display error message: "Password is required"
- Show below password input field
- Mark input with `aria-invalid="true"`

**Error Type**: Weak Password
**Detection**: Length check in `validatePassword` function
**Handling**:
- Display error message: "Password must be at least 8 characters"
- PasswordRequirements checklist shows unmet requirement
- Show below password input field
- User can see requirements and correct

**Error Type**: Password Mismatch
**Detection**: `validateConfirmPassword` function on blur/submit
**Handling**:
- Display error message: "Passwords do not match"
- Show below confirm password input field
- User can correct either password field

### 10.2 Server-Side Validation Errors

**Error Type**: Email Already Exists (409 Conflict)
**Response**:
```json
{
  "error": {
    "message": "Email already registered",
    "code": "EMAIL_ALREADY_EXISTS"
  }
}
```
**Handling**:
- Parse error response in `handleSubmit`
- Display error message below email input
- Suggest user to login instead
- Form remains populated for user to correct

**Error Type**: Validation Error (400 Bad Request)
**Response**:
```json
{
  "error": {
    "message": "Invalid input",
    "code": "VALIDATION_ERROR",
    "field": "email"
  }
}
```
**Handling**:
- Parse error response
- If `field` is specified, show error below that field
- If no field specified, show toast notification
- Re-enable form for correction

### 10.3 Network and Server Errors

**Error Type**: Network Failure
**Detection**: Fetch throws exception
**Handling**:
- Catch in try-catch block
- Show toast notification: "An unexpected error occurred. Please try again."
- Set `isSubmitting` to false
- Form remains populated
- User can retry submission

**Error Type**: Server Error (500 Internal Server Error)
**Response**:
```json
{
  "error": {
    "message": "Registration failed. Please try again.",
    "code": "INTERNAL_ERROR"
  }
}
```
**Handling**:
- Parse error response
- Show toast notification with error message
- Log error details (console/monitoring)
- Set `isSubmitting` to false
- User can retry

**Error Type**: Rate Limiting (429 Too Many Requests)
**Response**:
```json
{
  "error": {
    "message": "Too many attempts. Please try again later.",
    "code": "RATE_LIMIT_EXCEEDED"
  }
}
```
**Handling**:
- Parse error response
- Show toast notification with wait time
- Disable form temporarily
- Set `isSubmitting` to false

### 10.4 Edge Cases

**Edge Case**: User clicks submit multiple times
**Handling**:
- `isSubmitting` state prevents multiple submissions
- Submit button disabled during processing
- First click triggers submission, subsequent clicks ignored

**Edge Case**: User navigates away during submission
**Handling**:
- API call continues but response is ignored
- No state update on unmounted component
- User must restart registration process

**Edge Case**: Session expires during registration
**Handling**:
- Shouldn't occur (user not authenticated)
- If occurs, registration creates new session
- User proceeds normally

**Edge Case**: Whitespace in email
**Handling**:
- `.trim()` removes leading/trailing whitespace
- Validates trimmed value
- Stores trimmed value in form state

## 11. Implementation Steps

### Step 1: Create Type Definitions

**Action**: Add registration types to `src/types.ts`

**Tasks**:
1. Add `RegisterFormData` interface
2. Add `RegisterFormFieldError` interface
3. Add `RegisterRequest` interface (if not already present)
4. Add `RegisterSuccessResponse` interface (similar to LoginSuccessResponse)
5. Add `RegisterError` interface (similar to LoginError)
6. Add `PasswordRequirement` interface

**Verification**: TypeScript compiles without errors

### Step 2: Create PasswordRequirements Component

**Action**: Create `src/components/PasswordRequirements.tsx`

**Tasks**:
1. Define component props interface
2. Define password requirements array
3. Implement requirement testing logic
4. Create checklist UI with conditional styling
5. Add ARIA attributes for accessibility
6. Style with Tailwind CSS

**Verification**: Component renders with sample password, shows correct requirement states

### Step 3: Create FormErrorMessage Component

**Action**: Create `src/components/FormErrorMessage.tsx`

**Tasks**:
1. Define component props interface
2. Implement conditional rendering (only when message exists)
3. Add proper ARIA attributes (role="alert", aria-live="polite")
4. Style with Tailwind CSS (error red, appropriate spacing)

**Verification**: Component renders error message correctly, hidden when no message

### Step 4: Create useRegisterForm Hook

**Action**: Create `src/hooks/useRegisterForm.ts`

**Tasks**:
1. Set up state variables (formData, errors, isSubmitting, touched)
2. Implement validation functions (validateEmail, validatePassword, validateConfirmPassword)
3. Implement handleChange function
4. Implement handleBlur function
5. Implement handleSubmit function with API integration
6. Add error handling and toast notifications
7. Return hook interface

**Verification**: Hook compiles, exports correct interface

### Step 5: Create RegisterForm Component

**Action**: Create `src/components/RegisterForm.tsx`

**Tasks**:
1. Import required components and hooks
2. Use `useRegisterForm` hook
3. Create form structure with semantic HTML
4. Add email input section with label, Input, and FormErrorMessage
5. Add password input section with label, Input, PasswordRequirements, and FormErrorMessage
6. Add confirm password input section with label, Input, and FormErrorMessage
7. Add submit Button with loading state
8. Add link to login page
9. Implement proper ARIA attributes throughout
10. Style with Tailwind CSS
11. Add auto-focus to email field

**Verification**: Component renders correctly, form elements functional

### Step 6: Create Register Page

**Action**: Create `src/pages/register.astro`

**Tasks**:
1. Add authentication check (redirect if authenticated)
2. Import layout component
3. Import RegisterForm with `client:load` directive
4. Add page metadata (title, description)
5. Structure page layout
6. Add any additional static content (e.g., hero section)

**Verification**: Page loads, shows RegisterForm, redirects if authenticated

### Step 7: Implement API Endpoint

**Action**: Create `src/pages/api/auth/register.ts`

**Tasks**:
1. Add `export const prerender = false`
2. Import required types and Supabase client
3. Create Zod validation schema
4. Implement POST handler
5. Validate request body
6. Call `supabase.auth.signUp()`
7. Handle Supabase errors
8. Set session cookies
9. Return success response
10. Implement error handling

**Verification**: Endpoint returns correct responses, creates users successfully

### Step 8: Add Authentication Redirect Logic

**Action**: Update authentication middleware or register.astro

**Tasks**:
1. Check for existing session in `register.astro`
2. If session exists, redirect to `/decks`
3. If no session, render RegisterForm

**Verification**: Authenticated users cannot access `/register`, are redirected

### Step 9: Implement Toast Notifications

**Action**: Add toast notification system (e.g., react-hot-toast or sonner)

**Tasks**:
1. Install toast library: `npm install react-hot-toast`
2. Add Toaster component to RegisterForm or layout
3. Use toast.success() and toast.error() in handleSubmit
4. Style toasts to match design system

**Verification**: Toasts appear on success/error, dismiss correctly

### Step 10: Add Accessibility Features

**Action**: Enhance accessibility throughout registration view

**Tasks**:
1. Verify all inputs have associated labels
2. Add `aria-describedby` to inputs pointing to error messages
3. Add `aria-invalid` to inputs with errors
4. Add `aria-live="polite"` to error message containers
5. Ensure keyboard navigation works (tab order)
6. Test with screen reader
7. Add focus management (focus first error on submit)

**Verification**: Pass accessibility audit (axe DevTools), keyboard navigable

### Step 11: Implement Loading States

**Action**: Add loading indicators and disabled states

**Tasks**:
1. Disable submit button when `isSubmitting` is true
2. Show loading spinner on button during submission
3. Disable all inputs during submission (optional)
4. Add loading cursor or overlay (optional)

**Verification**: UI shows loading state during API call, prevents interaction

### Step 12: Add Form Validation Timing

**Action**: Fine-tune when validation occurs

**Tasks**:
1. Ensure validation only shows after field is touched
2. Clear errors when user starts typing in field with error
3. Validate on blur for immediate feedback
4. Validate all fields on submit attempt

**Verification**: Validation feels responsive, not annoying

### Step 13: Style the View

**Action**: Apply Tailwind CSS styling to match design system

**Tasks**:
1. Style form container (max-width, padding, centering)
2. Style input fields (consistent sizing, spacing)
3. Style labels (proper hierarchy, spacing)
4. Style error messages (color, size, spacing)
5. Style submit button (primary variant, hover states)
6. Style login link (secondary styling)
7. Ensure responsive design (mobile-first)
8. Test dark mode support (if applicable)

**Verification**: View matches design mockups, responsive on all devices

### Step 14: Test Registration Flow

**Action**: Comprehensive testing of registration functionality

**Tasks**:
1. Test successful registration flow end-to-end
2. Test validation errors (empty fields, invalid email, weak password, mismatch)
3. Test duplicate email error (409)
4. Test network error handling
5. Test form submission prevention during loading
6. Test redirect to `/decks` after success
7. Test auto-login (session created correctly)
8. Test link to login page

**Verification**: All scenarios work as expected, no bugs

### Step 15: Add Error Logging and Monitoring

**Action**: Implement error logging for debugging

**Tasks**:
1. Add console.error for caught exceptions
2. Consider adding error tracking service (e.g., Sentry)
3. Log registration attempts (success/failure) server-side
4. Add user-facing error IDs for support

**Verification**: Errors are logged, can be traced for debugging

### Step 16: Performance Optimization

**Action**: Optimize component performance

**Tasks**:
1. Use `React.memo()` for PasswordRequirements if needed
2. Use `useCallback` for event handlers in RegisterForm
3. Consider debouncing real-time validation (if performance issues)
4. Ensure no unnecessary re-renders

**Verification**: Component performs smoothly, no lag during typing

### Step 17: Documentation

**Action**: Document the registration view

**Tasks**:
1. Add JSDoc comments to components and functions
2. Document validation rules
3. Document API integration
4. Add README section for registration flow
5. Document any gotchas or edge cases

**Verification**: Code is well-documented, easy for others to understand

### Step 18: Code Review and Refinement

**Action**: Review implementation against requirements

**Tasks**:
1. Review against PRD and user stories
2. Check all acceptance criteria are met
3. Run linter and fix issues: `npm run lint:fix`
4. Format code: `npm run format`
5. Run type checker: `npm run type-check` (if available)

**Verification**: All requirements met, code quality high

### Step 19: Integration Testing

**Action**: Test registration in context of full application

**Tasks**:
1. Test redirect from protected routes to `/register`
2. Test registration -> redirect to `/decks` -> see authenticated UI
3. Test logout -> register again flow
4. Test registration with Supabase local instance and production

**Verification**: Registration integrates seamlessly with rest of app

### Step 20: Deployment Preparation

**Action**: Ensure registration view is production-ready

**Tasks**:
1. Verify environment variables are set correctly
2. Test with production Supabase instance
3. Verify secure cookies work in production
4. Test HTTPS redirect (if applicable)
5. Verify email uniqueness constraint in database
6. Set up monitoring and alerting

**Verification**: Registration works in production environment
