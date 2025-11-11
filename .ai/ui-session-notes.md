# UI Architecture Planning Session Summary

## Decisions Made

1. **Navigation Pattern**: Use a simple top navigation bar with "Decks" as the main section and a user menu in the top-right for account/logout. Minimal navigation: "My Decks" (main view), and User dropdown (Logout).

2. **AI Flashcard Review Flow**: Use a dedicated full-page review flow for AI-generated flashcard candidates. Include header showing "Review Generated Flashcards (X remaining)" with progress indication. Provide only "Accept" and "Discard" actions per card (no "Skip" button).

3. **Study Session Interface**: Implement study mode within the standard application layout (navigation remains visible). Include header with deck name, progress indicator (e.g., "5/12 cards"), and "Exit Study" button.

4. **AI Generation Loading**: Display loading screen with animated spinner and progress messages ("Analyzing your text...", "Generating flashcards...", "Almost done...") and character count summary. Show estimated time. Do not handle cases when generation takes longer than expected.

5. **Error Handling Strategy**: Use toast notifications (top-right, auto-dismiss in 5 seconds) for API failures. Use inline error messages (red text below form fields) for validation errors. No other error handling patterns needed for MVP.

6. **Empty States**: Implement friendly, actionable empty states with simple icons, clear messaging, and prominent CTAs. For empty deck list: "Welcome! Create your first deck to get started" with large "Create Deck" button. For empty deck: "No flashcards yet" with two options: "Generate with AI" and "Create Manually".

7. **Deck Statistics Display**: Display deck statistics inline and always visible. Each deck card shows: deck name (prominent), total flashcards count, cards due for review (highlighted if > 0), and action buttons. Cards with due reviews have subtle accent (blue border or badge).

8. **Flashcard Metadata**: Show a subtle AI badge/icon on AI-generated flashcards in the deck flashcard list view. Display detailed metadata (creation date, last modified) for flashcards in deck view. Metadata visible by default in deck view.

9. **Destructive Actions**: Implement confirmation dialogs (modals) for all destructive actions. "Delete deck?" dialog warns: "This will permanently delete [Deck Name] and all X flashcards. This cannot be undone." with "Cancel" (default focus) and "Delete" (red, destructive styling) buttons.

10. **Form Validation**: Use hybrid validation: (1) Real-time validation for character count constraints with live counter, (2) On-blur validation for required field checks, (3) On-submit validation as final check with inline error messages.

11. **Deck List Layout**: Use responsive grid layout showing 2-3 deck cards per row on desktop, 2 per row on tablet, 1 per row on mobile. Grid layout with hover effects, displaying deck name, flashcard count, cards due badge, and action buttons.

12. **Create Deck Button Location**: Place "Create Deck" button above the deck list (not in the page header). Also show in empty state when deck list is empty.

13. **Flashcard Creation/Editing Form**: Use modal dialog for both creating and editing flashcards. Form includes front and back text fields with validation errors inline. Modal is centered, medium-sized (~600px wide), dismisses on backdrop click with unsaved changes confirmation.

14. **Study Session Difficulty Ratings**: Use clearly labeled text buttons with color coding: "Again" (red/destructive), "Hard" (yellow/warning), "Good" (blue/primary), "Easy" (green/success). Map to API ratings: Again=0, Hard=1, Good=2, Easy=3.

15. **AI Generation Form Location**: Place AI generation interface on separate dedicated page accessed via "Generate with AI" button from deck detail view. Three-step flow: Input → Review → Deck.

16. **Character Counter Design**: Display counter below textarea as "X / 10,000 characters" with color states: gray (0-999), green (1000-10000), red (above 10000). Add secondary line showing status. Disable submit button when outside valid range.

17. **Deck Detail View Structure**: Use single scrollable page showing deck header (name, stats, actions) followed by flashcards list. Place action buttons in header: "Generate with AI", "Create Flashcard", and "Start Study" (disabled if no cards due). No tabs needed for MVP.

