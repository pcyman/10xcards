# API Endpoint Implementation Plan: List Flashcards in Deck

## 1. Endpoint Overview

This endpoint retrieves a paginated list of flashcards belonging to a specific deck owned by the authenticated user. It provides flexible querying capabilities including pagination, sorting by multiple fields (created_at, updated_at, next_review_date), ordering (ascending/descending), and filtering by AI-generation status.

**Key Features:**
- Paginated results with configurable page size (max 200 per page)
- Multi-field sorting with directional control
- Optional filtering by flashcard creation method (AI vs. manual)
- Authorization validation ensuring users can only access their own decks
- Comprehensive error handling for invalid inputs and unauthorized access

## 2. Request Details

- **HTTP Method:** `GET`
- **URL Structure:** `/api/decks/:deckId/flashcards`
- **Authentication:** Required (Bearer token via Authorization header)

### Parameters

**Path Parameters:**
- `deckId` (required) - UUID of the target deck

**Query Parameters:**
- `page` (optional) - Page number for pagination
  - Type: integer
  - Default: 1
  - Minimum: 1

- `limit` (optional) - Number of items per page
  - Type: integer
  - Default: 50
  - Minimum: 1
  - Maximum: 200

- `sort` (optional) - Field to sort by
  - Type: string enum
  - Values: `created_at`, `updated_at`, `next_review_date`
  - Default: `created_at`

- `order` (optional) - Sort direction
  - Type: string enum
  - Values: `asc`, `desc`
  - Default: `desc`

- `is_ai_generated` (optional) - Filter by creation method
  - Type: boolean
  - Values: `true`, `false`
  - When omitted: returns all flashcards regardless of creation method

**Request Headers:**
- `Authorization: Bearer <token>` (required)

**Example Request:**
```
GET /api/decks/550e8400-e29b-41d4-a716-446655440000/flashcards?page=1&limit=20&sort=next_review_date&order=asc&is_ai_generated=false
```

## 3. Used Types

### Existing Types (from `src/types.ts`)

**FlashcardDTO** (line 61):
```typescript
export type FlashcardDTO = Omit<FlashcardRow, "user_id">;
```
Represents the complete flashcard with all fields except user_id.

**PaginatedResponseDTO<T>** (lines 202-205):
```typescript
export interface PaginatedResponseDTO<T> {
  data: T[];
  pagination: PaginationDTO;
}
```
Generic wrapper for paginated responses.

**PaginationDTO** (lines 191-196):
```typescript
export interface PaginationDTO {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
```
Metadata about pagination state.

**FlashcardListQueryParams** (lines 354-360):
```typescript
export interface FlashcardListQueryParams {
  page?: number;
  limit?: number;
  sort?: "created_at" | "updated_at" | "next_review_date";
  order?: "asc" | "desc";
  is_ai_generated?: boolean;
}
```
Query parameters for the endpoint.

### Response Type
```typescript
PaginatedResponseDTO<FlashcardDTO>
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "deck_id": "660e8400-e29b-41d4-a716-446655440000",
      "front": "What is the capital of France?",
      "back": "Paris",
      "is_ai_generated": false,
      "next_review_date": "2025-11-15",
      "ease_factor": 2.5,
      "interval_days": 1,
      "repetitions": 0,
      "created_at": "2025-11-12T10:30:00Z",
      "updated_at": "2025-11-12T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 127,
    "total_pages": 3
  }
}
```

### Error Responses

**400 Bad Request** - Invalid query parameters
```json
{
  "error": "Invalid query parameters",
  "details": {
    "page": "Must be a positive integer",
    "limit": "Must be between 1 and 200"
  }
}
```

**401 Unauthorized** - Missing, invalid, or expired authentication token
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**404 Not Found** - Deck not found or doesn't belong to user
```json
{
  "error": "Deck not found"
}
```

**500 Internal Server Error** - Unexpected server error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## 5. Data Flow

### Request Flow

1. **Request Reception**
   - Astro API route receives GET request at `/api/decks/:deckId/flashcards`
   - Extract `deckId` from path parameters
   - Extract query parameters from URL

2. **Authentication & Authorization**
   - Middleware extracts JWT token from Authorization header
   - Supabase client validates token and retrieves user session
   - Extract `user_id` from authenticated session

