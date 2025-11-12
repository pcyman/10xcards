# API Endpoint Implementation Plan: Update Flashcard

## 1. Endpoint Overview

The Update Flashcard endpoint allows authenticated users to modify the front or back text of an existing flashcard. This is a partial update operation (PATCH) where users can update either field independently. The endpoint enforces ownership validation and maintains data integrity through strict validation rules.

**Core Functionality:**
- Update flashcard front and/or back text
- Enforce user ownership through Row Level Security (RLS) and explicit user_id checks
- Validate input to prevent empty or whitespace-only content
- Return complete flashcard data including spaced repetition metadata
- Maintain updated_at timestamp automatically via database trigger

## 2. Request Details

**HTTP Method:** `PATCH`

**URL Structure:** `/api/flashcards/:id`

**Path Parameters:**
- `id` (required) - UUID of the flashcard to update

**Request Headers:**
- `Authorization: Bearer <token>` - JWT token (validated by middleware)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "front": "string (optional)",
  "back": "string (optional)"
}
```

**Validation Rules:**
- At least one field (`front` or `back`) must be provided
- If `front` is provided, it must not be empty or whitespace-only
- If `back` is provided, it must not be empty or whitespace-only
- Both fields can be provided simultaneously
- Maximum length: No explicit limit (database uses `text` type)

**Example Valid Requests:**
```json
// Update only front
{ "front": "New front text" }

// Update only back
{ "back": "New back text" }

// Update both
{ "front": "New front", "back": "New back" }
```

**Example Invalid Requests:**
```json
// No fields provided
{}

// Empty string
{ "front": "" }

// Whitespace only
{ "back": "   " }
```

## 3. Used Types

### DTOs (Data Transfer Objects)

**Request Type:**
```typescript
// Already defined in src/types.ts:77-80
export interface UpdateFlashcardCommand {
  front?: string;
  back?: string;
}
```

**Response Type:**
```typescript
// Already defined in src/types.ts:61
export type FlashcardDTO = Omit<FlashcardRow, "user_id">;

// Includes all fields:
// - id: uuid
// - deck_id: uuid
// - front: string
// - back: string
// - is_ai_generated: boolean
// - next_review_date: date
// - ease_factor: decimal
// - interval_days: integer
// - repetitions: integer
// - created_at: timestamp
// - updated_at: timestamp
```

### Validation Schemas (New)

**Create:** `src/lib/validation/flashcard.schemas.ts`
```typescript
import { z } from "zod";

/**
 * Validation schema for UpdateFlashcardCommand
 * Validates the request body for PATCH /api/flashcards/:id
 */
export const updateFlashcardSchema = z
  .object({
    front: z
      .string()
      .optional()
      .refine(
        (val) => val === undefined || val.trim().length > 0,
        { message: "Front text cannot be empty or whitespace-only" }
      ),
    back: z
      .string()
      .optional()
      .refine(
        (val) => val === undefined || val.trim().length > 0,
        { message: "Back text cannot be empty or whitespace-only" }
      ),
  })
  .refine(
    (data) => data.front !== undefined || data.back !== undefined,
    { message: "At least one field (front or back) must be provided" }
  );
```

### Service Layer (New Method)

**Extend:** `src/lib/services/flashcard.service.ts`

```typescript
/**
 * Parameters for updating a flashcard
 */
export interface UpdateFlashcardParams {
  flashcardId: string;
  userId: string;
  command: UpdateFlashcardCommand;
}

/**
 * Update an existing flashcard's content
 *
 * Updates front and/or back text of a flashcard.
 * Verifies flashcard ownership before update.
 * The updated_at timestamp is automatically set by database trigger.
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param params - UpdateFlashcardParams containing flashcard ID, user ID, and update data
 * @returns FlashcardDTO of the updated flashcard
 * @throws Error with 'FLASHCARD_NOT_FOUND' message if flashcard doesn't exist or doesn't belong to user
 * @throws FlashcardServiceError if database operation fails
 */