18. **AI Candidate Review Display**: Display all candidates in scrollable vertical list, one card per viewport section. Each shows front text, back text, and "Accept"/"Discard" buttons. No sticky header showing progress. Cards fade out when accepted/discarded.

19. **Draft Persistence**: Do NOT implement draft persistence for MVP. Instead, use browser confirmation dialogs (`beforeunload` event) when users navigate away from forms with unsaved changes.

20. **Flashcard List Pagination**: Use simple "Load More" button at bottom of flashcard list. Initially load 50 cards (API default), show button if more exist. No pagination UI if deck has fewer than 50 cards.

## Matched Recommendations

### Navigation & Layout
- Top navigation bar with minimal sections (Logo, My Decks, User menu)
- Standard application layout maintained throughout (except AI review which is full-page)
- Responsive grid layout for deck cards (2-3 desktop, 2 tablet, 1 mobile)
- Single scrollable page for deck detail view (no tabs)

### User Flows & Interactions
- AI Generation Flow: Deck View → AI Input Page → AI Review Page → Deck View
- Study Flow: Deck View → Study Session (in-app layout) → Completion → Deck View
- Flashcard Creation: Deck View → Modal Form → Deck View
- Clear separation between AI generation and manual creation workflows

### Forms & Validation
- Hybrid validation strategy: real-time for character counts, on-blur for required fields, on-submit for final check
- Inline error messages for validation failures
- Character counter with color coding (gray/green/red) for AI generation textarea
- Submit button disabled when validation fails

### Data Display & Organization
- Deck statistics always visible inline (total cards, cards due)
- AI badge/icon on AI-generated flashcards
- Full metadata visible in deck view for flashcards
- Empty states with actionable CTAs and simple icons
- Progress indicators in study sessions and AI review flows

### Error Handling & Feedback
- Toast notifications for API failures (top-right, 5-second auto-dismiss)
- Inline error messages for validation failures
- Loading screens with progress messages for AI generation
- Browser confirmation dialogs for unsaved changes (no draft persistence)

### Safety & Confirmation
- Modal confirmation dialogs for all destructive actions
- Clear warnings about permanent deletion with no undo
- "Cancel" button as default focus, destructive action styled in red
- Unsaved changes warnings using browser `beforeunload` event

### Study Experience
- Text-labeled difficulty buttons with color coding (Again/Hard/Good/Easy)
- Progress indicator showing current card and total (e.g., "5/12 cards")
- Full flashcard content display (front, reveal, back, rate)
- Study session remains in standard layout with navigation visible

### AI Integration
- Dedicated page for AI text input with large textarea
- Separate full-page review flow for generated candidates
- All candidates displayed in scrollable list for easy comparison
- Accept/Discard binary choice (no skip option)
- No retry logic or extended timeout handling for MVP

### Performance & Scalability
- "Load More" button pagination for flashcard lists (50 per page)
- No infinite scroll or complex pagination for MVP
- Toast notifications with auto-dismiss to avoid UI clutter
- Modal dialogs for focused interactions without page navigation

## UI Architecture Planning Summary

### Main UI Architecture Requirements

The AI Flashcard Learning Platform uses a **server-side rendered (SSR) Astro application** with React 19 for interactive components. The architecture follows these principles:

1. **Simplicity First**: MVP scope drives minimal UI complexity with clear, focused user flows
2. **Component Isolation**: Astro components for static content, React components for interactivity
3. **API-Driven**: All data operations through RESTful API endpoints defined in api-plan.md
4. **Responsive Design**: Mobile-first approach with Tailwind CSS 4 and Shadcn/ui components
5. **Accessibility**: ARIA landmarks, semantic HTML, keyboard navigation support

### Key Views, Screens, and User Flows

#### Core Views

1. **Authentication Views** (Public)
   - Login page (username/email + password)
   - Registration page (email + password, no email verification)
   - Auto-login after registration, session persistence

