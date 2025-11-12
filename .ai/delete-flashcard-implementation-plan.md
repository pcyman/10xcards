# API Endpoint Implementation Plan: Delete Flashcard

## 1. Endpoint Overview

This endpoint permanently deletes a flashcard and all its associated review history from the database. The deletion is irreversible and requires the user to be authenticated. The endpoint verifies ownership before deletion to prevent unauthorized access (IDOR vulnerability). When a flashcard is deleted, the database CASCADE constraint automatically removes all related review records, maintaining referential integrity.

**Key Characteristics:**
- Idempotent operation (subsequent calls to delete an already-deleted flashcard return 404)
- Destructive operation requiring authentication
- Ownership verification required
- Cascading deletion of related review history

## 2. Request Details

- **HTTP Method:** `DELETE`
- **URL Structure:** `/api/flashcards/:id`
- **Authentication:** Required (Bearer token via Authorization header)

### Parameters

**Path Parameters (Required):**
- `id` (string, UUID format) - The unique identifier of the flashcard to delete
  - Must be a valid UUID v4 format
  - Example: `550e8400-e29b-41d4-a716-446655440000`

**Request Headers:**
- `Authorization: Bearer <token>` (required) - JWT token from Supabase authentication

**Request Body:**
- None

### Example Request

```http
DELETE /api/flashcards/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Used Types

### Response Types

```typescript
// Already defined in src/types.ts (lines 86-88)
export interface DeleteFlashcardResponseDTO {
  message: string;
}
```

### Internal Types

```typescript
// From src/db/database.types.ts (via Database type)
type FlashcardRow = Database["public"]["Tables"]["flashcards"]["Row"];

// Used internally for validation
interface DeleteFlashcardParams {
  id: string; // UUID
}
```

### Validation Schema

```typescript
// To be defined in the API route
import { z } from "zod";

const deleteFlashcardParamsSchema = z.object({
  id: z.string().uuid("Invalid flashcard ID format"),
});
```

## 4. Response Details

### Success Response (200 OK)

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "message": "Flashcard deleted successfully"
}
```

**Headers:**
```http
Content-Type: application/json
```

### Error Responses

#### 400 Bad Request
Invalid UUID format for flashcard ID.

```json
{
  "error": "Invalid flashcard ID format"
}
```

#### 401 Unauthorized
Missing, invalid, or expired authentication token.

```json
{
  "error": "Unauthorized"
}
```

#### 404 Not Found
Flashcard doesn't exist or doesn't belong to the authenticated user.

```json
{
  "error": "Flashcard not found"
}
```

#### 500 Internal Server Error
Unexpected server or database error.

```json
{
  "error": "Internal server error"
}
```

## 5. Data Flow

```
┌─────────────────┐
│  Client Request │
│  DELETE /api/   │
│  flashcards/:id │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Astro Middleware       │
│  - Extract Bearer token │
│  - Initialize Supabase  │
│  - Get authenticated    │
│    user from token      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  API Route Handler      │
│  /api/flashcards/[id]   │
│  - Export prerender=    │
│    false                │
│  - Validate auth        │
│  - Parse & validate ID  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Service Layer          │
│  flashcard.service.ts   │
│  - deleteFlashcard()    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Database Query         │
│  1. Verify flashcard    │
│     exists and belongs  │
│     to user             │
│  2. DELETE flashcard    │
│     (CASCADE deletes    │
│     reviews)            │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Response               │
│  - 200 OK + message     │
│  - 404 if not found     │
│  - 500 if DB error      │
└─────────────────────────┘
```

### Detailed Flow Steps

1. **Request Arrival**
   - Client sends DELETE request with flashcard ID in URL path
   - Authorization header contains Bearer token

2. **Middleware Processing** (`src/middleware/index.ts`)
   - Extracts Bearer token from Authorization header
   - Initializes Supabase client with token
   - Validates token and retrieves authenticated user
   - Makes `supabase` client and `user` available via `context.locals`

3. **Route Handler** (`src/pages/api/flashcards/[id].ts`)
   - Checks if user is authenticated (via `context.locals.user`)
   - Returns 401 if not authenticated
   - Extracts `id` from URL params
   - Validates `id` is valid UUID using Zod
   - Returns 400 if validation fails

