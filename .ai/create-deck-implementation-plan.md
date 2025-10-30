# API Endpoint Implementation Plan: Create Deck

## 1. Endpoint Overview

This endpoint creates a new flashcard deck for an authenticated user. Each deck serves as a container for organizing flashcards by topic or subject. The endpoint enforces unique deck names per user and returns the newly created deck with initial statistics (0 flashcards, 0 cards due).

**Key Features:**

- Creates a deck owned by the authenticated user
- Validates deck name (1-255 characters, non-empty, no whitespace-only)
- Enforces unique deck names per user via database constraint
- Returns deck with computed statistics
- Proper error handling for validation, conflicts, and authentication

## 2. Request Details

- **HTTP Method:** `POST`
- **URL Structure:** `/api/decks`
- **Authentication:** Required (Bearer token via Supabase Auth)
- **Content-Type:** `application/json`

### Parameters

**Required:**

- `name` (string): Deck name
  - Minimum length: 1 character
  - Maximum length: 255 characters
  - Cannot be empty or whitespace-only
  - Must satisfy database constraint: `trim(name) != ''`

**Optional:**

- None

### Request Body

```typescript
{
  "name": "string"
}
```

**Example:**

```json
{
  "name": "Spanish Vocabulary"
}
```

## 3. Used Types

### Request Type

```typescript
// Already defined in src/types.ts (line 30-32)
type CreateDeckCommand = {
  name: string;
};
```

### Response Type

```typescript
// Already defined in src/types.ts (line 20-24)
type DeckDTO = Omit<DeckRow, "user_id"> & {
  total_flashcards: number;
  cards_due: number;
  next_review_date?: string | null;
};
```

This expands to:

```typescript
{
  id: string                    // UUID
  name: string                  // Deck name
  created_at: string            // ISO timestamp
  updated_at: string            // ISO timestamp
  total_flashcards: number      // Count of flashcards in deck
  cards_due: number             // Count of flashcards due for review
  next_review_date?: string | null  // Next scheduled review date
}
```

### Validation Schema

```typescript
// To be created in API route
const createDeckSchema = z.object({
  name: z
    .string()
    .min(1, "Deck name is required")
    .max(255, "Deck name must not exceed 255 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Deck name cannot be empty or whitespace-only",
    }),
});
```

## 4. Response Details

### Success Response (201 Created)

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Spanish Vocabulary",
  "created_at": "2025-10-30T10:30:00.000Z",
  "updated_at": "2025-10-30T10:30:00.000Z",
  "total_flashcards": 0,
  "cards_due": 0,
  "next_review_date": null
}
```

### Error Responses

**401 Unauthorized**

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**400 Bad Request**

```json
{
  "error": "Bad Request",
  "message": "Deck name cannot be empty or whitespace-only"
}
```

**409 Conflict**

```json
{
  "error": "Conflict",
  "message": "A deck with this name already exists"
}
```

**422 Unprocessable Entity**

```json
{
  "error": "Validation Error",
  "message": "Deck name must not exceed 255 characters",
  "details": [...]
}
```

**500 Internal Server Error**

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## 5. Data Flow

```
1. Client Request
   ↓
2. Astro Middleware (inject Supabase client into context.locals)
   ↓
3. API Route Handler (/src/pages/api/decks/index.ts)
   ├─ Extract request body
   ├─ Authenticate user (context.locals.supabase.auth.getUser())
   ├─ Validate input (Zod schema)
   └─ Call DeckService.createDeck(userId, command)
   ↓
4. DeckService (/src/lib/services/deck.service.ts)
   ├─ Insert deck into database (user_id, name, timestamps)
   ├─ Handle unique constraint violation (409)
   ├─ Compute statistics:
   │  ├─ total_flashcards = 0 (new deck)
   │  ├─ cards_due = 0 (new deck)
   │  └─ next_review_date = null (new deck)
   └─ Return DeckDTO
   ↓
5. API Route Handler
   ├─ Return 201 Created with DeckDTO
   └─ Handle errors with appropriate status codes
```

### Database Interaction

```sql
-- Insert operation (via Supabase client)
INSERT INTO decks (user_id, name, created_at, updated_at)
VALUES ($1, $2, now(), now())
RETURNING id, name, created_at, updated_at;