2. **Deck List View** (Main Dashboard - Authenticated)
   - Top navigation: Logo, "My Decks", User menu (Logout)
   - "Create Deck" button above deck list
   - Responsive grid of deck cards showing:
     - Deck name
     - Total flashcard count
     - Cards due badge (highlighted if > 0)
     - Action buttons (Study/View/Edit/Delete)
   - Empty state with "Create your first deck" CTA

3. **Deck Detail View** (Authenticated)
   - Deck header with name, statistics, and action buttons:
     - "Generate with AI"
     - "Create Flashcard"
     - "Start Study" (disabled if no cards due)
   - Flashcard list with inline display:
     - Front and back text visible
     - AI badge for AI-generated cards
     - Metadata (creation date, last modified)
     - Edit/Delete actions per card
   - "Load More" button for pagination (50 cards per page)
   - Empty state with "Generate with AI" and "Create Manually" options

4. **AI Generation Input Page** (Authenticated)
   - Large textarea for text input (1000-10000 characters)
   - Character counter with color states (gray/green/red)
   - Status message ("Minimum 1,000 characters required" / "Ready to generate" / "Exceeds maximum")
   - Submit button (disabled when invalid)
   - Loading screen with progress messages during generation
   - Cancel button during generation

5. **AI Review Page** (Authenticated, Full-page)
   - Header: "Review Generated Flashcards (X remaining)"
   - Scrollable list of all candidates (5+ cards)
   - Each candidate card displays:
     - Front text (top)
     - Back text (bottom)
     - "Accept" button (primary)
     - "Discard" button (secondary)
   - Cards fade out when accepted/discarded
   - Return to deck view after review with success message

6. **Flashcard Creation/Edit Modal** (Authenticated)
   - Centered modal (~600px wide)
   - Two text fields: Front and Back
   - Inline validation errors
   - "Cancel" and "Save" buttons
   - Unsaved changes warning on dismiss

7. **Study Session View** (Authenticated, In-app layout)
   - Header: Deck name, progress ("5/12 cards"), "Exit Study" button
   - Card display area:
     - Initially shows front only
     - "Reveal Answer" button
     - After reveal, shows back text
     - Difficulty rating buttons: "Again" (red), "Hard" (yellow), "Good" (blue), "Easy" (green)
   - Auto-advance to next card after rating
   - Completion message when all cards reviewed

#### User Flow Diagrams

**New User Flow:**
```
Landing/Login → Register → Auto-login → Deck List (empty) → Create Deck → Deck Detail (empty) → Generate with AI → AI Input → AI Review → Accept cards → Deck Detail (with cards) → Start Study → Study Session → Complete → Deck List
```

**Returning User Study Flow:**
```
Login → Deck List → Select deck with due cards → Deck Detail → Start Study → Study Session → Review cards → Complete → Deck List or Deck Detail
```

**AI Generation Flow:**
```
Deck Detail → Generate with AI button → AI Input Page → Submit → Loading → AI Review Page → Accept/Discard candidates → Deck Detail (updated)
```

**Manual Flashcard Creation Flow:**
```
Deck Detail → Create Flashcard button → Modal opens → Fill front/back → Save → Modal closes → Deck Detail (updated)
```

### API Integration and State Management Strategy

#### API Communication Patterns

1. **Authentication State**
   - Managed by Supabase client via Astro middleware (`context.locals.supabase`)
   - JWT tokens in httpOnly cookies (handled by Supabase)
   - Session persistence across browser refreshes
   - Token refresh automatic via Supabase client

2. **Data Fetching Strategy**
   - Server-side data fetching in Astro pages (SSR)
   - Client-side fetching only for interactive operations (React components)
   - No global state management library needed for MVP
   - React component-local state for UI interactions

3. **Optimistic Updates**
   - Not implemented for MVP to maintain simplicity
   - All updates trigger re-fetch or page navigation
   - Toast notifications confirm successful operations

