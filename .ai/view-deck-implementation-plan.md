# API Endpoint Implementation Plan: GET /api/decks/:id

## 1. Endpoint Overview

This endpoint retrieves detailed information about a specific deck belonging to the authenticated user, including computed statistics about flashcards. It enforces strict ownership verification to prevent unauthorized access to other users' decks.

**Purpose:** Fetch a single deck with its metadata and computed statistics (total flashcards, cards due for review, next review date).

**Key Features:**

- Returns deck details with computed statistics
- Enforces user ownership verification
- Provides consistent 404 responses for security (doesn't reveal deck existence to unauthorized users)
- Uses existing service layer for statistics computation

## 2. Request Details

- **HTTP Method:** `GET`
- **URL Structure:** `/api/decks/:id`
- **Authentication:** Required (Bearer token via Supabase Auth, validated by middleware)
- **Authorization:** User can only access their own decks

### Parameters

#### Path Parameters (Required)

- `id` (string, UUID): The unique identifier of the deck to retrieve

#### Query Parameters

- None

#### Request Headers

- `Authorization: Bearer <token>` (handled by Supabase middleware)

#### Request Body

- None (GET request)

## 3. Used Types

### Response DTO

```typescript
// From src/types.ts:20-24
export type DeckDTO = Omit<DeckRow, "user_id"> & {
  total_flashcards: number;
  cards_due: number;
  next_review_date?: string | null;
};
```

**DeckDTO fields:**

- `id`: UUID - Deck identifier
- `name`: string - Deck name (1-255 characters)
- `created_at`: timestamp - Deck creation timestamp
- `updated_at`: timestamp - Last modification timestamp
- `total_flashcards`: number - Total count of flashcards in deck
- `cards_due`: number - Count of flashcards due for review (next_review_date <= now)
- `next_review_date`: string | null - Earliest upcoming review date (null if no future reviews)

### Validation Schema

```typescript
// From src/lib/validation/deck.schemas.ts:21
export const uuidSchema = z.string().uuid("Invalid UUID format");
```

## 4. Response Details

### Success Response (200 OK)

**Status Code:** `200 OK`

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Spanish Vocabulary",
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-01-20T14:45:00.000Z",
  "total_flashcards": 150,
  "cards_due": 12,
  "next_review_date": "2025-01-21T00:00:00.000Z"
}
```

### Error Responses

#### 401 Unauthorized

**Scenario:** No authentication token, invalid token, or expired session

**Response Body:**

```json
{
  "error": {
    "message": "Invalid or expired authentication token",
    "code": "UNAUTHORIZED"
  }
}
```

#### 400 Bad Request

**Scenario:** Invalid UUID format in path parameter

**Response Body:**

```json
{
  "error": {
    "message": "Invalid deck ID format",
    "code": "INVALID_UUID"
  }
}
```

#### 404 Not Found

**Scenario:** Deck doesn't exist OR deck belongs to another user (unified response for security)

**Response Body:**

```json
{
  "error": {
    "message": "Deck not found",
    "code": "DECK_NOT_FOUND"
  }
}
```

#### 500 Internal Server Error

**Scenario:** Database errors, service failures, unexpected exceptions

**Response Body:**

```json
{
  "error": {
    "message": "An unexpected error occurred",
    "code": "INTERNAL_SERVER_ERROR"
  }
}
```

## 5. Data Flow

### High-Level Flow

```
1. Client sends GET request to /api/decks/:id with auth token
2. Astro middleware validates session and attaches to locals
3. GET handler executes:
   a. Verify user authentication (locals.session, supabase.auth.getUser())
   b. Validate deck ID format (UUID schema)
   c. Call DeckService.getDeck(supabase, userId, deckId)
4. DeckService.getDeck executes:
   a. Query decks table filtered by id AND user_id
   b. Return null if no deck found (unauthorized or non-existent)
   c. Call computeDeckStatistics(supabase, deckId, userId)
   d. Combine deck data with statistics
   e. Return DeckDTO
