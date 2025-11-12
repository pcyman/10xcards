# API Endpoint Implementation Plan: Delete Deck

## 1. Endpoint Overview

This endpoint permanently deletes a deck and all its associated flashcards and review history. The deletion is authenticated and user-scoped, ensuring users can only delete their own decks. The database CASCADE constraints automatically handle the deletion of related flashcards and reviews when a deck is deleted.

**Key Features:**
- Permanent deletion with cascade to flashcards and reviews
- Authentication required via Bearer token
- Returns count of deleted flashcards for user feedback
- Ownership verification to prevent unauthorized deletions

## 2. Request Details

- **HTTP Method:** `DELETE`
- **URL Structure:** `/api/decks/:id`
- **Authentication:** Required (Bearer token in Authorization header)

### Parameters:

**Required:**
- `:id` (path parameter) - UUID of the deck to delete

**Optional:**
- None

### Request Headers:
```
Authorization: Bearer <jwt_token>
```

### Request Body:
None (DELETE operations do not have request bodies)

## 3. Used Types

### Response DTO (already exists in `src/types.ts`):

```typescript
/**
 * Response DTO for deck deletion
 * Used in: DELETE /api/decks/:id
 */
export interface DeleteDeckResponseDTO {
  message: string;
  deleted_flashcards: number;
}
```

### Validation Schema (to be created):

```typescript
import { z } from 'zod';

const deleteDeckParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid deck ID format' })
});
```

### Service Return Type:

```typescript
type DeleteDeckResult = {
  deleted_flashcards: number;
};
```

## 4. Response Details

### Success Response (200 OK):
```json
{
  "message": "Deck deleted successfully",
  "deleted_flashcards": 42
}
```

### Error Responses:

**400 Bad Request:**
```json
{
  "error": "Invalid deck ID format"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "error": "Deck not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

## 5. Data Flow

### Request Flow:
1. **Request arrives** at `/api/decks/:id` with DELETE method
2. **Middleware executes:**
   - Supabase client initialization
   - JWT token extraction from Authorization header
   - User authentication verification
3. **Route handler executes:**
   - Extract and validate `:id` parameter (UUID format)
   - Call service layer with `userId` and `deckId`
4. **Service layer executes:**
   - Count flashcards associated with the deck
   - Verify deck exists and belongs to authenticated user
   - Delete deck from database (CASCADE deletes flashcards and reviews)
   - Return flashcard count
5. **Route handler responds:**
   - Format success response with message and count
   - Return 200 OK status

### Database Interactions:

**Query 1: Count flashcards**
```sql
SELECT COUNT(*) as count
FROM flashcards
WHERE deck_id = $1 AND user_id = $2
```

**Query 2: Delete deck (with ownership verification)**
```sql
DELETE FROM decks
WHERE id = $1 AND user_id = $2
RETURNING id
```

**Cascade Effect:**
- `flashcards` table: All flashcards with matching `deck_id` are automatically deleted
- `reviews` table: All reviews for those flashcards are automatically deleted

### Supabase Client Usage:
```typescript
// Count flashcards
const { count } = await supabase
  .from('flashcards')
  .select('*', { count: 'exact', head: true })
  .eq('deck_id', deckId)
  .eq('user_id', userId);

// Delete deck with ownership check
const { data, error } = await supabase
  .from('decks')
  .delete()
  .eq('id', deckId)
  .eq('user_id', userId)
  .select('id')
  .single();
