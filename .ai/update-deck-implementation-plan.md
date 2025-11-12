# API Endpoint Implementation Plan: Update Deck

## 1. Endpoint Overview

This endpoint allows authenticated users to update the name of an existing deck. It enforces strict ownership validation to prevent unauthorized modifications and ensures deck name uniqueness per user. The endpoint returns the updated deck with computed statistics including total flashcards, cards due, and next review date.

**Key Features:**
- Single-field update (name only)
- Ownership verification (deck must belong to authenticated user)
- Unique name constraint per user
- Automatic timestamp update
- Computed statistics in response

## 2. Request Details

### HTTP Method
`PATCH`

### URL Structure
`/api/decks/:id`

### Path Parameters
- **id** (required)
  - Type: UUID
  - Description: Unique identifier of the deck to update
  - Validation: Must be valid UUID format

### Request Headers
- **Authorization** (required)
  - Format: `Bearer <access_token>`
  - Description: JWT token from Supabase authentication
  - Validation: Handled by Astro middleware

### Request Body
```json
{
  "name": "string (required, 1-255 characters, non-empty, non-whitespace)"
}
```

**Field Specifications:**
- **name** (required)
  - Type: string
  - Min length: 1 character (after trimming)
  - Max length: 255 characters
  - Constraints:
    - Cannot be empty string
    - Cannot be whitespace-only
    - Must be unique among user's decks
  - Example: `"Advanced Mathematics"`

### Content-Type
`application/json`

## 3. Used Types

### Command Model
```typescript
// Defined in src/types.ts (lines 38-40)
export interface UpdateDeckCommand {
  name: string;
}
```

### Response DTO
```typescript
// Defined in src/types.ts (lines 20-24)
export type DeckDTO = Omit<DeckRow, "user_id"> & {
  total_flashcards: number;
  cards_due: number;
  next_review_date?: string | null;
};
```

### Internal Types
```typescript
// From database.types.ts
type DeckRow = Database["public"]["Tables"]["decks"]["Row"];
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Advanced Mathematics",
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-16T14:22:00.000Z",
  "total_flashcards": 42,
  "cards_due": 5,
  "next_review_date": "2024-01-17T09:00:00.000Z"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": {
    "message": "Invalid deck ID format",
    "code": "INVALID_UUID"
  }
}
```

#### 401 Unauthorized
```json
{
  "error": {
    "message": "Invalid or expired authentication token",
    "code": "UNAUTHORIZED"
  }
}
```

#### 404 Not Found
```json
{
  "error": {
    "message": "Deck not found",
    "code": "DECK_NOT_FOUND"
  }
}
```

#### 409 Conflict
```json
{
  "error": {
    "message": "A deck with this name already exists",
    "code": "DUPLICATE_DECK_NAME"
  }
}
```

#### 422 Unprocessable Entity
```json
{
  "error": {
    "message": "Name cannot be empty or whitespace only",
    "code": "VALIDATION_ERROR",
    "field": "name"
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": {
    "message": "An unexpected error occurred",
    "code": "INTERNAL_SERVER_ERROR"
  }
}
```

## 5. Data Flow

### Request Flow

```
1. Client Request
   └─> PATCH /api/decks/:id with Bearer token and { name: "..." }

2. Astro Middleware
   ├─> Validates JWT token
   ├─> Initializes Supabase client
   └─> Attaches client to context.locals.supabase

3. Route Handler (/src/pages/api/decks/[id].ts)
   ├─> Extracts user from token
   ├─> Validates UUID format for deck ID
   ├─> Parses and validates request body with Zod
   └─> Calls DeckService.updateDeck()

4. DeckService
   ├─> Verifies deck exists and belongs to user
   ├─> Updates deck name in database
   ├─> Queries updated deck with statistics
   └─> Returns DeckDTO

5. Route Handler
   └─> Returns 200 OK with DeckDTO

6. Client receives updated deck
```

### Database Queries

**Query 1: Update deck and verify ownership**
```typescript
const { data: deck, error } = await supabase
  .from('decks')
  .update({
    name: command.name,
    updated_at: new Date().toISOString()
  })
  .eq('id', deckId)
  .eq('user_id', userId)
  .select()
  .single();
```

