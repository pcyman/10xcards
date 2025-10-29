# API Endpoint Implementation Plan: Generate Flashcards with AI

## 1. Endpoint Overview

This endpoint generates flashcard candidates from user-provided text using AI through the OpenRouter.ai service. It returns a minimum of 5 flashcard candidates without saving them to the database. Users can review these candidates before accepting them via a separate endpoint (`POST /api/decks/:deckId/flashcards/batch`).

**Key Characteristics:**
- Asynchronous AI processing
- No database writes (read-only for deck verification)
- Requires authenticated user access
- Enforces minimum quality threshold (5 candidates)
- Cost-sensitive operation requiring rate limiting

## 2. Request Details

### HTTP Method
`POST`

### URL Structure
```
/api/decks/:deckId/flashcards/generate
```

### Path Parameters
- **deckId** (required) - UUID of the target deck
  - Must be valid UUID format
  - Deck must exist and belong to authenticated user

### Request Headers
- **Authorization** (required) - `Bearer <token>`
  - Must be valid Supabase auth token
  - Token must not be expired

### Request Body
```json
{
  "text": "string (1000-10000 characters)"
}
```

**Validation Rules:**
- `text` field is required
- Minimum length: 1000 characters
- Maximum length: 10000 characters
- Must contain meaningful content (not just whitespace)

### Example Request
```bash
curl -X POST https://api.example.com/api/decks/550e8400-e29b-41d4-a716-446655440000/flashcards/generate \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The Pythagorean theorem states that in a right triangle, the square of the hypotenuse equals the sum of squares of the other two sides. This fundamental principle, expressed as a² + b² = c², has applications in geometry, trigonometry, and physics. It was proven by the ancient Greek mathematician Pythagoras around 500 BCE..."
  }'
```

## 3. Used Types

### Input Types
**GenerateFlashcardsCommand** (defined in `src/types.ts:104-106`)
```typescript
{
  text: string
}
```

### Output Types
**GenerateFlashcardsResponseDTO** (defined in `src/types.ts:112-115`)
```typescript
{
  candidates: FlashcardCandidateDTO[]
  total_generated: number
}
```

**FlashcardCandidateDTO** (defined in `src/types.ts:95-98`)
```typescript
{
  front: string
  back: string
}
```

### Validation Schemas (to be created)
```typescript
// In the API route file
const generateFlashcardsSchema = z.object({
  text: z.string()
    .min(1000, 'Text must be at least 1000 characters')
    .max(10000, 'Text must not exceed 10000 characters')
    .refine((val) => val.trim().length >= 1000, {
      message: 'Text must contain at least 1000 non-whitespace characters'
    })
})

const deckIdSchema = z.string().uuid('Invalid deck ID format')
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "candidates": [
    {
      "front": "What is the Pythagorean theorem?",
      "back": "In a right triangle, a² + b² = c², where c is the hypotenuse"
    },
    {
      "front": "Who proved the Pythagorean theorem?",
      "back": "The ancient Greek mathematician Pythagoras around 500 BCE"
    },
    {
      "front": "What are the applications of the Pythagorean theorem?",
      "back": "Geometry, trigonometry, and physics"
    }
    // ... minimum 5 total candidates
  ],
  "total_generated": 8
}
```

### Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired authentication token"
}
```

**404 Not Found**
```json
{
  "error": "Not Found",
  "message": "Deck not found or access denied"
}
```

**400 Bad Request**
```json
{
  "error": "Bad Request",
  "message": "Text must be between 1000 and 10000 characters"
}
```

**422 Unprocessable Entity**
```json
{
  "error": "Validation Error",
  "message": "Invalid request body",
  "details": [
    {
      "field": "text",
      "issue": "Required field missing"
    }
  ]
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal Server Error",
  "message": "Generation failed, please try again"
}
```

**503 Service Unavailable**
```json
{
  "error": "Service Unavailable",
  "message": "AI service temporarily unavailable, please try again later"
}
```

## 5. Data Flow

### High-Level Flow
```
1. Client Request → 2. Authentication → 3. Deck Verification →
4. Input Validation → 5. AI Service Call → 6. Response Parsing →
7. Quality Check → 8. Response to Client
```

### Detailed Flow

#### Step 1: Request Reception
- Astro API route receives POST request
- Extract `deckId` from URL params
- Extract `text` from request body
- Extract auth token from Authorization header

#### Step 2: Authentication
- Access Supabase client from `context.locals.supabase`
- Verify Bearer token using `supabase.auth.getUser()`
- If invalid/expired → Return 401
- Extract `user_id` from authenticated user

#### Step 3: Deck Ownership Verification
- Query `decks` table: `SELECT id FROM decks WHERE id = :deckId AND user_id = :userId`
- If no rows returned → Return 404
- This ensures:
  - Deck exists
  - User owns the deck
  - Cannot generate flashcards for others' decks

#### Step 4: Input Validation
- Validate `deckId` is valid UUID
- Validate `text` length (1000-10000 chars)
- Use Zod schema for structured validation
- If validation fails → Return 400 or 422

#### Step 5: AI Service Invocation
- Call `AIService.generateFlashcards(text)`
- Service constructs prompt with instructions
- Service calls OpenRouter.ai API (at this point mock the response, do not actually call OpenRouter.ai API)
- Service handles HTTP errors and timeouts
- If AI service unavailable → Return 503
- If generation fails → Return 500

#### Step 6: Response Parsing
- Parse AI response (likely JSON format)
- Transform into `FlashcardCandidateDTO[]` array
- Validate each candidate has `front` and `back` fields
- Filter out malformed or empty candidates

#### Step 7: Quality Assurance
- Ensure minimum 5 valid candidates
- If < 5 candidates → Retry once or return 500
- Deduplicate similar flashcards (optional)
- Trim whitespace from front/back text

#### Step 8: Response Construction
- Build `GenerateFlashcardsResponseDTO`
- Set `candidates` array
- Set `total_generated` count
- Return 200 with JSON response

### Database Interactions

**Read Operations:**
1. Verify deck existence and ownership:
```sql
SELECT id FROM decks
WHERE id = $1 AND user_id = $2
LIMIT 1
```

**No Write Operations** - This endpoint is read-only with external AI service call.

### External Service Integration

**OpenRouter.ai API Call:**
- **Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **Method:** POST
- **Headers:**
  - `Authorization: Bearer ${OPENROUTER_API_KEY}`
  - `Content-Type: application/json`
  - `HTTP-Referer: ${APP_URL}` (optional, for rankings)
  - `X-Title: 10xCards` (optional, for rankings)
- **Request Body:**
```json
{
  "model": "anthropic/claude-3.5-sonnet",
  "messages": [
    {
      "role": "system",
      "content": "You are a flashcard generator. Generate flashcards from provided text..."
    },
    {
      "role": "user",
      "content": "<user's text>"
    }
  ],
  "response_format": { "type": "json_object" },
  "temperature": 0.7
}
```

## 6. Security Considerations

### Authentication & Authorization
1. **Token Validation:** Verify Bearer token on every request
2. **User Verification:** Extract user ID from authenticated session
3. **Ownership Check:** Ensure deck belongs to requesting user
4. **Token Expiry:** Handle expired tokens gracefully with 401

### Input Validation & Sanitization
1. **UUID Validation:** Validate deckId format before database query
2. **Text Length:** Enforce 1000-10000 character limit strictly
3. **Prompt Injection:** Sanitize text to prevent AI prompt manipulation
   - Strip or escape special control characters
   - Limit formatting instructions in user text
   - Use system prompt to constrain AI behavior
4. **Content Type:** Validate `Content-Type: application/json` header

### API Key Security
1. **Environment Variables:** Store `OPENROUTER_API_KEY` in `.env` (never commit)
2. **Server-Side Only:** Never expose API key to client
3. **Key Rotation:** Support periodic key rotation without downtime

### Rate Limiting
1. **Per-User Limits:**
   - 10 requests per hour per user (prevents abuse)
   - 100 requests per day per user
2. **Global Limits:**
   - Protect against DDoS
   - Prevent cost overruns from OpenRouter.ai
3. **Implementation:** Use Redis or Supabase edge functions rate limiting

### Cost Control
1. **Token Limits:** Set max_tokens in OpenRouter API request
2. **Model Selection:** Use cost-effective models (balance quality vs. cost)
3. **Request Monitoring:** Log all AI API calls for cost tracking
4. **Fallback Models:** Implement model fallback if primary model unavailable

### Data Privacy
1. **No PII Logging:** Don't log full user text (only metadata)
2. **Temporary Storage:** Don't persist AI requests/responses
3. **User Data:** Respect that text content may be sensitive

## 7. Error Handling

### Error Categories

#### Client Errors (4xx)

**401 Unauthorized**
- **Triggers:**
  - Missing Authorization header
  - Invalid Bearer token format
  - Expired authentication token
  - Revoked token
- **Handling:**
  - Return immediately, no retry
  - Log unauthorized access attempts
  - Response: `{ error: "Unauthorized", message: "Invalid or expired authentication token" }`

**404 Not Found**
- **Triggers:**
  - Deck ID doesn't exist
  - Deck exists but belongs to different user
  - Invalid UUID format (could also be 400)
- **Handling:**
  - Don't reveal whether deck exists (security)
  - Generic message: "Deck not found or access denied"
  - Log potential enumeration attempts
- **Response:** `{ error: "Not Found", message: "Deck not found or access denied" }`

**400 Bad Request**
- **Triggers:**
  - Text length < 1000 characters
  - Text length > 10000 characters
  - Text is empty or only whitespace
- **Handling:**
  - Return specific validation message
  - Don't process request
- **Response:** `{ error: "Bad Request", message: "Text must be between 1000 and 10000 characters" }`

**422 Unprocessable Entity**
- **Triggers:**
  - Request body not valid JSON
  - Missing `text` field
  - Wrong data type (text is not string)
  - Malformed request structure
- **Handling:**
  - Parse Zod validation errors
  - Return detailed field-level errors
- **Response:**
```json
{
  "error": "Validation Error",
  "message": "Invalid request body",
  "details": [{ "field": "text", "issue": "Required field missing" }]
}
```

#### Server Errors (5xx)

**500 Internal Server Error**
- **Triggers:**
  - AI generation returned < 5 candidates (even after retry)
  - AI response parsing failed
  - Unexpected database error
  - OpenRouter API error (non-503)
  - Response format doesn't match schema
- **Handling:**
  - Log full error details server-side
  - Generic message to client: "Generation failed, please try again"
  - Attempt retry logic once for transient failures
  - Alert monitoring system for repeated failures
- **Response:** `{ error: "Internal Server Error", message: "Generation failed, please try again" }`

**503 Service Unavailable**
- **Triggers:**
  - OpenRouter.ai service is down
  - Network timeout to AI service
  - OpenRouter API rate limit exceeded
  - DNS resolution failure
- **Handling:**
  - Detect via HTTP 503 or connection timeout
  - Return immediately (no retry at endpoint level)
  - Log service outage
  - Client can implement retry with exponential backoff
- **Response:** `{ error: "Service Unavailable", message: "AI service temporarily unavailable, please try again later" }`

### Error Handling Strategy

```typescript
// Pseudo-code error handling structure

