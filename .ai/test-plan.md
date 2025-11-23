# Test Plan: 10XCards

## 1. Introduction and Testing Objectives

### 1.1 Purpose
This document outlines a comprehensive testing strategy for **10XCards**, an AI-powered flashcard learning platform that enables users to transform study materials into optimized flashcards using artificial intelligence and spaced repetition techniques.

### 1.2 Testing Objectives
- **Establish testing infrastructure** from the ground up (no current testing framework exists)
- **Ensure core functionality** of AI flashcard generation meets the MVP goal of 75% AI flashcard acceptance rate
- **Validate data integrity** across PostgreSQL database operations with Row Level Security (RLS)
- **Verify authentication security** and session management via Supabase JWT tokens
- **Ensure AI service reliability** with OpenRouter.ai integration (Gemini 2.5 Flash Lite)
- **Confirm accessibility compliance** across all user-facing components
- **Validate responsive design** across desktop and mobile viewports
- **Prevent regressions** as the platform evolves toward spaced repetition features

### 1.3 Current State
**Critical Gap Identified:** The codebase currently has **zero testing infrastructure**:
- No test files in source code
- No testing libraries (Jest, Vitest, Testing Library, etc.)
- No test configuration
- No CI/CD test automation

This test plan addresses building testing from scratch while prioritizing high-risk areas.

---

## 2. Scope of Testing

### 2.1 In Scope

#### 2.1.1 Core Features
- **Authentication System** (login, registration, logout, session refresh)
- **Deck Management** (CRUD operations, statistics computation)
- **Manual Flashcard Creation** (create, edit, delete flashcards)
- **AI Flashcard Generation** (OpenRouter.ai integration, response parsing)
- **AI Flashcard Review Flow** (accept/discard workflow, batch operations)
- **Input Validation** (Zod schema validation across all API endpoints)
- **Error Handling** (service errors, network failures, validation errors)
- **Pagination** (deck lists, flashcard lists)

#### 2.1.2 Technical Components
- **API Endpoints** (23 endpoints across auth, decks, flashcards)
- **Service Layer** (DeckService, FlashcardService, AiService)
- **Database Operations** (Supabase queries, RLS policies)
- **React Components** (forms, modals, lists, AI workflow components)
- **Custom Hooks** (useLoginForm, useReviewState, useCharacterValidation, etc.)
- **Middleware** (session validation, Supabase client injection)
- **Type Safety** (TypeScript type guards, DTO transformations)

#### 2.1.3 Cross-Cutting Concerns
- **Security** (RLS policies, JWT validation, input sanitization)
- **Accessibility** (ARIA attributes, keyboard navigation, screen reader support)
- **Responsive Design** (mobile, tablet, desktop breakpoints)
- **Performance** (API response times, database query optimization)
- **Browser Compatibility** (Chrome, Firefox, Safari, Edge)

### 2.2 Out of Scope (Not Yet Implemented)
- Spaced repetition study sessions
- Review difficulty rating
- Flashcard scheduling algorithm
- Review history analytics
- Real-time collaborative features
- Mobile native applications

---

## 3. Types of Tests to be Performed

### 3.1 Unit Tests (Priority: CRITICAL)

**Target Coverage:** 80% minimum for service layer and business logic

#### 3.1.1 Service Layer
**File:** `src/lib/services/deck.service.ts`
- `createDeck()`: Validate name uniqueness, user association, error handling
- `listDecks()`: Pagination logic, statistics computation correctness
- `getDeck()`: Authorization checks, non-existent deck handling
- `updateDeck()`: Name validation, duplicate name prevention
- `deleteDeck()`: Cascade deletion verification, ownership validation
- `computeDeckStatistics()`: Accurate total/due card counts

**File:** `src/lib/services/flashcard.service.ts`
- `createFlashcard()`: Empty content validation, deck association
- `batchCreateFlashcards()`: Transaction integrity, partial failure handling
- `listFlashcardsInDeck()`: Pagination, filtering, sorting
- `updateFlashcard()`: Content validation, ownership checks
- `deleteFlashcard()`: Reference integrity, cascade effects

**File:** `src/lib/services/ai.service.ts`
- `generateFlashcards()`: Character limit enforcement (1000-10000)
- `callOpenRouterAPI()`: Timeout handling (30s), network error recovery
- `parseResponse()`: JSON validation, minimum 5 flashcards requirement
- `buildPrompt()`: Prompt construction accuracy, context injection

#### 3.1.2 Validation Layer
**Files:** `src/lib/validation/*.schemas.ts`
- Password requirements (8+ chars, uppercase, lowercase, number, special char)
- Email format validation
- Deck name constraints (1-255 characters, uniqueness)
- Flashcard content constraints (non-empty front/back)
- Character count validation (1000-10000 for AI generation)
- Pagination parameter validation (limit, offset)

#### 3.1.3 Custom Hooks
**Files:** `src/hooks/*.ts`
- `useCharacterValidation`: Real-time count, min/max thresholds, visual feedback
- `useReviewState`: Accept/discard logic, progress calculation, completion detection
- `useNavigationGuard`: Unsaved changes detection, confirmation prompts
- `useGenerationProgress`: Cancellation handling, loading states

#### 3.1.4 Utilities and Helpers
- Error handling functions (`src/lib/errors/handler.ts`)
- Type guards and transformations
- Date formatting utilities
- Session storage helpers

### 3.2 Integration Tests (Priority: HIGH)

#### 3.2.1 API Endpoint Flows
**Authentication Flow:**
```
POST /api/auth/register → POST /api/auth/login → GET /api/auth/me → POST /api/auth/logout
```
- Verify JWT token generation and validation
- Test session persistence and refresh
- Validate error responses (401, 403, 422)

**Deck Management Flow:**
```
POST /api/decks → GET /api/decks → GET /api/decks/:id → PATCH /api/decks/:id → DELETE /api/decks/:id
```
- Test CRUD operations with database state verification
- Verify RLS policies enforce user isolation
- Test pagination with various limits/offsets

**AI Generation Flow:**
```
POST /api/decks/:deckId/flashcards/generate → POST /api/decks/:deckId/flashcards/batch
```
- Mock OpenRouter.ai responses
- Test concurrent generation requests
- Verify database rollback on partial failures

#### 3.2.2 Database Integration
- **RLS Policy Testing:** Ensure users cannot access other users' data
- **Cascade Deletion:** Verify flashcards deleted when deck is deleted
- **Transaction Integrity:** Batch operations succeed/fail atomically
- **Index Performance:** Query performance on `user_id`, `next_review_date`

#### 3.2.3 External Service Integration
**Supabase:**
- Authentication token validation
- Database connection pooling
- Error handling for database downtime

**OpenRouter.ai:**
- API request/response format validation
- Timeout handling (30-second limit)
- Error responses (rate limiting, service unavailable)
- Response parsing and validation

