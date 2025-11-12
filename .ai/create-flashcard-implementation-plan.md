# API Endpoint Implementation Plan: Create Flashcard Manually

## 1. Endpoint Overview

**Purpose:** Create a new flashcard manually in a specific deck with user-provided front and back text.

**Key Characteristics:**

- Creates a flashcard with `is_ai_generated = false`
- Initializes default spaced repetition parameters (ease_factor: 2.5, interval_days: 0, repetitions: 0)
- Sets `next_review_date` to current date (making it immediately available for study)
- Enforces deck ownership verification before creation
- Returns complete flashcard data including all spaced repetition metadata

## 2. Request Details

### HTTP Method

`POST`

### URL Structure

`/api/decks/:deckId/flashcards`

### Path Parameters

- **deckId** (required)
  - Type: UUID string
  - Description: Unique identifier of the deck to add the flashcard to
  - Validation: Must be a valid UUID format
  - Security: Ownership verified before creation

### Request Headers

- **Authorization**: `Bearer <token>` (required)
- **Content-Type**: `application/json` (required)

### Request Body

```json
{
  "front": "string (required, plain text, cannot be empty or whitespace-only)",
  "back": "string (required, plain text, cannot be empty or whitespace-only)"
}
```

**Validation Rules:**

- `front`: Required, string, must not be empty after trimming
- `back`: Required, string, must not be empty after trimming
- Both fields store plain text (unlimited length as per database schema)

## 3. Used Types

### Existing Types (from src/types.ts)

**CreateFlashcardCommand** (lines 67-70)

```typescript
export interface CreateFlashcardCommand {
  front: string;
  back: string;
}
```

- Used for request body validation
- Represents the user's input for creating a flashcard

**FlashcardDTO** (line 61)

```typescript
export type FlashcardDTO = Omit<FlashcardRow, "user_id">;
```

- Used for response payload
- Contains complete flashcard data excluding user_id (security measure)
- Includes: id, deck_id, front, back, is_ai_generated, next_review_date, ease_factor, interval_days, repetitions, created_at, updated_at

### Zod Validation Schemas (to be created)

**deckIdSchema**

```typescript
const deckIdSchema = z.string().uuid("Invalid deck ID format");
```

**createFlashcardSchema**

```typescript
const createFlashcardSchema = z.object({
  front: z
    .string()
    .min(1, "Front text is required")
    .refine((val) => val.trim().length > 0, {
      message: "Front text cannot be empty or whitespace-only",
    }),
  back: z
    .string()
    .min(1, "Back text is required")
    .refine((val) => val.trim().length > 0, {
      message: "Back text cannot be empty or whitespace-only",
    }),
});
```

## 4. Response Details

### Success Response (201 Created)

```json
{
  "id": "uuid",
  "deck_id": "uuid",
  "front": "string",
  "back": "string",
  "is_ai_generated": false,
  "next_review_date": "YYYY-MM-DD (today)",
  "ease_factor": 2.5,
  "interval_days": 0,
  "repetitions": 0,
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```

**Status Code:** `201 Created`

**Headers:**

- `Content-Type: application/json`

### Error Responses

**401 Unauthorized - No or Invalid Authentication**

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