async updateFlashcard(
  supabase: SupabaseServerClient,
  params: UpdateFlashcardParams
): Promise<FlashcardDTO>
```

## 4. Response Details

### Success Response (200 OK)

**Status Code:** `200 OK`

**Content-Type:** `application/json`

**Body:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "deck_id": "650e8400-e29b-41d4-a716-446655440001",
  "front": "Updated front text",
  "back": "Updated back text",
  "is_ai_generated": false,
  "next_review_date": "2025-01-15",
  "ease_factor": 2.5,
  "interval_days": 0,
  "repetitions": 0,
  "created_at": "2025-01-10T10:00:00.000Z",
  "updated_at": "2025-01-12T14:30:00.000Z"
}
```

### Error Responses

**401 Unauthorized**
```json
{
  "error": {
    "message": "Invalid or expired authentication token",
    "code": "UNAUTHORIZED"
  }
}
```

**400 Bad Request - Invalid UUID**
```json
{
  "error": {
    "message": "Invalid flashcard ID format",
    "code": "INVALID_UUID"
  }
}
```

**400 Bad Request - Invalid JSON**
```json
{
  "error": {
    "message": "Invalid JSON in request body",
    "code": "INVALID_JSON"
  }
}
```

**422 Unprocessable Entity - Validation Error**
```json
{
  "error": {
    "message": "At least one field (front or back) must be provided",
    "code": "VALIDATION_ERROR",
    "field": ""
  }
}
```

**404 Not Found**
```json
{
  "error": {
    "message": "Flashcard not found",
    "code": "FLASHCARD_NOT_FOUND"
  }
}
```

**500 Internal Server Error**
```json
{
  "error": {
    "message": "An unexpected error occurred",
    "code": "INTERNAL_SERVER_ERROR"
  }
}
```

## 5. Data Flow

### Request Processing Flow

```
1. Client Request
   ↓
2. Astro Middleware (src/middleware/index.ts)
   - Validates JWT token
   - Creates Supabase client with user context
   - Attaches session to locals
   ↓
3. API Route Handler (src/pages/api/flashcards/[id].ts - PATCH method)
   - Verifies authentication (locals.session)
   - Validates user token (getUser())
   - Validates flashcard ID (UUID format)
   - Parses request body (JSON)
   - Validates request body (Zod schema)
   ↓
4. FlashcardService.updateFlashcard()
   - Updates flashcard with ownership check (user_id = userId)
   - Handles database constraints
   - Returns FlashcardDTO
   ↓
5. Response
   - 200 OK with FlashcardDTO
   - OR appropriate error response
```

### Database Interaction

**Update Query:**
```typescript
await supabase
  .from("flashcards")
  .update({
    // Only include fields provided in command
    ...(command.front !== undefined && { front: command.front }),
    ...(command.back !== undefined && { back: command.back }),
    // updated_at set automatically by trigger
  })
  .eq("id", flashcardId)
  .eq("user_id", userId)  // Ownership verification
  .select("id, deck_id, front, back, is_ai_generated, next_review_date, ease_factor, interval_days, repetitions, created_at, updated_at")
  .single();
```

**Database Constraints Enforced:**
- `flashcards_front_not_empty`: Ensures `trim(front) != ''`
- `flashcards_back_not_empty`: Ensures `trim(back) != ''`
- Foreign key: `deck_id` references `decks(id)` with CASCADE
- Foreign key: `user_id` references `auth.users(id)` with CASCADE

**Row Level Security (RLS):**
- RLS policies automatically filter by authenticated user
- Additional explicit `user_id` check in query for clarity and security

## 6. Security Considerations

### Authentication & Authorization

1. **JWT Token Validation**
   - Middleware validates Bearer token before route handler executes
   - Route handler double-checks with `locals.supabase.auth.getUser()`
   - Returns 401 if token is missing, invalid, or expired

2. **Ownership Verification**
   - Database update query explicitly filters by `user_id`
   - Returns 404 (not 403) to prevent flashcard ID enumeration
   - Same error message for "not found" and "not owned" cases

3. **Row Level Security (RLS)**
   - Supabase RLS policies provide defense-in-depth
   - Service layer adds explicit user_id checks for clarity

### Input Validation & Sanitization

1. **Path Parameter Validation**
   - UUID format validation prevents SQL injection
   - Invalid UUIDs rejected with 400 before database query

2. **Request Body Validation**
   - Zod schema validates structure and data types
   - Whitespace trimming check prevents empty content
   - At-least-one-field check prevents no-op updates