try {
  // 1. Validate authentication
  const user = await validateAuth(token)
  if (!user) return respond401()

  // 2. Validate deck ownership
  const deck = await verifyDeckOwnership(deckId, user.id)
  if (!deck) return respond404()

  // 3. Validate input
  const validated = validateInput(requestBody)
  if (!validated.success) return respond422(validated.errors)

  // 4. Call AI service with retry
  let candidates
  try {
    candidates = await aiService.generateFlashcards(validated.data.text)
  } catch (error) {
    if (error instanceof ServiceUnavailableError) {
      return respond503()
    }
    // Retry once for transient failures
    candidates = await aiService.generateFlashcards(validated.data.text)
  }

  // 5. Validate quality (min 5 candidates)
  if (candidates.length < 5) {
    logError('Insufficient candidates generated', { count: candidates.length })
    return respond500('Generation failed, please try again')
  }

  // 6. Return success
  return respond200({
    candidates,
    total_generated: candidates.length
  })

} catch (error) {
  logError('Unexpected error in generate flashcards', error)
  return respond500('Generation failed, please try again')
}
```

### Logging Strategy
- **Info Level:** Successful generations (user_id, deck_id, candidate_count, duration)
- **Warning Level:** < 5 candidates, retries, rate limit approaches
- **Error Level:** All 500/503 errors with full stack trace
- **Security Level:** 401/404 patterns indicating enumeration attempts

## 8. Performance Considerations

### Bottlenecks

1. **AI API Latency (Primary Bottleneck)**
   - OpenRouter.ai response time: 5-15 seconds typical
   - Directly impacts user experience
   - Cannot be cached (each request is unique)

2. **Request Timeout**
   - Default Astro timeout may be insufficient
   - Need to handle long-running AI requests

3. **Database Query**
   - Deck ownership verification is fast (indexed query)
   - Minimal impact on overall latency

4. **Parsing & Validation**
   - JSON parsing overhead
   - Zod validation overhead
   - Negligible compared to AI latency

### Optimization Strategies

#### 1. Timeout Configuration
```typescript
// Set appropriate timeout for AI requests
export const prerender = false