### 3.3 Component Tests (Priority: MEDIUM)

**Testing Library:** @testing-library/react

#### 3.3.1 Authentication Components
- `LoginForm.tsx`: Form submission, validation errors, success redirect
- `RegisterForm.tsx`: Password requirements display, form validation
- `PasswordRequirements.tsx`: Real-time validation feedback

#### 3.3.2 Deck Components
- `DeckCard.tsx`: Display statistics, click navigation, menu actions
- `CreateDeckModal.tsx`: Form validation, duplicate name handling
- `EditDeckModal.tsx`: Pre-filled values, save functionality
- `ConfirmDeleteDialog.tsx`: Confirmation flow, escape key handling

#### 3.3.3 Flashcard Components
- `FlashcardModal.tsx`: Create/edit modes, content validation
- `FlashcardListItem.tsx`: Display formatting, action buttons
- `LoadMoreButton.tsx`: Pagination trigger, loading states

#### 3.3.4 AI Workflow Components
- `AiGenerationForm.tsx`: Character counter, validation states, submission
- `CharacterCounter.tsx`: Real-time updates, color states (gray/red/green)
- `AiReviewFlow.tsx`: Accept/discard actions, keyboard shortcuts (A/D/Escape)
- `AiCandidateCard.tsx`: Card display, action buttons, animations
- `ReviewProgress.tsx`: Accurate count, percentage calculation

#### 3.3.5 UI Component Library (Shadcn/ui)
- Verify accessibility (ARIA attributes, keyboard navigation)
- Test component variants (button styles, input states)
- Validate focus management and tab order

### 3.4 End-to-End (E2E) Tests (Priority: HIGH)

**Testing Tool:** Playwright (recommended for Astro SSR)

#### 3.4.1 Critical User Journeys

**Journey 1: New User Onboarding to AI Flashcard Creation**
```
1. Navigate to /register
2. Fill registration form with valid data
3. Submit and verify redirect to /decks
4. Create first deck via modal
5. Navigate to deck detail page
6. Click "Generate with AI"
7. Paste text (3000 characters)
8. Submit and wait for generation
9. Review candidates on /decks/:id/review
10. Accept 8 cards, discard 2 cards
11. Click "Done Reviewing"
12. Verify 8 cards appear in deck list
```
**Success Criteria:** Complete flow without errors, flashcards persisted to database

**Journey 2: Manual Flashcard Management**
```
1. Login as existing user
2. Navigate to existing deck
3. Click "Add Card"
4. Enter front/back content
5. Save flashcard
6. Edit flashcard content
7. Delete flashcard with confirmation
```
**Success Criteria:** All CRUD operations reflected in UI and database

**Journey 3: Deck Management**
```
1. Login as existing user
2. View deck list with statistics
3. Create new deck
4. Verify deck appears in list
5. Edit deck name
6. Delete deck with flashcards
7. Confirm cascade deletion
```
**Success Criteria:** Statistics accurate, cascading deletes work correctly

#### 3.4.2 Error Scenarios

**Network Failure Scenarios:**
- Offline mode during flashcard creation
- Timeout during AI generation
- Connection loss during authentication

**Validation Error Scenarios:**
- Duplicate deck names
- Empty flashcard content
- Character count outside 1000-10000 range
- Invalid email/password formats

**Authorization Scenarios:**
- Accessing another user's deck (direct URL)
- Expired session token
- Missing authentication header

### 3.5 Performance Tests (Priority: MEDIUM)

#### 3.5.1 API Response Times
**Target:** 95th percentile < 200ms for database queries
- `GET /api/decks` with 50 decks
- `GET /api/decks/:id/flashcards` with 500 flashcards
- `POST /api/decks/:deckId/flashcards/batch` with 20 flashcards

#### 3.5.2 AI Generation Performance
**Target:** < 30 seconds for 10-15 flashcards
- Measure end-to-end latency from request to parsed response
- Test with various text lengths (1000, 5000, 10000 characters)
- Monitor OpenRouter.ai response times

#### 3.5.3 Database Query Optimization
- Index usage verification for due flashcard queries
- Connection pool performance under load
- Pagination query performance (OFFSET vs keyset pagination)

#### 3.5.4 Frontend Performance
**Target:** Lighthouse score > 90 for Performance
- Initial page load (SSR rendering time)
- Time to Interactive (TTI)
- React component re-render optimization
- Bundle size analysis (< 300KB initial JS)

### 3.6 Accessibility Tests (Priority: HIGH)

**Standards:** WCAG 2.1 Level AA compliance

#### 3.6.1 Automated Testing
**Tool:** axe-core via @axe-core/playwright
- Run on all pages (login, register, decks, deck detail, generate, review)
- Fix all critical and serious violations
- Document and justify warnings if not fixable

#### 3.6.2 Manual Testing
- **Keyboard Navigation:** Tab order, focus indicators, escape key handling
- **Screen Reader Testing:** NVDA (Windows), VoiceOver (macOS)
- **ARIA Attributes:** Proper use of roles, labels, live regions
- **Focus Management:** Modals trap focus, focus restored on close
- **Color Contrast:** 4.5:1 minimum for text, 3:1 for UI components

#### 3.6.3 Specific Component Checks
- Form error announcements (aria-live regions)
- Button labels descriptive for screen readers
- Modal dialogs (aria-modal, focus trap)
- Loading states announced to assistive tech
- Keyboard shortcuts documented and accessible

### 3.7 Security Tests (Priority: CRITICAL)

#### 3.7.1 Authentication Security
- **JWT Validation:** Verify signature, expiration, issuer
- **Session Management:** Secure storage, automatic refresh, logout cleanup
- **Password Security:** Bcrypt hashing, minimum requirements enforced
- **CSRF Protection:** Verify Supabase built-in protections

#### 3.7.2 Authorization
- **RLS Policy Verification:** Users cannot query other users' data
- **API Endpoint Authorization:** All protected routes check authentication
- **Ownership Validation:** Users can only modify their own resources

#### 3.7.3 Input Validation & Sanitization
- **SQL Injection Prevention:** Parameterized queries only (Supabase client)
- **XSS Prevention:** Content sanitization, CSP headers
- **Path Traversal:** Validate deck/flashcard IDs are UUIDs
- **Rate Limiting:** Prevent abuse of AI generation endpoint

#### 3.7.4 Data Privacy
- **Personal Data:** Verify no PII leakage in logs or errors
- **Database Backups:** Ensure RLS applies to backup restoration
- **API Keys:** Verify environment variables not exposed to client

---

## 4. Test Scenarios for Key Functionalities

### 4.1 Authentication

#### TC-AUTH-001: Successful User Registration
**Preconditions:** None
**Steps:**
1. Navigate to `/register`
2. Enter valid email: `test@example.com`
3. Enter password meeting requirements: `SecurePass123!`
4. Confirm password: `SecurePass123!`
5. Submit form