3. **Database Constraints**
   - Check constraints enforce non-empty text at database level
   - Provides additional layer of validation
   - Prevents data corruption if validation is bypassed

4. **No SQL Injection Risk**
   - Parameterized queries via Supabase client
   - No raw SQL concatenation
   - UUID validation prevents injection attempts

### Cross-Site Scripting (XSS) Prevention

1. **Server-Side Storage**
   - Text stored as-is in database (plain text)
   - No HTML rendering on server
   - Frontend responsible for display sanitization

2. **Content-Type Header**
   - All responses use `application/json`
   - Prevents MIME-type confusion attacks

### Information Disclosure Prevention

1. **Error Messages**
   - Generic messages for client (no stack traces)
   - Detailed logging only in server logs
   - Same error for not-found/unauthorized (prevents enumeration)

2. **Sensitive Data Exclusion**
   - `user_id` excluded from FlashcardDTO response
   - Only flashcard owner's data returned

### Rate Limiting & Abuse Prevention

1. **Infrastructure Level**
   - Rate limiting should be implemented at API gateway/reverse proxy
   - Not implemented in endpoint code (separation of concerns)

2. **Database Performance**
   - Indexed columns (id, user_id) for fast queries
   - Single-row updates are efficient

## 7. Error Handling

### Error Categories & Handling Strategy

**1. Authentication Errors (401)**