4. **Service Layer** (`src/lib/services/flashcard.service.ts`)
   - Calls `deleteFlashcard(supabase, flashcardId, userId)`
   - Queries database to verify flashcard exists and belongs to user
   - If not found or ownership mismatch, throws appropriate error
   - Executes DELETE operation
   - Returns success confirmation

5. **Database Operation**
   - Query: `DELETE FROM flashcards WHERE id = ? AND user_id = ?`
   - CASCADE constraint automatically deletes related reviews
   - RLS policies enforce additional security layer

6. **Response Generation**
   - Success: Returns 200 with `DeleteFlashcardResponseDTO`
   - Errors: Returns appropriate status code with error message

## 6. Security Considerations

### Authentication

- **Bearer Token Validation:** Middleware validates JWT token from Authorization header
- **User Context:** Authenticated user object must be present in `context.locals.user`
- **Token Expiration:** Expired tokens automatically rejected by Supabase
- **No Authentication:** Return 401 immediately without processing request

### Authorization (Ownership Verification)

- **IDOR Prevention:** Must verify flashcard belongs to authenticated user
- **Implementation:** Include `user_id` in WHERE clause of DELETE query
- **Database RLS:** Row Level Security policies provide additional protection layer
- **Fail Closed:** If verification fails, return 404 (not 403 to avoid information disclosure)

### Input Validation

- **UUID Validation:** Validate flashcard ID is valid UUID format using Zod
- **Sanitization:** Supabase client automatically handles parameterized queries
- **Type Safety:** TypeScript ensures type correctness throughout the flow

### Data Protection

- **Soft Delete vs Hard Delete:** This endpoint performs hard delete (permanent removal)
- **Cascading Deletion:** Review history automatically deleted via CASCADE constraint
- **No Orphaned Data:** Database constraints ensure referential integrity
- **Audit Trail:** Consider logging deletion events for compliance if required

### Security Headers

```typescript
// Add in route handler
return new Response(JSON.stringify(response), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  },
});
```

### Rate Limiting

- Consider implementing rate limiting to prevent abuse
- Recommended: Maximum 100 deletions per minute per user
- Implementation: Use Astro middleware or external service (e.g., Upstash Redis)

## 7. Error Handling

### Error Scenarios and Responses

| Scenario | Status Code | Response | Logging |
|----------|-------------|----------|---------|
| Missing Authorization header | 401 | `{ "error": "Unauthorized" }` | Log authentication attempt |
| Invalid/expired token | 401 | `{ "error": "Unauthorized" }` | Log token validation failure |
| Invalid UUID format | 400 | `{ "error": "Invalid flashcard ID format" }` | Log validation error with ID |
| Flashcard not found | 404 | `{ "error": "Flashcard not found" }` | Log with flashcard ID and user ID |
| Flashcard belongs to different user | 404 | `{ "error": "Flashcard not found" }` | Log IDOR attempt with details |
| Database connection error | 500 | `{ "error": "Internal server error" }` | Log full error with stack trace |
| Unexpected server error | 500 | `{ "error": "Internal server error" }` | Log full error with stack trace |

### Error Handling Implementation