**Expected Results:**
- User created in Supabase `auth.users` table
- Session token returned and stored in localStorage
- Redirect to `/decks` page
- Success toast notification displayed

**Priority:** P0 (Critical)

#### TC-AUTH-002: Registration with Weak Password
**Preconditions:** None
**Steps:**
1. Navigate to `/register`
2. Enter valid email: `test@example.com`
3. Enter password: `weak`
4. Attempt to submit form

**Expected Results:**
- Form submission blocked
- Password requirements component shows unmet criteria in red
- Error message: "Password must be at least 8 characters"
- No API request sent

**Priority:** P1 (High)

#### TC-AUTH-003: Login with Invalid Credentials
**Preconditions:** User account exists
**Steps:**
1. Navigate to `/login`
2. Enter email: `test@example.com`
3. Enter wrong password: `WrongPassword123!`
4. Submit form

**Expected Results:**
- HTTP 401 Unauthorized response
- Error toast: "Invalid email or password"
- No session token stored
- User remains on login page

**Priority:** P0 (Critical)

#### TC-AUTH-004: Session Persistence
**Preconditions:** User is logged in
**Steps:**
1. Login successfully
2. Close browser tab
3. Reopen browser and navigate to `/decks`

**Expected Results:**
- Session token retrieved from localStorage
- User remains authenticated
- Deck list displays without redirect to login

**Priority:** P1 (High)

#### TC-AUTH-005: Session Expiration Handling
**Preconditions:** User has expired session token
**Steps:**
1. Set expired token in localStorage
2. Navigate to `/decks`
3. Observe behavior

**Expected Results:**
- Middleware detects expired token
- User redirected to `/login`
- Error message: "Session expired, please login again"
- localStorage cleared

**Priority:** P1 (High)

---

### 4.2 AI Flashcard Generation

#### TC-AI-001: Successful Flashcard Generation
**Preconditions:** User logged in, deck exists
**Steps:**
1. Navigate to `/decks/:id`
2. Click "Generate with AI"
3. Paste text: 3000-character educational content
4. Verify character counter shows green (valid range)
5. Click "Generate Flashcards"
6. Wait for OpenRouter.ai response

**Expected Results:**
- Loading screen displays with cancel option
- POST request to `/api/decks/:deckId/flashcards/generate` succeeds
- Minimum 5 flashcards returned from AI
- Redirect to `/decks/:id/review` with candidates in sessionStorage
- Candidates display in review interface

**Priority:** P0 (Critical - MVP feature)

#### TC-AI-002: Character Count Validation (Too Short)
**Preconditions:** User on generation page
**Steps:**
1. Navigate to `/decks/:id/generate`
2. Paste 500 characters of text
3. Observe character counter
4. Attempt to submit

**Expected Results:**
- Character counter displays red color
- Submit button disabled
- Error message: "Text must be between 1,000 and 10,000 characters"
- No API request sent

**Priority:** P1 (High)

#### TC-AI-003: Character Count Validation (Too Long)
**Preconditions:** User on generation page
**Steps:**
1. Navigate to `/decks/:id/generate`
2. Paste 15,000 characters of text
3. Observe character counter
4. Attempt to submit

**Expected Results:**
- Character counter displays red color
- Submit button disabled
- Error message: "Text must be between 1,000 and 10,000 characters"
- No API request sent

**Priority:** P1 (High)

#### TC-AI-004: OpenRouter.ai Service Unavailable
**Preconditions:** User on generation page, OpenRouter.ai returns 503
**Steps:**
1. Submit valid text for generation
2. Mock OpenRouter.ai to return 503 Service Unavailable

**Expected Results:**
- Loading screen shows error state
- Error toast: "AI service temporarily unavailable. Please try again."
- User remains on generation page
- Text content preserved (not lost)
- User can retry submission

**Priority:** P1 (High)

#### TC-AI-005: Generation Timeout (30 seconds)
**Preconditions:** User on generation page
**Steps:**
1. Submit valid text for generation
2. Mock OpenRouter.ai to not respond within 30 seconds

**Expected Results:**
- Request times out after 30 seconds
- Error message: "Generation timed out. Please try with shorter text."
- User returned to generation page
- Text content preserved

**Priority:** P2 (Medium)

#### TC-AI-006: Malformed AI Response
**Preconditions:** User on generation page
**Steps:**
1. Submit valid text for generation
2. Mock OpenRouter.ai to return invalid JSON or missing fields

**Expected Results:**
- Response parsing fails gracefully
- Error message: "Failed to generate flashcards. Please try again."
- No flashcard candidates created
- User can retry

**Priority:** P2 (Medium)

#### TC-AI-007: AI Returns Fewer Than 5 Flashcards
**Preconditions:** User on generation page
**Steps:**
1. Submit valid text for generation
2. Mock OpenRouter.ai to return 3 flashcards

**Expected Results:**
- Validation fails (minimum 5 required)
- Error message: "Generated fewer flashcards than expected. Please try again."
- No candidates shown in review
- User can retry generation

**Priority:** P2 (Medium)

---

### 4.3 AI Flashcard Review Flow

#### TC-REVIEW-001: Accept All Flashcards
**Preconditions:** 10 AI candidates in sessionStorage
**Steps:**
1. Navigate to `/decks/:id/review`
2. Click "Accept" (or press 'A') on all 10 cards
3. Verify progress shows 10 accepted, 0 discarded
4. Click "Done Reviewing"

**Expected Results:**
- POST to `/api/decks/:deckId/flashcards/batch` with 10 cards
- All 10 flashcards created in database with `is_ai_generated = true`
- Redirect to `/decks/:id`
- Success toast: "10 flashcards added to deck"
- Flashcards appear in deck list

**Priority:** P0 (Critical - MVP success metric: 75% acceptance rate)

#### TC-REVIEW-002: Discard All Flashcards
**Preconditions:** 10 AI candidates in sessionStorage
**Steps:**
1. Navigate to `/decks/:id/review`
2. Click "Discard" (or press 'D') on all 10 cards
3. Verify progress shows 0 accepted, 10 discarded
4. Click "Done Reviewing"

**Expected Results:**
- No API request to batch endpoint
- Redirect to `/decks/:id`
- Info toast: "No flashcards were added"
- Deck remains empty

**Priority:** P1 (High)

#### TC-REVIEW-003: Mixed Accept/Discard
**Preconditions:** 10 AI candidates in sessionStorage
**Steps:**
1. Navigate to `/decks/:id/review`
2. Accept cards: 1, 3, 5, 7, 9 (5 cards)
3. Discard cards: 2, 4, 6, 8, 10 (5 cards)
4. Verify progress shows 5 accepted, 5 discarded
5. Click "Done Reviewing"