**Scenario:** No session or invalid token
```typescript
if (!locals.session) {
  return new Response(
    JSON.stringify({
      error: {
        message: "Invalid or expired authentication token",
        code: "UNAUTHORIZED",
      },
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

**2. Validation Errors (400)**

**Scenario A:** Invalid UUID format
```typescript
const uuidValidation = uuidSchema.safeParse(id);
if (!uuidValidation.success) {
  return new Response(
    JSON.stringify({
      error: {
        message: "Invalid flashcard ID format",
        code: "INVALID_UUID",
      },
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

**Scenario B:** Invalid JSON body
```typescript
try {
  body = await request.json();
} catch {
  return new Response(
    JSON.stringify({
      error: {
        message: "Invalid JSON in request body",
        code: "INVALID_JSON",
      },
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

**3. Validation Errors (422)**

**Scenario:** Zod schema validation failure
```typescript
const validation = updateFlashcardSchema.safeParse(body);
if (!validation.success) {
  const firstError = validation.error.errors[0];
  return new Response(
    JSON.stringify({
      error: {
        message: firstError.message,
        code: "VALIDATION_ERROR",
        field: firstError.path.join("."),
      },
    }),
    { status: 422, headers: { "Content-Type": "application/json" } }
  );
}
```

**4. Not Found Errors (404)**

**Scenario:** Flashcard doesn't exist or user doesn't own it
```typescript
// In service: if no rows updated
if (!flashcard) {
  throw new Error("FLASHCARD_NOT_FOUND");
}

// In route handler:
if (error instanceof Error && error.message === "FLASHCARD_NOT_FOUND") {
  return new Response(
    JSON.stringify({
      error: {
        message: "Flashcard not found",
        code: "FLASHCARD_NOT_FOUND",
      },
    }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}
```

**5. Server Errors (500)**

**Scenario A:** FlashcardServiceError
```typescript
if (error instanceof FlashcardServiceError) {
  console.error("FlashcardService error in PATCH /api/flashcards/:id:", {
    timestamp: new Date().toISOString(),
    userId: locals.session?.user?.id ?? "unknown",
    flashcardId: params.id,
    message: error.message,
    error,
  });

  return new Response(
    JSON.stringify({
      error: {
        message: "An unexpected error occurred",
        code: "INTERNAL_SERVER_ERROR",
      },
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

**Scenario B:** Unexpected errors
```typescript
console.error("Unexpected error in PATCH /api/flashcards/:id:", {
  timestamp: new Date().toISOString(),
  userId: locals.session?.user?.id ?? "unknown",
  flashcardId: params.id,
  error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
});

return new Response(
  JSON.stringify({
    error: {
      message: "An unexpected error occurred",
      code: "INTERNAL_SERVER_ERROR",
    },
  }),
  { status: 500, headers: { "Content-Type": "application/json" } }
);
```

### Error Logging Strategy

**Structured Logging Format:**
```typescript
{
  timestamp: string,      // ISO 8601 format
  userId: string,         // User ID or "unknown"
  flashcardId: string,    // Flashcard ID from params
  message: string,        // Error message
  error: Error | object   // Full error object or stack trace
}
```

**Logging Levels:**
- **No Logging:** 400, 401, 404, 422 (expected client errors)
- **Error Logging:** 500 (unexpected server errors, service errors)

## 8. Performance Considerations

### Potential Bottlenecks

1. **Database Query Performance**
   - Single-row update with indexed columns (id, user_id)
   - O(1) operation with proper indexing
   - Risk: Low

2. **JSON Parsing**
   - Small payload size (typically < 1KB)
   - Synchronous operation
   - Risk: Low

3. **Validation Overhead**
   - Zod schema validation is fast for simple schemas
   - Linear time complexity O(n) where n = field count (max 2)
   - Risk: Low

### Optimization Strategies

1. **Database Indexing**
   - Ensure composite index on (id, user_id) exists
   - PostgreSQL query planner should use index efficiently
   - Monitor with `EXPLAIN ANALYZE` if performance issues arise

2. **Connection Pooling**
   - Supabase client handles connection pooling automatically
   - No additional configuration needed

3. **Response Caching**
   - Not recommended for PATCH operations
   - Always return fresh data after update

4. **Request Validation**
   - Early return pattern for validation errors
   - Avoid database queries for invalid requests

### Expected Performance

**Typical Response Times:**
- P50: < 100ms
- P95: < 250ms
- P99: < 500ms

**Load Capacity:**
- Single flashcard update: Low database impact
- Can handle 100+ concurrent update requests
- Limited by database connection pool size

## 9. Implementation Steps

### Step 1: Create Validation Schema File

**File:** `src/lib/validation/flashcard.schemas.ts`

**Actions:**
1. Create new file
2. Import Zod: `import { z } from "zod";`
3. Define `updateFlashcardSchema` with:
   - Optional `front` field with whitespace refinement
   - Optional `back` field with whitespace refinement
   - Object-level refinement to ensure at least one field is provided
4. Export schema for use in route handler

**Reference Pattern:** `src/lib/validation/deck.schemas.ts`

---

### Step 2: Extend FlashcardService with Update Method

**File:** `src/lib/services/flashcard.service.ts`

**Actions:**
1. Add `UpdateFlashcardParams` interface before class definition
2. Implement `updateFlashcard()` method in `FlashcardService` class:
   - Accept `supabase`, `params` as arguments
   - Build update object conditionally (only include provided fields)
   - Execute update query with `.eq("id", flashcardId).eq("user_id", userId)`
   - Select all FlashcardDTO fields
   - Use `.single()` to get exactly one row
3. Handle errors:
   - Throw `Error("FLASHCARD_NOT_FOUND")` if no flashcard returned
   - Throw `FlashcardServiceError` for database errors
   - Re-throw known errors, wrap unexpected errors
4. Return `FlashcardDTO`

**Reference Pattern:** `deckService.updateDeck()` in `src/lib/services/deck.service.ts:297-358`

---

### Step 3: Add PATCH Handler to Flashcard Route

**File:** `src/pages/api/flashcards/[id].ts`

**Actions:**
1. Import dependencies at top of file:
   - `UpdateFlashcardCommand` from `@/types`
   - `updateFlashcardSchema` from `@/lib/validation/flashcard.schemas`
   - `uuidSchema` from `@/lib/validation/deck.schemas`
2. Export `PATCH` function as `APIRoute`
3. Implement request handling with structured steps (use comments):
   - **Step 1:** Authentication (check `locals.session` and `getUser()`)
   - **Step 2:** Validate flashcard ID (UUID format)
   - **Step 3:** Parse and validate request body (JSON + Zod)
   - **Step 4:** Call service to update flashcard
   - **Step 5:** Return success response (200 OK)
   - **Step 6:** Handle service-level errors (try-catch)
4. Follow error response format from existing GET handler
5. Add JSDoc comment describing endpoint

**Reference Pattern:** `PATCH /api/decks/:id` in `src/pages/api/decks/[id].ts:174-374`

---

### Step 4: Test Authentication Flow

**Manual Testing:**
1. Test without authentication token → expect 401
2. Test with expired token → expect 401
3. Test with valid token → proceed to next tests

**Tools:**
- cURL or Postman
- Valid JWT token from Supabase Auth

---

### Step 5: Test Validation Rules

**Test Cases:**
1. **Invalid UUID:**
   - Request: `PATCH /api/flashcards/invalid-id`
   - Expected: 400 with "INVALID_UUID"

2. **Invalid JSON:**
   - Request body: `{invalid json}`
   - Expected: 400 with "INVALID_JSON"

3. **No fields provided:**
   - Request body: `{}`
   - Expected: 422 with validation error

4. **Empty string:**
   - Request body: `{ "front": "" }`
   - Expected: 422 with validation error

5. **Whitespace only:**
   - Request body: `{ "back": "   " }`
   - Expected: 422 with validation error

6. **Valid single field:**
   - Request body: `{ "front": "New front" }`
   - Expected: 200 with updated flashcard

7. **Valid both fields:**
   - Request body: `{ "front": "New front", "back": "New back" }`
   - Expected: 200 with updated flashcard

---

### Step 6: Test Authorization

**Test Cases:**
1. **Flashcard doesn't exist:**
   - Request: Valid UUID that doesn't exist in database
   - Expected: 404 with "FLASHCARD_NOT_FOUND"

2. **Flashcard belongs to another user:**
   - Request: Valid UUID of flashcard owned by different user
   - Expected: 404 with "FLASHCARD_NOT_FOUND" (same as not found)

3. **Flashcard belongs to current user:**
   - Request: Valid UUID of user's own flashcard
   - Expected: 200 with updated flashcard

---

### Step 7: Test Error Handling

**Test Cases:**
1. **Database connection failure:**
   - Simulate by stopping Supabase instance
   - Expected: 500 with "INTERNAL_SERVER_ERROR"
   - Verify error is logged with full context

2. **Constraint violation:**
   - Should be caught by Zod validation
   - If database constraint triggers, should return 500

---

### Step 8: Integration Testing

**Test Scenarios:**
1. **Complete update flow:**
   - Create flashcard → Update front → Verify change
   - Update back → Verify change
   - Update both → Verify changes

2. **updated_at timestamp:**
   - Verify `updated_at` changes after update
   - Verify it's newer than `created_at`

3. **Spaced repetition fields unchanged:**
   - Verify `ease_factor`, `interval_days`, `repetitions`, `next_review_date` remain unchanged

4. **Concurrent updates:**
   - Test multiple simultaneous updates to same flashcard
   - Verify last-write-wins behavior

---

### Step 9: Code Review & Documentation

**Checklist:**
1. ✓ All error scenarios handled with appropriate status codes
2. ✓ Consistent error response format across codebase
3. ✓ Proper error logging with structured context
4. ✓ JSDoc comments on all exported functions
5. ✓ Type safety: No `any` types used
6. ✓ Security: Ownership verification in place
7. ✓ Validation: All inputs validated before use
8. ✓ Code follows existing patterns and conventions
9. ✓ No console statements for debugging (use proper logging)

---

### Step 10: Update API Documentation

**Actions:**
1. Add endpoint to API documentation (if separate docs exist)
2. Include in OpenAPI/Swagger spec (if used)
3. Update CHANGELOG.md or similar
4. Add example requests/responses to developer documentation

---

## Summary

This implementation plan provides comprehensive guidance for adding the Update Flashcard endpoint (`PATCH /api/flashcards/:id`). The endpoint follows established patterns in the codebase, maintains security best practices, and provides robust error handling. The implementation leverages existing infrastructure (middleware, services, validation) and extends it consistently.

**Key Deliverables:**
1. Validation schema: `src/lib/validation/flashcard.schemas.ts`
2. Service method: `FlashcardService.updateFlashcard()` in `src/lib/services/flashcard.service.ts`
3. API route handler: `PATCH` export in `src/pages/api/flashcards/[id].ts`

**Estimated Implementation Time:**
- Step 1-3 (Core implementation): 2-3 hours
- Step 4-8 (Testing): 2-3 hours
- Step 9-10 (Review & documentation): 1 hour
- **Total:** 5-7 hours
