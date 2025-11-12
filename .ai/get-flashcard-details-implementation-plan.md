# API Endpoint Implementation Plan: Get Flashcard Details

## 1. Endpoint Overview

This endpoint retrieves detailed information about a specific flashcard by its UUID. It returns all flashcard data including content (front/back), spaced repetition metadata, and timestamps. The endpoint enforces user ownership through authentication and Row Level Security (RLS) policies.

**Purpose:** Allow authenticated users to fetch complete details of a single flashcard they own.

## 2. Request Details

- **HTTP Method:** `GET`
- **URL Structure:** `/api/flashcards/:id`
- **Parameters:**
  - **Required:**
    - `id` (path parameter) - UUID of the flashcard to retrieve
  - **Optional:** None
- **Request Headers:**
  - `Authorization: Bearer <JWT_TOKEN>` (required)
- **Request Body:** None

## 3. Used Types

### Response DTO

```typescript
// Already defined in src/types.ts
export type FlashcardDTO = Omit<FlashcardRow, "user_id">;
```

This DTO includes:
- `id` - Flashcard UUID
- `deck_id` - Parent deck UUID
- `front` - Front text content
- `back` - Back text content
- `is_ai_generated` - Whether flashcard was AI-generated
- `next_review_date` - Next scheduled review date
- `ease_factor` - Spaced repetition ease factor
- `interval_days` - Current review interval
- `repetitions` - Number of successful reviews
- `created_at` - Creation timestamp
- `updated_at` - Last modification timestamp

### Validation Schema

```typescript
// To be defined in the route handler
const GetFlashcardParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid flashcard ID format" }),
});
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "deck_id": "550e8400-e29b-41d4-a716-446655440001",
  "front": "What is spaced repetition?",
  "back": "A learning technique that incorporates increasing intervals of time between subsequent review of previously learned material.",
  "is_ai_generated": true,
  "next_review_date": "2025-11-15",
  "ease_factor": 2.5,
  "interval_days": 3,
  "repetitions": 2,
  "created_at": "2025-11-10T10:30:00Z",
  "updated_at": "2025-11-12T14:20:00Z"
}
```

### Error Responses

| Status Code | Scenario | Response Body |
|-------------|----------|---------------|
| 400 | Invalid UUID format | `{ "error": "Invalid flashcard ID format" }` |
| 401 | Missing or invalid JWT | `{ "error": "Unauthorized" }` |
| 404 | Flashcard not found or not owned by user | `{ "error": "Flashcard not found" }` |
| 500 | Database or server error | `{ "error": "Internal server error" }` |

## 5. Data Flow

1. **Request Reception:**
   - Astro API route receives GET request to `/api/flashcards/:id`
   - Middleware extracts JWT from Authorization header
   - Middleware initializes Supabase client with user context

2. **Parameter Validation:**
   - Extract `id` from path parameters
   - Validate `id` is a valid UUID using Zod schema
   - Early return with 400 if validation fails

3. **Authentication Check:**
   - Verify user session exists via Supabase client
   - Early return with 401 if unauthorized

4. **Service Layer Query:**
   - Call `flashcardService.getFlashcardById(supabase, id)`
   - Service executes: `supabase.from('flashcards').select('*').eq('id', id).single()`
   - RLS policy automatically filters for `user_id = auth.uid()`

5. **Data Processing:**
   - If no data returned, return 404
   - Remove `user_id` field from response (using FlashcardDTO type)
   - Return 200 with flashcard data

6. **Error Handling:**
   - Catch and log any database errors
   - Return 500 for unexpected errors
   - Never expose internal error details to client

## 6. Security Considerations

### Authentication
- **JWT Validation:** Supabase middleware validates Bearer token
- **Session Management:** Token must be active and not expired
- **Error Messages:** Generic "Unauthorized" message prevents information leakage

### Authorization
- **Row Level Security (RLS):** Postgres RLS policies ensure users can only access their own flashcards
- **Double-Check Pattern:** Although RLS handles authorization, the service should verify ownership
- **404 for Unauthorized:** Return 404 instead of 403 to prevent flashcard ID enumeration

### Input Validation
- **UUID Format:** Validate UUID format before database query to prevent malformed queries
- **Sanitization:** Supabase client handles parameterization; no SQL injection risk
- **Type Safety:** TypeScript + Zod ensures type correctness

### Data Protection
- **user_id Exclusion:** Never expose user_id in API responses
- **HTTPS Only:** All API traffic should use HTTPS (enforced at deployment level)
- **Rate Limiting:** Consider implementing rate limiting for flashcard endpoints (future enhancement)

## 7. Error Handling

### Validation Errors (400)
```typescript
// Early return pattern
if (!validation.success) {
  return new Response(
    JSON.stringify({ error: validation.error.errors[0].message }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

### Authentication Errors (401)
```typescript
// Check user session
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