4. **Error Handling**
   - API failures: Toast error messages (5-second auto-dismiss)
   - Validation errors: Inline messages below form fields
   - Network errors: Toast with "Please try again" message
   - Session expiration: Redirect to login (handled by middleware)

5. **Caching Strategy**
   - No client-side caching for MVP
   - Server-side rendering provides fresh data on navigation
   - Browser cache headers managed by Astro for static assets

#### API Endpoint Mapping to UI

| UI View/Action | API Endpoint | Method | Notes |
|----------------|--------------|--------|-------|
| Deck List | `/api/decks` | GET | SSR fetch with stats |
| Deck Detail | `/api/decks/:id` | GET | SSR fetch with flashcard list |
| Create Deck | `/api/decks` | POST | Client-side, then redirect |
| Update Deck | `/api/decks/:id` | PATCH | Client-side, then refresh |
| Delete Deck | `/api/decks/:id` | DELETE | After confirmation, then redirect |
| List Flashcards | `/api/decks/:deckId/flashcards?page=X` | GET | Paginated (50/page) |
| Create Flashcard | `/api/decks/:deckId/flashcards` | POST | Client-side from modal |
| Update Flashcard | `/api/flashcards/:id` | PATCH | Client-side from modal |
| Delete Flashcard | `/api/flashcards/:id` | DELETE | After confirmation |
| AI Generate | `/api/decks/:deckId/flashcards/generate` | POST | Shows loading screen |
| AI Accept Batch | `/api/decks/:deckId/flashcards/batch` | POST | After user review |
| Get Due Cards | `/api/decks/:deckId/flashcards/due` | GET | SSR fetch for study session |
| Submit Review | `/api/flashcards/:id/review` | POST | Updates SRS schedule |

### Responsiveness, Accessibility, and Security Considerations

#### Responsiveness

1. **Breakpoints** (Tailwind defaults)
   - Mobile: < 640px (sm) - Single column layouts, stacked components
   - Tablet: 640px - 1024px (sm to lg) - 2-column deck grid, adjusted spacing
   - Desktop: > 1024px (lg+) - 2-3 column deck grid, optimal spacing

2. **Mobile Optimizations**
   - Touch-friendly button sizes (minimum 44x44px)
   - Simplified navigation (hamburger menu if needed)
   - Single-column flashcard list
   - Full-width modals on mobile
   - Reduced padding and margins

3. **Responsive Components**
   - Deck grid: 1 column (mobile) → 2 columns (tablet) → 2-3 columns (desktop)
   - Navigation: Collapsible on mobile, full on desktop
   - Modals: Full-screen on mobile, centered on desktop
   - Text inputs: Full-width on mobile, constrained on desktop

#### Accessibility (ARIA)

1. **Semantic HTML**
   - `<main>` for primary content
   - `<nav>` for navigation
   - `<article>` for deck/flashcard cards
   - `<dialog>` for modals (or ARIA role="dialog")
   - `<button>` for all interactive actions (not divs)

2. **ARIA Attributes**
   - `aria-label` on icon-only buttons
   - `aria-describedby` for form field validation messages
   - `aria-live="polite"` for toast notifications
   - `aria-busy="true"` during loading states
   - `aria-expanded` for collapsible sections
   - `aria-current="page"` for active navigation
   - `aria-disabled` for disabled buttons (maintain in DOM)

3. **Keyboard Navigation**
   - All interactive elements focusable with Tab
   - Modal focus trap (Tab cycles within modal)
   - Escape key closes modals
   - Enter/Space activates buttons
   - Focus visible indicators (custom ring styles)
   - Skip to main content link

4. **Screen Reader Support**
   - Alt text for all images/icons
   - Descriptive button labels (not just "Click here")
   - Form labels properly associated with inputs
   - Error messages announced with aria-live
   - Loading states announced

#### Security Considerations