```typescript
try {
  // Validation
  const params = deleteFlashcardParamsSchema.parse({ id });

  // Service call
  await deleteFlashcard(supabase, params.id, user.id);

  // Success response
  return new Response(
    JSON.stringify({ message: "Flashcard deleted successfully" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
} catch (error) {
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({ error: "Invalid flashcard ID format" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (error instanceof NotFoundError) {
    return new Response(
      JSON.stringify({ error: "Flashcard not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  console.error("Error deleting flashcard:", error);
  return new Response(
    JSON.stringify({ error: "Internal server error" }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### Logging Strategy

- **Info Level:** Successful deletions (flashcard ID, user ID, timestamp)
- **Warn Level:** Authorization failures, not found errors
- **Error Level:** Database errors, unexpected exceptions
- **Include Context:** User ID, flashcard ID, request ID (if available)
- **Avoid Sensitive Data:** Never log authentication tokens

## 8. Performance Considerations

### Database Query Optimization

- **Single Query:** Use single DELETE query with WHERE clause for both existence check and deletion
- **Index Usage:** Database should have index on `(id, user_id)` for optimal performance
- **CASCADE Performance:** Database handles CASCADE deletion efficiently in single transaction
- **Connection Pooling:** Supabase manages connection pooling automatically

### Expected Query Performance

- **Average Response Time:** < 50ms for successful deletion
- **Database Query Time:** < 10ms with proper indexing
- **Network Overhead:** Minimal (small request/response payloads)

### Optimization Strategies

1. **Combined Query:** Verify and delete in single operation
   ```sql
   DELETE FROM flashcards
   WHERE id = $1 AND user_id = $2
   RETURNING id;
   ```
   - If returns no rows, flashcard not found or unauthorized
   - If returns 1 row, deletion successful
   - Eliminates separate SELECT query

2. **Avoid N+1 Queries:** Not applicable (single flashcard operation)

3. **Transaction Management:** Supabase handles transactions automatically for CASCADE deletions

4. **Caching Considerations:**
   - No caching needed for DELETE operations
   - If implementing cache elsewhere, invalidate cached flashcard data
   - Invalidate deck statistics cache (cards_due, total_flashcards)

### Scalability Considerations

- **Concurrent Deletions:** Database ACID properties handle concurrent operations
- **High Volume:** Current design scales to thousands of deletions per second
- **Database Locks:** Brief row-level lock during deletion (minimal impact)
- **Monitoring:** Track deletion rates and response times

### Potential Bottlenecks

1. **Database Connection Pool Exhaustion**
   - Mitigation: Supabase manages pool, monitor connection metrics

2. **CASCADE Deletion Performance**
   - Impact: Minimal unless flashcard has thousands of reviews
   - Mitigation: Database indexes on foreign keys

3. **Authentication Token Validation**
   - Impact: Additional network call to Supabase if token not cached
   - Mitigation: Supabase SDK caches valid tokens

## 9. Implementation Steps

### Step 1: Create/Update Service Layer

**File:** `src/lib/services/flashcard.service.ts`

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export async function deleteFlashcard(
  supabase: SupabaseClient<Database>,
  flashcardId: string,
  userId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", flashcardId)
    .eq("user_id", userId)
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "PGRST116") {
      // No rows returned - flashcard not found or unauthorized
      throw new NotFoundError("Flashcard not found");
    }
    throw error || new Error("Failed to delete flashcard");
  }
}
```

### Step 2: Create API Route Handler

**File:** `src/pages/api/flashcards/[id].ts`

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { deleteFlashcard, NotFoundError } from "@/lib/services/flashcard.service";
import type { DeleteFlashcardResponseDTO } from "@/types";

export const prerender = false;

const deleteFlashcardParamsSchema = z.object({
  id: z.string().uuid("Invalid flashcard ID format"),
});