**Query 2: Compute statistics**
```typescript
// Total flashcards
const { count: total } = await supabase
  .from('flashcards')
  .select('*', { count: 'exact', head: true })
  .eq('deck_id', deckId)
  .eq('user_id', userId);

// Cards due
const { count: due } = await supabase
  .from('flashcards')
  .select('*', { count: 'exact', head: true })
  .eq('deck_id', deckId)
  .eq('user_id', userId)
  .lte('next_review_date', new Date().toISOString());

// Next review date
const { data: nextCard } = await supabase
  .from('flashcards')
  .select('next_review_date')
  .eq('deck_id', deckId)
  .eq('user_id', userId)
  .gt('next_review_date', new Date().toISOString())
  .order('next_review_date', { ascending: true })
  .limit(1)
  .single();
```

### Data Transformations

1. **Request**: Raw JSON → Zod validation → UpdateDeckCommand
2. **Database**: DeckRow (with user_id) → Omit user_id → Add computed fields → DeckDTO
3. **Response**: DeckDTO → JSON serialization → HTTP response

## 6. Security Considerations

### Authentication & Authorization

**JWT Token Validation:**
- Handled by Astro middleware
- Token extracted from `Authorization: Bearer <token>` header
- Middleware attaches authenticated user to `context.locals`
- Invalid/expired tokens return 401 before reaching route handler