1. **Authentication & Authorization**
   - JWT tokens in httpOnly cookies (not localStorage)
   - Supabase Row Level Security (RLS) enforces data isolation
   - Session expiration redirects to login
   - All API requests require valid Bearer token
   - Middleware validates authentication on every request

2. **Input Validation & Sanitization**
   - Client-side validation with Zod schemas
   - Server-side validation on all API endpoints
   - XSS protection via Astro framework (auto-escaping)
   - SQL injection prevented by Supabase parameterized queries
   - Character length limits enforced (deck names, flashcard text)

3. **Data Protection**
   - Users can only access their own data (RLS policies)
   - 404 responses for unauthorized access (not 403, prevents info leakage)
   - Original AI input text not stored in database
   - No sensitive data in client-side state or logs

4. **API Security**
   - CORS configured for trusted origins only
   - Rate limiting on auth endpoints (5 attempts/minute)
   - Rate limiting on AI generation (10 requests/hour)
   - API keys in environment variables (never in client code)
   - HTTPS enforced in production

5. **UI-Level Security**
   - Confirmation dialogs for destructive actions
   - Logout button always accessible
   - Session timeout warnings (if implemented post-MVP)
   - No auto-complete on password fields in forms

### Technology Stack Integration

1. **Astro 5 (Framework)**
   - SSR mode with Node.js adapter (standalone)
   - File-based routing in `src/pages/`
   - API routes in `src/pages/api/` with `export const prerender = false`
   - Middleware in `src/middleware/index.ts` for auth and Supabase injection
   - View Transitions API for smooth page navigation

2. **React 19 (Interactivity)**
   - Functional components with hooks
   - Interactive islands for modals, forms, study session UI
   - No "use client" directives (not Next.js)
   - Hooks: `useState`, `useCallback`, `useMemo`, `useId`, `useTransition`
   - `React.memo()` for expensive re-rendering components

3. **TypeScript 5**
   - Strict mode enabled
   - Types in `src/types.ts` for entities and DTOs
   - Zod schemas for runtime validation
   - Auto-generated Supabase types in `src/db/database.types.ts`

4. **Tailwind CSS 4**
   - Utility-first styling with CSS variables
   - Custom theme configuration for brand colors
   - Responsive variants: `sm:`, `md:`, `lg:`, `xl:`
   - State variants: `hover:`, `focus-visible:`, `active:`, `disabled:`
   - Dark mode support with `dark:` variant (if implemented)

5. **Shadcn/ui**
   - New York style, neutral base color
   - Components in `src/components/ui/`
   - Pre-styled, accessible components (Button, Dialog, Toast, etc.)
   - Customizable with Tailwind classes

6. **Supabase**
   - PostgreSQL database with RLS
   - Auth with JWT tokens
   - Client initialized in `src/db/supabase.client.ts`
   - Accessed via `context.locals.supabase` in routes
   - Type-safe queries with generated types

### Component Architecture

#### Astro Components (Static/SSR)
- `src/layouts/Layout.astro` - Base HTML layout with navigation
- `src/pages/index.astro` - Deck list page
- `src/pages/decks/[id].astro` - Deck detail page
- `src/pages/decks/[id]/study.astro` - Study session page
- `src/pages/decks/[id]/generate.astro` - AI input page
- `src/pages/login.astro` - Login page
- `src/pages/register.astro` - Registration page

#### React Components (Interactive)
- `src/components/DeckCard.tsx` - Deck display with actions
- `src/components/FlashcardList.tsx` - Paginated flashcard list
- `src/components/FlashcardModal.tsx` - Create/edit flashcard modal
- `src/components/StudyCard.tsx` - Study session flashcard display
- `src/components/AiReview.tsx` - AI candidate review interface
- `src/components/ConfirmDialog.tsx` - Reusable confirmation modal
- `src/components/Toast.tsx` - Toast notification component
- `src/components/CharacterCounter.tsx` - Text input with counter

