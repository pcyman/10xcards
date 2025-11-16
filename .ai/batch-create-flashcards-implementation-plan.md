# API Endpoint Implementation Plan: Accept AI-Generated Flashcards (Batch)

## 1. Endpoint Overview

**Purpose:** Accept and save selected AI-generated flashcard candidates in batch.

**Method:** `POST`

**Path:** `/api/decks/:deckId/flashcards/batch`

**Authentication:** Required (Bearer token via Supabase session)

**Key Features:**
- Batch creation of multiple flashcards in a single request
- All flashcards marked as AI-generated (`is_ai_generated: true`)
- Default spaced repetition values applied to new flashcards
- Atomic operation - all flashcards created or none
- Deck ownership verification before creation

## 2. Request Details

### HTTP Method
`POST`

### URL Structure
`/api/decks/:deckId/flashcards/batch`

### Path Parameters

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `deckId` | string (UUID) | Yes | Must be valid UUID format | The deck to add flashcards to |

### Request Headers
- `Authorization: Bearer <token>` - JWT token from Supabase auth session
- `Content-Type: application/json`

### Request Body

**Type:** `AcceptFlashcardsCommand` (already defined in `src/types.ts`)

```json
{
  "flashcards": [
    {
      "front": "string (required, cannot be empty or whitespace-only)",
      "back": "string (required, cannot be empty or whitespace-only)"
    }
  ]
}
```

**Validation Rules:**
- `flashcards` array must contain at least 1 element
- `flashcards` array should be limited to max 100 elements (prevent DoS)
- Each `front` field: non-empty string, no whitespace-only content
- Each `back` field: non-empty string, no whitespace-only content

## 3. Used Types

### Existing Types (from `src/types.ts`)

**Request:**
- `AcceptFlashcardsCommand` (line 121-123) - Request body type
- `FlashcardCandidateDTO` (line 95-98) - Individual flashcard candidate

**Response:**
- `AcceptFlashcardsResponseDTO` (line 129-132) - Response body type
- `FlashcardDTO` (line 61) - Individual created flashcard

### New Service Interface (to be added to `flashcard.service.ts`)

```typescript
/**
 * Parameters for batch creating AI-generated flashcards
 */
export interface BatchCreateFlashcardsParams {
  deckId: string;
  userId: string;
  candidates: FlashcardCandidateDTO[];
}
```

## 4. Response Details

### Success Response (201 Created)

**Type:** `AcceptFlashcardsResponseDTO`

```json
{
  "created": [
    {
      "id": "uuid",
      "deck_id": "uuid",
      "front": "string",
      "back": "string",
      "is_ai_generated": true,
      "next_review_date": "date (today)",
      "ease_factor": 2.5,
      "interval_days": 0,
      "repetitions": 0,
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ],
  "total_created": "integer"
}
```

### Error Responses

| Status Code | Error Type | Response Structure |
|-------------|------------|-------------------|
| 400 | Bad Request | `{ error: "Bad Request", message: "..." }` |
| 401 | Unauthorized | `{ error: "Unauthorized", message: "..." }` |
| 404 | Not Found | `{ error: "Not Found", message: "..." }` |
| 422 | Validation Error | `{ error: "Validation Error", message: "...", details: [...] }` |
| 500 | Internal Server Error | `{ error: "Internal Server Error", message: "..." }` |

## 5. Data Flow

### High-Level Flow

1. **Authentication Layer** (Middleware)
   - Middleware extracts and validates session from request
   - Session stored in `context.locals.session`
   - Supabase client available via `context.locals.supabase`

2. **API Route Handler** (`POST /api/decks/:deckId/flashcards/batch`)
   - Validates authentication (session and user)
   - Validates path parameter (deckId format)
   - Parses and validates request body
   - Calls flashcard service with validated data
   - Returns response or handles errors

3. **Service Layer** (`flashcardService.batchCreateFlashcards()`)
   - Verifies deck exists and belongs to user
   - Batch inserts flashcards with `is_ai_generated: true`
   - Returns created flashcards with metadata

4. **Database Layer** (Supabase/PostgreSQL)
   - RLS policies enforce user_id constraints
   - CASCADE constraints maintain referential integrity
   - Database defaults apply (timestamps, SR values)

### Detailed Data Flow

```
Request (JSON body + Bearer token)
    ↓
Astro Middleware
    ↓ (validates session, sets locals)
API Route Handler (POST)
    ↓ (authentication check)
User Authentication
    ↓ (path param validation)
Deck ID Validation
    ↓ (request body validation)
Request Body Validation (Zod)
    ↓ (service call)
FlashcardService.batchCreateFlashcards()
    ├→ Verify deck ownership (SELECT from decks)
    │  └→ Throw "DECK_NOT_FOUND" if unauthorized
    └→ Batch insert flashcards (INSERT INTO flashcards)
       └→ Return created flashcards
    ↓
Build Response DTO
    ↓
Return 201 Created with AcceptFlashcardsResponseDTO
```