**Expected Results:**
- POST to batch endpoint with 5 cards
- Exactly 5 flashcards created in database
- Redirect to `/decks/:id`
- Success toast: "5 flashcards added to deck"

**Priority:** P0 (Critical)

#### TC-REVIEW-004: Keyboard Navigation
**Preconditions:** 10 AI candidates in sessionStorage
**Steps:**
1. Navigate to `/decks/:id/review`
2. Press 'A' key to accept first card
3. Press 'D' key to discard second card
4. Press 'Escape' key to attempt exit

**Expected Results:**
- 'A' key triggers accept action (green checkmark)
- 'D' key triggers discard action (red X)
- 'Escape' shows navigation guard confirmation
- Shortcuts work without clicking buttons

**Priority:** P1 (High)

#### TC-REVIEW-005: Exit Without Saving
**Preconditions:** User has accepted 3 cards
**Steps:**
1. Navigate to `/decks/:id/review`
2. Accept 3 cards
3. Click browser back button or press Escape
4. Observe confirmation dialog

**Expected Results:**
- Navigation guard prevents immediate exit
- Confirmation dialog: "You have unsaved changes. Exit without saving?"
- User can choose "Stay" or "Leave"
- If "Leave", no flashcards saved
- If "Stay", review continues

**Priority:** P1 (High)

#### TC-REVIEW-006: Session Storage Missing (Direct URL Access)
**Preconditions:** No candidates in sessionStorage
**Steps:**
1. Directly navigate to `/decks/:id/review` without generation

**Expected Results:**
- Page detects missing sessionStorage data
- Error message: "No flashcards to review"
- Redirect to `/decks/:id`
- User not stuck on review page

**Priority:** P2 (Medium)

---

### 4.4 Deck Management

#### TC-DECK-001: Create Deck with Unique Name
**Preconditions:** User logged in
**Steps:**
1. Navigate to `/decks`
2. Click "Create Deck"
3. Enter name: "Spanish Vocabulary"
4. Submit form

**Expected Results:**
- POST to `/api/decks` succeeds
- Deck created in database with `user_id` = current user
- Deck appears in grid with statistics (0 total, 0 due)
- Success toast: "Deck created successfully"
- Modal closes automatically

**Priority:** P0 (Critical)

#### TC-DECK-002: Create Deck with Duplicate Name
**Preconditions:** Deck "Spanish Vocabulary" exists for user
**Steps:**
1. Navigate to `/decks`
2. Click "Create Deck"
3. Enter name: "Spanish Vocabulary" (duplicate)
4. Submit form

**Expected Results:**
- HTTP 409 Conflict response
- Error toast: "Deck with this name already exists"
- Modal remains open
- Input field highlighted with error
- User can correct name

**Priority:** P1 (High)

#### TC-DECK-003: Update Deck Name
**Preconditions:** Deck "Spanish Vocabulary" exists
**Steps:**
1. Navigate to `/decks`
2. Click "Edit" on deck card
3. Change name to "Spanish Verbs"
4. Submit form

**Expected Results:**
- PATCH to `/api/decks/:id` succeeds
- Database updated with new name
- Deck card reflects new name immediately
- Success toast: "Deck updated successfully"
- Modal closes

**Priority:** P1 (High)

#### TC-DECK-004: Delete Deck with Flashcards
**Preconditions:** Deck has 50 flashcards
**Steps:**
1. Navigate to `/decks`
2. Click "Delete" on deck card
3. Confirmation dialog appears
4. Click "Confirm Delete"

**Expected Results:**
- DELETE to `/api/decks/:id` succeeds
- Deck removed from database
- All 50 flashcards cascade deleted
- Deck removed from grid immediately
- Success toast: "Deck deleted successfully"

**Priority:** P1 (High)

#### TC-DECK-005: Deck Statistics Accuracy
**Preconditions:** Deck has 100 total flashcards, 25 due today
**Steps:**
1. Navigate to `/decks`
2. Observe deck card statistics

**Expected Results:**
- Badge shows "100 cards"
- Due count shows "25 due"
- Statistics match database query results
- Statistics computed via `computeDeckStatistics()` service method

**Priority:** P2 (Medium)

#### TC-DECK-006: Pagination with 50+ Decks
**Preconditions:** User has 75 decks
**Steps:**
1. Navigate to `/decks`
2. Observe initial page (limit=20)
3. Click "Load More"
4. Observe additional decks loaded

**Expected Results:**
- Initial load shows 20 decks
- Click "Load More" fetches next 20 (offset=20)
- Third page shows remaining 35 decks
- No duplicate decks displayed
- Load More button hidden when all decks loaded

**Priority:** P2 (Medium)

---

### 4.5 Manual Flashcard Management

#### TC-FLASHCARD-001: Create Flashcard
**Preconditions:** User on deck detail page
**Steps:**
1. Navigate to `/decks/:id`
2. Click "Add Card"
3. Enter front: "What is the capital of France?"
4. Enter back: "Paris"
5. Submit form

**Expected Results:**
- POST to `/api/decks/:deckId/flashcards` succeeds
- Flashcard created with `is_ai_generated = false`
- Flashcard appears at top of list
- Success toast: "Flashcard created successfully"
- Modal closes

**Priority:** P0 (Critical)

#### TC-FLASHCARD-002: Create Flashcard with Empty Content
**Preconditions:** User on deck detail page
**Steps:**
1. Click "Add Card"
2. Leave front field empty
3. Enter back: "Paris"
4. Attempt to submit

**Expected Results:**
- Client-side validation prevents submission
- Error message: "Front side cannot be empty"
- Submit button disabled
- No API request sent

**Priority:** P1 (High)

#### TC-FLASHCARD-003: Edit Existing Flashcard
**Preconditions:** Flashcard exists
**Steps:**
1. Navigate to `/decks/:id`
2. Click "Edit" on flashcard
3. Change front to: "What is the capital of Spain?"
4. Change back to: "Madrid"
5. Submit form

**Expected Results:**
- PATCH to `/api/flashcards/:id` succeeds
- Flashcard updated in database
- List item reflects new content immediately
- Success toast: "Flashcard updated successfully"

**Priority:** P1 (High)

#### TC-FLASHCARD-004: Delete Flashcard
**Preconditions:** Flashcard exists
**Steps:**
1. Navigate to `/decks/:id`
2. Click "Delete" on flashcard
3. Confirmation dialog appears
4. Click "Confirm Delete"

**Expected Results:**
- DELETE to `/api/flashcards/:id` succeeds
- Flashcard removed from database
- List item removed from UI immediately
- Success toast: "Flashcard deleted successfully"

**Priority:** P1 (High)