// In API route
const GENERATION_TIMEOUT = 30000 // 30 seconds
```

#### 2. Response Streaming (Future Enhancement)
- Consider Server-Sent Events (SSE) for real-time candidate streaming
- Show candidates as they're generated instead of waiting for all
- Improves perceived performance

#### 3. Caching Strategy
- **Not applicable for this endpoint** - each request is unique
- Could cache common educational text fingerprints (advanced)

#### 5. Concurrent Request Handling
- Use Node.js async/await properly
- Don't block event loop with synchronous operations
- AI service should use proper HTTP client (fetch with AbortController)

#### 6. Model Selection
- Balance between speed, cost, and quality
- Faster models: `anthropic/claude-3-haiku`, `openai/gpt-3.5-turbo`
- Higher quality: `anthropic/claude-3.5-sonnet`, `openai/gpt-4`
- Consider time-of-day routing (fast models during peak hours)

#### 7. Monitoring & Alerting
- Track P50, P95, P99 latencies
- Monitor AI API success rates
- Alert on degraded performance or high error rates
- Dashboard for cost tracking

### Performance Targets
- **P50 Latency:** < 10 seconds (depends on AI service)
- **P95 Latency:** < 20 seconds
- **Timeout:** 30 seconds maximum
- **Success Rate:** > 95%
- **Availability:** > 99% (excluding AI service downtime)

## 9. Implementation Steps

### Step 1: Environment Configuration
1. Add OpenRouter API key to `.env`:
   ```env
   OPENROUTER_API_KEY=sk_or_v1_xxxxx
   OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
   APP_URL=https://10xcards.com
   ```

2. Update `.env.example` with placeholder:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
   APP_URL=http://localhost:3000
   ```

3. Add types to `src/env.d.ts`:
   ```typescript
   interface ImportMetaEnv {
     readonly SUPABASE_URL: string
     readonly SUPABASE_KEY: string
     readonly OPENROUTER_API_KEY: string
     readonly OPENROUTER_MODEL: string
     readonly APP_URL: string
   }
   ```

### Step 2: Create AI Service
1. Create directory: `src/lib/services/`

2. Create file: `src/lib/services/ai.service.ts`
   ```typescript
   import type { FlashcardCandidateDTO } from '@/types'

   export class AIService {
     private readonly apiKey: string
     private readonly model: string
     private readonly baseUrl = 'https://openrouter.ai/api/v1'

     constructor(apiKey: string, model: string) {
       this.apiKey = apiKey
       this.model = model
     }

     async generateFlashcards(text: string): Promise<FlashcardCandidateDTO[]> {
       // Implementation details
     }

     private buildPrompt(text: string): string {
       // Construct system prompt and user message
     }

     private parseResponse(response: unknown): FlashcardCandidateDTO[] {
       // Parse and validate AI response
     }
   }

   export const aiService = new AIService(
     import.meta.env.OPENROUTER_API_KEY,
     import.meta.env.OPENROUTER_MODEL
   )
   ```

3. Implement prompt engineering:
   ```typescript
   private buildPrompt(text: string): string {
     return `You are an expert flashcard creator. Your task is to generate high-quality flashcards from the provided text.

   Requirements:
   - Generate at least 5 flashcards, preferably 8-12
   - Each flashcard must have a "front" (question) and "back" (answer)
   - Questions should be clear, specific, and test understanding
   - Answers should be concise but complete
   - Cover key concepts, definitions, facts, and relationships
   - Vary question types (what, why, how, when, who)
   - Return JSON format: { "flashcards": [{ "front": "...", "back": "..." }] }

   Text to analyze:
   ${text}`
   }
   ```

4. Implement error handling and retry logic

5. Add unit tests for AI service

### Step 3: Create API Route
1. Create file: `src/pages/api/decks/[deckId]/flashcards/generate.ts`

2. Add route configuration:
   ```typescript
   export const prerender = false // Required for dynamic API routes
   ```

3. Implement POST handler:
   ```typescript
   import type { APIRoute } from 'astro'
   import { z } from 'zod'
   import type { GenerateFlashcardsCommand, GenerateFlashcardsResponseDTO } from '@/types'
   import { aiService } from '@/lib/services/ai.service'

   export const POST: APIRoute = async ({ params, request, locals }) => {
     // Implementation
   }
   ```