### Database Interactions

**Query 1: Verify Deck Ownership**
```sql
SELECT id FROM decks
WHERE id = :deckId AND user_id = :userId
```

**Query 2: Batch Insert Flashcards**
```sql
INSERT INTO flashcards (deck_id, user_id, front, back, is_ai_generated)
VALUES
  (:deckId, :userId, :front1, :back1, true),
  (:deckId, :userId, :front2, :back2, true),
  ...
RETURNING id, deck_id, front, back, is_ai_generated,
          next_review_date, ease_factor, interval_days,
          repetitions, created_at, updated_at
```

## 6. Security Considerations

### Authentication & Authorization

**Session Validation:**
- Check `locals.session` exists (set by middleware)
- Verify user via `supabase.auth.getUser()`
- Return 401 if session missing or invalid

**Deck Ownership:**
- Verify deck exists AND belongs to authenticated user
- Query: `SELECT id FROM decks WHERE id = :deckId AND user_id = :userId`
- Return 404 if deck not found or unauthorized access attempt

**RLS Policies:**
- Database-level Row Level Security enforces user_id constraints
- Provides defense-in-depth even if application logic fails

### Input Validation

**Path Parameter:**
- Validate deckId is valid UUID format
- Prevents invalid queries and potential injection

**Request Body:**
- Strict Zod schema validation for all fields
- Prevent empty/whitespace-only content
- Reject malformed JSON early

### Rate Limiting & DoS Prevention

**Batch Size Limit:**
- Maximum 100 flashcards per batch request
- Prevents resource exhaustion attacks
- Add validation: `z.array(...).min(1).max(100)`

**Recommendation:**
- Consider implementing rate limiting at infrastructure level (e.g., nginx, API gateway)
- Monitor for suspicious patterns (many large batches from single user)

### Data Integrity

**Database Constraints:**
- `flashcards_front_not_empty` - ensures front text not empty/whitespace
- `flashcards_back_not_empty` - ensures back text not empty/whitespace
- Foreign key constraints - ensure deck_id references valid deck
- RLS policies - enforce user_id matches authenticated user

**Atomic Operations:**
- Use batch insert for atomic creation
- All flashcards created or none (transaction semantics)

## 7. Error Handling

### Error Handling Strategy

Follow the **early return pattern** used in existing endpoints:
1. Handle errors at the beginning of logic blocks
2. Use early returns for error conditions
3. Place happy path last
4. Avoid unnecessary else statements

### Error Scenarios

| Error Condition | Detection Point | Status Code | Response | Logging |
|-----------------|----------------|-------------|----------|---------|
| **Missing session** | After locals check | 401 | `{ error: "Unauthorized", message: "Authentication required" }` | No (expected case) |
| **Invalid auth token** | After `getUser()` call | 401 | `{ error: "Unauthorized", message: "Invalid or expired authentication token" }` | No (expected case) |
| **Invalid deckId format** | Path param validation | 400 | `{ error: "Bad Request", message: "Invalid deck ID format" }` | No (client error) |
| **Invalid JSON body** | `request.json()` parse | 400 | `{ error: "Bad Request", message: "Invalid JSON in request body" }` | No (client error) |
| **Empty array** | Zod validation | 422 | `{ error: "Validation Error", message: "At least one flashcard is required", details: [...] }` | No (client error) |
| **Too many flashcards** | Zod validation | 422 | `{ error: "Validation Error", message: "Maximum 100 flashcards allowed per batch", details: [...] }` | No (client error) |
| **Invalid flashcard data** | Zod validation | 422 | `{ error: "Validation Error", message: <first error>, details: [...] }` | No (client error) |
| **Deck not found** | Service layer | 404 | `{ error: "Not Found", message: "Deck not found or does not belong to user" }` | No (expected case) |
| **FlashcardServiceError** | Service layer | 500 | `{ error: "Internal Server Error", message: "Failed to create flashcards" }` | Yes (console.error) |
| **Unexpected error** | Catch-all | 500 | `{ error: "Internal Server Error", message: "An unexpected error occurred" }` | Yes (console.error) |

### Error Response Format

**Client Errors (4xx):**
```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

**Validation Errors (422):**
```json
{
  "error": "Validation Error",
  "message": "First validation error message",
  "details": [
    {
      "path": ["flashcards", 0, "front"],
      "message": "Front text cannot be empty or whitespace-only"
    }
  ]
}
```

**Server Errors (500):**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to create flashcards"
}
```

## 8. Performance Considerations

### Database Optimization

