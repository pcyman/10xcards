# UI Architecture for AI Flashcard Learning Platform

## 1. UI Structure Overview

The AI Flashcard Learning Platform is a server-side rendered (SSR) web application built with Astro 5 and React 19. The architecture follows a simple, focused approach designed for a 2-week MVP development timeline. The UI consists of 7 primary views and 2 reusable modal components, organized around three core user workflows: deck management, AI-powered flashcard generation, and spaced repetition study sessions.

### Architecture Principles

- **Simplicity First**: Minimal UI complexity aligned with MVP scope
- **Component Isolation**: Astro components for static content, React components for interactivity
- **API-Driven**: All data operations through RESTful endpoints
- **Responsive Design**: Mobile-first approach with Tailwind CSS 4
- **Accessibility**: ARIA landmarks, semantic HTML, keyboard navigation
- **Progressive Enhancement**: Server-rendered content with client-side interactivity

### Technology Integration

- **Astro 5**: SSR framework with file-based routing
- **React 19**: Functional components for interactive islands
- **Supabase**: Authentication and PostgreSQL database with RLS
- **Tailwind CSS 4**: Utility-first styling
- **Shadcn/ui**: Accessible component library (New York style, neutral)

## 2. View List

### 2.1 Login View

**Path**: `/login`
**Authentication**: Public (redirects to `/decks` if authenticated)

**Main Purpose**
Authenticate existing users with username (email) and password, providing immediate access to their flashcard decks.

**Key Information to Display**
- Email input field with label
- Password input field with label
- Login button (primary CTA)
- Link to registration page
- Error message area for failed authentication
- Session persistence indication

**Key View Components**
- `LoginForm.tsx` - React component handling form submission
- `Input` (Shadcn/ui) - Email and password fields
- `Button` (Shadcn/ui) - Login action
- Error message display (inline, below form)

**API Integration**
- Supabase authentication via `supabase.auth.signInWithPassword()`
- Redirects to `/decks` on success
- Returns to login with error message on failure

**UX Considerations**
- Auto-focus on email field on page load
- Clear, non-technical error messages ("Invalid username or password")
- Loading state on submit button during authentication
- Password field with show/hide toggle
- Enter key submits form

**Accessibility**
- Semantic `<form>` element
- Associated `<label>` for each input with `for` attribute
- `aria-invalid` on fields with validation errors
- `aria-describedby` linking inputs to error messages
- Focus visible indicators on all interactive elements