### Not Found Errors (404)
```typescript
// Flashcard doesn't exist or user doesn't own it
if (!flashcard) {
  return new Response(
    JSON.stringify({ error: "Flashcard not found" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}
```

### Server Errors (500)
```typescript
// Catch unexpected errors
try {
  // ... main logic
} catch (error) {
  console.error("Error fetching flashcard:", error);
  return new Response(
    JSON.stringify({ error: "Internal server error" }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### Error Logging Strategy
- Log all 500 errors with full stack traces using `console.error`
- Log validation failures with the invalid input (but not for production)
- Never log sensitive data (JWT tokens, user IDs)
- Include request context (flashcard ID, user ID) for debugging

## 8. Performance Considerations

### Database Optimization
- **Single Query:** Uses `.single()` to fetch only one row
- **Index Usage:** Query by primary key `id` uses index automatically
- **RLS Performance:** RLS policy adds `user_id` filter, which is indexed
- **Field Selection:** Select only needed fields (currently `*`, but can be optimized)

### Response Time Targets
- **Expected:** < 100ms for typical request
- **Maximum Acceptable:** < 500ms

### Caching Strategy
- **No Caching Initially:** Flashcard data can change frequently due to reviews
- **Future Enhancement:** Consider short-lived cache (5-10 seconds) for frequently accessed flashcards
- **Cache Headers:** Set `Cache-Control: no-cache` to prevent stale data

### Connection Pooling
- Supabase client handles connection pooling automatically
- No additional configuration needed

## 9. Implementation Steps

### Step 1: Create Flashcard Service (if not exists)
Create or update `src/lib/services/flashcard.service.ts`:

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { FlashcardDTO } from "@/types";

export const flashcardService = {
  /**
   * Get a single flashcard by ID
   * RLS automatically filters by user_id
   */
  async getFlashcardById(
    supabase: SupabaseClient,
    id: string
  ): Promise<FlashcardDTO | null> {
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Database error fetching flashcard:", error);
      throw new Error("Failed to fetch flashcard");
    }

    if (!data) {
      return null;
    }

    // Omit user_id from response
    const { user_id, ...flashcard } = data;
    return flashcard as FlashcardDTO;
  },
};
```

### Step 2: Create API Route Handler
Create `src/pages/api/flashcards/[id].ts`:

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { flashcardService } from "@/lib/services/flashcard.service";

export const prerender = false;

// Validation schema
const GetFlashcardParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid flashcard ID format" }),
});

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Validate path parameter
    const validation = GetFlashcardParamsSchema.safeParse(params);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: validation.error.errors[0].message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { id } = validation.data;

    // Step 2: Check authentication
    const supabase = locals.supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 3: Fetch flashcard via service
    const flashcard = await flashcardService.getFlashcardById(supabase, id);

    // Step 4: Handle not found
    if (!flashcard) {
      return new Response(
        JSON.stringify({ error: "Flashcard not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 5: Return success response
    return new Response(JSON.stringify(flashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 6: Handle unexpected errors
    console.error("Error in GET /api/flashcards/:id:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

### Step 3: Verify RLS Policies
Ensure the following RLS policy exists on the `flashcards` table (should already exist):

```sql
-- Policy for selecting flashcards
create policy "Users can select their own flashcards"
  on flashcards
  for select
  to authenticated
  using (user_id = auth.uid());
```

### Step 4: Add Integration Tests
Create test file `tests/api/flashcards/get-flashcard.test.ts`:

```typescript
// Test cases:
// 1. Successfully retrieve own flashcard
// 2. Return 404 for non-existent flashcard
// 3. Return 404 when trying to access another user's flashcard
// 4. Return 400 for invalid UUID format
// 5. Return 401 for unauthenticated request
```

### Step 5: Test Manually
```bash
# Valid request
curl -X GET http://localhost:3000/api/flashcards/<valid-uuid> \
  -H "Authorization: Bearer <valid-jwt-token>"

# Invalid UUID
curl -X GET http://localhost:3000/api/flashcards/invalid-uuid \
  -H "Authorization: Bearer <valid-jwt-token>"

# No auth token
curl -X GET http://localhost:3000/api/flashcards/<valid-uuid>
```

### Step 6: Update API Documentation
Update project API documentation to include this endpoint with:
- Request/response examples
- Authentication requirements
- Error codes and meanings
- Rate limiting information (if applicable)

### Step 7: Code Review Checklist
- [ ] Input validation using Zod
- [ ] Proper error handling with early returns
- [ ] Authentication check implemented
- [ ] Service layer extracts business logic
- [ ] Correct HTTP status codes used
- [ ] No sensitive data in responses
- [ ] TypeScript types correctly applied
- [ ] ESLint passes with no warnings
- [ ] Error logging implemented
- [ ] Manual testing completed
- [ ] Integration tests added