#### Shadcn/ui Components (Used)
- `Button` - All CTAs and actions
- `Dialog` - Modals and confirmation dialogs
- `Input` - Text inputs for forms
- `Textarea` - Multi-line text inputs
- `Card` - Deck cards, flashcard cards
- `Badge` - AI indicator, cards due count
- `Toast` - Error and success notifications
- `Progress` - Study session progress indicator
- `Separator` - Visual dividers

### Form Handling & Validation

1. **Validation Strategy**
   - Real-time: Character counters (AI generation textarea)
   - On-blur: Required field checks (show error when user leaves field)
   - On-submit: Final validation with inline error messages
   - Disabled submit buttons when invalid

2. **Validation Rules**
   - Deck name: 1-255 chars, not empty/whitespace-only, unique per user
   - Flashcard front/back: Required, not empty/whitespace-only
   - AI generation text: 1000-10000 characters
   - Password: Minimum 8 characters (handled by Supabase)

3. **Error Display**
   - Inline: Red text below form fields
   - Color coding: Red borders on invalid fields
   - Clear messaging: "This field cannot be empty", "Minimum 1,000 characters required"
   - No aggressive validation before user interaction

4. **Success Feedback**
   - Toast notifications: "Deck created", "Flashcard saved", "Study session complete"
   - Visual updates: New items appear in lists
   - Redirects: After creation, navigate to detail view

### Loading States & Async Operations

1. **Loading Indicators**
   - Spinners for page-level loading (SSR)
   - Button loading states with spinner + text (e.g., "Saving...")
   - Full-screen loading for AI generation with progress messages
   - Skeleton loaders for list items (optional enhancement)

2. **Async Operation Patterns**
   - Form submissions: Disable button, show loading state, handle response
   - AI generation: Navigate to loading screen, show progress, transition to review
   - Deletions: Show confirmation, perform delete, show toast, update UI
   - Study reviews: Submit rating, brief loading, auto-advance to next card

### Navigation & Routing

1. **Route Structure**
   ```
   / (redirects to /decks or /login based on auth)
   /login
   /register
   /decks (main deck list)
   /decks/[id] (deck detail with flashcards)
   /decks/[id]/generate (AI input page)
   /decks/[id]/review (AI review page, receives candidates via state)
   /decks/[id]/study (study session)
   ```

2. **Navigation Behavior**
   - Top nav always visible
   - Astro View Transitions for smooth page navigation
   - Back button support (browser native)
   - Logout redirects to /login
   - Unauthorized access redirects to /login
   - After creating deck, redirect to /decks/[id]
   - After AI review, redirect to /decks/[id] with success message

3. **Protected Routes**
   - All routes except /login and /register require authentication
   - Middleware checks `context.locals.supabase.auth.getUser()`
   - Unauthenticated requests redirect to /login with return URL

### Performance Considerations

1. **Code Splitting**
   - React.lazy() for heavy components (AI review, study session)
   - Astro automatic code splitting per page
   - Lazy load Shadcn/ui components not needed on initial render

2. **Image Optimization**
   - Not applicable for MVP (no image uploads)
   - Logo and icons optimized as SVGs

3. **Bundle Size**
   - Minimize JavaScript shipped to client
   - Use Astro components for static content (no React hydration)
   - Only hydrate interactive components (modals, forms, study UI)

4. **Database Query Optimization**
   - Use SQL aggregation for deck statistics
   - Leverage indexes defined in schema (user_id, deck_id, due dates)
   - Paginate flashcard lists (50 per page)
   - Fetch only necessary fields

5. **API Request Optimization**
   - No unnecessary re-fetching (SSR provides fresh data)
   - Batch flashcard acceptance (single API call for multiple cards)
   - No polling or real-time features for MVP

## Unresolved Issues

None - all 20 questions have been answered and decisions have been made. The UI architecture planning is complete and ready for implementation.