```

## 6. Security Considerations

### Authentication:
- **Bearer Token Required:** JWT token must be present in Authorization header
- **Token Validation:** Middleware validates token and extracts user ID
- **User Context:** Authenticated user ID is used for all database queries

### Authorization:
- **Ownership Verification:** Deck deletion query includes `user_id = $userId` condition
- **IDOR Prevention:** Users cannot delete decks they don't own
- **RLS (Row Level Security):** Supabase RLS policies provide additional layer of security

### Input Validation:
- **UUID Validation:** Validate `:id` parameter is valid UUID format using Zod
- **SQL Injection Prevention:** Supabase client uses parameterized queries
- **Type Safety:** TypeScript ensures type correctness throughout the flow

### Security Best Practices:
1. Never expose detailed error messages that reveal database structure
2. Log unauthorized access attempts for security monitoring
3. Use database transactions if additional operations are needed
4. Verify user existence before processing deletion
5. Return 404 for both non-existent and unauthorized decks (prevent enumeration)

## 7. Error Handling

### Error Scenarios and Responses:

| Scenario | Status Code | Response | Action |
|----------|-------------|----------|--------|
| Missing Authorization header | 401 | `{ "error": "Unauthorized" }` | Handled by middleware |
| Invalid/expired JWT token | 401 | `{ "error": "Unauthorized" }` | Handled by middleware |
| Invalid UUID format | 400 | `{ "error": "Invalid deck ID format" }` | Validation error |
| Deck doesn't exist | 404 | `{ "error": "Deck not found" }` | Service layer check |
| Deck belongs to different user | 404 | `{ "error": "Deck not found" }` | Ownership verification |
| Database connection error | 500 | `{ "error": "Internal server error" }` | Log and return generic error |
| Unexpected database error | 500 | `{ "error": "Internal server error" }` | Log and return generic error |

### Error Handling Pattern:

```typescript
// Early validation
const validation = deleteDeckParamsSchema.safeParse(params);
if (!validation.success) {
  return new Response(JSON.stringify({ error: 'Invalid deck ID format' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Service call with error handling
try {
  const result = await deckService.deleteDeck(userId, deckId);

  if (!result) {
    return new Response(JSON.stringify({ error: 'Deck not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Success response
  return new Response(JSON.stringify({
    message: 'Deck deleted successfully',
    deleted_flashcards: result.deleted_flashcards
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

} catch (error) {
  console.error('Error deleting deck:', error);
  return new Response(JSON.stringify({ error: 'Internal server error' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Logging Strategy:
- **Error Level:** Log 500 errors with full stack trace
- **Warning Level:** Log 401 unauthorized attempts (security monitoring)
- **Info Level:** Log 404 errors (attempted access to non-existent resources)
- **Optional:** Log successful deletions for audit trail

## 8. Performance Considerations

### Database Performance:
- **Cascade Delete:** Efficient due to foreign key CASCADE constraints
- **Index Usage:** Deletion uses primary key (id) and indexed user_id
- **Transaction Safety:** Single DELETE query is atomic

### Potential Bottlenecks:
- **Large Decks:** Decks with thousands of flashcards may take longer to delete
- **Review History:** Each flashcard may have many review records

### Optimization Strategies:
1. **Database Indexes:** Ensure indexes on foreign keys (deck_id, flashcard_id)
2. **Connection Pooling:** Use Supabase connection pooling
3. **Async Operations:** Use async/await properly to prevent blocking
4. **Timeout Handling:** Consider query timeout for very large deletions

### Scalability:
- Current implementation is suitable for typical use cases
- For very large decks (10,000+ flashcards), consider:
  - Background job processing
  - Progress notifications
  - Soft delete with background cleanup

## 9. Implementation Steps

### Step 1: Create Validation Schema
**File:** `src/lib/validation/deck.validation.ts` (or inline in route)

```typescript
import { z } from 'zod';

export const deleteDeckParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid deck ID format' })
});
```

### Step 2: Create or Update Deck Service
**File:** `src/lib/services/deck.service.ts`

```typescript
import type { SupabaseClient } from '@/db/supabase.client';

export class DeckService {
  constructor(private supabase: SupabaseClient) {}

  async deleteDeck(userId: string, deckId: string): Promise<{ deleted_flashcards: number } | null> {
    // Count flashcards before deletion
    const { count } = await this.supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('deck_id', deckId)
      .eq('user_id', userId);

    // Delete deck with ownership verification
    const { data, error } = await this.supabase
      .from('decks')
      .delete()
      .eq('id', deckId)
      .eq('user_id', userId)
      .select('id')
      .single();

    if (error || !data) {
      return null; // Deck not found or doesn't belong to user
    }

    return {
      deleted_flashcards: count ?? 0
    };
  }
}
```

### Step 3: Create API Route Handler
**File:** `src/pages/api/decks/[id].ts`

```typescript
import type { APIRoute } from 'astro';
import { deleteDeckParamsSchema } from '@/lib/validation/deck.validation';
import { DeckService } from '@/lib/services/deck.service';
import type { DeleteDeckResponseDTO } from '@/types';

export const prerender = false;

export const DELETE: APIRoute = async ({ params, locals }) => {
  // Step 1: Check authentication
  const { supabase, user } = locals;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Step 2: Validate deck ID parameter
  const validation = deleteDeckParamsSchema.safeParse(params);

  if (!validation.success) {
    return new Response(JSON.stringify({
      error: 'Invalid deck ID format'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id: deckId } = validation.data;

  // Step 3: Delete deck via service
  try {
    const deckService = new DeckService(supabase);
    const result = await deckService.deleteDeck(user.id, deckId);

    if (!result) {
      return new Response(JSON.stringify({
        error: 'Deck not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Step 4: Return success response
    const response: DeleteDeckResponseDTO = {
      message: 'Deck deleted successfully',
      deleted_flashcards: result.deleted_flashcards
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting deck:', error);

    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

### Step 4: Update Middleware (if needed)
**File:** `src/middleware/index.ts`

Ensure middleware:
- Initializes Supabase client
- Extracts and validates JWT token
- Sets `locals.user` and `locals.supabase`

### Step 5: Testing Checklist

**Unit Tests (Service Layer):**
- [ ] Successfully deletes deck and returns flashcard count
- [ ] Returns null when deck doesn't exist
- [ ] Returns null when deck belongs to different user
- [ ] Handles database errors gracefully

**Integration Tests (API Route):**
- [ ] Returns 200 with correct response for valid deletion
- [ ] Returns 401 when not authenticated
- [ ] Returns 400 for invalid UUID format
- [ ] Returns 404 when deck doesn't exist
- [ ] Returns 404 when deck belongs to different user
- [ ] Verifies flashcards and reviews are cascaded deleted

**Security Tests:**
- [ ] Cannot delete another user's deck
- [ ] Cannot delete with expired token
- [ ] Cannot delete without authorization header
- [ ] SQL injection attempts are prevented

**Performance Tests:**
- [ ] Deletion of deck with 100 flashcards completes quickly
- [ ] Deletion of deck with 1000+ flashcards completes within acceptable time

### Step 6: Documentation Updates

- [ ] Update API documentation with endpoint details
- [ ] Add JSDoc comments to service methods
- [ ] Document any edge cases or limitations
- [ ] Update type definitions if needed (already complete)

### Step 7: Deployment Checklist

- [ ] Run linter and fix any issues
- [ ] Run type checker and resolve errors
- [ ] Test endpoint in development environment
- [ ] Test endpoint in staging environment
- [ ] Verify database CASCADE constraints are in place
- [ ] Monitor logs for any errors after deployment
- [ ] Verify authentication flow works correctly

## 10. Additional Considerations

### Future Enhancements:
1. **Soft Delete:** Instead of permanent deletion, mark as deleted with timestamp
2. **Undo Functionality:** Keep deleted decks for 30 days before permanent deletion
3. **Bulk Delete:** Allow deleting multiple decks at once
4. **Background Processing:** For very large decks, use queue system
5. **Audit Trail:** Detailed logging of who deleted what and when

### Monitoring and Metrics:
- Track deletion frequency per user
- Monitor deletion performance (execution time)
- Alert on unusual deletion patterns (security)
- Track cascade deletion row counts

### Compliance:
- GDPR: Ensure user data is completely removed
- Data Retention: Comply with any data retention policies
- Audit Logs: Maintain deletion logs for compliance