export const DELETE: APIRoute = async ({ params, locals }) => {
  const supabase = locals.supabase;
  const user = locals.user;

  // Authentication check
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Validate path parameter
    const validatedParams = deleteFlashcardParamsSchema.parse({ id: params.id });

    // Delete flashcard via service
    await deleteFlashcard(supabase, validatedParams.id, user.id);

    // Success response
    const response: DeleteFlashcardResponseDTO = {
      message: "Flashcard deleted successfully",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    // Validation error
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid flashcard ID format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Not found error
    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({ error: "Flashcard not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Unexpected error
    console.error("Error deleting flashcard:", {
      error,
      flashcardId: params.id,
      userId: user.id,
    });

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

### Step 3: Verify Type Definitions

**File:** `src/types.ts`

Verify that `DeleteFlashcardResponseDTO` exists (it should already be present at lines 86-88):

```typescript
export interface DeleteFlashcardResponseDTO {
  message: string;
}
```

### Step 4: Verify Middleware Configuration

**File:** `src/middleware/index.ts`

Ensure middleware is properly configured to:
- Extract and validate Bearer token
- Initialize Supabase client
- Provide `locals.supabase` and `locals.user`

No changes needed if already implementing authentication for other endpoints.

### Step 5: Add Database Indexes (If Not Present)

**File:** Create migration file `supabase/migrations/[timestamp]_add_flashcard_indexes.sql`

```sql
-- add indexes for flashcard deletion performance
-- this migration adds composite index for efficient ownership verification

-- composite index for delete operations (id + user_id lookup)
create index if not exists idx_flashcards_id_user_id
on flashcards(id, user_id);

-- comment on index
comment on index idx_flashcards_id_user_id is
'Composite index for efficient flashcard deletion with ownership verification';
```

### Step 6: Verify Row Level Security Policies

Ensure RLS policies exist for flashcards table:

```sql
-- Policy for delete operations (should already exist)
create policy "Users can delete their own flashcards"
on flashcards for delete
to authenticated
using (auth.uid() = user_id);
```

### Step 7: Test Implementation

Create test cases for:

1. **Successful Deletion (200)**
   - Valid flashcard ID belonging to user
   - Verify flashcard and reviews are deleted
   - Verify correct response message

2. **Invalid UUID Format (400)**
   - Malformed UUID string
   - Empty string
   - Non-UUID string

3. **Unauthorized Access (401)**
   - No Authorization header
   - Invalid Bearer token
   - Expired token

4. **Not Found (404)**
   - Non-existent flashcard ID
   - Flashcard belonging to different user
   - Already deleted flashcard (idempotency)

5. **Error Handling (500)**
   - Database connection failure
   - Unexpected errors

### Step 8: Integration Testing

1. Test with real Supabase instance
2. Verify CASCADE deletion of reviews
3. Test concurrent deletion attempts
4. Verify RLS policies are enforced
5. Monitor query performance

### Step 9: Documentation

1. Update API documentation with endpoint details
2. Add JSDoc comments to service functions
3. Document error codes and responses
4. Add examples to developer guide

### Step 10: Deployment Checklist

- [ ] Service layer implemented and tested
- [ ] API route handler created with proper error handling
- [ ] Type definitions verified
- [ ] Middleware authentication working
- [ ] Database indexes created
- [ ] RLS policies verified
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] API documentation updated
- [ ] Code reviewed and approved
- [ ] Monitoring alerts configured (if applicable)

## 10. Testing Checklist

### Manual Testing

```bash
# Test successful deletion
curl -X DELETE https://api.example.com/api/flashcards/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 OK
# { "message": "Flashcard deleted successfully" }

# Test invalid UUID
curl -X DELETE https://api.example.com/api/flashcards/invalid-uuid \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Expected: 400 Bad Request
# { "error": "Invalid flashcard ID format" }

# Test unauthorized access
curl -X DELETE https://api.example.com/api/flashcards/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json"

# Expected: 401 Unauthorized
# { "error": "Unauthorized" }

# Test not found
curl -X DELETE https://api.example.com/api/flashcards/550e8400-e29b-41d4-a716-446655440999 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Expected: 404 Not Found
# { "error": "Flashcard not found" }
```

### Automated Testing

Create test file: `src/tests/api/flashcards/delete.test.ts`

Test scenarios:
- Successful deletion with cleanup verification
- Validation errors
- Authentication failures
- Authorization failures (IDOR attempts)
- Idempotency (deleting already deleted flashcard)
- CASCADE deletion verification (reviews deleted)

## 11. Monitoring and Observability

### Metrics to Track

1. **Request Metrics**
   - Total DELETE requests per minute
   - Success rate (200 responses)
   - Error rate by status code

2. **Performance Metrics**
   - Average response time
   - P95 response time
   - Database query duration

3. **Security Metrics**
   - Failed authentication attempts (401)
   - IDOR attempts (404 on ownership check)
   - Invalid UUID attempts (400)

### Logging Examples

```typescript
// Successful deletion
console.info("Flashcard deleted", {
  flashcardId: params.id,
  userId: user.id,
  timestamp: new Date().toISOString(),
});

// IDOR attempt
console.warn("Unauthorized flashcard deletion attempt", {
  flashcardId: params.id,
  userId: user.id,
  timestamp: new Date().toISOString(),
});

// Database error
console.error("Database error during flashcard deletion", {
  error: error.message,
  flashcardId: params.id,
  userId: user.id,
  timestamp: new Date().toISOString(),
});
```

### Alerts

Configure alerts for:
- Error rate > 5% over 5-minute window
- Response time P95 > 500ms
- Authentication failure rate > 10%
- Unusual deletion volume (potential abuse)