**Security**
- No password autocomplete on login form
- HTTPS enforced in production
- JWT tokens stored in httpOnly cookies (Supabase)
- Generic error messages (don't reveal whether email or password was wrong)

**Edge Cases**
- Session expiration redirects here with message
- Invalid credentials show generic error
- Network failures show toast notification

---

### 2.2 Registration View

**Path**: `/register`
**Authentication**: Public (redirects to `/decks` if authenticated)

**Main Purpose**
Enable new users to create accounts immediately without email verification, providing instant access to the platform.

**Key Information to Display**
- Email input field with validation
- Password input field with requirements display
- Password confirmation field
- Register button (primary CTA)
- Link to login page
- Validation error messages (inline)
- Password requirements checklist

**Key View Components**
- `RegisterForm.tsx` - React component with validation
- `Input` (Shadcn/ui) - Form fields
- `Button` (Shadcn/ui) - Registration action
- Password strength indicator
- Validation error display

**API Integration**
- Supabase authentication via `supabase.auth.signUp()`
- Auto-login after successful registration
- Redirects to `/decks` immediately
- No email verification step

**UX Considerations**
- Real-time password validation feedback
- Clear password requirements (minimum 8 characters)
- Auto-focus on email field
- Unique email validation on blur
- Loading state during registration
- Success feedback before redirect

**Accessibility**
- Semantic `<form>` element
- Labels properly associated with inputs
- `aria-describedby` for password requirements
- `aria-invalid` and `aria-errormessage` for validation
- Live region for validation feedback (`aria-live="polite"`)
- Keyboard navigation support

**Security**
- Password minimum 8 characters
- Email uniqueness validated server-side
- No password autocomplete
- Client and server-side validation
- XSS protection via framework escaping

**Edge Cases**
- Duplicate email shows specific error
- Weak passwords rejected with feedback
- Network errors show toast notification
- Form submission disabled during processing

---

### 2.3 Deck List View (Main Dashboard)

**Path**: `/decks`
**Authentication**: Required (redirected to `/login` if unauthenticated)

**Main Purpose**
Serve as the primary navigation hub displaying all user's decks with key statistics, enabling quick access to study sessions and deck management.

**Key Information to Display**
- Top navigation bar (logo, "My Decks", user menu with logout)
- "Create Deck" button (above deck grid)
- Responsive grid of deck cards showing:
  - Deck name (prominent)
  - Total flashcard count
  - Cards due for review (highlighted if > 0)
  - Action buttons (Study, View, Edit, Delete)
- Empty state when no decks exist
- Loading state during data fetch

**Key View Components**
- `Layout.astro` - Base layout with navigation
- `DeckCard.tsx` - React component for each deck with actions
- `CreateDeckModal.tsx` - Modal for deck creation
- `ConfirmDialog.tsx` - Deletion confirmation
- `Toast.tsx` - Success/error notifications
- `Card`, `Badge`, `Button` (Shadcn/ui)

**API Integration**
- SSR fetch: `GET /api/decks` with pagination support
- Client-side: `POST /api/decks` (create)
- Client-side: `DELETE /api/decks/:id` (delete)
- Client-side: `PATCH /api/decks/:id` (edit name)

**Data Structure**
```typescript
{
  data: [
    {
      id: string,
      name: string,
      created_at: timestamp,
      updated_at: timestamp,
      total_flashcards: number,
      cards_due: number
    }
  ],
  pagination: {
    page: number,
    limit: number,
    total: number,
    total_pages: number
  }
}
```

**UX Considerations**
- Responsive grid: 1 column (mobile) → 2 columns (tablet) → 2-3 columns (desktop)
- Decks with due reviews have visual accent (blue border/badge)
- Hover effects on deck cards
- "Start Study" button primary if cards due, otherwise "View Deck"
- Create deck button prominently placed
- Empty state with friendly message and large CTA
- Quick actions accessible without entering deck
- Loading skeleton states for deck cards

**Accessibility**
- `<main>` landmark for deck grid
- Each deck card as `<article>`
- `aria-label` on icon-only buttons
- `aria-current="page"` on "My Decks" nav link
- Keyboard navigation between deck cards
- Focus trap in create/delete modals
- Screen reader announcement for deck statistics

**Security**
- RLS ensures users only see their own decks
- CSRF protection on POST/PATCH/DELETE
- Input validation for deck names

**Navigation**
- "Create Deck" button opens modal
- Clicking deck card navigates to `/decks/[id]`
- "Start Study" button navigates to `/decks/[id]/study`
- Edit/Delete actions handled inline with modals
- User menu provides logout action

**Edge Cases**
- Empty state: "Welcome! Create your first deck to get started"
- No cards due: Study button disabled with tooltip
- Loading state: Skeleton cards during fetch
- Error state: Toast notification with retry option
- Delete confirmation: Modal warning about permanent deletion

---

### 2.4 Deck Detail View

**Path**: `/decks/[id]`
**Authentication**: Required

**Main Purpose**
Display all flashcards within a specific deck, provide deck management actions, and serve as the gateway to AI generation, manual creation, and study sessions.

**Key Information to Display**
- Top navigation (consistent across app)
- Deck header section:
  - Deck name (editable inline or via modal)
  - Total flashcard count
  - Cards due badge
  - Action buttons: "Generate with AI", "Create Flashcard", "Start Study"
- Flashcard list displaying:
  - Front text (truncated if long)
  - Back text (truncated if long)
  - AI generation badge (if applicable)
  - Creation date
  - Last modified date (if edited)
  - Edit and Delete buttons per card
- "Load More" button for pagination (if > 50 cards)
- Empty state when deck has no flashcards

**Key View Components**
- `DeckHeader.tsx` - React component with deck stats and actions
- `FlashcardList.tsx` - Paginated list with load more
- `FlashcardListItem.tsx` - Individual card display
- `FlashcardModal.tsx` - Create/edit modal
- `ConfirmDialog.tsx` - Delete confirmation
- `Badge` (Shadcn/ui) - AI indicator, cards due
- `Card`, `Button`, `Separator` (Shadcn/ui)

**API Integration**
- SSR fetch: `GET /api/decks/:id` (deck details)
- SSR fetch: `GET /api/decks/:deckId/flashcards?page=1&limit=50`
- Client-side: `GET /api/decks/:deckId/flashcards?page=X` (load more)
- Client-side: `POST /api/decks/:deckId/flashcards` (create)
- Client-side: `PATCH /api/flashcards/:id` (edit)
- Client-side: `DELETE /api/flashcards/:id` (delete)

**Data Structure**
```typescript
// Deck
{
  id: string,
  name: string,
  created_at: timestamp,
  updated_at: timestamp,
  total_flashcards: number,
  cards_due: number,
  next_review_date: date | null
}

// Flashcards
{
  data: [
    {
      id: string,
      deck_id: string,
      front: string,
      back: string,
      is_ai_generated: boolean,
      next_review_date: date,
      created_at: timestamp,
      updated_at: timestamp
    }
  ],
  pagination: {...}
}
```

**UX Considerations**
- Single scrollable page (no tabs)
- Action buttons in sticky header on scroll
- Flashcards displayed in cards with subtle borders
- Front/back text truncated with "Read more" if > 200 chars
- AI badge subtly positioned (top-right of card)
- Edit/Delete icons on hover (always visible on mobile)
- "Load More" loads next 50 cards, smooth scroll
- Empty state shows two CTAs: "Generate with AI" (primary), "Create Manually" (secondary)
- Visual feedback on card edit/delete
- Optimistic UI updates after actions

**Accessibility**
- Deck header in `<header>` with `aria-label="Deck information"`
- Flashcard list as `<ul>` with `role="list"`
- Each flashcard as `<li>` with `<article>`
- Edit/Delete buttons with `aria-label` (e.g., "Edit flashcard: [front text]")
- AI badge with `aria-label="AI-generated flashcard"`
- "Start Study" button `aria-disabled="true"` when no cards due
- Load More button with `aria-label="Load more flashcards (X remaining)"`

**Security**
- RLS ensures users only access their own decks
- 404 response if deck doesn't belong to user
- Input validation on create/edit
- Confirmation required for destructive actions

**Navigation**
- "Generate with AI" → `/decks/[id]/generate`
- "Create Flashcard" → Opens modal
- "Start Study" → `/decks/[id]/study`
- Back to deck list via top nav "My Decks" link
- Edit flashcard opens modal
- Delete shows confirmation dialog

**Edge Cases**
- Empty deck: Friendly message with AI generation and manual creation CTAs
- No cards due: "Start Study" disabled with tooltip "No cards due for review today"
- Flashcard list exceeds 50: Show "Load More" button
- Loading more cards: Button shows spinner
- Delete last flashcard: Updates to empty state
- Long flashcard text: Truncate with ellipsis, expand on click or in modal

---

### 2.5 AI Generation Input View

**Path**: `/decks/[id]/generate`
**Authentication**: Required

**Main Purpose**
Accept text input from users (1000-10000 characters) for AI-powered flashcard generation, providing clear validation feedback and initiating the generation process.

**Key Information to Display**
- Top navigation (consistent)
- Page header: "Generate Flashcards with AI"
- Deck name context (e.g., "for [Deck Name]")
- Large textarea for text input
- Character counter with color states:
  - Gray (0-999): "X / 10,000 characters"
  - Green (1000-10000): "X / 10,000 characters - Ready to generate"
  - Red (10001+): "X / 10,000 characters - Exceeds maximum"
- Status message below counter:
  - "Minimum 1,000 characters required"
  - "Ready to generate"
  - "Exceeds maximum of 10,000 characters"
- Submit button (disabled when invalid)
- Cancel button (returns to deck detail)
- Loading screen during generation with:
  - Animated spinner
  - Progress messages ("Analyzing your text...", "Generating flashcards...", "Almost done...")
  - Estimated time indication
  - Cancel option

**Key View Components**
- `AiGenerationForm.tsx` - React component with validation
- `CharacterCounter.tsx` - Real-time counter with states
- `LoadingScreen.tsx` - AI generation progress
- `Textarea` (Shadcn/ui) - Text input
- `Button` (Shadcn/ui) - Submit/Cancel
- `Progress` (Shadcn/ui) - Loading indicator

**API Integration**
- Client-side: `POST /api/decks/:deckId/flashcards/generate`
- Request: `{ text: string }`
- Success response: `{ candidates: [{front, back}], total_generated: number }`
- Error response: `{ error: "Generation failed, please try again" }`

**UX Considerations**
- Auto-focus on textarea on page load
- Real-time character counting (debounced)
- Submit button clearly disabled when count < 1000 or > 10000
- Color coding provides instant visual feedback
- Loading screen with progress messages (rotates every 3-5 seconds)
- Cancel during generation returns to deck detail
- Error handling via toast notification
- Browser confirmation on navigation with unsaved text

**Accessibility**
- `<form>` with proper semantics
- `<label>` for textarea with `for` attribute
- Character counter as `aria-live="polite"` region
- Status message with `aria-live="polite"`
- Submit button with `aria-disabled="true"` when invalid
- Loading screen with `aria-busy="true"` and `aria-live="assertive"` for progress messages
- Keyboard shortcut (Ctrl+Enter) to submit when valid

**Security**
- Client-side validation (length)
- Server-side validation (1000-10000 chars)
- Input sanitization to prevent XSS
- Original text NOT stored in database
- Rate limiting on AI endpoint (10 requests/hour per user)

**Validation**
- Real-time: Character count with color states
- On-submit: Final check before API call
- Error display: Status message updates in real-time
- Submit button disabled when invalid

**Navigation**
- Cancel button → Back to `/decks/[id]`
- Successful generation → Navigate to `/decks/[id]/review` with candidates in state
- Failed generation → Stay on page with error toast

**Edge Cases**
- Character count exactly 1000 or 10000: Valid (inclusive)
- Paste large text: Immediate validation feedback
- AI service failure: Error toast "Generation failed, please try again"
- Network timeout: Error toast with retry option
- Empty textarea: Submit disabled, status shows minimum requirement
- Browser back with unsaved text: Confirmation dialog

---

### 2.6 AI Review View

**Path**: `/decks/[id]/review`
**Authentication**: Required
**Special**: Full-page layout (navigation hidden)

**Main Purpose**
Display AI-generated flashcard candidates for user review, allowing acceptance or rejection of each card to maintain quality control over study materials.

**Key Information to Display**
- Page header: "Review Generated Flashcards"
- Progress indication: "X remaining" or "X of Y reviewed"
- Scrollable vertical list of all candidates (minimum 5)
- Each candidate card showing:
  - Front text (prominent, top)
  - Back text (below front)
  - "Accept" button (primary, green)
  - "Discard" button (secondary, gray)
- Footer with summary:
  - "X cards accepted"
  - "Done Reviewing" button (after all processed)
- Empty state if all cards processed: "All cards reviewed! X accepted."

**Key View Components**
- `AiReviewFlow.tsx` - Main review container
- `AiCandidateCard.tsx` - Individual candidate with actions
- `ReviewProgress.tsx` - Progress header
- `Card` (Shadcn/ui) - Candidate display
- `Button` (Shadcn/ui) - Accept/Discard/Done

**API Integration**
- Receives candidates from generation step (via state/URL params)
- Client-side: `POST /api/decks/:deckId/flashcards/batch` when done
- Request: `{ flashcards: [{front, back}] }` (only accepted cards)
- Response: `{ created: [...flashcards], total_created: number }`

**Data Structure**
```typescript
// Candidates (in-memory, not persisted)
{
  candidates: [
    { front: string, back: string, status: 'pending' | 'accepted' | 'discarded' }
  ]
}

// Batch acceptance request
{
  flashcards: [
    { front: string, back: string }
  ]
}
```

**UX Considerations**
- All candidates visible in scrollable list (not one-by-one)
- Cards fade out with animation when accepted/discarded
- Accept button highlighted if user hovers
- Progress updates in real-time as cards processed
- "Done Reviewing" appears after at least one action
- Can accept all, some, or none
- Summary shows count of accepted cards
- Success toast on completion: "X flashcards added to [Deck Name]"
- Automatic redirect to deck detail after submission

**Accessibility**
- Full-page `<main>` with `aria-label="AI flashcard review"`
- Progress header as `<header>` with `aria-live="polite"`
- Candidate list as `<ul role="list">`
- Each candidate as `<li>` with `<article>`
- Accept/Discard buttons with clear labels
- Keyboard shortcuts: A (accept), D (discard), Enter (done)
- Focus management: After action, focus moves to next candidate
- Screen reader announces: "Card accepted" or "Card discarded"

**Security**
- Candidates passed via encrypted session state (not URL)
- Server-side validation of flashcard content
- Rate limiting on batch endpoint
- XSS protection on displayed text

**Validation**
- Front and back cannot be empty (validated on generation)
- Accept button creates flashcard with `is_ai_generated: true`
- Batch submission requires at least one accepted card

**Navigation**
- No traditional navigation (full-page)
- "Done Reviewing" → Submit accepted cards → Navigate to `/decks/[id]` with success message
- Browser back: Confirmation dialog (lose review progress)
- Escape key: Confirmation dialog to exit without saving

**Edge Cases**
- All cards discarded: "0 flashcards added" message, return to deck detail
- Accept all: Quick "Accept All" button option (stretch goal)
- Network failure on submit: Error toast, retry option, review state preserved
- Accidentally discard: No undo in MVP (user must generate again)
- Long text in cards: Scrollable card content, max height with overflow

---

### 2.7 Study Session View

**Path**: `/decks/[id]/study`
**Authentication**: Required
**Layout**: Standard layout with navigation visible

**Main Purpose**
Enable users to review due flashcards using spaced repetition, displaying cards one at a time with difficulty rating to optimize learning retention.

**Key Information to Display**
- Top navigation (consistent)
- Study session header:
  - Deck name
  - Progress indicator: "Card X of Y"
  - "Exit Study" button
- Flashcard display area:
  - Initially: Front text only (large, centered)
  - "Reveal Answer" button (primary)
  - After reveal: Back text (below front)
  - Difficulty rating buttons (after reveal):
    - "Again" (red, rating 0)
    - "Hard" (yellow, rating 1)
    - "Good" (blue, rating 2)
    - "Easy" (green, rating 3)
- Completion screen when finished:
  - Success message: "Great work! You reviewed X cards."
  - Statistics: Session summary
  - "Back to Deck" button
  - "Review More" button (if more cards available)

**Key View Components**
- `StudySession.tsx` - Main study container with state
- `StudyCard.tsx` - Card display with reveal logic
- `DifficultyButtons.tsx` - Rating buttons with colors
- `StudyProgress.tsx` - Header with progress
- `StudyComplete.tsx` - Completion screen
- `Button`, `Card`, `Progress` (Shadcn/ui)

**API Integration**
- SSR fetch: `GET /api/decks/:deckId/flashcards/due?limit=50`
- Client-side: `POST /api/flashcards/:id/review` (for each rating)
- Request: `{ difficulty_rating: 0 | 1 | 2 | 3 }`
- Response: `{ flashcard: {...}, review: {...} }`

**Data Structure**
```typescript
// Due cards
{
  data: [
    {
      id: string,
      front: string,
      back: string,
      ease_factor: number,
      interval_days: number,
      repetitions: number
    }
  ],
  total_due: number
}

// Review submission
{
  difficulty_rating: 0 | 1 | 2 | 3
}

// Review response
{
  flashcard: {
    id: string,
    next_review_date: date,
    ease_factor: number,
    interval_days: number,
    repetitions: number,
    updated_at: timestamp
  },
  review: {
    id: string,
    reviewed_at: timestamp,
    difficulty_rating: number,
    next_review_date: date
  }
}
```

**UX Considerations**
- Clean, distraction-free interface
- Large, readable text for card content
- Clear visual separation between front and back
- "Reveal Answer" button prominent and centered
- Difficulty buttons appear only after reveal
- Color coding matches difficulty (red = again, green = easy)
- Auto-advance to next card after rating
- Progress bar at top shows completion
- Keyboard shortcuts for ratings (1, 2, 3, 4)
- Exit study shows confirmation if in progress
- Completion screen provides positive reinforcement
- Session limited to 50 cards (load more if needed)

**Accessibility**
- Study header as `<header>` with `aria-label="Study session"`
- Card display in `<main>` with `<article>`
- "Reveal Answer" button with focus on page load
- Difficulty buttons with clear text labels (not just colors)
- `aria-live="polite"` for progress updates
- Keyboard shortcuts announced in screen reader
- Focus management: After rating, focus on next "Reveal Answer"
- Completion screen as `<section>` with heading

**Security**
- RLS ensures users only study their own cards
- Review submissions validated server-side
- Session state managed securely

**Study Flow**
1. Load due cards from API
2. Display first card (front only)
3. User attempts recall
4. User clicks "Reveal Answer"
5. Front and back both visible
6. User selects difficulty rating
7. Submit rating to API
8. SRS algorithm calculates next review date
9. Auto-advance to next card
10. Repeat until all cards reviewed
11. Display completion screen

**Validation**
- Difficulty rating must be 0-3
- Cannot rate before revealing answer
- Cannot skip cards without rating

**Navigation**
- "Exit Study" → Confirmation dialog → Return to `/decks/[id]`
- Completion screen "Back to Deck" → `/decks/[id]`
- Top nav "My Decks" → Confirmation if study in progress

**Edge Cases**
- No cards due: Shouldn't reach this view (button disabled)
- Single card due: Progress shows "1 of 1"
- Network failure on submit: Error toast, retry option, card remains in queue
- Long card text: Scrollable content area
- Accidentally clicked wrong rating: No undo in MVP
- Session interruption: Progress lost, cards re-queued (not reviewed)
- Exit confirmation: "Exit study session? Your progress will be lost."

---

### 2.8 Flashcard Create/Edit Modal (Component)

**Context**: Overlay modal triggered from Deck Detail View
**Authentication**: Inherited from parent view

**Main Purpose**
Provide a focused interface for creating new flashcards or editing existing ones, with validation and clear feedback.

**Key Information to Display**
- Modal header: "Create Flashcard" or "Edit Flashcard"
- Front text field:
  - Label: "Front"
  - Placeholder: "Enter the question or prompt"
  - Validation error (inline, below field)
- Back text field:
  - Label: "Back"
  - Placeholder: "Enter the answer or explanation"
  - Validation error (inline, below field)
- Action buttons:
  - "Cancel" (secondary, left-aligned)
  - "Save" (primary, right-aligned, disabled when invalid)
- Unsaved changes warning if dismissed with edits

**Key View Components**
- `FlashcardModal.tsx` - Main modal container
- `Dialog` (Shadcn/ui) - Modal structure
- `Input` or `Textarea` (Shadcn/ui) - Form fields
- `Button` (Shadcn/ui) - Actions

**API Integration**
- Create: `POST /api/decks/:deckId/flashcards`
- Edit: `PATCH /api/flashcards/:id`
- Request: `{ front: string, back: string }`
- Response: Full flashcard object

**UX Considerations**
- Modal centered on desktop (~600px wide)
- Full-screen on mobile
- Auto-focus on front field when opened
- Real-time character count if limits added (future)
- On-blur validation (show errors when field loses focus)
- Save button disabled until both fields valid
- Enter key in fields moves to next field (not submit)
- Shift+Enter to submit form
- Smooth open/close animations
- Click backdrop or Escape key to dismiss (with confirmation)
- Loading state on save button during API call

**Accessibility**
- `<dialog>` element or `role="dialog"`
- `aria-labelledby` pointing to modal title
- `aria-modal="true"`
- Focus trap (Tab cycles within modal)
- Focus on close button when opened
- Focus returns to trigger button when closed
- Escape key closes modal
- Screen reader announces modal opening

**Security**
- Input sanitization to prevent XSS
- Front and back fields validated (not empty, not whitespace-only)
- CSRF protection on POST/PATCH

**Validation**
- On-blur: Check if field is empty
- On-submit: Final validation
- Inline errors: Red text below field
- Error messages:
  - "Front cannot be empty"
  - "Back cannot be empty"
  - "This field cannot contain only whitespace"

**Validation Rules**
- Front: Required, not empty, not whitespace-only
- Back: Required, not empty, not whitespace-only
- No rich text (plain text only)

**Modal Behavior**
- Create mode: Empty fields, saves to deck
- Edit mode: Pre-populated with existing values
- Successful save: Modal closes, toast notification, deck detail updates
- Failed save: Modal stays open, error toast
- Unsaved changes on dismiss: Browser confirmation

**Navigation**
- Cancel button: Close modal without saving
- Save button: Submit and close on success
- Backdrop click: Confirmation if unsaved changes
- Escape key: Same as backdrop click

**Edge Cases**
- Both fields empty: Save disabled
- Whitespace-only input: Validation error
- Very long text: Consider max length (future)
- Network error on save: Toast error, modal remains open, retry available
- Duplicate front/back (same text): Allow in MVP
- Edit without changes: Allow save (updates timestamp)

---

### 2.9 Confirmation Dialog (Component)

**Context**: Overlay modal triggered for destructive actions
**Authentication**: Inherited from parent view

**Main Purpose**
Confirm destructive actions (delete deck, delete flashcard) with clear warnings about permanent data loss.

**Key Information to Display**
- Dialog header: "Delete [Item Type]?" (e.g., "Delete Deck?")
- Warning message:
  - For deck: "This will permanently delete [Deck Name] and all X flashcards. This cannot be undone."
  - For flashcard: "This will permanently delete this flashcard. This cannot be undone."
- Action buttons:
  - "Cancel" (secondary, default focus, left)
  - "Delete" (destructive red styling, right)

**Key View Components**
- `ConfirmDialog.tsx` - Reusable confirmation modal
- `Dialog` (Shadcn/ui) - Modal structure
- `Button` (Shadcn/ui) - Cancel/Delete actions

**API Integration**
- Delete deck: `DELETE /api/decks/:id`
- Delete flashcard: `DELETE /api/flashcards/:id`
- Response: `{ message: string, deleted_flashcards?: number }`

**UX Considerations**
- Modal centered, smaller than flashcard modal (~400px wide)
- Clear visual distinction for destructive action
- Delete button styled red with warning icon
- Default focus on Cancel button (safer choice)
- Enter key triggers focused button
- Escape key cancels (same as Cancel button)
- Loading state on Delete button during API call
- Brief confirmation toast after successful deletion
- Immediate UI update (optimistic if needed)

**Accessibility**
- `<dialog>` or `role="alertdialog"`
- `aria-labelledby` pointing to dialog title
- `aria-describedby` pointing to warning message
- `aria-modal="true"`
- Focus trap within dialog
- Initial focus on Cancel button (safer default)
- Escape key dismisses dialog
- Screen reader announces as alert

**Security**
- Server-side authorization check
- RLS prevents deleting other users' data
- Confirmation prevents accidental deletion

**Dialog Variants**
1. **Delete Deck**:
   - Title: "Delete Deck?"
   - Message: "This will permanently delete '[Deck Name]' and all X flashcards. This cannot be undone."
   - On confirm: Delete deck, redirect to `/decks`, toast: "Deck deleted"

2. **Delete Flashcard**:
   - Title: "Delete Flashcard?"
   - Message: "This will permanently delete this flashcard. This cannot be undone."
   - On confirm: Delete flashcard, update list, toast: "Flashcard deleted"

**Navigation**
- Cancel button: Close dialog, no action
- Delete button: Execute deletion, close dialog, show toast
- Backdrop click: Same as Cancel
- Escape key: Same as Cancel
- After deck deletion: Redirect to `/decks`
- After flashcard deletion: Remain on deck detail, update list

**Edge Cases**
- Network error during deletion: Error toast, dialog remains open, retry
- Already deleted by another session: Error toast, refresh view
- Last flashcard in deck: Deck becomes empty, show empty state

---

## 3. User Journey Map

### 3.1 Primary User Flows

#### New User Onboarding Journey

```
Landing/Login Page
    ↓ (Click "Create account")
Registration Page
    ↓ (Fill form, submit)
Auto-login + Redirect
    ↓
Deck List (Empty State)
    ↓ (Click "Create Deck")
Create Deck Modal
    ↓ (Enter name, save)
Deck Detail (Empty State)
    ↓ (Click "Generate with AI")
AI Generation Input Page
    ↓ (Paste text, submit)
Loading Screen (AI processing)
    ↓
AI Review Page
    ↓ (Accept/Discard candidates)
Deck Detail (With Flashcards)
    ↓ (Click "Start Study")
Study Session
    ↓ (Review all cards, rate each)
Study Complete Screen
    ↓ (Click "Back to Deck")
Deck Detail or Deck List
```

**Total Steps**: 9-11 interactions
**Estimated Time**: 5-10 minutes for complete onboarding and first study session

---

#### Returning User Study Journey

```
Login Page
    ↓ (Enter credentials, submit)
Deck List
    ↓ (Click deck with due cards)
Deck Detail
    ↓ (Click "Start Study")
Study Session
    ↓ (Review cards one by one)
    ├─ View front
    ├─ Reveal answer
    ├─ Rate difficulty
    └─ Auto-advance to next card
Study Complete Screen
    ↓ (Click "Back to Deck" or "My Decks")
Deck List or Deck Detail
```

**Total Steps**: 5-6 interactions + N card reviews
**Estimated Time**: 2-15 minutes depending on cards due

---

#### AI Flashcard Generation Flow

```
Deck Detail
    ↓ (Click "Generate with AI")
AI Generation Input Page
    ↓ (Paste study material)
    ├─ Character counter updates
    ├─ Submit button enables at 1000 chars
    └─ Click "Generate"
Loading Screen
    ├─ "Analyzing your text..."
    ├─ "Generating flashcards..."
    └─ "Almost done..."
AI Review Page
    ↓ (Review 5+ candidates)
    ├─ Accept quality cards
    ├─ Discard poor cards
    └─ Click "Done Reviewing"
Batch Save API Call
    ↓
Deck Detail (Updated)
    └─ Success toast: "X flashcards added"
```

**Total Steps**: 5-6 interactions
**Estimated Time**: 2-5 minutes

---

#### Manual Flashcard Creation Flow

```
Deck Detail
    ↓ (Click "Create Flashcard")
Flashcard Modal Opens
    ↓ (Fill front and back)
    ├─ Validation on blur
    ├─ Save button enabled when valid
    └─ Click "Save"
API Call (Create)
    ↓
Modal Closes
    ↓
Deck Detail (Updated)
    └─ Success toast: "Flashcard created"
```

**Total Steps**: 4 interactions
**Estimated Time**: 30-60 seconds per card

---

#### Deck Management Flow

```
Deck List
    ↓ (Hover deck card)
    ├─ Click "Edit"
    │   ↓ (Edit name modal)
    │   └─ Save → Update deck
    ├─ Click "Delete"
    │   ↓ (Confirmation dialog)
    │   └─ Confirm → Delete deck → Redirect to list
    └─ Click "View"
        ↓
        Deck Detail
```

**Total Steps**: 2-3 interactions per action
**Estimated Time**: 15-30 seconds

---

### 3.2 User Journey Touchpoints

| Journey Stage | View | Key Actions | Success Criteria |
|---------------|------|-------------|------------------|
| **Discovery** | Login/Register | Create account, login | User authenticated |
| **Onboarding** | Deck List (Empty) | Create first deck | Deck created successfully |
| **Content Creation** | AI Generation / Manual | Generate or create flashcards | Flashcards in deck |
| **Learning** | Study Session | Review due cards | Cards reviewed, SRS updated |
| **Management** | Deck Detail | Edit/delete cards, edit deck | Content maintained |
| **Retention** | Deck List | Return for daily review | Consistent usage |

---

### 3.3 Critical User Interactions

#### High-Frequency Actions
1. **Login** (daily users)
2. **Start Study** (primary use case)
3. **Review flashcard** (multiple per session)
4. **Accept AI candidate** (during generation)
5. **Navigate to deck detail** (exploration)

#### Low-Frequency Actions
1. **Register** (one-time)
2. **Create deck** (occasional)
3. **Generate with AI** (periodic)
4. **Edit flashcard** (corrections)
5. **Delete deck/flashcard** (rare)

---

## 4. Layout and Navigation Structure

### 4.1 Global Navigation

**Top Navigation Bar** (Persistent across all authenticated views except AI Review)

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] 10xCards          My Decks          [User] ▼         │
└─────────────────────────────────────────────────────────────┘
```

**Components**:
- **Logo/Brand**: "10xCards" (clickable, links to `/decks`)
- **My Decks**: Link to `/decks` (main navigation item)
- **User Menu**: Dropdown with:
  - User email display
  - "Logout" option

**Responsive Behavior**:
- Desktop: Full navigation visible
- Tablet: Same as desktop
- Mobile: Hamburger menu (if needed) or simplified

**Implementation**:
- Component: `Navigation.astro` or `Header.tsx`
- Always visible except AI Review page (full-page experience)
- Sticky on scroll (optional enhancement)
- Active state on "My Decks" when on `/decks`

---

### 4.2 Page Layout Structure

**Standard Layout** (Used by most views)

```
┌───────────────────────────────────────────────────────┐
│ Top Navigation Bar                                     │
├───────────────────────────────────────────────────────┤
│                                                        │
│                  Main Content Area                     │
│                  (Astro/React components)              │
│                                                        │
│                                                        │
└───────────────────────────────────────────────────────┘
```

**Full-Page Layout** (AI Review only)

```
┌───────────────────────────────────────────────────────┐
│                                                        │
│               AI Review Full-Page Content              │
│               (No top navigation)                      │
│                                                        │
└───────────────────────────────────────────────────────┘
```

---

### 4.3 Navigation Patterns

#### Primary Navigation
- **Top Nav "My Decks"**: Always returns to deck list
- **Logo**: Also returns to deck list (when authenticated)
- **User Menu > Logout**: Logs out, redirects to `/login`

#### Contextual Navigation
- **Deck Cards**: Click anywhere on card → Deck Detail
- **"Start Study" Button**: Deck Detail → Study Session
- **"Generate with AI" Button**: Deck Detail → AI Input
- **Action Buttons**: Trigger modals or inline edits

#### Breadcrumb Navigation
Not implemented in MVP for simplicity. Users navigate via:
- Top nav "My Decks" (always accessible)
- Browser back button (supported)
- In-context "Back" buttons where needed

---

### 4.4 Routing Structure

| Route | View | Auth Required | Prerender |
|-------|------|---------------|-----------|
| `/` | Redirect to `/decks` or `/login` | - | No |
| `/login` | Login View | Public | No |
| `/register` | Registration View | Public | No |
| `/decks` | Deck List View | Yes | No |
| `/decks/[id]` | Deck Detail View | Yes | No |
| `/decks/[id]/generate` | AI Input View | Yes | No |
| `/decks/[id]/review` | AI Review View | Yes | No |
| `/decks/[id]/study` | Study Session View | Yes | No |
| `/api/*` | API Endpoints | Varies | No |

**Route Protection**:
- Middleware checks authentication via `context.locals.supabase.auth.getUser()`
- Unauthenticated requests to protected routes redirect to `/login?redirect=[current_path]`
- After login, redirect to original destination or `/decks`

---

### 4.5 Navigation Accessibility

- **Skip to Main Content**: Link at top for keyboard users
- **ARIA Landmarks**:
  - `<nav>` for top navigation
  - `<main>` for primary content
  - `<header>` for page headers
- **Keyboard Navigation**:
  - Tab order follows visual layout
  - Focus visible indicators on all interactive elements
  - Escape key closes modals/dialogs
- **Screen Reader Support**:
  - `aria-current="page"` on active nav link
  - `aria-label` on navigation regions
  - Descriptive link text (no "Click here")

---

### 4.6 State Management Across Navigation

**Authentication State**:
- Managed by Supabase via `context.locals.supabase`
- JWT tokens in httpOnly cookies
- Session persists across page navigations
- Automatic token refresh

**Data State**:
- No global state management library (MVP simplicity)
- Server-side rendering provides fresh data on navigation
- React component-local state for UI interactions
- Form state managed locally in components

**Navigation State**:
- Astro View Transitions API for smooth page changes
- Browser history fully supported
- No client-side routing (SSR with page navigation)

---

## 5. Key Components

### 5.1 Core UI Components (Reusable)

#### 5.1.1 DeckCard Component

**Purpose**: Display deck information with statistics and actions in the deck list.

**Usage**: Deck List View

**Key Features**:
- Deck name (prominent heading)
- Total flashcard count
- Cards due badge (highlighted if > 0)
- Action buttons: "Study" (primary if cards due), "View", "Edit", "Delete"
- Hover effects and responsive design

**Props**:
```typescript
interface DeckCardProps {
  deck: {
    id: string;
    name: string;
    total_flashcards: number;
    cards_due: number;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}
```

**Accessibility**:
- Wrapped in `<article>` with semantic structure
- Edit/Delete buttons with `aria-label`
- Badge with `aria-label="X cards due for review"`

---

#### 5.1.2 FlashcardListItem Component

**Purpose**: Display individual flashcard with metadata in deck detail view.

**Usage**: Deck Detail View (within FlashcardList)

**Key Features**:
- Front text (truncated if long)
- Back text (truncated if long)
- AI badge (conditional)
- Creation date
- Last modified date (if edited)
- Edit and Delete action buttons

**Props**:
```typescript
interface FlashcardListItemProps {
  flashcard: {
    id: string;
    front: string;
    back: string;
    is_ai_generated: boolean;
    created_at: string;
    updated_at: string;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}
```

**Accessibility**:
- `<article>` for semantic structure
- Buttons with descriptive `aria-label`
- AI badge with screen reader text

---

#### 5.1.3 CharacterCounter Component

**Purpose**: Display real-time character count with color-coded validation states.

**Usage**: AI Generation Input View

**Key Features**:
- Real-time count (debounced)
- Color states: gray (invalid low), green (valid), red (invalid high)
- Status message below counter
- Integration with textarea

**Props**:
```typescript
interface CharacterCounterProps {
  count: number;
  min: number; // 1000
  max: number; // 10000
  onChange?: (isValid: boolean) => void;
}
```

**Accessibility**:
- Counter as `aria-live="polite"` region
- Status message updates announced
- Color coding supplemented with text

---

#### 5.1.4 Toast Component

**Purpose**: Display temporary notification messages for success/error feedback.

**Usage**: Global (triggered from any view)

**Key Features**:
- Positioned top-right
- Auto-dismiss after 5 seconds
- Close button for manual dismiss
- Variants: success (green), error (red), info (blue)
- Queue support for multiple toasts

**Props**:
```typescript
interface ToastProps {
  message: string;
  variant: 'success' | 'error' | 'info';
  duration?: number; // default 5000ms
  onDismiss?: () => void;
}
```

**Accessibility**:
- `role="status"` or `role="alert"` depending on variant
- `aria-live="polite"` for info/success
- `aria-live="assertive"` for errors
- Focus not trapped (non-blocking)

---

#### 5.1.5 ConfirmDialog Component

**Purpose**: Reusable confirmation modal for destructive actions.

**Usage**: Deck List, Deck Detail (for deletions)

**Key Features**:
- Customizable title and message
- Cancel (default focus) and Confirm buttons
- Destructive styling on confirm
- Keyboard support (Enter/Escape)

**Props**:
```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string; // default "Delete"
  cancelText?: string; // default "Cancel"
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Accessibility**:
- `role="alertdialog"`
- Focus trap
- Initial focus on Cancel
- Keyboard shortcuts

---

#### 5.1.6 FlashcardModal Component

**Purpose**: Create or edit flashcard with validation.

**Usage**: Deck Detail View

**Key Features**:
- Two text fields (Front, Back)
- Inline validation errors
- Save button disabled when invalid
- Loading state during save
- Unsaved changes warning

**Props**:
```typescript
interface FlashcardModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  deckId: string;
  flashcard?: {
    id: string;
    front: string;
    back: string;
  };
  onClose: () => void;
  onSave: (flashcard: any) => void;
}
```

**Accessibility**:
- `role="dialog"`
- Focus trap
- Form labels properly associated
- Error messages with `aria-describedby`

---

#### 5.1.7 StudyCard Component

**Purpose**: Display flashcard during study session with reveal and rating.

**Usage**: Study Session View

**Key Features**:
- Front text (initially visible)
- Reveal Answer button
- Back text (after reveal)
- Difficulty rating buttons (after reveal)
- Auto-advance after rating

**Props**:
```typescript
interface StudyCardProps {
  flashcard: {
    id: string;
    front: string;
    back: string;
  };
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}
```

**Accessibility**:
- Clear button labels
- Focus management (auto-focus on Reveal)
- Keyboard shortcuts for ratings

---

#### 5.1.8 AiCandidateCard Component

**Purpose**: Display AI-generated flashcard candidate for review.

**Usage**: AI Review View

**Key Features**:
- Front text
- Back text
- Accept button (green)
- Discard button (gray)
- Fade-out animation when actioned

**Props**:
```typescript
interface AiCandidateCardProps {
  candidate: {
    front: string;
    back: string;
  };
  onAccept: () => void;
  onDiscard: () => void;
}
```

**Accessibility**:
- `<article>` semantic structure
- Clear button labels
- Keyboard shortcuts (A/D)

---

### 5.2 Shadcn/ui Components Used

The following Shadcn/ui components are utilized across the application:

| Component | Usage | Views |
|-----------|-------|-------|
| **Button** | All CTAs and actions | All views |
| **Dialog** | Modals and confirmations | Flashcard modal, confirmations |
| **Input** | Text inputs for forms | Login, Register, Deck modals |
| **Textarea** | Multi-line text inputs | Flashcard modal, AI generation |
| **Card** | Container for deck/flashcard items | Deck List, Deck Detail |
| **Badge** | AI indicator, cards due count | Deck Detail, Deck List |
| **Toast** | Notifications | All views (global) |
| **Progress** | Study session progress | Study Session |
| **Separator** | Visual dividers | Deck Detail header |
| **Label** | Form field labels | All forms |

---

### 5.3 Layout Components

#### 5.3.1 Layout.astro

**Purpose**: Base HTML layout with navigation and global structure.

**Features**:
- HTML document structure
- Top navigation bar
- Main content area
- Global styles and scripts
- Astro View Transitions

**Usage**: Wraps all authenticated pages except AI Review

---

#### 5.3.2 AuthLayout.astro

**Purpose**: Minimal layout for authentication pages (login/register).

**Features**:
- Centered form container
- No navigation
- Simple background

**Usage**: Login and Registration views

---

### 5.4 Component Architecture Patterns

**Astro Components** (Static/SSR):
- Used for page layouts and static content
- No client-side JavaScript unless needed
- Server-side data fetching
- Examples: `Layout.astro`, page components

**React Components** (Interactive):
- Used for interactive UI elements
- Client-side state management
- Event handling and dynamic updates
- Examples: Modals, forms, study UI

**Composition**:
- Astro pages can import React components
- Use `client:load` directive for immediate hydration
- Use `client:idle` for deferred hydration
- Use `client:visible` for viewport-based hydration

---

### 5.5 Component Communication

**Parent-Child**:
- Props passed down
- Callbacks passed up
- Typical React patterns

**Sibling Components**:
- No global state in MVP
- Communication via parent component
- Or via URL state (navigation)

**Cross-Page**:
- URL parameters
- Session storage (for AI candidates)
- API as source of truth

---

### 5.6 State Management Strategy

**Component-Local State**:
- `useState` for UI state
- `useReducer` for complex form state
- No global state library needed

**Server State**:
- SSR provides initial data
- React Query or SWR not needed for MVP
- Refetch via page navigation

**Form State**:
- Controlled components
- Validation state local to form
- Submission state (loading, error)

**Session State**:
- Authentication via Supabase
- User context from `context.locals`
- No client-side session management

---

This UI architecture provides a comprehensive, user-centered design that aligns with the PRD requirements, leverages the API capabilities effectively, and incorporates all decisions from the planning session. The structure emphasizes simplicity, accessibility, and clear user journeys while maintaining security and performance standards appropriate for an MVP.