or

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired authentication token"
}
```

**400 Bad Request - Invalid UUID or JSON**

```json
{
  "error": "Bad Request",
  "message": "Invalid deck ID format"
}
```

or

```json
{
  "error": "Bad Request",
  "message": "Invalid JSON in request body"
}
```

**404 Not Found - Deck Not Found or Not Owned**

```json
{
  "error": "Not Found",
  "message": "Deck not found or does not belong to user"
}
```

**422 Unprocessable Entity - Validation Failed**

```json
{
  "error": "Validation Error",
  "message": "Front text cannot be empty or whitespace-only",
  "details": [
    /* Zod validation errors */
  ]
}
```

**500 Internal Server Error - Database or Unexpected Errors**

```json
{
  "error": "Internal Server Error",
  "message": "Failed to create flashcard"
}
```

## 5. Data Flow

### High-Level Flow

1. **Request Reception** → API route receives POST request with deckId and flashcard data
2. **Authentication** → Verify user session and extract user ID
3. **Path Validation** → Validate deckId is a valid UUID
4. **Body Validation** → Parse and validate request body against schema
5. **Authorization** → Service verifies deck ownership (user owns the deck)
6. **Creation** → Service inserts flashcard with default SR values
7. **Response** → Return created flashcard DTO with 201 status

### Detailed Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. API Route (POST /api/decks/:deckId/flashcards)          │
│    - Extract deckId from params                             │
│    - Extract session from locals                            │
│    - Parse request body                                     │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Authentication Check                                     │
│    - Verify locals.session exists                           │
│    - Call supabase.auth.getUser()                          │
│    - Extract user.id                                        │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Input Validation                                         │
│    - Validate deckId with Zod (UUID format)                 │
│    - Validate request body with Zod schema                  │
│    - Check front and back are not empty/whitespace          │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. FlashcardService.createFlashcard()                       │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ 4a. Verify Deck Ownership                           │ │
│    │     - Query decks table                             │ │
│    │     - Filter by deck_id AND user_id                 │ │
│    │     - Throw DECK_NOT_FOUND if not found            │ │
│    └─────────────────────────────────────────────────────┘ │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ 4b. Insert Flashcard                                │ │
│    │     - Insert into flashcards table with:            │ │
│    │       * deck_id (from path)                         │ │
│    │       * user_id (from auth)                         │ │
│    │       * front, back (from request)                  │ │
│    │       * is_ai_generated = false                     │ │
│    │       * Default SR values (DB defaults)             │ │
│    │     - Select created flashcard                      │ │
│    └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Return Response                                          │
│    - Transform to FlashcardDTO (exclude user_id)            │
│    - Return with 201 Created status                         │
│    - Set Content-Type: application/json                     │
└─────────────────────────────────────────────────────────────┘
```

### Database Interactions

**Query 1: Verify Deck Ownership**

```typescript
const { data: deck } = await supabase.from("decks").select("id").eq("id", deckId).eq("user_id", userId).maybeSingle();
```

- **Purpose**: Ensure deck exists and belongs to the user
- **Security**: Prevents unauthorized flashcard creation
- **Error Handling**: Throw DECK_NOT_FOUND if null

**Query 2: Insert Flashcard**

```typescript
const { data: flashcard } = await supabase
  .from("flashcards")
  .insert({
    deck_id: deckId,
    user_id: userId,
    front: command.front,
    back: command.back,
    is_ai_generated: false,
    // Default values from DB: next_review_date, ease_factor, interval_days, repetitions
  })
  .select(
    "id, deck_id, front, back, is_ai_generated, next_review_date, ease_factor, interval_days, repetitions, created_at, updated_at"
  )
  .single();
```

- **Purpose**: Create flashcard with proper defaults
- **Note**: Database handles default values for SR fields
- **Security**: RLS policies enforce user_id matching

## 6. Security Considerations

### Authentication & Authorization

**1. Session-Based Authentication**

- Verify `locals.session` exists (set by Astro middleware)
- Extract user via `supabase.auth.getUser()`
- Reject requests without valid session (401 Unauthorized)

**2. Deck Ownership Verification**

- **Threat**: IDOR (Insecure Direct Object Reference)
- **Mitigation**: Explicitly verify deck belongs to authenticated user
- **Implementation**: Query decks table with `user_id = authenticated_user_id`
- **Fail-Safe**: Return 404 if deck doesn't exist or belongs to another user

**3. Row-Level Security (RLS)**

- Supabase RLS policies enforce user_id matching on flashcards table
- Provides defense-in-depth even if service-layer checks fail
- User cannot insert flashcards for another user

### Input Validation & Sanitization

**1. Path Parameter Validation**

- Validate deckId is a valid UUID format
- Prevents SQL injection and malformed queries
- Reject invalid UUIDs with 400 Bad Request

**2. Request Body Validation**

- Use Zod schemas for strict type checking
- Trim and validate front/back text
- Reject empty or whitespace-only strings (422 Unprocessable Entity)
- No length limit (database allows TEXT type)

**3. Content Security**

- Store plain text only (no HTML)
- Prevents XSS attacks when displaying flashcards
- Frontend responsible for safe rendering

### Data Integrity

**1. Database Constraints**

- Foreign key constraints ensure deckId references valid deck
- Check constraints prevent empty front/back text at DB level
- User_id foreign key enforces valid user references