-- Note: Database enforces constraints
-- - unique (user_id, name)
-- - check (trim(name) != '')
```

### Service Layer Responsibilities

The `DeckService` should:

1. Accept Supabase client, user_id, and CreateDeckCommand
2. Insert deck record using Supabase client
3. Handle database errors (unique constraint, check constraint)
4. Compute statistics (for new decks: all zeros/nulls)
5. Map database row to DeckDTO (excluding user_id)
6. Return typed DeckDTO

## 6. Security Considerations

### Authentication

- **Requirement:** Valid Supabase session required
- **Implementation:** Call `context.locals.supabase.auth.getUser()`
- **Error:** Return 401 if user is null or session invalid
- **Token Source:** Bearer token from Authorization header

### Authorization

- **User Isolation:** Always use authenticated user's ID from session
- **Never Trust Client:** Never accept user_id from request body
- **Row Level Security:** Supabase RLS policies enforce user-based access

### Input Validation

- **Sanitization:** Validate name with Zod before database interaction
- **XSS Prevention:** Validate length and content constraints
- **SQL Injection:** Mitigated by Supabase parameterized queries
- **Whitespace Handling:** Reject whitespace-only names per spec

### Database Constraints

- **Unique Constraint:** `(user_id, name)` prevents duplicate deck names
- **Check Constraint:** `trim(name) != ''` enforces non-empty names
- **Foreign Key:** `user_id` references `auth.users(id)` with CASCADE

### Additional Security Measures

- **Rate Limiting:** Consider implementing to prevent abuse
- **Input Size Limits:** Enforced by 255 character maximum
- **Content Validation:** Ensure name contains valid characters
- **CORS:** Configure appropriately for production

## 7. Error Handling

### Error Scenarios and Status Codes

| Scenario                | Status Code | Error Type            | Message                                        |
| ----------------------- | ----------- | --------------------- | ---------------------------------------------- |
| No authentication token | 401         | Unauthorized          | "Authentication required"                      |
| Invalid/expired token   | 401         | Unauthorized          | "Invalid or expired authentication token"      |
| Missing name field      | 400         | Bad Request           | "Deck name is required"                        |
| Empty name (after trim) | 400         | Bad Request           | "Deck name cannot be empty or whitespace-only" |
| Name too long (>255)    | 422         | Validation Error      | "Deck name must not exceed 255 characters"     |
| Duplicate deck name     | 409         | Conflict              | "A deck with this name already exists"         |
| Database error          | 500         | Internal Server Error | "An unexpected error occurred"                 |
| Unexpected error        | 500         | Internal Server Error | "An unexpected error occurred"                 |

### Error Handling Strategy

**1. Authentication Errors (401)**

```typescript
const {
  data: { user },
  error,
} = await context.locals.supabase.auth.getUser();