4. Implement authentication:
   ```typescript
   // Extract token
   const authHeader = request.headers.get('Authorization')
   if (!authHeader?.startsWith('Bearer ')) {
     return new Response(
       JSON.stringify({ error: 'Unauthorized', message: 'Missing or invalid authentication token' }),
       { status: 401, headers: { 'Content-Type': 'application/json' } }
     )
   }

   // Verify user
   const { data: { user }, error: authError } = await locals.supabase.auth.getUser()
   if (authError || !user) {
     return new Response(
       JSON.stringify({ error: 'Unauthorized', message: 'Invalid or expired authentication token' }),
       { status: 401, headers: { 'Content-Type': 'application/json' } }
     )
   }
   ```

5. Implement deck ownership verification:
   ```typescript
   const { deckId } = params

   // Validate UUID format
   const deckIdSchema = z.string().uuid()
   const deckIdValidation = deckIdSchema.safeParse(deckId)
   if (!deckIdValidation.success) {
     return new Response(
       JSON.stringify({ error: 'Bad Request', message: 'Invalid deck ID format' }),
       { status: 400, headers: { 'Content-Type': 'application/json' } }
     )
   }

   // Check ownership
   const { data: deck, error: deckError } = await locals.supabase
     .from('decks')
     .select('id')
     .eq('id', deckId)
     .eq('user_id', user.id)
     .single()

   if (deckError || !deck) {
     return new Response(
       JSON.stringify({ error: 'Not Found', message: 'Deck not found or access denied' }),
       { status: 404, headers: { 'Content-Type': 'application/json' } }
     )
   }
   ```

6. Implement input validation:
   ```typescript
   const generateFlashcardsSchema = z.object({
     text: z.string()
       .min(1000, 'Text must be at least 1000 characters')
       .max(10000, 'Text must not exceed 10000 characters')
       .refine((val) => val.trim().length >= 1000, {
         message: 'Text must contain at least 1000 non-whitespace characters'
       })
   })

   let body: GenerateFlashcardsCommand
   try {
     body = await request.json()
   } catch {
     return new Response(
       JSON.stringify({ error: 'Validation Error', message: 'Invalid JSON in request body' }),
       { status: 422, headers: { 'Content-Type': 'application/json' } }
     )
   }

   const validation = generateFlashcardsSchema.safeParse(body)
   if (!validation.success) {
     return new Response(
       JSON.stringify({
         error: 'Validation Error',
         message: 'Invalid request body',
         details: validation.error.errors
       }),
       { status: 422, headers: { 'Content-Type': 'application/json' } }
     )
   }
   ```

7. Implement AI generation with error handling:
   ```typescript
   let candidates: FlashcardCandidateDTO[]

   try {
     candidates = await aiService.generateFlashcards(validation.data.text)
   } catch (error) {
     if (error instanceof ServiceUnavailableError) {
       return new Response(
         JSON.stringify({
           error: 'Service Unavailable',
           message: 'AI service temporarily unavailable, please try again later'
         }),
         { status: 503, headers: { 'Content-Type': 'application/json' } }
       )
     }

     // Log error for monitoring
     console.error('AI generation failed:', error)

     return new Response(
       JSON.stringify({
         error: 'Internal Server Error',
         message: 'Generation failed, please try again'
       }),
       { status: 500, headers: { 'Content-Type': 'application/json' } }
     )
   }

   // Validate minimum candidates
   if (candidates.length < 5) {
     console.error('Insufficient candidates generated:', candidates.length)
     return new Response(
       JSON.stringify({
         error: 'Internal Server Error',
         message: 'Generation failed, please try again'
       }),
       { status: 500, headers: { 'Content-Type': 'application/json' } }
     )
   }
   ```

8. Return success response:
   ```typescript
   const response: GenerateFlashcardsResponseDTO = {
     candidates,
     total_generated: candidates.length
   }

   return new Response(
     JSON.stringify(response),
     {
       status: 200,
       headers: { 'Content-Type': 'application/json' }
     }
   )
   ```

### Step 5: Testing

#### Unit Tests
1. Test AI service:
   - Mock OpenRouter API responses
   - Test successful generation
   - Test parsing errors
   - Test < 5 candidates scenario
   - Test network errors

2. Test validation schemas:
   - Valid inputs
   - Text too short (< 1000 chars)
   - Text too long (> 10000 chars)
   - Invalid UUID format