**2. Default Values**

- Database provides default values for SR fields
- Ensures data consistency even if application layer fails
- next_review_date defaults to current_date

### Rate Limiting & Abuse Prevention

**Recommendations:**

- Implement rate limiting on flashcard creation (e.g., 100 per hour)
- Monitor for suspicious patterns (bulk creation)
- Consider deck size limits if needed

## 7. Error Handling

### Error Handling Strategy

Follow early-return pattern with guard clauses:

1. Check authentication first (401)
2. Validate path parameters (400)
3. Parse and validate body (400/422)
4. Call service layer (404/500)
5. Return success (201)

### Specific Error Scenarios

| Scenario              | Status Code | Error Response                                                                  | Handling Location           |
| --------------------- | ----------- | ------------------------------------------------------------------------------- | --------------------------- |
| No session token      | 401         | `{ error: "Unauthorized", message: "Authentication required" }`                 | API Route - Auth Check      |
| Invalid/expired token | 401         | `{ error: "Unauthorized", message: "Invalid or expired authentication token" }` | API Route - Auth Check      |
| Invalid deckId UUID   | 400         | `{ error: "Bad Request", message: "Invalid deck ID format" }`                   | API Route - Path Validation |
| Invalid JSON body     | 400         | `{ error: "Bad Request", message: "Invalid JSON in request body" }`             | API Route - Body Parsing    |
| Empty front/back text | 422         | `{ error: "Validation Error", message: "...", details: [...] }`                 | API Route - Body Validation |
| Deck not found        | 404         | `{ error: "Not Found", message: "Deck not found or does not belong to user" }`  | Service - Ownership Check   |
| Database insert error | 500         | `{ error: "Internal Server Error", message: "Failed to create flashcard" }`     | Service - Insert Error      |
| Unexpected error      | 500         | `{ error: "Internal Server Error", message: "An unexpected error occurred" }`   | API Route - Catch-All       |

### Error Logging

**Client Errors (4xx):**

- No logging required (user input issues)
- Return descriptive error messages

**Server Errors (5xx):**

- Log with `console.error()` including:
  - Error message
  - Stack trace
  - Context (endpoint, user ID if available)