3. **Input Validation**
   - Validate `deckId` is a valid UUID format
   - Validate and sanitize all query parameters using Zod schema
   - Apply defaults for omitted optional parameters
   - Ensure `limit` doesn't exceed maximum (200)

4. **Deck Ownership Verification**
   - Query `decks` table to verify deck exists and belongs to authenticated user
   - If deck not found or belongs to different user, return 404
   - This prevents enumeration attacks by not differentiating between "not exists" and "not yours"

5. **Flashcard Query Construction**
   - Build Supabase query with:
     - Filter by `deck_id` and `user_id`
     - Apply `is_ai_generated` filter if provided
     - Apply sorting by specified field and direction
     - Calculate offset from page and limit: `offset = (page - 1) * limit`
     - Apply limit to query

6. **Parallel Queries**
   - Execute two queries in parallel:
     - Main query: Fetch paginated flashcards with filters
     - Count query: Get total count of flashcards matching filters

7. **Response Construction**
   - Map database rows to `FlashcardDTO` (exclude `user_id` field)
   - Calculate `total_pages` from total count and limit: `Math.ceil(total / limit)`
   - Construct `PaginationDTO` object
   - Wrap data and pagination in `PaginatedResponseDTO`

8. **Response Return**
   - Return JSON response with status 200
   - Set appropriate headers (Content-Type: application/json)

### Database Interactions

**Query 1: Verify Deck Ownership**
```typescript
const { data: deck, error } = await supabase
  .from('decks')
  .select('id')
  .eq('id', deckId)
  .eq('user_id', userId)
  .single();
```

**Query 2: Fetch Flashcards (Paginated)**
```typescript
let query = supabase
  .from('flashcards')
  .select('id, deck_id, front, back, is_ai_generated, next_review_date, ease_factor, interval_days, repetitions, created_at, updated_at')
  .eq('deck_id', deckId)
  .eq('user_id', userId);

if (is_ai_generated !== undefined) {
  query = query.eq('is_ai_generated', is_ai_generated);
}

query = query
  .order(sort, { ascending: order === 'asc' })
  .range(offset, offset + limit - 1);
```

**Query 3: Count Total Flashcards**
```typescript
let countQuery = supabase
  .from('flashcards')
  .select('id', { count: 'exact', head: true })
  .eq('deck_id', deckId)
  .eq('user_id', userId);

if (is_ai_generated !== undefined) {
  countQuery = countQuery.eq('is_ai_generated', is_ai_generated);
}
```

## 6. Security Considerations

### Authentication & Authorization

1. **JWT Token Validation**
   - Verify Bearer token is present in Authorization header
   - Validate token signature and expiration via Supabase auth
   - Extract authenticated user ID from token claims

2. **Deck Ownership Verification**
   - Always verify deck belongs to authenticated user before querying flashcards
   - Return generic 404 for both non-existent decks and unauthorized access
   - This prevents attackers from enumerating valid deck IDs

3. **Row Level Security (RLS)**
   - Although we apply `user_id` filters in application code, ensure RLS policies are enabled on flashcards table
   - RLS provides defense-in-depth even if application logic has bugs

### Input Validation & Sanitization

1. **UUID Validation**
   - Validate `deckId` matches UUID v4 format using Zod
   - Prevents SQL injection and invalid database queries

2. **Query Parameter Validation**
   - Validate all numeric parameters are integers within valid ranges
   - Validate enum parameters match allowed values exactly
   - Prevent parameter pollution by accepting only first value if multiple provided

3. **Limit Enforcement**
   - Cap maximum limit at 200 to prevent resource exhaustion
   - Prevents DOS attacks via excessive data retrieval

### Data Exposure Prevention

1. **Exclude Sensitive Fields**
   - Never return `user_id` in flashcard responses (already handled by FlashcardDTO type)
   - Ensures user IDs are not exposed to clients

2. **Error Message Sanitization**
   - Return generic error messages for authorization failures
   - Don't reveal whether deck exists when user lacks access
   - Prevents information leakage about system state

### Rate Limiting Considerations