**Batch Insert:**
- Use single `.insert([...])` call instead of multiple individual inserts
- Reduces database round-trips from N to 1
- Supabase supports batch inserts natively

**Query Efficiency:**
- Deck ownership check: Simple indexed query on (id, user_id)
- Batch insert: Single parameterized INSERT statement
- Total: 2 database queries regardless of flashcard count

### Scalability

**Current Implementation:**
- Max 100 flashcards per batch (configurable)
- Estimated response time: <500ms for 100 flashcards
- Suitable for typical use cases

**Future Optimizations (if needed):**
- Consider background job processing for very large batches (>100)
- Add database connection pooling if concurrent requests increase
- Implement caching for deck ownership checks (short TTL)

### Transaction Handling

**Atomic Operations:**
- Supabase/PostgreSQL handles batch insert atomically
- If any flashcard fails constraint, entire batch rolls back
- No partial state - all or nothing

### Memory Considerations

**Request Size Limits:**
- 100 flashcards × ~500 bytes average = ~50KB request body
- Well within typical API gateway limits (1-10MB)
- No special handling required

## 9. Implementation Steps

### Step 1: Create Zod Validation Schemas in API Route

**File:** `src/pages/api/decks/[deckId]/flashcards/batch.ts`

```typescript
import { z } from "zod";

/**
 * Validation schema for deckId path parameter
 */
const deckIdSchema = z.string().uuid("Invalid deck ID format");

/**
 * Validation schema for individual flashcard candidate
 */
const flashcardCandidateSchema = z.object({
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

/**
 * Validation schema for batch flashcard acceptance
 */
const acceptFlashcardsSchema = z.object({
  flashcards: z
    .array(flashcardCandidateSchema)
    .min(1, "At least one flashcard is required")
    .max(100, "Maximum 100 flashcards allowed per batch"),
});
```

### Step 2: Add Service Method to FlashcardService

**File:** `src/lib/services/flashcard.service.ts`

Add interface for parameters:
```typescript
/**
 * Parameters for batch creating AI-generated flashcards
 */
export interface BatchCreateFlashcardsParams {
  deckId: string;
  userId: string;
  candidates: FlashcardCandidateDTO[];
}
```

Add method to FlashcardService class:
```typescript
/**
 * Batch create AI-generated flashcards in a deck
 *
 * Creates multiple flashcards with is_ai_generated=true and default spaced repetition values.
 * Verifies deck ownership before creation.
 * Uses batch insert for efficiency - all flashcards created atomically.
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param params - BatchCreateFlashcardsParams containing deck ID, user ID, and flashcard candidates
 * @returns AcceptFlashcardsResponseDTO with created flashcards and count
 * @throws Error with 'DECK_NOT_FOUND' message if deck doesn't exist or doesn't belong to user
 * @throws FlashcardServiceError if database operation fails
 */
async batchCreateFlashcards(
  supabase: SupabaseServerClient,
  params: BatchCreateFlashcardsParams
): Promise<AcceptFlashcardsResponseDTO> {
  const { deckId, userId, candidates } = params;

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
      throw new FlashcardServiceError(`Failed to verify deck ownership: ${deckError.message}`);
    }

    if (!deck) {
      throw new Error("DECK_NOT_FOUND");
    }

    // ========================================================================
    // Step 2: Prepare batch insert data
    // ========================================================================
    const flashcardsToInsert = candidates.map((candidate) => ({
      deck_id: deckId,
      user_id: userId,
      front: candidate.front,
      back: candidate.back,
      is_ai_generated: true,
      // Default values are set by database:
      // - next_review_date: current_date
      // - ease_factor: 2.5
      // - interval_days: 0
      // - repetitions: 0
    }));

    // ========================================================================
    // Step 3: Batch insert flashcards
    // ========================================================================
    const { data: createdFlashcards, error: insertError } = await supabase
      .from("flashcards")
      .insert(flashcardsToInsert)
      .select(
        "id, deck_id, front, back, is_ai_generated, next_review_date, ease_factor, interval_days, repetitions, created_at, updated_at"
      );

    if (insertError) {
      throw new FlashcardServiceError(`Failed to create flashcards: ${insertError.message}`);
    }

    // ========================================================================
    // Step 4: Build and return response DTO
    // ========================================================================
    return {
      created: createdFlashcards as FlashcardDTO[],
      total_created: createdFlashcards.length,
    };
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
    console.error("Unexpected error in batchCreateFlashcards:", error);
    throw new FlashcardServiceError("Failed to batch create flashcards");
  }
}
```

### Step 3: Update Service Import in API Route

**File:** `src/lib/services/flashcard.service.ts`