5. Handler returns 200 OK with DeckDTO, or 404 if null
6. Error handling catches and returns appropriate status codes
```

### Database Queries

**Query 1: Fetch Deck with Ownership Verification**

```typescript
const { data: deck, error } = await supabase
  .from("decks")
  .select("id, name, created_at, updated_at")
  .eq("id", deckId)
  .eq("user_id", userId)
  .maybeSingle();
```

**Query 2-4: Compute Statistics (via existing computeDeckStatistics method)**

- **Total flashcards count:**

  ```typescript
  const { count: total } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .eq("deck_id", deckId)
    .eq("user_id", userId);
  ```

- **Cards due count:**

  ```typescript
  const { count: due } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .eq("deck_id", deckId)
    .eq("user_id", userId)
    .lte("next_review_date", now);
  ```

- **Next review date:**
  ```typescript
  const { data: nextCard } = await supabase
    .from("flashcards")
    .select("next_review_date")
    .eq("deck_id", deckId)
    .eq("user_id", userId)
    .gt("next_review_date", now)
    .order("next_review_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  ```

### Service Layer Design

**New Method: `DeckService.getDeck()`**

Location: `src/lib/services/deck.service.ts`

```typescript
/**
 * Get a single deck with computed statistics
 *
 * Fetches deck details with ownership verification and computes statistics:
 * - total_flashcards: Total number of cards in deck
 * - cards_due: Number of cards due for review (next_review_date <= now)
 * - next_review_date: Earliest upcoming review date
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param userId - ID of authenticated user
 * @param deckId - UUID of the deck to retrieve
 * @returns DeckDTO with computed statistics, or null if not found/unauthorized
 * @throws DeckServiceError if database query fails
 */
async getDeck(
  supabase: SupabaseServerClient,
  userId: string,
  deckId: string
): Promise<DeckDTO | null>
```

**Implementation Steps:**

1. Query decks table with `.eq("id", deckId).eq("user_id", userId).maybeSingle()`
2. Handle database errors by throwing DeckServiceError
3. Return null if no deck found (covers both non-existent and unauthorized)
4. Call existing `computeDeckStatistics(supabase, deckId, userId)`
5. Combine deck data with statistics into DeckDTO
6. Return DeckDTO

## 6. Security Considerations

### Authentication

- **Session Verification:** Check `locals.session` (set by Astro middleware)
- **Token Validation:** Call `supabase.auth.getUser()` to verify token validity
- **User Extraction:** Extract `user.id` from authenticated session for queries

### Authorization

- **Ownership Verification:** Filter database query by both `id` AND `user_id`
- **RLS (Row-Level Security):** Supabase RLS policies provide additional layer of protection
- **Fail-Secure:** Return null from service layer for any unauthorized/non-existent deck

### Information Disclosure Prevention

- **Unified 404 Response:** Same error message for non-existent decks and unauthorized access
- **No User Enumeration:** Don't reveal whether deck exists for another user
- **Minimal Error Details:** Generic error messages for internal server errors

### Input Validation

- **UUID Format Validation:** Use Zod schema to validate UUID before database query
- **Type Safety:** TypeScript ensures type correctness throughout the flow
- **SQL Injection Prevention:** Supabase client uses parameterized queries

### Additional Security Measures

- **CORS:** Configured at Astro level (not endpoint-specific)
- **Rate Limiting:** Should be implemented at API gateway/proxy level
- **Audit Logging:** Console.error logs include timestamp, userId, deckId for incident investigation

## 7. Error Handling

### Error Handling Strategy

Follow the **early return pattern** used throughout the codebase:

1. Handle authentication errors first (401)
2. Handle validation errors next (400)
3. Call service layer
4. Handle service-level errors (404, 500)
5. Catch unexpected errors in try-catch (500)

### Detailed Error Scenarios

#### 1. Authentication Failures (401)

**Scenario 1.1:** No session in locals

```typescript
if (!locals.session) {
  return new Response(
    JSON.stringify({
      error: {
        message: "Invalid or expired authentication token",
        code: "UNAUTHORIZED",
      },
    }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

**Scenario 1.2:** Invalid or expired token

```typescript
const {
  data: { user },
  error: authError,
} = await locals.supabase.auth.getUser();

if (authError || !user) {
  return new Response(
    JSON.stringify({
      error: {
        message: "Invalid or expired authentication token",
        code: "UNAUTHORIZED",
      },
    }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

#### 2. Validation Errors (400)

**Scenario 2.1:** Invalid UUID format

```typescript
const uuidValidation = uuidSchema.safeParse(id);

if (!uuidValidation.success) {
  return new Response(
    JSON.stringify({
      error: {
        message: "Invalid deck ID format",
        code: "INVALID_UUID",
      },
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

#### 3. Resource Not Found (404)

**Scenario 3.1:** Deck doesn't exist or belongs to another user

```typescript
const deck = await deckService.getDeck(locals.supabase, user.id, uuidValidation.data);

if (!deck) {
  return new Response(
    JSON.stringify({
      error: {
        message: "Deck not found",
        code: "DECK_NOT_FOUND",
      },
    }),
    {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

#### 4. Service-Level Errors (500)

**Scenario 4.1:** DeckServiceError (database failures)

```typescript
if (error instanceof DeckServiceError) {
  console.error("DeckService error in GET /api/decks/:id:", {
    timestamp: new Date().toISOString(),
    userId: locals.session?.user?.id ?? "unknown",
    deckId: params.id,
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
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

**Scenario 4.2:** Unexpected errors

```typescript
console.error("Unexpected error in GET /api/decks/:id:", {
  timestamp: new Date().toISOString(),
  userId: locals.session?.user?.id ?? "unknown",
  deckId: params.id,
  error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
});

return new Response(
  JSON.stringify({
    error: {
      message: "An unexpected error occurred",
      code: "INTERNAL_SERVER_ERROR",
    },
  }),
  {
    status: 500,
    headers: { "Content-Type": "application/json" },
  }
);
```

### Error Logging Standards

**All errors should be logged with:**

- `timestamp`: ISO 8601 timestamp
- `userId`: Authenticated user ID (or "unknown")
- `deckId`: Deck ID from path parameter
- `message`: Error message
- `error`: Full error object (for DeckServiceError) or message + stack (for Error)

## 8. Performance Considerations

### Query Optimization

**Current Approach:**

- Service method makes 4 database queries (1 for deck + 3 for statistics)
- Total queries: 4 round-trips to Supabase

**Optimization Opportunities:**

- Statistics computation already uses efficient count queries with `{ head: true }`
- `maybeSingle()` limits deck query to 1 row
- Next review date query uses `limit(1)` and index on `next_review_date`

**Indexes Required:**

```sql
-- Ensure these indexes exist in database
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review_date ON flashcards(next_review_date);
```

### Caching Strategy

**Current Implementation:** No caching
**Future Consideration:**

- Cache deck statistics with short TTL (30-60 seconds)
- Invalidate on flashcard create/update/delete/review
- Use Redis or similar for multi-instance deployments

### Response Time Expectations

- **Optimal:** < 100ms (deck with few flashcards, indexed queries)
- **Typical:** 100-300ms (deck with 100-1000 flashcards)
- **Maximum acceptable:** < 1000ms (large decks with 10,000+ flashcards)

### Scalability Considerations

- RLS policies add overhead but are necessary for security
- Statistics computation scales linearly with flashcard count
- Consider materialized views or background jobs for decks with 50,000+ flashcards

## 9. Implementation Steps

### Step 1: Add getDeck Method to DeckService

**File:** `src/lib/services/deck.service.ts`

**Action:** Add new public method after `deleteDeck` method

**Code:**

```typescript
/**
 * Get a single deck with computed statistics
 *
 * Fetches deck details with ownership verification and computes statistics:
 * - total_flashcards: Total number of cards in deck
 * - cards_due: Number of cards due for review (next_review_date <= now)
 * - next_review_date: Earliest upcoming review date
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param userId - ID of authenticated user
 * @param deckId - UUID of the deck to retrieve
 * @returns DeckDTO with computed statistics, or null if not found/unauthorized
 * @throws DeckServiceError if database query fails
 */
async getDeck(
  supabase: SupabaseServerClient,
  userId: string,
  deckId: string
): Promise<DeckDTO | null> {
  try {
    // ========================================================================
    // Step 1: Fetch deck with ownership verification
    // ========================================================================
    const { data: deck, error } = await supabase
      .from("decks")
      .select("id, name, created_at, updated_at")
      .eq("id", deckId)
      .eq("user_id", userId)
      .maybeSingle();

    // ========================================================================
    // Step 2: Handle database errors
    // ========================================================================
    if (error) {
      throw new DeckServiceError(`Failed to fetch deck: ${error.message}`);
    }

    // ========================================================================
    // Step 3: Return null if deck not found or unauthorized
    // ========================================================================
    if (!deck) {
      return null;
    }

    // ========================================================================
    // Step 4: Compute deck statistics
    // ========================================================================
    const stats = await this.computeDeckStatistics(supabase, deckId, userId);

    // ========================================================================
    // Step 5: Return DTO with computed statistics
    // ========================================================================
    return {
      id: deck.id,
      name: deck.name,
      created_at: deck.created_at,
      updated_at: deck.updated_at,
      ...stats,
    };
  } catch (error) {
    // Re-throw DeckServiceError
    if (error instanceof DeckServiceError) {
      throw error;
    }

    // Log and wrap unexpected errors
    console.error("Unexpected error in getDeck:", error);
    throw new DeckServiceError("Failed to get deck");
  }
}
```

### Step 2: Add GET Handler to API Route

**File:** `src/pages/api/decks/[id].ts`

**Action:** Add GET export before existing PATCH export

**Code:**

```typescript
/**
 * GET /api/decks/:id
 *
 * Retrieve details of a specific deck with computed statistics
 *
 * Path Parameters:
 * @param id - UUID of the deck to retrieve
 *
 * @returns Deck details with statistics (200 OK)
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // ========================================================================
    // Step 1: Authentication
    // ========================================================================
    // Check if user is authenticated via session (set by middleware)
    if (!locals.session) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid or expired authentication token",
            code: "UNAUTHORIZED",
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
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
          error: {
            message: "Invalid or expired authentication token",
            code: "UNAUTHORIZED",
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // Step 2: Validate deck ID
    // ========================================================================
    const { id } = params;
    const uuidValidation = uuidSchema.safeParse(id);

    if (!uuidValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid deck ID format",
            code: "INVALID_UUID",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // Step 3: Fetch deck via service
    // ========================================================================
    const deck = await deckService.getDeck(locals.supabase, user.id, uuidValidation.data);

    if (!deck) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Deck not found",
            code: "DECK_NOT_FOUND",
          },
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // Step 4: Return success response
    // ========================================================================
    return new Response(JSON.stringify(deck), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ========================================================================
    // Step 5: Handle service-level errors
    // ========================================================================
    // Handle DeckService errors
    if (error instanceof DeckServiceError) {
      console.error("DeckService error in GET /api/decks/:id:", {
        timestamp: new Date().toISOString(),
        userId: locals.session?.user?.id ?? "unknown",
        deckId: params.id,
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
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Log unexpected errors
    console.error("Unexpected error in GET /api/decks/:id:", {
      timestamp: new Date().toISOString(),
      userId: locals.session?.user?.id ?? "unknown",
      deckId: params.id,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });

    // Return generic error
    return new Response(
      JSON.stringify({
        error: {
          message: "An unexpected error occurred",
          code: "INTERNAL_SERVER_ERROR",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

### Step 3: Update Type Imports (if needed)

**File:** `src/pages/api/decks/[id].ts`

**Action:** Verify imports include DeckDTO (should already be imported for PATCH handler)

**Current imports:**

```typescript
import type { APIRoute } from "astro";
import type { UpdateDeckCommand, DeleteDeckResponseDTO } from "@/types";
import { deckService, DeckServiceError } from "@/lib/services/deck.service";
import { updateDeckSchema, uuidSchema } from "@/lib/validation/deck.schemas";
```

**Updated imports (if DeckDTO not already imported):**

```typescript
import type { APIRoute } from "astro";
import type { UpdateDeckCommand, DeleteDeckResponseDTO, DeckDTO } from "@/types";
import { deckService, DeckServiceError } from "@/lib/services/deck.service";
import { updateDeckSchema, uuidSchema } from "@/lib/validation/deck.schemas";
```

### Step 4: Testing Checklist

**Manual Testing:**

- [ ] Test successful deck retrieval (200 OK)
- [ ] Test authentication failure - no token (401)
- [ ] Test authentication failure - invalid token (401)
- [ ] Test authentication failure - expired token (401)
- [ ] Test invalid UUID format (400)
- [ ] Test deck not found (404)
- [ ] Test accessing another user's deck (404)
- [ ] Test deck with no flashcards (statistics should be 0/null)
- [ ] Test deck with flashcards due for review
- [ ] Test deck with future flashcards (next_review_date populated)

**Edge Cases:**

- [ ] Deck with 0 flashcards
- [ ] Deck with 10,000+ flashcards (performance)
- [ ] Deck with all flashcards due
- [ ] Deck with no flashcards due
- [ ] Malformed UUID (e.g., "not-a-uuid")
- [ ] Empty string as deck ID
- [ ] SQL injection attempts in deck ID

**Integration Testing:**

- [ ] Verify RLS policies enforce ownership
- [ ] Verify statistics match actual flashcard data
- [ ] Verify timestamps are in ISO 8601 format
- [ ] Verify response conforms to DeckDTO type

### Step 5: Documentation Updates

**Files to update:**

- [ ] API documentation (if exists)
- [ ] OpenAPI/Swagger spec (if exists)
- [ ] README.md with endpoint examples (if exists)
- [ ] Update types.ts comment on DeckDTO to confirm GET /api/decks/:id usage (already listed)

### Step 6: Deployment Checklist

**Pre-deployment:**

- [ ] Run linter: `npm run lint`
- [ ] Run formatter: `npm run format`
- [ ] Build project: `npm run build`
- [ ] Preview build: `npm run preview`
- [ ] Test in production-like environment

**Database:**

- [ ] Verify indexes exist on decks(user_id) and flashcards(deck_id, user_id, next_review_date)
- [ ] Verify RLS policies are enabled and correct

**Monitoring:**

- [ ] Set up logging aggregation for error tracking
- [ ] Set up performance monitoring for endpoint response times
- [ ] Set up alerting for 500 errors

---

## Summary

This implementation plan provides a complete guide for adding the GET /api/decks/:id endpoint. The implementation:

1. **Reuses existing infrastructure:** DeckService, validation schemas, error patterns
2. **Maintains security:** Strict ownership verification, unified 404 responses
3. **Follows codebase conventions:** Early return pattern, structured error handling, comprehensive logging
4. **Optimizes performance:** Efficient count queries, single-row limits, appropriate indexing
5. **Ensures type safety:** TypeScript types, Zod validation, DeckDTO response

The endpoint integrates seamlessly with the existing codebase architecture and maintains consistency with other deck-related endpoints.