- Return generic error message (don't expose internals)

**Example:**

```typescript
console.error("FlashcardService error in POST /api/decks/:deckId/flashcards:", {
  message: error.message,
  deckId,
  userId: user.id,
  error,
});
```

### Service Error Patterns

**DECK_NOT_FOUND Error:**

```typescript
if (!deck) {
  throw new Error("DECK_NOT_FOUND");
}
```

- Caught in API route
- Mapped to 404 response
- Message: "Deck not found or does not belong to user"

**FlashcardServiceError:**

- Custom error class for service-layer failures
- Indicates database or internal errors
- Mapped to 500 response
- Logged for debugging

## 8. Performance Considerations

### Database Query Optimization

**1. Minimize Round Trips**

- Deck ownership check: Simple query on indexed columns (id, user_id)
- Insert operation: Single query with `.select()` to return created data
- Total: 2 database queries per request

**2. Use Indexes**

- Primary key index on decks.id (automatic)
- User_id indexes for RLS filtering
- No full table scans

**3. Efficient Selects**

- Only select needed columns (exclude user_id in response)
- Use `.single()` for insert to avoid array wrapping

### Potential Bottlenecks

**1. Authentication Overhead**

- Every request validates JWT token
- Mitigated by Supabase's optimized auth
- Consider token caching if needed

**2. Deck Ownership Check**

- Additional query before insert
- Necessary for security
- Fast due to indexed columns
- Could be optimized with RLS-only approach (trade-off: less explicit errors)

**3. Concurrent Creates**

- Multiple flashcards in same deck
- No locking needed (independent rows)
- Database handles concurrency

### Optimization Strategies

**1. Connection Pooling**

- Supabase handles connection pooling
- No manual optimization needed

**2. Prepared Statements**

- Supabase uses prepared statements
- Prevents SQL injection
- Improves query performance

**3. Response Size**

- Single flashcard object (minimal payload)
- No pagination needed
- Fast serialization

### Scalability Notes

**Expected Load:**

- Manual flashcard creation is user-paced
- Lower frequency than bulk operations
- Not a high-throughput endpoint

**Scaling Approach:**

- Horizontal scaling via Supabase
- Stateless API routes (can run multiple instances)
- Database is the scaling bottleneck (not application)

## 9. Implementation Steps

### Step 1: Add Zod Validation Schemas to API Route

**File:** `src/pages/api/decks/[deckId]/flashcards.ts`

Add validation schemas after the existing imports:

```typescript
/**
 * Validation schema for creating a flashcard
 */
const createFlashcardSchema = z.object({
  front: z
    .string()
    .min(1, "Front text is required")
    .refine((val) => val.trim().length > 0, {
      message: "Front text cannot be empty or whitespace-only",
    }),
  back: z
    .string()
    .min(1, "Back text is required")
    .refine((val) => val.trim().length > 0, {
      message: "Back text cannot be empty or whitespace-only",
    }),
});
```

### Step 2: Add createFlashcard Method to FlashcardService

**File:** `src/lib/services/flashcard.service.ts`

Add interface for parameters:

```typescript
/**
 * Parameters for creating a flashcard
 */
export interface CreateFlashcardParams {
  deckId: string;
  userId: string;
  command: CreateFlashcardCommand;
}
```

Add method to FlashcardService class:

```typescript
/**
 * Create a new flashcard manually in a deck
 *
 * Creates a flashcard with is_ai_generated=false and default spaced repetition values.
 * Verifies deck ownership before creation.
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param params - CreateFlashcardParams containing deck ID, user ID, and flashcard data
 * @returns FlashcardDTO of the created flashcard
 * @throws Error with 'DECK_NOT_FOUND' message if deck doesn't exist or doesn't belong to user
 * @throws FlashcardServiceError if database operation fails
 */
async createFlashcard(
  supabase: SupabaseServerClient,
  params: CreateFlashcardParams
): Promise<FlashcardDTO> {
  const { deckId, userId, command } = params;

  try {
    // ========================================================================
    // Step 1: Verify deck ownership
    // ========================================================================
    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .select("id")
      .eq("id", deckId)
      .eq("user_id", userId)
      .maybeSingle();

    if (deckError) {
      throw new FlashcardServiceError(
        `Failed to verify deck ownership: ${deckError.message}`
      );
    }

    if (!deck) {
      throw new Error("DECK_NOT_FOUND");
    }

    // ========================================================================
    // Step 2: Insert flashcard with default spaced repetition values
    // ========================================================================
    const { data: flashcard, error: insertError } = await supabase
      .from("flashcards")
      .insert({
        deck_id: deckId,
        user_id: userId,
        front: command.front,
        back: command.back,
        is_ai_generated: false,
        // Default values are set by database:
        // - next_review_date: current_date
        // - ease_factor: 2.5
        // - interval_days: 0
        // - repetitions: 0
      })
      .select(
        "id, deck_id, front, back, is_ai_generated, next_review_date, ease_factor, interval_days, repetitions, created_at, updated_at"
      )
      .single();

    if (insertError) {
      throw new FlashcardServiceError(
        `Failed to create flashcard: ${insertError.message}`
      );
    }

    return flashcard as FlashcardDTO;
  } catch (error) {
    // Re-throw known errors (DECK_NOT_FOUND)
    if (error instanceof Error && error.message === "DECK_NOT_FOUND") {
      throw error;
    }

    // Re-throw FlashcardServiceError
    if (error instanceof FlashcardServiceError) {
      throw error;
    }

    // Log and wrap unexpected errors
    console.error("Unexpected error in createFlashcard:", error);
    throw new FlashcardServiceError("Failed to create flashcard");
  }
}
```

### Step 3: Implement POST Handler in API Route

**File:** `src/pages/api/decks/[deckId]/flashcards.ts`

Add POST handler after the existing GET handler:

```typescript
/**
 * POST /api/decks/:deckId/flashcards
 *
 * Create a new flashcard manually in a specific deck
 *
 * Path Parameters:
 * @param deckId - UUID of the deck
 *
 * Request Body:
 * @param front - Front text of flashcard (required, non-empty)
 * @param back - Back text of flashcard (required, non-empty)
 *
 * @returns Created flashcard with default spaced repetition values (201 Created)
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // ========================================================================
    // Step 1: Authentication
    // ========================================================================
    // Check if user is authenticated via session (set by middleware)
    if (!locals.session) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user from Supabase
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or expired authentication token",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // Step 2: Validate Path Parameter (deckId)
    // ========================================================================
    const deckIdValidation = deckIdSchema.safeParse(params.deckId);

    if (!deckIdValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid deck ID format",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const deckId = deckIdValidation.data;

    // ========================================================================
    // Step 3: Parse and Validate Request Body
    // ========================================================================
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid JSON in request body",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validationResult = createFlashcardSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: validationResult.error.errors[0].message,
          details: validationResult.error.errors,
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const command: CreateFlashcardCommand = validationResult.data;

    // ========================================================================
    // Step 4: Create Flashcard via Service
    // ========================================================================
    const flashcard = await flashcardService.createFlashcard(locals.supabase, {
      deckId,
      userId: user.id,
      command,
    });

    // ========================================================================
    // Step 5: Return Created Flashcard
    // ========================================================================
    return new Response(JSON.stringify(flashcard), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ========================================================================
    // Step 6: Error Handling
    // ========================================================================
    // Handle deck not found specifically
    if (error instanceof Error && error.message === "DECK_NOT_FOUND") {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Deck not found or does not belong to user",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle FlashcardService errors
    if (error instanceof FlashcardServiceError) {
      console.error("FlashcardService error in POST /api/decks/:deckId/flashcards:", {
        message: error.message,
        error,
      });

      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to create flashcard",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Catch-all for unexpected errors
    console.error("Unexpected error in POST /api/decks/:deckId/flashcards:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

### Step 4: Update Type Imports

**File:** `src/pages/api/decks/[deckId]/flashcards.ts`

Update the type imports at the top of the file:

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import type { FlashcardListQueryParams, CreateFlashcardCommand } from "@/types";
import { flashcardService, FlashcardServiceError } from "@/lib/services/flashcard.service";
```

### Step 5: Update Service Exports

**File:** `src/lib/services/flashcard.service.ts`

Ensure the CreateFlashcardParams interface is exported (added in Step 2).

Update imports at the top if CreateFlashcardCommand is not already imported:

```typescript
import type { createServerClient } from "@/db/supabase.client";
import type { FlashcardDTO, PaginatedResponseDTO, CreateFlashcardCommand } from "@/types";
```

### Step 6: Testing Checklist

After implementation, test the following scenarios:

**Success Cases:**

- [ ] Create flashcard with valid front and back text
- [ ] Verify response has status 201
- [ ] Verify response contains all required fields
- [ ] Verify is_ai_generated is false
- [ ] Verify default SR values (ease_factor: 2.5, interval_days: 0, repetitions: 0)
- [ ] Verify next_review_date is set to current date

**Authentication/Authorization:**

- [ ] Request without token returns 401
- [ ] Request with invalid token returns 401
- [ ] Request with expired token returns 401
- [ ] User cannot create flashcard in another user's deck (404)

**Validation Errors:**

- [ ] Invalid deckId UUID returns 400
- [ ] Invalid JSON body returns 400
- [ ] Empty front text returns 422
- [ ] Whitespace-only front text returns 422
- [ ] Empty back text returns 422
- [ ] Whitespace-only back text returns 422
- [ ] Missing front field returns 422
- [ ] Missing back field returns 422

**Not Found:**

- [ ] Non-existent deckId returns 404
- [ ] Deck belonging to another user returns 404

**Edge Cases:**

- [ ] Very long front text (thousands of characters) works
- [ ] Very long back text (thousands of characters) works
- [ ] Unicode characters in front/back text work
- [ ] Special characters in front/back text work

### Step 7: Documentation

Add JSDoc comments to all new functions and ensure they follow the existing codebase style. The implementation steps above include comprehensive JSDoc comments.

### Step 8: Code Review Checklist

Before submitting for review:

- [ ] All error paths return appropriate status codes
- [ ] All responses have Content-Type: application/json header
- [ ] No sensitive data (user_id) in responses
- [ ] Consistent error message format
- [ ] Console.error for server errors
- [ ] Early-return pattern for guard clauses
- [ ] Type safety (no `any` types)
- [ ] Zod schemas for all input validation
- [ ] Service layer handles business logic
- [ ] API route handles HTTP concerns
