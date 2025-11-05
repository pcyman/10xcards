# REST API Plan - AI Flashcard Learning Platform

## 1. Resources

The API exposes the following main resources:

| Resource       | Database Table | Description                                                      |
| -------------- | -------------- | ---------------------------------------------------------------- |
| **Auth**       | `auth.users`   | User authentication and session management (managed by Supabase) |
| **Decks**      | `decks`        | Flashcard collections organized by topic or subject              |
| **Flashcards** | `flashcards`   | Individual flashcard content with spaced repetition metadata     |
| **Reviews**    | `reviews`      | Study session review records for spaced repetition tracking      |

## 2. Endpoints

### 2.2 Decks

#### List All Decks

- **Method:** `GET`
- **Path:** `/api/decks`
- **Description:** Retrieve all decks for the authenticated user with metadata
- **Authentication:** Required (Bearer token)
- **Query Parameters:**
  - `page` - integer (optional, default: 1)
  - `limit` - integer (optional, default: 20, max: 100)
  - `sort` - string (optional, values: `created_at`, `updated_at`, `name`, default: `created_at`)
  - `order` - string (optional, values: `asc`, `desc`, default: `desc`)
- **Response Payload (Success):**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "total_flashcards": "integer",
      "cards_due": "integer"
    }
  ],
  "pagination": {
    "page": "integer",
    "limit": "integer",
    "total": "integer",
    "total_pages": "integer"
  }
}
```

- **Success Code:** `200 OK`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `400 Bad Request` - Invalid query parameters

#### Get Deck Details

- **Method:** `GET`
- **Path:** `/api/decks/:id`
- **Description:** Retrieve details of a specific deck including statistics
- **Authentication:** Required (Bearer token)
- **Request Payload:** None
- **Response Payload (Success):**

```json
{
  "id": "uuid",
  "name": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "total_flashcards": "integer",
  "cards_due": "integer",
  "next_review_date": "date | null"
}
```

- **Success Code:** `200 OK`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `404 Not Found` - Deck not found or does not belong to user

#### Create Deck

- **Method:** `POST`
- **Path:** `/api/decks`
- **Description:** Create a new flashcard deck
- **Authentication:** Required (Bearer token)
- **Request Payload:**

```json
{
  "name": "string (required, 1-255 characters, cannot be empty or whitespace-only)"
}
```

- **Response Payload (Success):**

```json
{
  "id": "uuid",
  "name": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "total_flashcards": 0,
  "cards_due": 0
}
```

- **Success Code:** `201 Created`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `400 Bad Request` - Invalid input (empty name, whitespace-only)
  - `409 Conflict` - Deck name already exists for this user
  - `422 Unprocessable Entity` - Validation failed

#### Update Deck

- **Method:** `PATCH`
- **Path:** `/api/decks/:id`
- **Description:** Update deck name
- **Authentication:** Required (Bearer token)
- **Request Payload:**

```json
{
  "name": "string (required, 1-255 characters, cannot be empty or whitespace-only)"
}
```

- **Response Payload (Success):**

```json
{
  "id": "uuid",
  "name": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "total_flashcards": "integer",
  "cards_due": "integer"
}
```

- **Success Code:** `200 OK`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `404 Not Found` - Deck not found or does not belong to user
  - `400 Bad Request` - Invalid input (empty name, whitespace-only)
  - `409 Conflict` - New deck name already exists for this user
  - `422 Unprocessable Entity` - Validation failed

#### Delete Deck

- **Method:** `DELETE`
- **Path:** `/api/decks/:id`
- **Description:** Permanently delete a deck and all its flashcards
- **Authentication:** Required (Bearer token)
- **Request Payload:** None
- **Response Payload (Success):**

```json
{
  "message": "Deck deleted successfully",
  "deleted_flashcards": "integer"
}
```

- **Success Code:** `200 OK`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `404 Not Found` - Deck not found or does not belong to user

---

### 2.3 Flashcards

#### List Flashcards in Deck

- **Method:** `GET`
- **Path:** `/api/decks/:deckId/flashcards`
- **Description:** Retrieve all flashcards in a specific deck
- **Authentication:** Required (Bearer token)
- **Query Parameters:**
  - `page` - integer (optional, default: 1)
  - `limit` - integer (optional, default: 50, max: 200)
  - `sort` - string (optional, values: `created_at`, `updated_at`, `next_review_date`, default: `created_at`)
  - `order` - string (optional, values: `asc`, `desc`, default: `desc`)
  - `is_ai_generated` - boolean (optional, filter by creation method)
- **Response Payload (Success):**

```json
{
  "data": [
    {
      "id": "uuid",
      "deck_id": "uuid",
      "front": "string",
      "back": "string",
      "is_ai_generated": "boolean",
      "next_review_date": "date",
      "ease_factor": "decimal",
      "interval_days": "integer",
      "repetitions": "integer",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ],
  "pagination": {
    "page": "integer",
    "limit": "integer",
    "total": "integer",
    "total_pages": "integer"
  }
}
```

- **Success Code:** `200 OK`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `404 Not Found` - Deck not found or does not belong to user
  - `400 Bad Request` - Invalid query parameters

#### Get Flashcard Details

- **Method:** `GET`
- **Path:** `/api/flashcards/:id`
- **Description:** Retrieve details of a specific flashcard
- **Authentication:** Required (Bearer token)
- **Request Payload:** None
- **Response Payload (Success):**

```json
{
  "id": "uuid",
  "deck_id": "uuid",
  "front": "string",
  "back": "string",
  "is_ai_generated": "boolean",
  "next_review_date": "date",
  "ease_factor": "decimal",
  "interval_days": "integer",
  "repetitions": "integer",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

- **Success Code:** `200 OK`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `404 Not Found` - Flashcard not found or does not belong to user

#### Create Flashcard Manually

- **Method:** `POST`
- **Path:** `/api/decks/:deckId/flashcards`
- **Description:** Create a new flashcard manually in a specific deck
- **Authentication:** Required (Bearer token)
- **Request Payload:**

```json
{
  "front": "string (required, plain text, cannot be empty or whitespace-only)",
  "back": "string (required, plain text, cannot be empty or whitespace-only)"
}
```

- **Response Payload (Success):**

```json
{
  "id": "uuid",
  "deck_id": "uuid",
  "front": "string",
  "back": "string",
  "is_ai_generated": false,
  "next_review_date": "date (today)",
  "ease_factor": 2.5,
  "interval_days": 0,
  "repetitions": 0,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

- **Success Code:** `201 Created`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `404 Not Found` - Deck not found or does not belong to user
  - `400 Bad Request` - Invalid input (empty fields, whitespace-only)
  - `422 Unprocessable Entity` - Validation failed

#### Generate Flashcards with AI

- **Method:** `POST`
- **Path:** `/api/decks/:deckId/flashcards/generate`
- **Description:** Generate flashcard candidates from text using AI (minimum 5 candidates)
- **Authentication:** Required (Bearer token)
- **Request Payload:**

```json
{
  "text": "string (required, 1000-10000 characters)"
}
```

- **Response Payload (Success):**

```json
{
  "candidates": [
    {
      "front": "string",
      "back": "string"
    }
  ],
  "total_generated": "integer (minimum 5)"
}
```

- **Success Code:** `200 OK`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `404 Not Found` - Deck not found or does not belong to user
  - `400 Bad Request` - Text length outside 1000-10000 character range
  - `422 Unprocessable Entity` - Validation failed
  - `500 Internal Server Error` - AI generation failed (message: "Generation failed, please try again")
  - `503 Service Unavailable` - AI service temporarily unavailable

#### Accept AI-Generated Flashcards

- **Method:** `POST`
- **Path:** `/api/decks/:deckId/flashcards/batch`
- **Description:** Accept and save selected AI-generated flashcard candidates
- **Authentication:** Required (Bearer token)
- **Request Payload:**

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

- **Response Payload (Success):**

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

- **Success Code:** `201 Created`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `404 Not Found` - Deck not found or does not belong to user
  - `400 Bad Request` - Invalid input (empty array, invalid flashcard data)
  - `422 Unprocessable Entity` - Validation failed

#### Update Flashcard

- **Method:** `PATCH`
- **Path:** `/api/flashcards/:id`
- **Description:** Update flashcard front or back text
- **Authentication:** Required (Bearer token)
- **Request Payload:**

```json
{
  "front": "string (optional, cannot be empty or whitespace-only if provided)",
  "back": "string (optional, cannot be empty or whitespace-only if provided)"
}
```

- **Response Payload (Success):**

```json
{
  "id": "uuid",
  "deck_id": "uuid",
  "front": "string",
  "back": "string",
  "is_ai_generated": "boolean",
  "next_review_date": "date",
  "ease_factor": "decimal",
  "interval_days": "integer",
  "repetitions": "integer",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

- **Success Code:** `200 OK`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `404 Not Found` - Flashcard not found or does not belong to user
  - `400 Bad Request` - Invalid input (empty fields, whitespace-only, no fields provided)
  - `422 Unprocessable Entity` - Validation failed

#### Delete Flashcard

- **Method:** `DELETE`
- **Path:** `/api/flashcards/:id`
- **Description:** Permanently delete a flashcard and all its review history
- **Authentication:** Required (Bearer token)
- **Request Payload:** None
- **Response Payload (Success):**

```json
{
  "message": "Flashcard deleted successfully"
}
```

- **Success Code:** `200 OK`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `404 Not Found` - Flashcard not found or does not belong to user

---

### 2.4 Study Sessions

#### Get Due Flashcards for Study

- **Method:** `GET`
- **Path:** `/api/decks/:deckId/flashcards/due`
- **Description:** Retrieve all flashcards due for review (next_review_date <= today)
- **Authentication:** Required (Bearer token)
- **Query Parameters:**
  - `limit` - integer (optional, default: 50, max: 200, limits cards per session)
- **Response Payload (Success):**

```json
{
  "data": [
    {
      "id": "uuid",
      "deck_id": "uuid",
      "front": "string",
      "back": "string",
      "ease_factor": "decimal",
      "interval_days": "integer",
      "repetitions": "integer"
    }
  ],
  "total_due": "integer"
}
```

- **Success Code:** `200 OK`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `404 Not Found` - Deck not found or does not belong to user

#### Submit Flashcard Review

- **Method:** `POST`
- **Path:** `/api/flashcards/:id/review`
- **Description:** Submit difficulty rating for a flashcard and update spaced repetition schedule
- **Authentication:** Required (Bearer token)
- **Request Payload:**

```json
{
  "difficulty_rating": "integer (required, 0-3)"
}
```

- **Response Payload (Success):**

```json
{
  "flashcard": {
    "id": "uuid",
    "next_review_date": "date",
    "ease_factor": "decimal",
    "interval_days": "integer",
    "repetitions": "integer",
    "updated_at": "timestamp"
  },
  "review": {
    "id": "uuid",
    "reviewed_at": "timestamp",
    "difficulty_rating": "integer",
    "next_review_date": "date"
  }
}
```

- **Success Code:** `200 OK`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `404 Not Found` - Flashcard not found or does not belong to user
  - `400 Bad Request` - Invalid difficulty rating (must be 0-3)
  - `422 Unprocessable Entity` - Validation failed

---

### 2.5 Reviews

#### Get Review History for Flashcard

- **Method:** `GET`
- **Path:** `/api/flashcards/:flashcardId/reviews`
- **Description:** Retrieve review history for a specific flashcard
- **Authentication:** Required (Bearer token)
- **Query Parameters:**
  - `page` - integer (optional, default: 1)
  - `limit` - integer (optional, default: 20, max: 100)
  - `order` - string (optional, values: `asc`, `desc`, default: `desc` - most recent first)
- **Response Payload (Success):**

```json
{
  "data": [
    {
      "id": "uuid",
      "flashcard_id": "uuid",
      "reviewed_at": "timestamp",
      "difficulty_rating": "integer (0-3)",
      "next_review_date": "date"
    }
  ],
  "pagination": {
    "page": "integer",
    "limit": "integer",
    "total": "integer",
    "total_pages": "integer"
  }
}
```

- **Success Code:** `200 OK`
- **Error Codes:**
  - `401 Unauthorized` - Invalid or expired token
  - `404 Not Found` - Flashcard not found or does not belong to user

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

The API uses **Supabase Authentication** with JWT (JSON Web Tokens) following the Bearer token authentication scheme.

#### Implementation Details:

**1. Registration & Login Flow:**

- User provides username (email) and password
- Supabase creates user in `auth.users` table
- Server returns access token and refresh token
- Client stores tokens securely (httpOnly cookies recommended)

**2. Token Usage:**

- All authenticated endpoints require `Authorization` header
- Format: `Authorization: Bearer <access_token>`
- Tokens are validated by Supabase middleware
- Expired tokens return `401 Unauthorized`

**3. Token Refresh:**

- Access tokens expire after a configured period (e.g., 1 hour)
- Refresh tokens used to obtain new access tokens without re-login
- Implemented via Supabase client's automatic token refresh

**4. Session Management:**

- Sessions persist across browser sessions (via refresh token)
- User can manually logout to invalidate session
- Session timeout configured in Supabase settings

### 3.2 Authorization and Data Isolation

**Row Level Security (RLS):**

- All database tables have RLS enabled
- Policies enforce `user_id` matching for all operations
- Supabase automatically filters queries by authenticated user
- No additional authorization logic needed in API layer

**Policy Enforcement:**

- `SELECT`: Users can only read their own data (`auth.uid() = user_id`)
- `INSERT`: Users can only create data with their own `user_id`
- `UPDATE`: Users can only modify their own data
- `DELETE`: Users can only delete their own data

**API-Level Checks:**

- Middleware validates JWT token on every request
- User context extracted from token and passed to database queries
- Invalid tokens or missing authentication return `401 Unauthorized`
- Attempts to access other users' resources return `404 Not Found` (not `403`, to avoid information leakage)

### 3.3 Security Best Practices

**Password Security:**

- Minimum 8 characters required
- Passwords hashed using bcrypt (handled by Supabase)
- Password validation on registration and login

**Input Validation:**

- All inputs validated with Zod schemas before database operations
- XSS protection via Astro framework (auto-escaping)
- SQL injection prevented by Supabase parameterized queries

**Rate Limiting:**

- Implement rate limiting for authentication endpoints (e.g., 5 attempts per minute)
- Rate limiting for AI generation endpoints (e.g., 10 requests per hour)
- Consider implementing global rate limits per user

**CORS Configuration:**

- Configure CORS to allow only trusted origins
- Restrict API access to application domain in production

---

## 4. Validation and Business Logic

### 4.1 Validation Rules by Resource

#### Decks

| Field  | Validation Rules                                                                |
| ------ | ------------------------------------------------------------------------------- |
| `name` | Required, 1-255 characters, cannot be empty or whitespace-only, unique per user |

#### Flashcards

| Field             | Validation Rules                                         |
| ----------------- | -------------------------------------------------------- |
| `front`           | Required, plain text, cannot be empty or whitespace-only |
| `back`            | Required, plain text, cannot be empty or whitespace-only |
| `ease_factor`     | Decimal, default 2.5, must be positive                   |
| `interval_days`   | Integer, default 0, must be non-negative                 |
| `repetitions`     | Integer, default 0, must be non-negative                 |
| `is_ai_generated` | Boolean, default false                                   |

#### Reviews

| Field               | Validation Rules                                       |
| ------------------- | ------------------------------------------------------ |
| `difficulty_rating` | Required, integer, must be between 0 and 3 (inclusive) |
| `reviewed_at`       | Timestamp, auto-generated (now)                        |
| `next_review_date`  | Date, required, calculated by algorithm                |

#### AI Generation

| Field  | Validation Rules                                                  |
| ------ | ----------------------------------------------------------------- |
| `text` | Required, must be between 1,000 and 10,000 characters (inclusive) |

### 4.2 Business Logic Implementation

#### 4.2.1 AI Flashcard Generation

**Endpoint:** `POST /api/decks/:deckId/flashcards/generate`

**Logic:**

1. Validate input text length (1000-10000 characters)
2. Verify deck exists and belongs to authenticated user
3. Send text to AI service (OpenRouter.ai) with flashcard generation prompt
4. Parse AI response to extract minimum 5 flashcard candidates
5. Return candidates for user review (do not save to database)
6. If AI service fails, return error message: "Generation failed, please try again"
7. Do not store original input text in database

**Success Criteria:**

- At least 5 flashcard candidates generated
- Each candidate has non-empty front and back text
- Original text not persisted

#### 4.2.2 Accept AI-Generated Flashcards

**Endpoint:** `POST /api/decks/:deckId/flashcards/batch`

**Logic:**

1. Validate each flashcard in batch (front/back not empty)
2. Verify deck exists and belongs to authenticated user
3. Create flashcards with `is_ai_generated = true`
4. Set default spaced repetition values (ease_factor: 2.5, interval_days: 0, repetitions: 0)
5. Set `next_review_date` to current date (due immediately)
6. Return created flashcards with database-generated UUIDs

**Tracking:**

- `is_ai_generated` flag enables calculation of success metrics
- Acceptance Rate = (Accepted AI Cards / Total Generated) × 100
- Usage Rate = (AI Cards / Total Cards) × 100

#### 4.2.3 Spaced Repetition Algorithm

**Endpoint:** `POST /api/flashcards/:id/review`

**Logic:**

1. Validate difficulty rating (0-3)
2. Retrieve current flashcard state (ease_factor, interval_days, repetitions)
3. Apply spaced repetition algorithm (e.g., SM-2 or FSRS):
   - **Rating 0-1 (Again/Hard):** Reset interval, decrease ease factor
   - **Rating 2 (Good):** Multiply interval by ease factor
   - **Rating 3 (Easy):** Multiply interval by higher factor, increase ease factor
4. Calculate new `next_review_date` = current_date + new_interval_days
5. Update flashcard with new values (ease_factor, interval_days, repetitions++)
6. Create review record in `reviews` table
7. Return updated flashcard and review record

**Algorithm Details:**

- Use open-source spaced repetition library (e.g., ts-fsrs or similar)
- Ease factor range: typically 1.3 to 2.5
- Interval progression: 0 → 1 → 3 → 7 → 14 → 30... (varies by algorithm)

#### 4.2.4 Deck Statistics

**Endpoints:** `GET /api/decks` and `GET /api/decks/:id`

**Logic:**

1. Fetch decks for authenticated user
2. For each deck, calculate:
   - `total_flashcards`: COUNT of flashcards in deck
   - `cards_due`: COUNT of flashcards WHERE next_review_date <= current_date
3. Use SQL aggregation with LEFT JOIN for efficiency:

```sql
SELECT d.*,
       COUNT(f.id) as total_flashcards,
       COUNT(f.id) FILTER (WHERE f.next_review_date <= current_date) as cards_due
FROM decks d
LEFT JOIN flashcards f ON f.deck_id = d.id
WHERE d.user_id = auth.uid()
GROUP BY d.id
```

#### 4.2.5 Due Cards Query

**Endpoint:** `GET /api/decks/:deckId/flashcards/due`

**Logic:**

1. Query flashcards WHERE deck_id = :deckId AND next_review_date <= current_date
2. Order by next_review_date ASC (oldest due cards first)
3. Use partial index `idx_flashcards_due_review` for efficient retrieval
4. Apply limit parameter to control session size
5. Return flashcards in study-ready format (excluding sensitive metadata)

#### 4.2.6 Cascade Deletion

**Endpoints:** `DELETE /api/decks/:id` and `DELETE /api/flashcards/:id`

**Logic:**

- Deck deletion triggers CASCADE DELETE for all flashcards in deck
- Flashcard deletion triggers CASCADE DELETE for all reviews of that flashcard
- Database constraints handle cascade automatically
- API returns count of deleted child records for user feedback

**Confirmation:**

- No undo functionality in MVP (as per PRD)
- Consider implementing soft confirmation on client side
- Return deleted counts in response

### 4.3 Error Handling Patterns

**Validation Errors (400 Bad Request):**

- Return descriptive error messages for each validation failure
- Include field name and specific validation rule violated
- Example: `{ "error": "Validation failed", "details": { "name": "Deck name cannot be empty" } }`

**Not Found Errors (404 Not Found):**

- Return generic message without revealing if resource exists but belongs to another user
- Example: `{ "error": "Resource not found" }`

**Conflict Errors (409 Conflict):**

- Return when unique constraints violated (e.g., duplicate deck name)
- Example: `{ "error": "A deck with this name already exists" }`

**Server Errors (500 Internal Server Error):**

- Log detailed error server-side
- Return generic user-friendly message to client
- Example: `{ "error": "An unexpected error occurred. Please try again." }`

**AI Service Errors (500/503):**

- Return specific message: "Generation failed, please try again"
- Log failure reason server-side for debugging
- No automatic retry in MVP

### 4.4 Performance Optimizations

**Pagination:**

- Default page size: 20-50 items depending on resource
- Maximum page size: 100-200 items to prevent large payloads
- Use cursor-based pagination for better performance on large datasets

**Indexing:**

- Leverage database indexes for common queries:
  - `idx_decks_user_id` for user's decks
  - `idx_flashcards_deck_id` for deck's flashcards
  - `idx_flashcards_due_review` (partial index) for due cards query
  - `idx_reviews_flashcard_reviewed` for review history

**Query Optimization:**

- Use SQL aggregation for statistics instead of multiple queries
- Fetch only necessary fields (avoid SELECT \* in production)
- Use database transactions for batch operations (flashcard acceptance)

---

## 5. Additional Considerations

### 5.1 API Versioning

- Current version: v1 (implicit in URL structure)
- Future versions can use `/api/v2/` prefix if breaking changes needed
- Maintain backward compatibility within same major version

### 5.2 Content Types

- All requests and responses use `Content-Type: application/json`
- Date formats use ISO 8601 (e.g., `2025-01-26T10:30:00Z`)
- UUID format: lowercase, hyphenated (e.g., `550e8400-e29b-41d4-a716-446655440000`)

### 5.3 CORS Headers

```
Access-Control-Allow-Origin: <configured-origin>
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### 5.4 Success Metrics Tracking

While not exposed as API endpoints, the following queries support success metrics:

**AI Flashcard Acceptance Rate:**

```sql
SELECT
  (COUNT(*) FILTER (WHERE is_ai_generated = true)::float /
   NULLIF(COUNT(*), 0)) * 100 as acceptance_rate
FROM flashcards;
```

**AI Generation Usage Rate:**

```sql
SELECT
  COUNT(*) FILTER (WHERE is_ai_generated = true) as ai_generated,
  COUNT(*) FILTER (WHERE is_ai_generated = false) as manual,
  (COUNT(*) FILTER (WHERE is_ai_generated = true)::float /
   NULLIF(COUNT(*), 0)) * 100 as usage_rate
FROM flashcards;
```

### 5.5 Future Enhancements (Post-MVP)

- Search flashcards within deck (`/api/decks/:deckId/flashcards/search?q=...`)
- Export deck to JSON/CSV (`GET /api/decks/:id/export`)
- Import flashcards from file (`POST /api/decks/:deckId/flashcards/import`)
- Deck sharing and collaboration features
- Statistics dashboard endpoint
- Custom spaced repetition algorithm settings
