# API Endpoint Implementation Plan: List All Decks

## 1. Endpoint Overview

This endpoint retrieves a paginated list of all decks belonging to the authenticated user, including computed metadata such as the total number of flashcards and the count of cards due for review. It supports flexible querying through pagination, sorting by multiple fields, and customizable ordering.

**Purpose:** Enable users to view and manage their deck collections with relevant statistics for study planning.

## 2. Request Details

- **HTTP Method:** `GET`
- **URL Structure:** `/api/decks`
- **Authentication:** Required (Bearer token via Supabase authentication)

### Query Parameters:

**Optional:**

- `page` - integer (default: `1`, minimum: `1`)
  - Specifies which page of results to return
  - Must be a positive integer
- `limit` - integer (default: `20`, minimum: `1`, maximum: `100`)
  - Number of decks per page
  - Capped at 100 to prevent excessive data fetching
- `sort` - string (default: `created_at`)
  - Field to sort by
  - Allowed values: `created_at`, `updated_at`, `name`
- `order` - string (default: `desc`)
  - Sort direction
  - Allowed values: `asc`, `desc`

**Request Body:** None (GET request)

### Example Request:

```
GET /api/decks?page=1&limit=20&sort=name&order=asc
Authorization: Bearer <token>
```

## 3. Used Types

### From `src/types.ts`:

**Response Types:**

- `PaginatedResponseDTO<DeckDTO>` - Wrapper containing data array and pagination metadata
- `DeckDTO` - Individual deck with computed statistics
- `PaginationDTO` - Pagination metadata structure

**Query Types:**

- `DeckListQueryParams` - Type-safe query parameter validation

### Type Definitions:

```typescript
// Response structure
type PaginatedResponseDTO<T> = {
  data: T[];
  pagination: PaginationDTO;
};

// Individual deck DTO
type DeckDTO = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  total_flashcards: number;
  cards_due: number;
  next_review_date?: string | null;
};

// Pagination metadata
type PaginationDTO = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

// Query parameters
type DeckListQueryParams = {
  page?: number;
  limit?: number;
  sort?: "created_at" | "updated_at" | "name";
  order?: "asc" | "desc";
};
```

## 4. Response Details

### Success Response (200 OK):

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Spanish Vocabulary",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z",
      "total_flashcards": 150,
      "cards_due": 12,
      "next_review_date": "2024-01-21T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

### Error Responses:

**401 Unauthorized:**

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

**400 Bad Request:**

```json
{
  "error": "Bad Request",
  "message": "Validation error",
  "details": [
    {
      "field": "limit",
      "message": "Must be between 1 and 100"
    }
  ]
}
```

**500 Internal Server Error:**

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## 5. Data Flow

### High-Level Flow:

1. **Request Reception** → Astro API route receives GET request
2. **Authentication** → Middleware verifies Bearer token via Supabase
3. **Input Validation** → Zod validates and parses query parameters
4. **Service Invocation** → DeckService.listDecks() called with validated params
5. **Database Query** → Supabase fetches decks with RLS filtering by user_id
6. **Statistics Calculation** → Compute total_flashcards, cards_due, next_review_date
7. **Pagination** → Apply offset/limit, calculate pagination metadata
8. **Response Formatting** → Return PaginatedResponseDTO with DeckDTO array

### Detailed Database Interactions:

#### Step 1: Count Total Decks

```sql
SELECT COUNT(*) FROM decks WHERE user_id = $1
```

#### Step 2: Fetch Paginated Decks with Statistics

```sql
SELECT
  d.id,
  d.name,
  d.created_at,
  d.updated_at,
  COUNT(f.id) as total_flashcards,
  COUNT(CASE WHEN f.next_review_date <= NOW() THEN 1 END) as cards_due,
  MIN(f.next_review_date) as next_review_date
FROM decks d
LEFT JOIN flashcards f ON f.deck_id = d.id
WHERE d.user_id = $1
GROUP BY d.id, d.name, d.created_at, d.updated_at
ORDER BY d.[sort_field] [order]
LIMIT $2 OFFSET $3
```

#### Calculation Logic:

- `total_flashcards`: COUNT of all flashcards in the deck
- `cards_due`: COUNT of flashcards where next_review_date <= current timestamp
- `next_review_date`: MIN(next_review_date) from flashcards (earliest upcoming review)
- Pagination: `OFFSET = (page - 1) * limit`, `LIMIT = limit`
- `total_pages`: `Math.ceil(total / limit)`

### Service Layer Structure:

**File:** `src/lib/services/deck.service.ts`

**Method Signature:**

```typescript
async listDecks(
  userId: string,
  params: DeckListQueryParams
): Promise<PaginatedResponseDTO<DeckDTO>>
```

## 6. Security Considerations

### Authentication & Authorization:

1. **Middleware Authentication:**
   - Supabase middleware (`src/middleware/index.ts`) validates Bearer token
   - Sets `context.locals.supabase` with authenticated client
   - Automatically rejects requests without valid token (401)

2. **Row-Level Security (RLS):**
   - Database RLS policies ensure users only access their own decks
   - Filter by `user_id` in WHERE clause as additional safeguard
   - Defense-in-depth: combine RLS + explicit user_id filtering

3. **Data Exposure Prevention:**
   - `DeckDTO` omits `user_id` field (type excludes it)
   - Only return data owned by authenticated user
   - Never expose other users' deck information

### Input Validation:

1. **Zod Schema Validation:**

```typescript
const queryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["created_at", "updated_at", "name"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
```

2. **SQL Injection Prevention:**
   - Use Supabase parameterized queries exclusively
   - Never concatenate user input into SQL strings
   - Validate sort field against whitelist enum

3. **Rate Limiting Considerations:**
   - Consider implementing rate limiting to prevent abuse
   - Monitor for excessive pagination requests
   - Log suspicious patterns (e.g., rapid page iteration)

### Additional Security Measures:

- CORS configuration for production domains only
- HTTPS enforcement in production
- Audit logging for authentication failures
- Monitor for unauthorized access attempts

## 7. Error Handling

### Error Categories and HTTP Status Codes:

#### 401 Unauthorized

**Trigger Conditions:**

- Missing `Authorization` header
- Invalid or expired Bearer token
- Token signature validation failure

**Response:**

```typescript
return new Response(
  JSON.stringify({
    error: "Unauthorized",
    message: "Invalid or missing authentication token",
  }),
  { status: 401, headers: { "Content-Type": "application/json" } }
);
```

**Handled By:** Middleware (automatic rejection before route handler)

#### 400 Bad Request

**Trigger Conditions:**

- `page` < 1 or not an integer
- `limit` < 1, > 100, or not an integer
- `sort` not in allowed enum values
- `order` not in ['asc', 'desc']

**Response:**

```typescript
return new Response(
  JSON.stringify({
    error: "Bad Request",
    message: "Invalid query parameters",
    details: zodError.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  }),
  { status: 400, headers: { "Content-Type": "application/json" } }
);
```

**Handling Strategy:**

- Use Zod's built-in error formatting
- Return detailed validation errors
- Log validation failures for monitoring

#### 500 Internal Server Error

**Trigger Conditions:**

- Database connection failures
- Query execution errors
- Unexpected exceptions in service layer
- Computation errors in statistics calculation

**Response:**

```typescript
return new Response(
  JSON.stringify({
    error: "Internal Server Error",
    message: "An unexpected error occurred",
  }),
  { status: 500, headers: { "Content-Type": "application/json" } }
);
```

**Handling Strategy:**

- Log full error details server-side (stack trace, context)
- Return generic message to client (avoid exposing internals)
- Monitor error rates for alerting
- Consider retry logic for transient failures

### Error Handling Pattern (Early Returns):

```typescript
export const GET = async (context) => {
  // 1. Authentication check (handled by middleware)
  const userId = context.locals.user?.id;
  if (!userId) {
    return new Response(/* 401 */);
  }

  // 2. Input validation
  const validationResult = queryParamsSchema.safeParse(context.url.searchParams);
  if (!validationResult.success) {
    return new Response(/* 400 with details */);
  }

  // 3. Service call with error handling
  try {
    const result = await deckService.listDecks(userId, validationResult.data);
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    // Log error with context
    console.error("Error listing decks:", { userId, error });
    return new Response(/* 500 */);
  }
};
```

## 8. Performance Considerations

### Potential Bottlenecks:

1. **N+1 Query Problem:**
   - **Issue:** Separate queries for each deck's statistics
   - **Solution:** Use single JOIN query with GROUP BY to fetch all data at once
   - **Impact:** Reduces database round trips from O(n) to O(1)

2. **Large Deck Collections:**
   - **Issue:** Users with hundreds of decks
   - **Mitigation:** Pagination limits response size (max 100 per request)
   - **Consideration:** Index on `(user_id, created_at)`, `(user_id, updated_at)`, `(user_id, name)`

3. **Statistics Calculation:**
   - **Issue:** COUNT operations on large flashcard tables
   - **Optimization:** Database-level aggregation (GROUP BY in single query)
   - **Future:** Consider materialized views or cached counts for very large datasets

### Database Indexing Strategy:

**Required Indexes:**

```sql
-- Primary filtering and sorting
CREATE INDEX idx_decks_user_created ON decks(user_id, created_at DESC);
CREATE INDEX idx_decks_user_updated ON decks(user_id, updated_at DESC);
CREATE INDEX idx_decks_user_name ON decks(user_id, name);

-- Join optimization
CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX idx_flashcards_next_review ON flashcards(next_review_date);
```

### Query Optimization:

- Use `LEFT JOIN` for statistics (handles decks with 0 flashcards)
- Apply `LIMIT` and `OFFSET` at database level (not in application)
- Leverage PostgreSQL query planner with proper indexes
- Consider `EXPLAIN ANALYZE` for query performance profiling

## 9. Implementation Steps

### Step 1: Create DeckService

**File:** `src/lib/services/deck.service.ts`

1. Create service class/module for deck operations
2. Implement `listDecks()` method with signature:
   ```typescript
   async listDecks(
     supabase: SupabaseClient<Database>,
     userId: string,
     params: DeckListQueryParams
   ): Promise<PaginatedResponseDTO<DeckDTO>>
   ```
3. Include proper TypeScript types from `src/types.ts`
4. Add JSDoc documentation

### Step 2: Implement Database Query Logic

1. **Count total decks:**

   ```typescript
   const { count, error: countError } = await supabase
     .from("decks")
     .select("*", { count: "exact", head: true })
     .eq("user_id", userId);
   ```

2. **Fetch decks with statistics:**
   - Use Supabase `.select()` with JOIN syntax
   - Apply `GROUP BY` for aggregations
   - Add `ORDER BY` based on sort and order params
   - Apply pagination with `.range(from, to)`

3. **Handle RLS:** Supabase RLS automatically filters by user_id, but add explicit filter as defense-in-depth

4. **Map results to DeckDTO:**
   - Transform database rows to match DeckDTO structure
   - Ensure `next_review_date` is properly formatted (ISO 8601)
   - Handle null values for decks with no flashcards

### Step 3: Calculate Pagination Metadata

```typescript
const totalPages = Math.ceil(count / limit);
const pagination: PaginationDTO = {
  page,
  limit,
  total: count,
  total_pages: totalPages,
};
```

### Step 4: Create Zod Validation Schema

**File:** `src/pages/api/decks/index.ts` (or separate validation file)

```typescript
import { z } from "zod";

const queryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["created_at", "updated_at", "name"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
```

### Step 5: Implement API Route Handler

**File:** `src/pages/api/decks/index.ts`

```typescript
import type { APIRoute } from "astro";
import type { DeckListQueryParams } from "@/types";
import { deckService } from "@/lib/services/deck.service";
import { z } from "zod";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  // 1. Extract authenticated user
  const userId = context.locals.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized", message: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Validate query parameters
  const queryParams = Object.fromEntries(context.url.searchParams);
  const validationResult = queryParamsSchema.safeParse(queryParams);

  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        error: "Bad Request",
        message: "Invalid query parameters",
        details: validationResult.error.issues,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3. Call service
  try {
    const result = await deckService.listDecks(context.locals.supabase, userId, validationResult.data);

    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error listing decks:", { userId, error });

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

### Step 6: Add Error Logging

1. Implement structured logging for:
   - Validation failures (with userId and invalid params)
   - Database errors (with query context)
   - Unexpected exceptions (with full stack trace)
2. Use consistent log format for easier parsing
3. Consider log levels (INFO, WARN, ERROR)