if (error || !user) {
  return new Response(
    JSON.stringify({
      error: "Unauthorized",
      message: "Authentication required",
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

**2. Validation Errors (400, 422)**

```typescript
const result = createDeckSchema.safeParse(body);

if (!result.success) {
  return new Response(
    JSON.stringify({
      error: "Validation Error",
      message: result.error.errors[0].message,
      details: result.error.errors,
    }),
    { status: 422, headers: { "Content-Type": "application/json" } }
  );
}
```

**3. Conflict Errors (409)**

```typescript
// In service layer, catch Supabase error
if (error?.code === '23505') { // Unique constraint violation
  throw new Error('DECK_NAME_EXISTS')
}

// In API route
catch (error) {
  if (error.message === 'DECK_NAME_EXISTS') {
    return new Response(
      JSON.stringify({
        error: 'Conflict',
        message: 'A deck with this name already exists'
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

**4. Server Errors (500)**

```typescript
catch (error) {
  console.error('Error creating deck:', error)

  return new Response(
    JSON.stringify({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}
```

### Error Handling Best Practices

- Handle errors early (guard clauses, early returns)
- Avoid deep nesting with if-else chains
- Log server errors for debugging (not client errors)
- Never expose sensitive information in error messages
- Use specific error messages for client-side issues
- Use generic messages for server-side issues

## 8. Performance Considerations

### Potential Bottlenecks

- **Database Round-trips:** Single INSERT operation is efficient
- **Statistics Computation:** For new decks, hardcode zeros (no query needed)
- **Authentication:** Session validation adds minimal overhead
- **Validation:** Zod validation is fast for simple schemas

### Optimization Strategies

**1. Minimize Database Queries**

- New decks always have 0 flashcards → no count query needed
- Use `RETURNING` clause to get created deck in same query
- Avoid separate SELECT after INSERT

**2. Efficient Data Mapping**

```typescript
// Good: Compute stats without queries for new decks
const deckDTO: DeckDTO = {
  id: deck.id,
  name: deck.name,
  created_at: deck.created_at,
  updated_at: deck.updated_at,
  total_flashcards: 0,
  cards_due: 0,
  next_review_date: null,
};
```

**3. Connection Pooling**

- Supabase client handles connection pooling automatically
- No manual connection management needed

**4. Caching Considerations**

- Deck creation is a write operation → no caching applicable
- Consider caching deck lists after implementation

### Scalability

- **Indexing:** Database already has indexes on primary key and unique constraint
- **Rate Limiting:** Implement to prevent abuse and ensure fair usage
- **Monitoring:** Track creation frequency per user for anomaly detection

## 9. Implementation Steps

### Step 1: Create Validation Schema

**File:** `src/pages/api/decks/index.ts`

```typescript
import { z } from "zod";
import type { CreateDeckCommand, DeckDTO } from "@/types";

const createDeckSchema = z.object({
  name: z
    .string()
    .min(1, "Deck name is required")
    .max(255, "Deck name must not exceed 255 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Deck name cannot be empty or whitespace-only",
    }),
});
```

### Step 2: Create Deck Service

**File:** `src/lib/services/deck.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateDeckCommand, DeckDTO } from "@/types";

export class DeckService {
  constructor(private supabase: SupabaseClient) {}

  async createDeck(userId: string, command: CreateDeckCommand): Promise<DeckDTO> {
    // Insert deck
    const { data: deck, error } = await this.supabase
      .from("decks")
      .insert({
        user_id: userId,
        name: command.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, name, created_at, updated_at")
      .single();

    // Handle unique constraint violation
    if (error?.code === "23505") {
      throw new Error("DECK_NAME_EXISTS");
    }

    // Handle check constraint violation
    if (error?.code === "23514") {
      throw new Error("INVALID_DECK_NAME");
    }

    if (error) {
      throw error;
    }

    // Return DTO with computed stats (all zeros for new deck)
    return {
      id: deck.id,
      name: deck.name,
      created_at: deck.created_at,
      updated_at: deck.updated_at,
      total_flashcards: 0,
      cards_due: 0,
      next_review_date: null,
    };
  }
}
```

### Step 3: Create API Route Handler

**File:** `src/pages/api/decks/index.ts`

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import type { CreateDeckCommand } from "@/types";
import { DeckService } from "@/lib/services/deck.service";

export const prerender = false;

const createDeckSchema = z.object({
  name: z
    .string()
    .min(1, "Deck name is required")
    .max(255, "Deck name must not exceed 255 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Deck name cannot be empty or whitespace-only",
    }),
});

export const POST: APIRoute = async (context) => {
  try {
    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await context.locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Parse and validate request body
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid JSON in request body",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = createDeckSchema.safeParse(body);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: result.error.errors[0].message,
          details: result.error.errors,
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Create deck via service
    const command: CreateDeckCommand = result.data;
    const deckService = new DeckService(context.locals.supabase);
    const deck = await deckService.createDeck(user.id, command);

    // 4. Return created deck
    return new Response(JSON.stringify(deck), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === "DECK_NAME_EXISTS") {
        return new Response(
          JSON.stringify({
            error: "Conflict",
            message: "A deck with this name already exists",
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }

      if (error.message === "INVALID_DECK_NAME") {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Deck name cannot be empty or whitespace-only",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Log unexpected errors
    console.error("Error creating deck:", error);

    // Return generic error
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

### Step 4: Test Authentication

- Test without Bearer token → expect 401
- Test with invalid/expired token → expect 401
- Test with valid token → proceed to next tests

### Step 5: Test Input Validation

- Test with missing name → expect 422
- Test with empty string → expect 422
- Test with whitespace-only name → expect 422
- Test with name > 255 characters → expect 422
- Test with valid name → expect 201

### Step 6: Test Business Logic

- Test creating first deck → expect 201 with stats
- Test creating duplicate deck name → expect 409
- Test creating deck with different name → expect 201
- Verify returned deck has correct structure (DeckDTO)
- Verify total_flashcards = 0, cards_due = 0

### Step 7: Test Error Handling

- Test malformed JSON → expect 400
- Test database connection failure → expect 500
- Test unexpected errors → expect 500
- Verify error messages are user-friendly

### Step 8: Integration Testing

- Test full flow: auth → validation → creation → response
- Verify database record created correctly
- Verify timestamps are set
- Verify user_id is from session, not request

### Step 9: Documentation

- Add JSDoc comments to service methods
- Document error codes in API documentation
- Update OpenAPI/Swagger spec if applicable
- Add usage examples

### Step 10: Code Review Checklist

- [ ] Authentication properly implemented
- [ ] Input validation covers all edge cases
- [ ] Error handling is comprehensive
- [ ] No SQL injection vulnerabilities
- [ ] No sensitive data in error messages
- [ ] Service layer properly separated from route
- [ ] TypeScript types are correct
- [ ] Code follows project conventions (CLAUDE.md)
- [ ] Early returns for error conditions
- [ ] Happy path is last in functions
- [ ] No unnecessary else statements
- [ ] Console logging only for server errors