- Consider implementing rate limiting at API gateway level
- Suggested limit: 100 requests per minute per user
- Prevents abuse of pagination to scrape large datasets

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Response | Handling Strategy |
|----------|-------------|----------|-------------------|
| Missing Authorization header | 401 | `{"error": "Unauthorized", "message": "Authentication required"}` | Check for header early, return before any database queries |
| Invalid JWT token | 401 | `{"error": "Unauthorized", "message": "Invalid authentication token"}` | Let Supabase auth middleware handle, return error if user is null |
| Expired JWT token | 401 | `{"error": "Unauthorized", "message": "Session expired"}` | Supabase client returns auth error, map to 401 |
| Invalid deckId format | 400 | `{"error": "Invalid deck ID format"}` | Validate with Zod UUID schema |
| Invalid page number (< 1) | 400 | `{"error": "Invalid query parameters", "details": {"page": "Must be >= 1"}}` | Validate with Zod in query schema |
| Invalid limit (< 1 or > 200) | 400 | `{"error": "Invalid query parameters", "details": {"limit": "Must be between 1 and 200"}}` | Validate with Zod in query schema |
| Invalid sort field | 400 | `{"error": "Invalid query parameters", "details": {"sort": "Must be one of: created_at, updated_at, next_review_date"}}` | Validate with Zod enum |
| Invalid order value | 400 | `{"error": "Invalid query parameters", "details": {"order": "Must be asc or desc"}}` | Validate with Zod enum |
| Invalid is_ai_generated type | 400 | `{"error": "Invalid query parameters", "details": {"is_ai_generated": "Must be a boolean"}}` | Validate with Zod boolean coercion |
| Deck not found | 404 | `{"error": "Deck not found"}` | Query deck ownership, return 404 if null |
| Deck belongs to different user | 404 | `{"error": "Deck not found"}` | Query with user_id filter, return 404 if no match (don't differentiate from not found) |
| Database connection error | 500 | `{"error": "Internal server error"}` | Catch database errors, log details, return generic message |
| Unexpected server error | 500 | `{"error": "Internal server error"}` | Catch all unhandled errors, log stack trace, return generic message |

### Error Handling Pattern

Follow early return pattern with guard clauses:

```typescript
// 1. Authentication check (earliest possible)
if (!userId) {
  return new Response(JSON.stringify({...}), { status: 401 });
}

// 2. Input validation
const validationResult = schema.safeParse(input);
if (!validationResult.success) {
  return new Response(JSON.stringify({...}), { status: 400 });
}

// 3. Authorization (deck ownership)
const deck = await verifyDeckOwnership(...);
if (!deck) {
  return new Response(JSON.stringify({...}), { status: 404 });
}

// 4. Happy path - main business logic
const result = await fetchFlashcards(...);
return new Response(JSON.stringify(result), { status: 200 });
```

### Logging Strategy

- Log all 500 errors with full stack traces
- Log authentication failures (potential security issues)
- Log validation failures for monitoring abuse patterns
- Don't log successful requests (too verbose)
- Use structured logging with request ID for traceability

## 8. Performance Considerations

### Database Query Optimization

1. **Indexing Requirements**
   - Ensure composite index on `flashcards(deck_id, user_id)` for efficient filtering
   - Ensure indexes on sort fields: `created_at`, `updated_at`, `next_review_date`
   - Index on `is_ai_generated` if this filter is used frequently

2. **Query Efficiency**
   - Use `select` to fetch only needed columns (avoid `select *`)
   - Apply filters before sorting to reduce dataset size
   - Use database-level pagination with `range()` instead of fetching all and slicing in application

3. **Parallel Queries**
   - Execute data fetch and count queries in parallel using `Promise.all()`
   - Reduces total response time by ~50% compared to sequential queries

### Caching Considerations

1. **Response Caching**
   - Consider HTTP caching headers for relatively stable pages
   - Example: `Cache-Control: private, max-age=30` for 30-second client cache
   - Invalidate on mutations (create, update, delete flashcards)

2. **Deck Ownership Caching**
   - For high-traffic scenarios, consider caching deck ownership verification
   - Use short TTL (30-60 seconds) to balance performance and consistency

### Scalability

1. **Pagination Best Practices**
   - Default limit of 50 is reasonable for most use cases
   - Maximum limit of 200 prevents excessive memory usage
   - For very large decks (1000+ cards), encourage smaller page sizes in UI

2. **Database Connection Pooling**
   - Supabase client handles connection pooling automatically
   - Ensure proper cleanup of database connections in error scenarios

### Performance Monitoring

- Monitor query execution times (target: < 100ms for p95)
- Monitor response payload sizes (target: < 50KB for typical requests)
- Set up alerting for slow queries (> 500ms)
- Track pagination patterns to optimize default limit

## 9. Implementation Steps

### Step 1: Create Service Layer

**File:** `src/lib/services/flashcard.service.ts`

Create or extend the flashcard service with the following function:

```typescript
interface ListFlashcardsParams {
  deckId: string;
  userId: string;
  page: number;
  limit: number;
  sort: 'created_at' | 'updated_at' | 'next_review_date';
  order: 'asc' | 'desc';
  isAiGenerated?: boolean;
}

async function listFlashcardsInDeck(
  supabase: SupabaseClient<Database>,
  params: ListFlashcardsParams
): Promise<PaginatedResponseDTO<FlashcardDTO>>
```

**Implementation details:**
- Verify deck ownership first
- Build Supabase query with filters, sorting, and pagination
- Execute data and count queries in parallel
- Transform results to DTOs
- Calculate pagination metadata
- Return paginated response

### Step 2: Create Zod Validation Schema

**File:** `src/pages/api/decks/[deckId]/flashcards.ts` (top of file)

Define validation schema for query parameters:

```typescript
import { z } from 'zod';

const queryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sort: z.enum(['created_at', 'updated_at', 'next_review_date']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  is_ai_generated: z.coerce.boolean().optional(),
});

const deckIdSchema = z.string().uuid();
```

**Notes:**
- Use `z.coerce` for automatic type conversion from URL strings
- Use `.default()` for optional parameters with defaults
- UUID validation for deckId prevents injection attacks

### Step 3: Create API Route Handler

**File:** `src/pages/api/decks/[deckId]/flashcards.ts`

Create the route file with the following structure:

```typescript
export const prerender = false;

export async function GET(context: APIContext) {
  // Implementation here
}
```

### Step 4: Implement Authentication Check

Inside the `GET` function:

```typescript
// Extract Supabase client from locals
const supabase = context.locals.supabase;

// Get authenticated user
const { data: { user }, error: authError } = await supabase.auth.getUser();

// Early return if not authenticated
if (authError || !user) {
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      message: 'Authentication required'
    }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}

const userId = user.id;
```

### Step 5: Validate Path and Query Parameters

```typescript
// Validate deckId from path params
const deckIdValidation = deckIdSchema.safeParse(context.params.deckId);

if (!deckIdValidation.success) {
  return new Response(
    JSON.stringify({
      error: 'Invalid deck ID format'
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

const deckId = deckIdValidation.data;

// Parse and validate query parameters
const url = new URL(context.request.url);
const queryParams = {
  page: url.searchParams.get('page'),
  limit: url.searchParams.get('limit'),
  sort: url.searchParams.get('sort'),
  order: url.searchParams.get('order'),
  is_ai_generated: url.searchParams.get('is_ai_generated'),
};

const validation = queryParamsSchema.safeParse(queryParams);

if (!validation.success) {
  return new Response(
    JSON.stringify({
      error: 'Invalid query parameters',
      details: validation.error.flatten().fieldErrors
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

const { page, limit, sort, order, is_ai_generated } = validation.data;
```

### Step 6: Call Service Layer

```typescript
try {
  const result = await listFlashcardsInDeck(supabase, {
    deckId,
    userId,
    page,
    limit,
    sort,
    order,
    isAiGenerated: is_ai_generated,
  });

  return new Response(
    JSON.stringify(result),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
} catch (error) {
  // Error handling in next step
}
```

### Step 7: Implement Error Handling

```typescript
catch (error) {
  // Handle deck not found specifically
  if (error instanceof Error && error.message === 'Deck not found') {
    return new Response(
      JSON.stringify({
        error: 'Deck not found'
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Log unexpected errors
  console.error('Error listing flashcards:', error);

  // Return generic error to client
  return new Response(
    JSON.stringify({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Step 8: Implement Service Function Details

In the service layer (`flashcard.service.ts`):

```typescript
async function listFlashcardsInDeck(
  supabase: SupabaseClient<Database>,
  params: ListFlashcardsParams
): Promise<PaginatedResponseDTO<FlashcardDTO>> {
  const { deckId, userId, page, limit, sort, order, isAiGenerated } = params;

  // Step 1: Verify deck ownership
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id')
    .eq('id', deckId)
    .eq('user_id', userId)
    .single();

  if (deckError || !deck) {
    throw new Error('Deck not found');
  }

  // Step 2: Build flashcard query
  const offset = (page - 1) * limit;

  let dataQuery = supabase
    .from('flashcards')
    .select('id, deck_id, front, back, is_ai_generated, next_review_date, ease_factor, interval_days, repetitions, created_at, updated_at')
    .eq('deck_id', deckId)
    .eq('user_id', userId);

  let countQuery = supabase
    .from('flashcards')
    .select('id', { count: 'exact', head: true })
    .eq('deck_id', deckId)
    .eq('user_id', userId);

  // Apply optional filter
  if (isAiGenerated !== undefined) {
    dataQuery = dataQuery.eq('is_ai_generated', isAiGenerated);
    countQuery = countQuery.eq('is_ai_generated', isAiGenerated);
  }

  // Apply sorting and pagination to data query
  dataQuery = dataQuery
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1);

  // Step 3: Execute queries in parallel
  const [dataResult, countResult] = await Promise.all([
    dataQuery,
    countQuery,
  ]);

  if (dataResult.error) {
    throw dataResult.error;
  }

  if (countResult.error) {
    throw countResult.error;
  }

  // Step 4: Build response
  const total = countResult.count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: dataResult.data as FlashcardDTO[],
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
    },
  };
}
```

### Step 9: Test the Endpoint

Create test scenarios for:

1. **Happy Path Tests:**
   - Default parameters (page 1, limit 50, sort by created_at desc)
   - Custom pagination (page 2, limit 20)
   - Different sort fields (created_at, updated_at, next_review_date)
   - Different sort orders (asc, desc)
   - Filter by is_ai_generated = true
   - Filter by is_ai_generated = false
   - Empty deck (should return empty data array with proper pagination)

2. **Error Tests:**
   - Missing authentication token (401)
   - Invalid authentication token (401)
   - Invalid deckId format (400)
   - Deck doesn't exist (404)
   - Deck belongs to different user (404)
   - Invalid page number (400)
   - Invalid limit (400)
   - Invalid sort field (400)
   - Invalid order value (400)

3. **Edge Cases:**
   - Page number beyond available pages (should return empty array)
   - Limit = 1 (minimum)
   - Limit = 200 (maximum)
   - Deck with exactly one flashcard
   - Deck with hundreds of flashcards

### Step 10: Add Type Safety Checks

Ensure TypeScript compilation passes:

```bash
npm run build
```

Verify that:
- All imports resolve correctly
- Type annotations match interfaces in `src/types.ts`
- No TypeScript errors in route or service files

### Step 11: Code Review Checklist

Before finalizing implementation, verify:

- [ ] Authentication check is first operation
- [ ] All user inputs are validated with Zod
- [ ] Deck ownership is verified before querying flashcards
- [ ] user_id filter is applied to all queries (defense in depth)
- [ ] Error responses use correct status codes
- [ ] Sensitive information is not leaked in error messages
- [ ] Database queries use parallel execution where possible
- [ ] Pagination metadata is calculated correctly
- [ ] Response matches API specification exactly
- [ ] Code follows early return pattern for errors
- [ ] Service layer is properly decoupled from route handler
- [ ] All magic numbers are explained or extracted to constants
- [ ] Comments explain "why" not "what"
- [ ] Code passes ESLint and Prettier checks

### Step 12: Performance Testing

Test with realistic data volumes:

1. Create test deck with 500+ flashcards
2. Measure response times for various page numbers
3. Verify database query execution plans use indexes
4. Test with concurrent requests (10+ simultaneous users)
5. Monitor memory usage during large result sets

Target benchmarks:
- Response time < 100ms for p95
- Response time < 200ms for p99
- Memory usage < 50MB per request
- Database query time < 50ms

### Step 13: Documentation

Update API documentation with:
- Example request URLs
- Example response payloads
- Error code descriptions
- Usage notes and best practices
- Rate limiting information (if applicable)