Add to imports at top of file:
```typescript
import type {
  FlashcardDTO,
  PaginatedResponseDTO,
  CreateFlashcardCommand,
  UpdateFlashcardCommand,
  AcceptFlashcardsResponseDTO,  // ADD THIS
  FlashcardCandidateDTO          // ADD THIS
} from "@/types";
```

### Step 4: Implement API Route Handler

**File:** `src/pages/api/decks/[deckId]/flashcards/batch.ts` (new file)

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import type { AcceptFlashcardsCommand } from "@/types";
import { flashcardService, FlashcardServiceError } from "@/lib/services/flashcard.service";

// Disable prerendering for this dynamic API route
export const prerender = false;

/**
 * Validation schema for deckId path parameter
 */
const deckIdSchema = z.string().uuid("Invalid deck ID format");

/**
 * Validation schema for individual flashcard candidate
 */
const flashcardCandidateSchema = z.object({
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

/**
 * Validation schema for batch flashcard acceptance
 */
const acceptFlashcardsSchema = z.object({
  flashcards: z
    .array(flashcardCandidateSchema)
    .min(1, "At least one flashcard is required")
    .max(100, "Maximum 100 flashcards allowed per batch"),
});

/**
 * POST /api/decks/:deckId/flashcards/batch
 *
 * Accept and save selected AI-generated flashcard candidates in batch
 *
 * Path Parameters:
 * @param deckId - UUID of the deck
 *
 * Request Body:
 * @param flashcards - Array of flashcard candidates with front and back text
 *
 * @returns Created flashcards with metadata (201 Created)
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

    const validationResult = acceptFlashcardsSchema.safeParse(body);

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

    const command: AcceptFlashcardsCommand = validationResult.data;

    // ========================================================================
    // Step 4: Batch Create Flashcards via Service
    // ========================================================================
    const result = await flashcardService.batchCreateFlashcards(locals.supabase, {
      deckId,
      userId: user.id,
      candidates: command.flashcards,
    });

    // ========================================================================
    // Step 5: Return Created Flashcards
    // ========================================================================
    return new Response(JSON.stringify(result), {
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
      console.error("FlashcardService error in POST /api/decks/:deckId/flashcards/batch:", {
        message: error.message,
        error,
      });

      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to create flashcards",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Catch-all for unexpected errors
    console.error("Unexpected error in POST /api/decks/:deckId/flashcards/batch:", error);

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

### Step 5: Testing Checklist

**Unit Tests (if applicable):**
- [ ] Test Zod validation schemas with valid/invalid data
- [ ] Test service method with valid deck and candidates
- [ ] Test service method with non-existent deck
- [ ] Test service method with unauthorized deck access

**Integration Tests:**
- [ ] Test successful batch creation (happy path)
- [ ] Test authentication failure (no session)
- [ ] Test authentication failure (invalid token)
- [ ] Test invalid deckId format
- [ ] Test invalid JSON body
- [ ] Test empty flashcards array
- [ ] Test too many flashcards (>100)
- [ ] Test invalid flashcard data (empty/whitespace)
- [ ] Test deck not found
- [ ] Test deck belonging to different user
- [ ] Test database constraint violations

**Manual Testing:**
1. Create valid batch request with 1 flashcard
2. Create valid batch request with 50 flashcards
3. Create valid batch request with 100 flashcards (max)
4. Attempt to create batch with 101 flashcards (should fail)
5. Verify all created flashcards have `is_ai_generated: true`
6. Verify default spaced repetition values applied
7. Test with non-existent deck ID
8. Test with another user's deck ID (should fail)

### Step 6: Documentation Updates

**Update API Documentation:**
- [ ] Add endpoint to API reference documentation
- [ ] Include request/response examples
- [ ] Document error codes and scenarios
- [ ] Add usage examples

**Update src/types.ts Comments:**
- [ ] Update `AcceptFlashcardsCommand` usage comment to include new endpoint
- [ ] Update `AcceptFlashcardsResponseDTO` usage comment to include new endpoint

## 10. Future Enhancements (Optional)

### Potential Improvements

1. **Partial Success Handling**
   - Currently: All-or-nothing batch insert
   - Future: Return partial success with failed items and reasons
   - Trade-off: More complex error handling vs. better user experience

2. **Duplicate Detection**
   - Check for duplicate flashcards (same front/back) before insertion
   - Prevent accidental duplicate creation
   - Performance impact: Requires additional queries

3. **Async Processing**
   - For very large batches (>100), use background job queue
   - Return 202 Accepted with job ID
   - Poll for completion status
   - Better scalability for heavy usage

4. **Batch Size Analytics**
   - Track average batch sizes
   - Monitor for unusual patterns
   - Optimize limits based on real usage data

5. **Webhook Notifications**
   - Notify external systems when large batches created
   - Enable integrations and automation
   - Useful for tracking study progress