#### TC-FLASHCARD-005: Pagination with 100+ Flashcards
**Preconditions:** Deck has 250 flashcards
**Steps:**
1. Navigate to `/decks/:id`
2. Observe initial page (limit=20)
3. Scroll to bottom and click "Load More"
4. Continue loading until all flashcards displayed

**Expected Results:**
- Initial load shows 20 flashcards
- Each "Load More" fetches 20 more
- No duplicate flashcards
- Button hidden after all 250 loaded
- Smooth scrolling performance

**Priority:** P2 (Medium)

---

### 4.6 Error Handling & Edge Cases

#### TC-ERROR-001: Network Failure During API Call
**Preconditions:** Network disconnected
**Steps:**
1. Attempt to create a deck
2. Submit form while offline

**Expected Results:**
- Request fails (network error)
- Error toast: "Network error. Please check your connection."
- Form remains open with data preserved
- User can retry when back online

**Priority:** P1 (High)

#### TC-ERROR-002: Unauthorized Access to Another User's Deck
**Preconditions:** User A logged in, User B's deck ID known
**Steps:**
1. Login as User A
2. Navigate to `/decks/[User-B-Deck-ID]`

**Expected Results:**
- RLS policy blocks query
- HTTP 404 Not Found (deck doesn't exist for User A)
- Error page or redirect to `/decks`
- No data leakage about User B's deck

**Priority:** P0 (Critical - Security)

#### TC-ERROR-003: Expired Session During Action
**Preconditions:** User session expires mid-workflow
**Steps:**
1. Login and navigate to deck
2. Wait for session to expire (or manually expire token)
3. Attempt to create flashcard

**Expected Results:**
- HTTP 401 Unauthorized response
- Error toast: "Session expired. Please login again."
- Redirect to `/login`
- After re-login, redirect back to previous page

**Priority:** P1 (High)

---

## 5. Testing Environment

### 5.1 Development Environment
**Purpose:** Developer local testing during feature development

**Configuration:**
- **Supabase:** Local instance via `supabase start` (Docker containers)
- **Database:** PostgreSQL 15 with migrations applied
- **OpenRouter.ai:** Mock service (MSW) to avoid API costs
- **Port:** `localhost:3000`
- **Node Version:** 20.x LTS
- **Browser:** Latest Chrome, Firefox

**Data:**
- Seeded test users (test@example.com / password123)
- Sample decks with varying flashcard counts (0, 10, 100, 500)
- AI-generated flashcard examples

### 5.2 CI/CD Environment (GitHub Actions)
**Purpose:** Automated testing on every pull request and merge to main

**Configuration:**
- **Runner:** `ubuntu-latest`
- **Node Version:** 20.x
- **Supabase:** In-memory test database
- **OpenRouter.ai:** Fully mocked (no external calls)
- **Browser:** Headless Chrome/Firefox for E2E tests

**Workflows:**
1. **Unit & Integration Tests** (runs on every commit)
2. **Component Tests** (runs on every commit)
3. **E2E Tests** (runs on every PR)
4. **Accessibility Tests** (runs on every PR)
5. **Performance Tests** (runs weekly)

### 5.3 Staging Environment
**Purpose:** Pre-production validation with real integrations

**Configuration:**
- **Hosting:** DigitalOcean (Docker container)
- **Supabase:** Dedicated staging project
- **Database:** PostgreSQL with production-like data volume
- **OpenRouter.ai:** Real API with test API key (spending limit: $5/month)
- **URL:** `https://staging.10xcards.app` (example)

**Data:**
- Production-like data volume (1000+ users, 10000+ flashcards)
- Anonymized production data snapshots
- Refresh weekly from production backups

### 5.4 Production Environment
**Purpose:** Live application for end users

**Configuration:**
- **Hosting:** DigitalOcean (Docker container)
- **Supabase:** Production project with daily backups
- **OpenRouter.ai:** Production API key with monitoring
- **Domain:** `https://10xcards.app`
- **Monitoring:** Sentry for error tracking, Vercel Analytics

**Testing in Production:**
- **Smoke Tests:** Run hourly to verify critical paths (login, deck creation)
- **Synthetic Monitoring:** Uptime checks every 5 minutes
- **Real User Monitoring:** Track actual user session failures

---

## 6. Testing Tools

### 6.1 Unit & Integration Testing

#### Vitest
**Purpose:** Fast, Vite-native test runner for unit and integration tests
**Justification:** Native ESM support, compatibility with Astro build system, faster than Jest
**Installation:**
```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8
```
**Configuration:** `vitest.config.ts`

#### Testing Utilities
**Purpose:** Mocking, assertions, test data generation
- `@faker-js/faker` - Generate realistic test data
- `msw` (Mock Service Worker) - Mock HTTP requests (OpenRouter.ai, Supabase)
- `vitest-mock-extended` - Advanced mocking capabilities

### 6.2 Component Testing

#### React Testing Library
**Purpose:** Test React components from user perspective
**Installation:**
```bash
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

#### Astro Component Testing
**Purpose:** Test Astro components (server-side rendering)
**Approach:** Use Vitest to render Astro components to HTML and validate output

### 6.3 End-to-End Testing

#### Playwright
**Purpose:** Cross-browser E2E testing with excellent SSR support
**Justification:** Better for Astro SSR than Cypress, supports network mocking, parallel execution
**Installation:**
```bash
npm install -D @playwright/test
```
**Browsers:** Chromium, Firefox, WebKit (Safari)
**Configuration:** `playwright.config.ts`

**Features Used:**
- Page Object Model pattern
- Network request mocking
- Screenshot comparison (visual regression)
- Trace recording for debugging failures

### 6.4 Accessibility Testing

#### axe-core
**Purpose:** Automated accessibility testing (WCAG 2.1 compliance)
**Integration:** `@axe-core/playwright` for E2E tests, `vitest-axe` for component tests
**Installation:**
```bash
npm install -D @axe-core/playwright vitest-axe
```

#### Manual Testing Tools
- **NVDA:** Windows screen reader (open source)
- **VoiceOver:** macOS screen reader (built-in)
- **Keyboard Navigation:** Manual tab order verification

### 6.5 Performance Testing

#### Lighthouse CI
**Purpose:** Automated performance, accessibility, SEO auditing
**Installation:**
```bash
npm install -D @lhci/cli
```
**Configuration:** `lighthouserc.json`
**Metrics:** Performance, Accessibility, Best Practices, SEO scores

#### Artillery
**Purpose:** Load testing for API endpoints
**Use Cases:** Test deck/flashcard list pagination under load, concurrent AI generation requests
**Installation:**
```bash
npm install -D artillery
```

### 6.6 Code Coverage

#### Vitest Coverage (v8)
**Purpose:** Track code coverage metrics
**Target:** 80% coverage for service layer, 70% overall
**Configuration:** Integrated with Vitest
**Reports:** HTML, LCOV, JSON

**Commands:**
```bash
npm run test:coverage
```

### 6.7 CI/CD Integration

#### GitHub Actions
**Purpose:** Automated test execution on PR and merge
**Workflows:**
- `.github/workflows/test-unit.yml` - Unit/integration tests
- `.github/workflows/test-e2e.yml` - E2E tests
- `.github/workflows/test-accessibility.yml` - Accessibility audit
- `.github/workflows/test-performance.yml` - Lighthouse CI

**Features:**
- Parallel test execution
- Test result annotations on PRs
- Coverage report comments
- Playwright trace uploads on failures

### 6.8 Monitoring & Observability

#### Sentry
**Purpose:** Production error tracking and performance monitoring
**Integration:** `@sentry/astro` SDK
**Features:**
- Error grouping and alerting
- Session replay for debugging
- Performance transaction tracking

---

## 7. Testing Schedule

### 7.1 Phase 1: Foundation (Weeks 1-2)
**Goal:** Establish testing infrastructure

**Week 1:**
- Set up Vitest configuration and scripts
- Install testing dependencies (Testing Library, Playwright, etc.)
- Configure test environments (local, CI)
- Write example tests for each type (unit, component, E2E)
- Set up code coverage reporting

**Week 2:**
- Implement MSW mocks for OpenRouter.ai
- Configure Supabase test database
- Set up GitHub Actions workflows
- Implement test data seeding scripts
- Document testing conventions

**Deliverables:**
- Fully configured testing infrastructure
- CI/CD pipelines operational
- Developer testing guide

### 7.2 Phase 2: Critical Path Testing (Weeks 3-5)
**Goal:** Test highest-priority features and security

**Week 3: Authentication & Authorization**
- Unit tests for auth services (10 tests)
- Integration tests for auth API endpoints (8 tests)
- Component tests for LoginForm/RegisterForm (6 tests)
- E2E tests for auth flows (5 tests)
- Security tests for RLS policies (8 tests)

**Week 4: AI Flashcard Generation**
- Unit tests for AI service (12 tests)
- Integration tests for generation API (10 tests)
- Component tests for AiGenerationForm (8 tests)
- E2E tests for complete AI flow (4 tests)
- Performance tests for generation latency (3 tests)

**Week 5: AI Review Flow**
- Unit tests for review state management (8 tests)
- Component tests for AiReviewFlow (10 tests)
- E2E tests for review workflow (6 tests)
- Accessibility tests for keyboard shortcuts (5 tests)

**Deliverables:**
- 80+ tests covering critical paths
- All P0 test scenarios implemented
- Security validation complete

### 7.3 Phase 3: Core Features (Weeks 6-7)
**Goal:** Comprehensive coverage of deck and flashcard management

**Week 6: Deck Management**
- Unit tests for deck service (10 tests)
- Integration tests for deck API endpoints (8 tests)
- Component tests for deck components (12 tests)
- E2E tests for deck CRUD operations (5 tests)

**Week 7: Flashcard Management**
- Unit tests for flashcard service (10 tests)
- Integration tests for flashcard API (8 tests)
- Component tests for flashcard components (10 tests)
- E2E tests for flashcard workflows (4 tests)

**Deliverables:**
- 67+ additional tests
- All P1 test scenarios implemented
- 70% overall code coverage achieved

### 7.4 Phase 4: Edge Cases & Optimization (Week 8)
**Goal:** Handle error scenarios and performance edge cases

**Activities:**
- Error handling tests (network failures, timeouts, validation errors)
- Performance tests (large datasets, pagination, query optimization)
- Accessibility manual testing (screen readers, keyboard navigation)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Visual regression testing setup

**Deliverables:**
- All P2 test scenarios implemented
- Performance benchmarks established
- Accessibility audit report

### 7.5 Phase 5: Continuous Testing (Ongoing)
**Goal:** Maintain and expand test coverage as features evolve

**Daily:**
- Developers run unit tests before committing (`npm run test`)
- Pre-commit hooks run linting and type checking

**Per Pull Request:**
- CI runs all unit, integration, component tests
- E2E tests run on staging branch
- Code coverage reports generated
- Accessibility checks for new components

**Weekly:**
- Full E2E test suite runs on staging
- Performance tests with Lighthouse CI
- Review and triage failed tests

**Monthly:**
- Manual accessibility testing session
- Security audit (dependency updates, vulnerability scanning)
- Review test coverage metrics and identify gaps

---

## 8. Test Acceptance Criteria

### 8.1 Code Coverage Thresholds

**Minimum Coverage by Component:**
| Component Type | Minimum Coverage | Target Coverage |
|----------------|------------------|-----------------|
| Service Layer (`src/lib/services/`) | 85% | 90% |
| API Endpoints (`src/pages/api/`) | 80% | 85% |
| Validation Schemas (`src/lib/validation/`) | 90% | 95% |
| Custom Hooks (`src/hooks/`) | 80% | 90% |
| React Components (`src/components/`) | 70% | 80% |
| Overall Codebase | 70% | 80% |

**Coverage Metrics:**
- **Line Coverage:** Percentage of code lines executed
- **Branch Coverage:** Percentage of conditional branches tested
- **Function Coverage:** Percentage of functions called
- **Statement Coverage:** Percentage of statements executed

**Enforcement:**
- CI pipeline fails if coverage drops below minimum threshold
- Pull requests require coverage report review
- New code must include corresponding tests

### 8.2 Test Success Criteria

**All Tests Must:**
1. **Pass Consistently:** No flaky tests allowed (max 1% flakiness rate)
2. **Execute Quickly:** Unit tests < 5 seconds total, E2E tests < 5 minutes total
3. **Be Isolated:** No dependencies between tests, can run in any order
4. **Be Deterministic:** Same input always produces same result
5. **Be Maintainable:** Clear naming, minimal duplication, documented when complex

**Test Quality Gates:**
- ✅ All unit tests pass (0 failures)
- ✅ All integration tests pass (0 failures)
- ✅ All component tests pass (0 failures)
- ✅ All E2E tests pass (0 failures)
- ✅ No accessibility violations (critical/serious)
- ✅ Code coverage meets thresholds
- ✅ Performance budgets met (Lighthouse > 90)

### 8.3 Definition of Done for Features

A feature is considered **complete** only when:
1. ✅ Functional requirements implemented
2. ✅ Unit tests written and passing (service layer)
3. ✅ Integration tests written and passing (API endpoints)
4. ✅ Component tests written and passing (React components)
5. ✅ E2E tests written and passing (critical user flows)
6. ✅ Accessibility audit passed (no critical violations)
7. ✅ Code coverage meets minimum thresholds
8. ✅ Manual testing completed (happy path + edge cases)
9. ✅ Documentation updated (if applicable)
10. ✅ Code review approved by at least one team member

### 8.4 Critical Metrics for MVP Success

**AI Flashcard Acceptance Rate:** ≥ 75%
- **Measurement:** `(Accepted Cards / Total Generated Cards) * 100`
- **Test Validation:** E2E tests must verify batch acceptance endpoint correctly records acceptance rate
- **Data Collection:** Track in production via analytics events

**AI Usage Rate:** ≥ 75%
- **Measurement:** `(AI-Generated Flashcards / Total Flashcards) * 100`
- **Test Validation:** Database queries must correctly calculate `is_ai_generated` percentage
- **Data Collection:** SQL query on `flashcards` table

**Test Coverage for MVP Features:**
- AI Generation: 90% coverage (critical path)
- AI Review Flow: 85% coverage (critical path)
- Authentication: 85% coverage (security-critical)
- Deck/Flashcard CRUD: 80% coverage (core functionality)

---

## 9. Roles and Responsibilities

### 9.1 Development Team

#### Lead Developer
**Responsibilities:**
- Establish testing infrastructure and conventions
- Review and approve test architecture decisions
- Mentor team on testing best practices
- Monitor code coverage trends
- Approve pull requests with test requirements

**Testing Duties:**
- Write tests for critical service layer components
- Review complex test scenarios
- Resolve flaky test issues
- Optimize test performance

#### Frontend Developers
**Responsibilities:**
- Write component tests for React components
- Write E2E tests for user-facing features
- Ensure accessibility compliance in new components
- Fix bugs identified through testing

**Testing Duties:**
- Minimum 70% coverage for components they develop
- Write tests before or alongside feature code (TDD encouraged)
- Run tests locally before committing
- Fix failing tests in their PRs

#### Backend Developers
**Responsibilities:**
- Write unit tests for service layer
- Write integration tests for API endpoints
- Ensure database migrations include test data
- Validate RLS policies with security tests

**Testing Duties:**
- Minimum 85% coverage for services and API endpoints
- Write Zod schema tests for all validation logic
- Mock external dependencies (Supabase, OpenRouter.ai)
- Test error handling and edge cases

### 9.2 QA Engineer (if applicable)

**Responsibilities:**
- Design comprehensive test scenarios and test cases
- Execute manual testing for exploratory and usability testing
- Perform accessibility audits (WCAG 2.1 compliance)
- Coordinate user acceptance testing (UAT)
- Maintain test documentation

**Testing Duties:**
- Create detailed test plans for new features
- Perform cross-browser and device testing
- Conduct performance testing (load, stress tests)
- Verify bug fixes and regression testing
- Report and triage bugs in issue tracker

### 9.3 DevOps Engineer

**Responsibilities:**
- Maintain CI/CD pipelines for automated testing
- Configure test environments (staging, CI runners)
- Monitor test execution performance and reliability
- Set up test result reporting and dashboards
- Manage Supabase test database infrastructure

**Testing Duties:**
- Ensure CI tests run on every PR
- Investigate and fix CI pipeline failures
- Optimize test execution time (parallelization, caching)
- Integrate coverage reports into PR comments
- Set up error monitoring (Sentry) for production

### 9.4 Product Owner

**Responsibilities:**
- Define acceptance criteria for features
- Prioritize bug fixes based on severity and impact
- Approve UAT test results before release
- Monitor MVP success metrics (75% AI acceptance, 75% AI usage)

**Testing Duties:**
- Review test scenarios align with business requirements
- Participate in UAT sessions
- Validate that test coverage aligns with user stories
- Approve release candidates based on test results

---

## 10. Bug Reporting Procedures

### 10.1 Bug Severity Levels

#### P0 - Critical (Blocker)
**Definition:** Prevents core functionality, security vulnerability, data loss
**Examples:**
- Authentication completely broken (no one can login)
- AI generation returns 500 errors for all requests
- Database RLS allows cross-user data access
- Application crashes on startup

**Response Time:** Immediate (within 1 hour)
**Resolution Time:** Same day
**Notification:** Alert entire team via Slack, page on-call engineer

#### P1 - High (Major)
**Definition:** Major feature broken, significant user impact, workaround exists
**Examples:**
- AI review flow allows accepting deleted cards
- Deck deletion fails to cascade to flashcards
- Character counter displays incorrect count
- Session expires prematurely (< 1 hour)

**Response Time:** Within 4 hours
**Resolution Time:** 1-2 days
**Notification:** Notify team lead and assigned developer

#### P2 - Medium (Minor)
**Definition:** Non-critical feature issue, usability problem, limited impact
**Examples:**
- Load More button doesn't update text
- Toast notification disappears too quickly
- Password requirements not updating in real-time
- Pagination skips one item

**Response Time:** Within 1 business day
**Resolution Time:** 1 week
**Notification:** Create issue, assign to sprint

#### P3 - Low (Trivial)
**Definition:** Cosmetic issue, typo, minor UI inconsistency
**Examples:**
- Button hover color slightly off brand
- Tooltip text has typo
- Spacing inconsistent on one page
- Icon not perfectly centered

**Response Time:** Next sprint planning
**Resolution Time:** Best effort
**Notification:** Backlog item

### 10.2 Bug Report Template

**Title:** [Component] Short description (e.g., "AI Generation - Timeout not handled")

**Severity:** P0 / P1 / P2 / P3

**Environment:**
- Browser: Chrome 120.0.6099.109
- OS: Windows 11
- Environment: Production / Staging / Development
- User: Authenticated / Anonymous

**Steps to Reproduce:**
1. Navigate to `/decks/123/generate`
2. Paste 5000-character text
3. Click "Generate Flashcards"
4. Wait 35 seconds (exceeds 30s timeout)

**Expected Behavior:**
Error message appears: "Generation timed out. Please try again."
User redirected to generation page with text preserved.

**Actual Behavior:**
Infinite loading spinner. No error message.
User stuck on loading page.

**Screenshots/Videos:**
[Attach screenshot or recording]

**Error Logs:**
```
TypeError: Cannot read property 'candidates' of undefined
  at parseResponse (ai.service.ts:45)
```

**Additional Context:**
- Happens on 3rd generation attempt in same session
- sessionStorage may not be clearing properly

**Related Issues:** #123, #456

### 10.3 Bug Triage Process

**Step 1: Bug Submission**
- Developer/QA/User submits bug via GitHub Issues
- Uses bug report template
- Tags with label: `bug`, `needs-triage`

**Step 2: Initial Triage (Daily)**
- Team lead reviews new bugs
- Assigns severity (P0-P3)
- Assigns to developer or sprint
- Adds labels: `frontend`, `backend`, `database`, `ai`, `security`, `accessibility`

**Step 3: Investigation**
- Assigned developer reproduces bug
- Identifies root cause
- Estimates effort (S/M/L/XL)
- Updates issue with findings
- Changes status to `in-progress`

**Step 4: Fix & Testing**
- Developer implements fix
- Writes regression test to prevent recurrence
- Submits PR with reference to issue (`Fixes #123`)
- CI runs all tests automatically
- Code review required

**Step 5: Verification**
- QA verifies fix in staging environment
- Runs regression tests manually
- Checks related functionality not broken
- Approves or requests changes

**Step 6: Deployment & Closure**
- Fix merged to main branch
- Deployed to production
- Issue automatically closed (via `Fixes #123`)
- Monitor production for 24 hours
- If recurs, reopen issue with `regression` label

### 10.4 Bug Tracking Metrics

**KPIs to Monitor:**
1. **Time to First Response:** Median time from bug report to first comment
2. **Time to Resolution:** Median time from report to production fix (by severity)
3. **Bug Escape Rate:** Bugs found in production vs caught in testing
4. **Regression Rate:** Percentage of bugs that recur after being fixed
5. **Open Bug Count:** Total open bugs by severity (target: < 10 P1+, < 50 total)

**Weekly Review:**
- Review all P0/P1 bugs in team meeting
- Identify patterns (e.g., AI service failures, validation issues)
- Adjust testing strategy to prevent similar bugs
- Celebrate bug-free weeks

---

## 11. Risk Management

### 11.1 Testing Risks

**Risk 1: No Existing Testing Infrastructure**
- **Impact:** High - Delays testing implementation by 2 weeks
- **Probability:** Certain (current state)
- **Mitigation:** Allocate Phase 1 (Weeks 1-2) entirely to infrastructure setup
- **Contingency:** Use manual testing for critical paths until automation ready

**Risk 2: AI Service Dependency (OpenRouter.ai)**
- **Impact:** High - Cannot test AI generation in CI without mocks
- **Probability:** Medium - External service may be unreliable
- **Mitigation:** Implement comprehensive MSW mocks for all AI scenarios
- **Contingency:** Provide mock mode toggle in test environment

**Risk 3: Flaky E2E Tests**
- **Impact:** Medium - False positives slow down development
- **Probability:** High - Network timing, async operations
- **Mitigation:** Use Playwright's auto-wait, network mocking, strict locators
- **Contingency:** Automatic retry (max 2x) for E2E tests in CI

**Risk 4: Test Maintenance Burden**
- **Impact:** Medium - Tests become outdated as features evolve
- **Probability:** Medium - Rapid feature development expected
- **Mitigation:** Follow Page Object Model, centralized test data, clear documentation
- **Contingency:** Allocate 20% of sprint time to test maintenance

**Risk 5: Insufficient QA Resources**
- **Impact:** High - Manual testing gaps (accessibility, cross-browser)
- **Probability:** Medium - Small team, limited QA expertise
- **Mitigation:** Automate as much as possible, use axe-core for accessibility
- **Contingency:** Contract external QA consultants for critical releases

### 11.2 Priority Areas Requiring Extra Attention

#### Authentication & Authorization (CRITICAL)
**Why Critical:**
- Security vulnerability could expose all user data
- RLS policies must be bulletproof
- JWT validation essential for session security

**Extra Testing:**
- Penetration testing for auth endpoints
- Manual RLS policy verification with multiple test users
- Session expiration edge cases (timezone, clock skew)
- OWASP Top 10 vulnerability scanning

#### AI Flashcard Generation (CRITICAL - MVP Feature)
**Why Critical:**
- Primary value proposition of the product
- 75% acceptance rate is MVP success metric
- External dependency on OpenRouter.ai
- Complex parsing logic prone to errors

**Extra Testing:**
- Extensive mocking of AI responses (valid, invalid, malformed)
- Performance testing under load (concurrent requests)
- Timeout and retry logic validation
- Content validation (harmful content filtering if applicable)

#### Database Migrations (HIGH RISK)
**Why Critical:**
- Destructive operations cannot be undone in production
- RLS policy changes could break existing functionality
- Schema changes affect all queries

**Extra Testing:**
- Test migrations on production-like data volumes
- Rollback procedures documented and tested
- RLS policies tested before and after migration
- Performance impact measured (query explain plans)

#### Pagination & Large Datasets (MEDIUM RISK)
**Why Critical:**
- Performance degrades with 500+ flashcards per deck
- OFFSET pagination inefficient at large offsets
- Potential for data skipping or duplication

**Extra Testing:**
- Load testing with 10,000+ flashcards
- Pagination edge cases (empty results, single page, many pages)
- Consider keyset pagination for future optimization

---

## 12. Appendix

### 12.1 Test Naming Conventions

**Unit Tests:**
```typescript
describe('DeckService', () => {
  describe('createDeck', () => {
    it('should create deck with valid name and user ID', async () => {});
    it('should throw error when deck name already exists for user', async () => {});
    it('should allow same deck name for different users', async () => {});
  });
});
```

**Integration Tests:**
```typescript
describe('POST /api/decks', () => {
  it('should return 201 and deck when authenticated user creates valid deck', async () => {});
  it('should return 401 when user is not authenticated', async () => {});
  it('should return 409 when deck name is duplicate', async () => {});
});
```

**Component Tests:**
```typescript
describe('AiGenerationForm', () => {
  it('should disable submit button when character count is below 1000', () => {});
  it('should call onSubmit with text when form is valid', () => {});
  it('should display character counter in red when count exceeds 10000', () => {});
});
```

**E2E Tests:**
```typescript
test.describe('AI Flashcard Generation Flow', () => {
  test('should generate and review flashcards successfully', async ({ page }) => {});
  test('should handle OpenRouter.ai timeout gracefully', async ({ page }) => {});
});
```

### 12.2 Key File Locations

**Configuration Files:**
- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `lighthouserc.json` - Lighthouse CI configuration
- `.github/workflows/test-*.yml` - CI workflows

**Test Directories:**
- `src/__tests__/unit/` - Unit tests (mirrors src/ structure)
- `src/__tests__/integration/` - Integration tests (API endpoints)
- `src/__tests__/components/` - Component tests
- `tests/e2e/` - End-to-end tests (Playwright)
- `tests/fixtures/` - Test data fixtures
- `tests/mocks/` - MSW mock handlers

**Test Utilities:**
- `tests/utils/test-helpers.ts` - Shared test utilities
- `tests/utils/db-helpers.ts` - Database seeding and cleanup
- `tests/utils/auth-helpers.ts` - Authentication test helpers
- `tests/mocks/handlers.ts` - MSW request handlers

### 12.3 Recommended Reading

**Testing Philosophy:**
- [Testing Library Guiding Principles](https://testing-library.com/docs/guiding-principles/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Vitest Documentation](https://vitest.dev/guide/)

**Accessibility:**
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

**Security:**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

---

**Note:** This test plan is a living document and should be updated as the project evolves. All team members are encouraged to propose improvements through pull requests.