**Ownership Verification:**
- Critical security check: deck must belong to authenticated user
- Use `.eq('user_id', userId)` in update query
- If no rows affected → 404 (don't reveal if deck exists for another user)
- Prevents horizontal privilege escalation (IDOR)

### Input Validation & Sanitization

**Zod Schema:**
```typescript
const UpdateDeckCommandSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less")
    .refine(
      (val) => val.trim().length > 0,
      "Name cannot be whitespace only"
    )
});
```

**UUID Validation:**
```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!UUID_REGEX.test(id)) {
  return new Response(
    JSON.stringify({
      error: {
        message: "Invalid deck ID format",
        code: "INVALID_UUID"
      }
    }),
    { status: 400 }
  );
}
```

### SQL Injection Prevention

- Supabase client uses parameterized queries
- No raw SQL in application code
- All user inputs are properly escaped

### Data Exposure Prevention

- Never return `user_id` in responses (DeckDTO omits it)
- Generic 404 message (don't reveal if deck exists for another user)
- Don't expose internal error details to clients
- Sanitize error messages before sending to client

### Rate Limiting Considerations

- Consider implementing rate limiting per user
- Prevent abuse: limit updates to N requests per minute
- Could be implemented via middleware or API gateway

## 7. Error Handling

### Error Handling Strategy

**Early Returns Pattern:**
```typescript
// 1. Check authentication first
if (!user) {
  return new Response(JSON.stringify({ error: ... }), { status: 401 });
}

// 2. Validate UUID format
if (!isValidUUID(id)) {
  return new Response(JSON.stringify({ error: ... }), { status: 400 });
}

// 3. Validate request body
const result = schema.safeParse(body);
if (!result.success) {
  return new Response(JSON.stringify({ error: ... }), { status: 422 });
}

// 4. Attempt update
try {
  const deck = await deckService.updateDeck(...);
  return new Response(JSON.stringify(deck), { status: 200 });
} catch (error) {
  // Handle specific errors
}
```

### Specific Error Scenarios

#### 1. Authentication Errors (401)

**Trigger:** Missing, invalid, or expired JWT token

**Handling:**
```typescript
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return new Response(
    JSON.stringify({
      error: {
        message: "Invalid or expired authentication token",
        code: "UNAUTHORIZED"
      }
    }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" }
    }
  );
}
```

#### 2. Invalid UUID Format (400)

**Trigger:** Malformed deck ID in URL path

**Handling:**
```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!UUID_REGEX.test(id)) {
  return new Response(
    JSON.stringify({
      error: {
        message: "Invalid deck ID format",
        code: "INVALID_UUID"
      }
    }),
    { status: 400 }
  );
}
```

#### 3. Validation Errors (422)

**Trigger:** Invalid request body (empty name, whitespace-only, too long)

**Handling:**
```typescript
const result = UpdateDeckCommandSchema.safeParse(body);

if (!result.success) {
  const firstError = result.error.errors[0];
  return new Response(
    JSON.stringify({
      error: {
        message: firstError.message,
        code: "VALIDATION_ERROR",
        field: firstError.path.join(".")
      }
    }),
    { status: 422 }
  );
}
```

#### 4. Deck Not Found or Unauthorized (404)

**Trigger:**
- Deck doesn't exist
- Deck exists but belongs to another user

**Handling:**
```typescript
if (!deck) {
  return new Response(
    JSON.stringify({
      error: {
        message: "Deck not found",
        code: "DECK_NOT_FOUND"
      }
    }),
    { status: 404 }
  );
}
```

**Security Note:** Use same message for both cases to not leak information about other users' decks.

#### 5. Duplicate Deck Name (409)

**Trigger:** Unique constraint violation (`decks_unique_name_per_user`)

**Handling:**
```typescript
if (error?.code === "23505") { // PostgreSQL unique violation
  return new Response(
    JSON.stringify({
      error: {
        message: "A deck with this name already exists",
        code: "DUPLICATE_DECK_NAME"
      }
    }),
    { status: 409 }
  );
}
```

#### 6. Database Errors (500)

**Trigger:** Connection issues, constraint violations, unexpected errors

**Handling:**
```typescript
catch (error) {
  console.error("Error updating deck:", {
    userId: user.id,
    deckId: id,
    error: error instanceof Error ? error.message : error
  });

  return new Response(
    JSON.stringify({
      error: {
        message: "An unexpected error occurred",
        code: "INTERNAL_SERVER_ERROR"
      }
    }),
    { status: 500 }
  );
}
```

### Error Logging

**What to Log:**
- Timestamp
- User ID
- Deck ID
- Operation (update deck)
- Error type and message
- Stack trace (for 500 errors)

**What NOT to Log:**
- Sensitive user data
- Full request bodies
- Authentication tokens

**Example:**
```typescript
console.error("[DeckService] Failed to update deck", {
  timestamp: new Date().toISOString(),
  userId: user.id,
  deckId: id,
  operation: "updateDeck",
  error: error instanceof Error ? {
    message: error.message,
    stack: error.stack
  } : error
});
```

## 8. Performance Considerations

### Potential Bottlenecks

1. **Multiple Database Queries:**
   - Update query
   - Count queries for statistics
   - Next review date query
   - **Impact:** 4 separate database round-trips

2. **Unnecessary Data Transfer:**
   - Fetching all flashcard data when only counting
   - **Impact:** Network and memory overhead

### Optimization Strategies

#### 1. Use Database Functions

**Create a PostgreSQL function to compute statistics:**
```sql
create or replace function get_deck_with_stats(p_deck_id uuid, p_user_id uuid)
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'id', d.id,
    'name', d.name,
    'created_at', d.created_at,
    'updated_at', d.updated_at,
    'total_flashcards', (
      select count(*)
      from flashcards
      where deck_id = d.id and user_id = p_user_id
    ),
    'cards_due', (
      select count(*)
      from flashcards
      where deck_id = d.id
        and user_id = p_user_id
        and next_review_date <= now()
    ),
    'next_review_date', (
      select min(next_review_date)
      from flashcards
      where deck_id = d.id
        and user_id = p_user_id
        and next_review_date > now()
    )
  )
  into result
  from decks d
  where d.id = p_deck_id and d.user_id = p_user_id;

  return result;
end;
$$ language plpgsql;
```

**Benefits:**
- Single database round-trip
- Computed on database server (faster)
- Reduced network overhead

#### 2. Use COUNT with head: true

**Current approach (optimized):**
```typescript
const { count } = await supabase
  .from('flashcards')
  .select('*', { count: 'exact', head: true })
  .eq('deck_id', deckId);
```

**Benefits:**
- `head: true` prevents fetching data (only returns count)
- Reduces memory usage
- Faster response time

#### 3. Index Optimization

**Recommended indexes:**
```sql
-- For ownership verification and updates
create index idx_decks_user_id_id on decks(user_id, id);

-- For unique name constraint (already exists)
create unique index idx_decks_unique_name_per_user on decks(user_id, name);

-- For flashcard counting
create index idx_flashcards_deck_user on flashcards(deck_id, user_id);

-- For cards due counting
create index idx_flashcards_review_date on flashcards(deck_id, next_review_date);
```

#### 4. Caching Strategy

**Response caching:**
- Cache computed statistics for short duration (30-60 seconds)
- Invalidate cache on deck/flashcard modifications
- Use Redis or in-memory cache

**Trade-offs:**
- Improved performance for frequently accessed decks
- Slightly stale statistics
- Additional complexity

### Performance Metrics

**Target Performance:**
- Response time: < 100ms (p50), < 200ms (p95)
- Database queries: 1-2 queries maximum
- Payload size: < 1KB

## 9. Implementation Steps

### Step 1: Create Validation Schema

**File:** `src/lib/validation/deck.validation.ts`

```typescript
import { z } from "zod";

export const UpdateDeckCommandSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less")
    .refine(
      (val) => val.trim().length > 0,
      "Name cannot be whitespace only"
    )
});

export const UUIDSchema = z.string().uuid("Invalid UUID format");
```

### Step 2: Create or Update Deck Service

**File:** `src/lib/services/deck.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { UpdateDeckCommand, DeckDTO } from "@/types";

export class DeckService {
  constructor(private supabase: SupabaseClient) {}

  async updateDeck(
    userId: string,
    deckId: string,
    command: UpdateDeckCommand
  ): Promise<DeckDTO> {
    // Update deck with ownership verification
    const { data: deck, error: updateError } = await this.supabase
      .from("decks")
      .update({
        name: command.name,
        updated_at: new Date().toISOString()
      })
      .eq("id", deckId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "23505") {
        throw new Error("DUPLICATE_DECK_NAME");
      }
      throw updateError;
    }

    if (!deck) {
      throw new Error("DECK_NOT_FOUND");
    }

    // Compute statistics
    const stats = await this.computeDeckStatistics(deckId, userId);

    return {
      id: deck.id,
      name: deck.name,
      created_at: deck.created_at,
      updated_at: deck.updated_at,
      ...stats
    };
  }

  private async computeDeckStatistics(
    deckId: string,
    userId: string
  ): Promise<{
    total_flashcards: number;
    cards_due: number;
    next_review_date: string | null;
  }> {
    const now = new Date().toISOString();

    // Total flashcards
    const { count: total } = await this.supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("deck_id", deckId)
      .eq("user_id", userId);

    // Cards due
    const { count: due } = await this.supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("deck_id", deckId)
      .eq("user_id", userId)
      .lte("next_review_date", now);

    // Next review date
    const { data: nextCard } = await this.supabase
      .from("flashcards")
      .select("next_review_date")
      .eq("deck_id", deckId)
      .eq("user_id", userId)
      .gt("next_review_date", now)
      .order("next_review_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    return {
      total_flashcards: total ?? 0,
      cards_due: due ?? 0,
      next_review_date: nextCard?.next_review_date ?? null
    };
  }
}
```

### Step 3: Create Route Handler

**File:** `src/pages/api/decks/[id].ts`

```typescript
import type { APIRoute } from "astro";
import { UpdateDeckCommandSchema, UUIDSchema } from "@/lib/validation/deck.validation";
import { DeckService } from "@/lib/services/deck.service";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Authentication check
    const { data: { user } } = await locals.supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid or expired authentication token",
            code: "UNAUTHORIZED"
          }
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 2. Validate deck ID
    const { id } = params;
    const uuidValidation = UUIDSchema.safeParse(id);

    if (!uuidValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid deck ID format",
            code: "INVALID_UUID"
          }
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validation = UpdateDeckCommandSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            message: firstError.message,
            code: "VALIDATION_ERROR",
            field: firstError.path.join(".")
          }
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 4. Update deck via service
    const deckService = new DeckService(locals.supabase);
    const updatedDeck = await deckService.updateDeck(
      user.id,
      uuidValidation.data,
      validation.data
    );

    // 5. Return success response
    return new Response(
      JSON.stringify(updatedDeck),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    // Handle service-level errors
    if (error instanceof Error) {
      if (error.message === "DECK_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: {
              message: "Deck not found",
              code: "DECK_NOT_FOUND"
            }
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      if (error.message === "DUPLICATE_DECK_NAME") {
        return new Response(
          JSON.stringify({
            error: {
              message: "A deck with this name already exists",
              code: "DUPLICATE_DECK_NAME"
            }
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }

    // Log unexpected errors
    console.error("[API] Error updating deck:", {
      timestamp: new Date().toISOString(),
      userId: locals.supabase ? user?.id : "unknown",
      deckId: params.id,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });

    // Return generic error
    return new Response(
      JSON.stringify({
        error: {
          message: "An unexpected error occurred",
          code: "INTERNAL_SERVER_ERROR"
        }
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
```

### Step 4: Add Unit Tests

**File:** `tests/services/deck.service.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { DeckService } from "@/lib/services/deck.service";

describe("DeckService.updateDeck", () => {
  let service: DeckService;
  let mockSupabase: any;

  beforeEach(() => {
    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      update: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      single: vi.fn()
    };
    service = new DeckService(mockSupabase);
  });

  it("should update deck name successfully", async () => {
    // Test implementation
  });

  it("should throw DECK_NOT_FOUND when deck doesn't exist", async () => {
    // Test implementation
  });

  it("should throw DUPLICATE_DECK_NAME on unique constraint violation", async () => {
    // Test implementation
  });

  it("should verify deck ownership", async () => {
    // Test implementation
  });
});
```

### Step 5: Add Integration Tests

**File:** `tests/api/decks/update.test.ts`

```typescript
import { describe, it, expect } from "vitest";

describe("PATCH /api/decks/:id", () => {
  it("should return 401 when not authenticated", async () => {
    // Test implementation
  });

  it("should return 400 for invalid UUID", async () => {
    // Test implementation
  });

  it("should return 422 for empty name", async () => {
    // Test implementation
  });

  it("should return 422 for whitespace-only name", async () => {
    // Test implementation
  });

  it("should return 404 for non-existent deck", async () => {
    // Test implementation
  });

  it("should return 404 when deck belongs to another user", async () => {
    // Test implementation
  });

  it("should return 409 for duplicate name", async () => {
    // Test implementation
  });

  it("should return 200 with updated deck", async () => {
    // Test implementation
  });

  it("should include computed statistics in response", async () => {
    // Test implementation
  });
});
```

### Step 6: Update API Documentation

**File:** `docs/api/decks.md` (or similar)

Document the endpoint with:
- Request/response examples
- Error scenarios
- Authentication requirements
- Rate limiting information (if applicable)

### Step 7: Manual Testing Checklist

- [ ] Test with valid authentication token
- [ ] Test with expired token (401)
- [ ] Test with invalid UUID format (400)
- [ ] Test with empty name (422)
- [ ] Test with whitespace-only name (422)
- [ ] Test with name exceeding 255 characters (422)
- [ ] Test with non-existent deck ID (404)
- [ ] Test updating another user's deck (404)
- [ ] Test with duplicate deck name (409)
- [ ] Test successful update (200)
- [ ] Verify `updated_at` timestamp changes
- [ ] Verify computed statistics are accurate
- [ ] Test concurrent updates (race conditions)
- [ ] Test with special characters in name
- [ ] Test with Unicode characters in name
- [ ] Verify response doesn't include `user_id`

### Step 8: Deploy and Monitor

1. **Deploy to staging environment**
2. **Run smoke tests**
3. **Monitor error rates and response times**
4. **Check logs for unexpected errors**
5. **Deploy to production**
6. **Set up alerts for error rate spikes**
7. **Monitor database query performance**

---

## Additional Notes

### Potential Future Enhancements

1. **Batch Updates:** Allow updating multiple decks at once
2. **Partial Updates:** Support PATCH with optional fields (currently only name)
3. **Versioning:** Add optimistic locking with version field
4. **Audit Trail:** Log deck name changes for history
5. **WebSocket Notifications:** Notify clients when deck is updated
6. **Rate Limiting:** Implement per-user rate limits
7. **Validation Rules:** Add custom validation rules (e.g., profanity filter)

### Related Endpoints

- `GET /api/decks/:id` - Get single deck
- `DELETE /api/decks/:id` - Delete deck
- `POST /api/decks` - Create new deck
- `GET /api/decks` - List user's decks

### Database Migration Considerations

If adding indexes or database functions:

```sql
-- Migration: YYYYMMDDHHmmss_add_deck_update_indexes.sql
-- Purpose: Optimize deck update operations
-- Affected tables: decks, flashcards

-- Add composite index for ownership verification
create index if not exists idx_decks_user_id_id
  on decks(user_id, id);

-- Add index for flashcard counting by deck
create index if not exists idx_flashcards_deck_user
  on flashcards(deck_id, user_id);
```
