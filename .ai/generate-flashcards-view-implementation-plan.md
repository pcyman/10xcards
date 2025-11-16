# View Implementation Plan: AI Flashcard Generation and Review

## 1. Overview

This implementation plan covers two interconnected views for AI-powered flashcard generation:

1. **AI Generation Input View** (`/decks/[id]/generate`): Accepts user text input (1000-10000 characters) and initiates AI flashcard generation with real-time validation feedback
2. **AI Review View** (`/decks/[id]/review`): Displays generated flashcard candidates for user review with accept/discard functionality

The views work together to fulfill the core product value proposition: transforming study materials into optimized flashcards using AI while maintaining quality control through user review.

## 2. View Routing

### AI Generation Input View
- **Path**: `/decks/[id]/generate`
- **File**: `src/pages/decks/[id]/generate.astro`
- **Authentication**: Required (redirect to login if unauthenticated)
- **Layout**: Standard layout with top navigation

### AI Review View
- **Path**: `/decks/[id]/review`
- **File**: `src/pages/decks/[id]/review.astro`
- **Authentication**: Required (redirect to login if unauthenticated)
- **Layout**: Full-page layout (navigation hidden)
- **Special**: Receives candidates from generation view via sessionStorage

## 3. Component Structure

### AI Generation Input View

```
GenerateFlashcardsPage.astro (Page)
└── AiGenerationForm.tsx (Client Component)
    ├── Label (Shadcn/ui)
    ├── Textarea (Shadcn/ui)
    ├── CharacterCounter.tsx (Display Component)
    ├── div (Button Group)
    │   ├── Button (Shadcn/ui) - Cancel
    │   └── Button (Shadcn/ui) - Generate
    └── LoadingScreen.tsx (Conditional, Modal Component)
        ├── div (Progress Container)
        │   ├── Spinner (Icon/Animation)
        │   ├── p (Progress Message)
        │   └── Progress (Shadcn/ui)
        └── Button (Shadcn/ui) - Cancel Generation
```

### AI Review View

```
ReviewFlashcardsPage.astro (Page)
└── AiReviewFlow.tsx (Client Component)
    ├── ReviewProgress.tsx (Header Component)
    │   ├── h1 (Title)
    │   ├── p (Progress Text)
    │   └── p (Accepted Count)
    ├── div (Scrollable List Container)
    │   └── [AiCandidateCard.tsx] (Repeating Component)
    │       ├── Card (Shadcn/ui)
    │       │   ├── CardHeader (Front Text)
    │       │   ├── CardContent (Back Text)
    │       │   └── CardFooter (Action Buttons)
    │       │       ├── Button (Shadcn/ui) - Accept
    │       │       └── Button (Shadcn/ui) - Discard
    └── div (Footer)
        ├── p (Summary Text)
        └── Button (Shadcn/ui) - Done Reviewing
```

## 4. Component Details

### 4.1 GenerateFlashcardsPage.astro

**Component Description**: Astro page component serving as the container for the AI generation form. Handles authentication, deck validation, and provides context data to the client-side form component.

**Main Elements**:
- `<Layout>` wrapper with page title and navigation
- `<main>` with page header displaying deck name
- `<AiGenerationForm>` client component with hydration

**Handled Events**: None (static server component)

**Validation Conditions**:
- Verify user authentication (redirect to `/login` if unauthenticated)
- Validate deck ID format (UUID) from URL params
- Verify deck exists and belongs to authenticated user (query from Supabase)
- If deck not found or unauthorized, redirect to `/decks` with error toast

**Types**:
- `DeckDTO` (from types.ts) - for deck data
- Astro.locals for Supabase client access

**Props**: None (page component)

**Implementation Notes**:
- Must include `export const prerender = false` for SSR
- Extract `deckId` from `Astro.params.id`
- Query deck from Supabase using locals.supabase
- Pass deck data (id, name) to AiGenerationForm as props

---

### 4.2 AiGenerationForm.tsx

**Component Description**: Primary React component managing the flashcard generation form. Handles text input, real-time character validation, form submission, and navigation to review view.

**Main Elements**:
- `<form>` with `onSubmit` handler
- `<div>` container for header section (deck name context)
- `<Label>` (Shadcn/ui) for textarea with `htmlFor` attribute
- `<Textarea>` (Shadcn/ui) for text input
- `<CharacterCounter>` display component
- `<div>` status message container with `aria-live="polite"`
- `<div>` button group container
- `<Button>` (Shadcn/ui) Cancel - navigates back to deck
- `<Button>` (Shadcn/ui) Submit - triggers generation
- `<LoadingScreen>` (conditional) - shown during generation

**Handled Events**:
1. **onChange** (Textarea): Updates inputText state, triggers character validation
2. **onSubmit** (Form): Prevents default, validates input, calls generateFlashcards API
3. **onClick** (Cancel Button): Navigates to `/decks/[id]`
4. **onClick** (Cancel in LoadingScreen): Cancels generation, returns to form
5. **onKeyDown** (Form): Ctrl+Enter submits form when valid
6. **beforeunload** (Window): Prompts confirmation when navigating with unsaved text

**Validation Conditions**:
1. **Minimum character count**: `inputText.trim().length >= 1000`
   - Submit button disabled if false
   - Status message: "Minimum 1,000 characters required"
   - Counter color: Gray

2. **Maximum character count**: `inputText.trim().length <= 10000`
   - Submit button disabled if false
   - Status message: "Exceeds maximum of 10,000 characters"
   - Counter color: Red

3. **Valid range**: `1000 <= inputText.trim().length <= 10000`
   - Submit button enabled if true
   - Status message: "Ready to generate"
   - Counter color: Green

4. **Non-empty deck ID**: Must have valid deckId prop
   - Component should not render if invalid

**Types**:
- `GenerateFlashcardsCommand` (from types.ts) - request payload
- `GenerateFlashcardsResponseDTO` (from types.ts) - response data
- `CharacterCountState` (new, defined in Section 5)
- `AiGenerationFormProps` (new):
  ```typescript
  interface AiGenerationFormProps {
    deckId: string;
    deckName: string;
  }
  ```

**Props**:
- `deckId: string` - UUID of the target deck
- `deckName: string` - Display name for context header

**State Variables**:
- `inputText: string` - Current textarea value
- `characterCount: CharacterCountState` - Validation state from useCharacterValidation
- `isGenerating: boolean` - Loading state during API call
- `error: string | null` - Error message from failed generation

**Custom Hooks Used**:
- `useCharacterValidation(inputText)` - Returns CharacterCountState
- `useNavigationGuard(inputText.length > 0 && !isGenerating)` - Prompts on navigation

**API Integration**:
- Endpoint: `POST /api/decks/${deckId}/flashcards/generate`
- Request: `{ text: inputText }`
- Headers: `{ "Authorization": "Bearer ${token}", "Content-Type": "application/json" }`
- Success: Store candidates in sessionStorage, navigate to `/decks/${deckId}/review`
- Error: Set error state, show error toast, stay on page

---

### 4.3 CharacterCounter.tsx

**Component Description**: Display component showing character count with color-coded visual feedback based on validation state.

**Main Elements**:
- `<div>` container with appropriate color classes
- `<span>` for count display in format "X / 10,000 characters"
- `<span>` for status message (varies by state)

**Handled Events**: None (pure display component)

**Validation Conditions**: None (receives validation state via props)

**Types**:
- `CharacterCounterProps` (new):
  ```typescript
  interface CharacterCounterProps {
    count: number;
    state: 'invalid-min' | 'valid' | 'invalid-max';
    message: string;
  }
  ```

**Props**:
- `count: number` - Current character count
- `state: 'invalid-min' | 'valid' | 'invalid-max'` - Validation state
- `message: string` - Status message to display

**Styling Logic**:
- `invalid-min` (0-999): Gray text color (`text-gray-500`)
- `valid` (1000-10000): Green text color (`text-green-600`)
- `invalid-max` (10001+): Red text color (`text-red-600`)

**Accessibility**:
- Container has `aria-live="polite"` for screen reader updates
- Status message wrapped in `<span>` with appropriate role

---

### 4.4 LoadingScreen.tsx

**Component Description**: Modal overlay displaying AI generation progress with rotating messages and cancel option.

**Main Elements**:
- `<div>` modal overlay with backdrop
- `<div>` centered content container
- `<div>` spinner/loading animation
- `<p>` progress message with fade transition
- `<Progress>` (Shadcn/ui) indeterminate progress bar
- `<Button>` (Shadcn/ui) Cancel button

**Handled Events**:
1. **onClick** (Cancel Button): Calls onCancel callback, aborts API request

**Validation Conditions**: None

**Types**:
- `LoadingScreenProps` (new):
  ```typescript
  interface LoadingScreenProps {
    onCancel: () => void;
  }
  ```

**Props**:
- `onCancel: () => void` - Callback when user cancels generation

**State Variables**:
- `currentMessage: string` - Current progress message
- `messageIndex: number` - Index for rotating messages

**Custom Hooks Used**:
- `useGenerationProgress()` - Rotates through progress messages

**Progress Messages** (rotate every 3-5 seconds):
1. "Analyzing your text..."
2. "Generating flashcards..."
3. "Almost done..."

**Accessibility**:
- Modal has `role="dialog"` and `aria-modal="true"`
- Progress message has `aria-live="assertive"` for immediate announcement
- Focus trapped within modal when open
- Escape key closes modal (triggers onCancel)

---

### 4.5 ReviewFlashcardsPage.astro

**Component Description**: Astro page component for the AI review flow. Validates authentication and deck access, retrieves candidates from sessionStorage, and provides data to review component.

**Main Elements**:
- `<Layout>` wrapper (minimal, no navigation)
- `<main>` full-page container
- `<AiReviewFlow>` client component with candidates data

**Handled Events**: None (static server component)

**Validation Conditions**:
- Verify user authentication (redirect to `/login` if unauthenticated)
- Validate deck ID format (UUID) from URL params
- Verify deck exists and belongs to authenticated user
- If deck not found, redirect to `/decks` with error toast

**Types**:
- `DeckDTO` (from types.ts)
- `FlashcardCandidateDTO[]` (from types.ts) - passed via script tag

**Props**: None (page component)

**Implementation Notes**:
- Must include `export const prerender = false` for SSR
- Extract `deckId` from `Astro.params.id`
- Candidates retrieved from sessionStorage on client side
- If no candidates found in sessionStorage, redirect to `/decks/${deckId}/generate`
- Pass deckId and deckName to AiReviewFlow

---

### 4.6 AiReviewFlow.tsx

**Component Description**: Main React component managing the review flow. Displays all candidates in a scrollable list, handles accept/discard actions, and submits accepted flashcards in batch.

**Main Elements**:
- `<div>` main container with full-page layout
- `<ReviewProgress>` header component
- `<div>` scrollable list container
- Array of `<AiCandidateCard>` components (mapped from candidates)
- `<div>` footer section
- `<p>` summary text showing accepted count
- `<Button>` (Shadcn/ui) "Done Reviewing" button

**Handled Events**:
1. **onAccept** (from AiCandidateCard): Updates candidate status to 'accepted', increments count
2. **onDiscard** (from AiCandidateCard): Updates candidate status to 'discarded'
3. **onClick** (Done Reviewing Button): Filters accepted candidates, submits to batch API
4. **onKeyDown** (Document):
   - 'A' accepts focused candidate
   - 'D' discards focused candidate
   - Escape prompts exit confirmation
   - Enter clicks "Done Reviewing" when ready
5. **beforeunload** (Window): Prompts confirmation when navigating with unsubmitted reviews

**Validation Conditions**:
1. **At least one candidate exists**: `candidates.length >= 5`
   - Should always be true from generation endpoint
   - If false, show error and redirect

2. **All candidates processed** (optional):
   - "Done Reviewing" button enabled regardless
   - User can finish review early

3. **At least one accepted** (optional):
   - Batch submission works with empty array (creates 0 flashcards)
   - Show appropriate message: "0 flashcards added"

**Types**:
- `FlashcardCandidateDTO` (from types.ts)
- `AcceptFlashcardsCommand` (from types.ts) - request payload
- `AcceptFlashcardsResponseDTO` (from types.ts) - response data
- `CandidateWithStatus` (new, defined in Section 5)
- `AiReviewFlowProps` (new):
  ```typescript
  interface AiReviewFlowProps {
    deckId: string;
    deckName: string;
    initialCandidates: FlashcardCandidateDTO[];
  }
  ```

**Props**:
- `deckId: string` - UUID of the target deck
- `deckName: string` - Display name for success message
- `initialCandidates: FlashcardCandidateDTO[]` - Generated candidates from previous step

**State Variables**:
- `candidates: CandidateWithStatus[]` - All candidates with status tracking
- `acceptedCount: number` - Number of accepted cards (computed)
- `processedCount: number` - Number of accepted + discarded cards (computed)
- `isSubmitting: boolean` - Loading state during batch submission
- `error: string | null` - Error message from failed submission

**Custom Hooks Used**:
- `useReviewState(initialCandidates)` - Manages candidate state and actions

**API Integration**:
- Endpoint: `POST /api/decks/${deckId}/flashcards/batch`
- Request: `{ flashcards: acceptedCandidates.map(c => ({ front: c.front, back: c.back })) }`
- Headers: `{ "Authorization": "Bearer ${token}", "Content-Type": "application/json" }`
- Success:
  - Show success toast: "${total_created} flashcards added to ${deckName}"
  - Clear candidates from sessionStorage
  - Navigate to `/decks/${deckId}`
- Error:
  - Set error state
  - Show error toast with retry option
  - Preserve review state (don't clear candidates)

**Accessibility**:
- Container has `role="main"` and `aria-label="AI flashcard review"`
- Keyboard shortcuts documented in help text
- Focus management: After accept/discard, focus moves to next unprocessed candidate
- Screen reader announces status changes via aria-live regions

---

### 4.7 ReviewProgress.tsx

**Component Description**: Header component displaying review progress, including title, remaining count, and accepted count.

**Main Elements**:
- `<header>` element
- `<h1>` page title: "Review Generated Flashcards"
- `<div>` progress information container
- `<p>` remaining count: "X remaining" or "All reviewed"
- `<p>` accepted count: "X cards accepted"

**Handled Events**: None (pure display component)

**Validation Conditions**: None (receives computed values via props)

**Types**:
- `ReviewProgressProps` (new):
  ```typescript
  interface ReviewProgressProps {
    totalCount: number;
    remainingCount: number;
    acceptedCount: number;
  }
  ```

**Props**:
- `totalCount: number` - Total number of candidates
- `remainingCount: number` - Number of pending (not accepted or discarded) candidates
- `acceptedCount: number` - Number of accepted candidates

**Display Logic**:
- Show "X remaining" when `remainingCount > 0`
- Show "All reviewed" when `remainingCount === 0`
- Always show "X cards accepted"

**Accessibility**:
- Header has `aria-live="polite"` for progress updates
- Semantic `<header>` element for proper structure

---

### 4.8 AiCandidateCard.tsx

**Component Description**: Display component for individual flashcard candidate with accept/discard actions. Shows front and back text with prominent action buttons.

**Main Elements**:
- `<article>` wrapper with fade-out animation classes
- `<Card>` (Shadcn/ui) container
- `<CardHeader>` with front text (larger, bold)
- `<CardContent>` with back text (scrollable if long)
- `<CardFooter>` with action buttons
- `<Button>` (Shadcn/ui) Accept - primary, green variant
- `<Button>` (Shadcn/ui) Discard - secondary, gray variant

**Handled Events**:
1. **onClick** (Accept Button): Calls onAccept callback with candidate id
2. **onClick** (Discard Button): Calls onDiscard callback with candidate id
3. **onKeyDown** (Article):
   - 'A' key accepts candidate
   - 'D' key discards candidate

**Validation Conditions**: None (data pre-validated from generation)

**Types**:
- `CandidateWithStatus` (defined in Section 5)
- `AiCandidateCardProps` (new):
  ```typescript
  interface AiCandidateCardProps {
    candidate: CandidateWithStatus;
    onAccept: (id: string) => void;
    onDiscard: (id: string) => void;
  }
  ```

**Props**:
- `candidate: CandidateWithStatus` - Candidate data with status
- `onAccept: (id: string) => void` - Callback when accepted
- `onDiscard: (id: string) => void` - Callback when discarded

**Animation Logic**:
- When status changes from 'pending' to 'accepted' or 'discarded':
  1. Add 'fade-out' class
  2. Wait for animation to complete (300ms)
  3. Remove card from visible list

**Styling**:
- Front text: Large font size, bold weight, dark color
- Back text: Normal font size, regular weight, gray color
- Max height on content with `overflow-y: auto` for long text
- Accept button: Green background (`bg-green-600 hover:bg-green-700`)
- Discard button: Gray background (`bg-gray-200 hover:bg-gray-300`)
- Card shows focus ring when focused for keyboard navigation

**Accessibility**:
- `<article>` has `role="article"` and `aria-label="Flashcard candidate"`
- Front text has id for aria-labelledby reference
- Buttons have clear labels ("Accept" and "Discard")
- Keyboard shortcuts work when card is focused
- Screen reader announces: "Card accepted" or "Card discarded" via aria-live

---

## 5. Types

### 5.1 Existing Types (from types.ts)

These types are already defined and should be imported from `src/types.ts`:

```typescript
// Flashcard candidate structure from AI generation
interface FlashcardCandidateDTO {
  front: string; // Question text
  back: string;  // Answer text
}

// Request payload for generation endpoint
interface GenerateFlashcardsCommand {
  text: string; // User input text (1000-10000 characters)
}

// Response from generation endpoint
interface GenerateFlashcardsResponseDTO {
  candidates: FlashcardCandidateDTO[]; // Minimum 5 candidates
  total_generated: number;             // Count of generated candidates
}

// Request payload for batch acceptance endpoint
interface AcceptFlashcardsCommand {
  flashcards: FlashcardCandidateDTO[]; // Only accepted candidates
}

// Response from batch acceptance endpoint
interface AcceptFlashcardsResponseDTO {
  created: FlashcardDTO[];  // Created flashcards with full metadata
  total_created: number;    // Count of created flashcards
}

// Full flashcard structure (for reference)
type FlashcardDTO = Omit<FlashcardRow, "user_id">;
```

### 5.2 New Component Props Types

Define these types in component files or a shared types file:

```typescript
// Props for AiGenerationForm component
interface AiGenerationFormProps {
  deckId: string;   // UUID of the target deck
  deckName: string; // Display name for context ("for [Deck Name]")
}

// Props for CharacterCounter component
interface CharacterCounterProps {
  count: number;                                  // Current character count
  state: 'invalid-min' | 'valid' | 'invalid-max'; // Validation state
  message: string;                                // Status message to display
}

// Props for LoadingScreen component
interface LoadingScreenProps {
  onCancel: () => void; // Callback when user cancels generation
}

// Props for AiReviewFlow component
interface AiReviewFlowProps {
  deckId: string;                              // UUID of the target deck
  deckName: string;                            // Display name for success message
  initialCandidates: FlashcardCandidateDTO[];  // Generated candidates from previous step
}

// Props for ReviewProgress component
interface ReviewProgressProps {
  totalCount: number;     // Total number of candidates
  remainingCount: number; // Number of pending candidates
  acceptedCount: number;  // Number of accepted candidates
}

// Props for AiCandidateCard component
interface AiCandidateCardProps {
  candidate: CandidateWithStatus;       // Candidate data with status
  onAccept: (id: string) => void;       // Callback when accepted
  onDiscard: (id: string) => void;      // Callback when discarded
}
```

### 5.3 New ViewModel Types

Define these types for internal state management:

```typescript
// Character count validation state
interface CharacterCountState {
  count: number;                                  // Current character count
  state: 'invalid-min' | 'valid' | 'invalid-max'; // Validation state
  message: string;                                // User-facing status message
}

// State meanings:
// - 'invalid-min': count < 1000 (gray, submit disabled)
// - 'valid': 1000 <= count <= 10000 (green, submit enabled)
// - 'invalid-max': count > 10000 (red, submit disabled)

// Candidate with UI status tracking
interface CandidateWithStatus extends FlashcardCandidateDTO {
  id: string;                              // Temporary UUID for React keys
  status: 'pending' | 'accepted' | 'discarded'; // Current review state
}

// Status meanings:
// - 'pending': Not yet reviewed (visible, awaiting action)
// - 'accepted': Marked for saving (will fade out, included in batch)
// - 'discarded': Marked for rejection (will fade out, excluded from batch)

// Review state management (optional - can use individual state variables)
interface ReviewState {
  candidates: CandidateWithStatus[]; // All candidates with status
  acceptedCount: number;             // Computed: candidates with status 'accepted'
  processedCount: number;            // Computed: candidates with status 'accepted' or 'discarded'
  isSubmitting: boolean;             // Loading state during batch submission
}

// Generation progress tracking (optional - can use individual state variables)
interface GenerationProgress {
  isGenerating: boolean;  // Whether generation is in progress
  currentMessage: string; // Current progress message being displayed
  messageIndex: number;   // Index for rotating through messages
}
```

### 5.4 Type Usage Summary

| Component | Imports from types.ts | New Props Types | New ViewModel Types |
|-----------|----------------------|-----------------|---------------------|
| GenerateFlashcardsPage.astro | - | - | - |
| AiGenerationForm.tsx | GenerateFlashcardsCommand, GenerateFlashcardsResponseDTO | AiGenerationFormProps | CharacterCountState |
| CharacterCounter.tsx | - | CharacterCounterProps | - |
| LoadingScreen.tsx | - | LoadingScreenProps | GenerationProgress (optional) |
| ReviewFlashcardsPage.astro | FlashcardCandidateDTO | - | - |
| AiReviewFlow.tsx | FlashcardCandidateDTO, AcceptFlashcardsCommand, AcceptFlashcardsResponseDTO | AiReviewFlowProps | CandidateWithStatus, ReviewState (optional) |
| ReviewProgress.tsx | - | ReviewProgressProps | - |
| AiCandidateCard.tsx | - | AiCandidateCardProps | CandidateWithStatus |

---

## 6. State Management

### 6.1 AiGenerationForm State

**State Variables**:
1. `inputText` (string): Current textarea value
   - Initial: Empty string ""
   - Updated: On every onChange event from Textarea
   - Used: For character counting, validation, API request

2. `characterCount` (CharacterCountState): Validation state
   - Initial: `{ count: 0, state: 'invalid-min', message: 'Minimum 1,000 characters required' }`
   - Updated: By useCharacterValidation hook when inputText changes
   - Used: For CharacterCounter display, submit button disabled state

3. `isGenerating` (boolean): Loading state
   - Initial: false
   - Updated: Set to true on form submit, false on success/error
   - Used: To show/hide LoadingScreen, disable form controls

4. `error` (string | null): Error message
   - Initial: null
   - Updated: Set on API error, cleared on new submission
   - Used: To display error toast notification

**Custom Hooks**:

#### useCharacterValidation
```typescript
function useCharacterValidation(text: string): CharacterCountState {
  return useMemo(() => {
    const trimmedText = text.trim();
    const count = trimmedText.length;

    if (count < 1000) {
      return {
        count,
        state: 'invalid-min',
        message: 'Minimum 1,000 characters required'
      };
    } else if (count > 10000) {
      return {
        count,
        state: 'invalid-max',
        message: 'Exceeds maximum of 10,000 characters'
      };
    } else {
      return {
        count,
        state: 'valid',
        message: 'Ready to generate'
      };
    }
  }, [text]);
}
```
- **Purpose**: Calculate character count and validation state
- **Optimization**: useMemo prevents recalculation on every render
- **Returns**: CharacterCountState with count, state, and message

#### useNavigationGuard
```typescript
function useNavigationGuard(shouldWarn: boolean): void {
  useEffect(() => {
    if (!shouldWarn) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldWarn]);
}
```
- **Purpose**: Prompt user confirmation when navigating away with unsaved content
- **Trigger**: When shouldWarn is true (hasContent && !isGenerating)
- **Implementation**: Uses beforeunload event

#### useGenerationProgress
```typescript
function useGenerationProgress(): string {
  const messages = [
    "Analyzing your text...",
    "Generating flashcards...",
    "Almost done..."
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 4000); // Rotate every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return messages[messageIndex];
}
```
- **Purpose**: Rotate through progress messages during loading
- **Interval**: Updates every 4 seconds
- **Returns**: Current progress message string

**State Flow**:
1. User types in textarea → `inputText` updates → `characterCount` recalculates
2. User clicks Generate → `isGenerating` = true → LoadingScreen shows
3. API responds → `isGenerating` = false → Navigate to review OR set `error`
4. User navigates away → `useNavigationGuard` prompts if `inputText.length > 0`

---

### 6.2 AiReviewFlow State

**State Variables**:
1. `candidates` (CandidateWithStatus[]): All candidates with status tracking
   - Initial: Map initialCandidates to add id and status='pending'
   - Updated: When user accepts/discards a candidate
   - Used: To render AiCandidateCard list, filter accepted for submission

2. `isSubmitting` (boolean): Loading state during batch submission
   - Initial: false
   - Updated: Set to true on "Done" click, false on success/error
   - Used: To disable buttons, show loading indicator

3. `error` (string | null): Error message
   - Initial: null
   - Updated: Set on API error, cleared on retry
   - Used: To display error toast with retry option

**Computed Values** (using useMemo or inline calculation):
1. `acceptedCount`: `candidates.filter(c => c.status === 'accepted').length`
2. `remainingCount`: `candidates.filter(c => c.status === 'pending').length`
3. `processedCount`: `candidates.filter(c => c.status !== 'pending').length`
4. `acceptedCandidates`: `candidates.filter(c => c.status === 'accepted')`

**Custom Hook**:

#### useReviewState
```typescript
function useReviewState(initialCandidates: FlashcardCandidateDTO[]) {
  // Initialize candidates with ids and status
  const [candidates, setCandidates] = useState<CandidateWithStatus[]>(() =>
    initialCandidates.map(c => ({
      ...c,
      id: crypto.randomUUID(),
      status: 'pending' as const
    }))
  );

  // Accept handler
  const handleAccept = useCallback((id: string) => {
    setCandidates(prev =>
      prev.map(c => c.id === id ? { ...c, status: 'accepted' as const } : c)
    );
  }, []);

  // Discard handler
  const handleDiscard = useCallback((id: string) => {
    setCandidates(prev =>
      prev.map(c => c.id === id ? { ...c, status: 'discarded' as const } : c)
    );
  }, []);

  // Computed counts
  const acceptedCount = useMemo(
    () => candidates.filter(c => c.status === 'accepted').length,
    [candidates]
  );

  const remainingCount = useMemo(
    () => candidates.filter(c => c.status === 'pending').length,
    [candidates]
  );

  const acceptedCandidates = useMemo(
    () => candidates.filter(c => c.status === 'accepted'),
    [candidates]
  );

  return {
    candidates,
    handleAccept,
    handleDiscard,
    acceptedCount,
    remainingCount,
    acceptedCandidates
  };
}
```
- **Purpose**: Encapsulate review state logic and actions
- **Optimization**: useCallback for handlers, useMemo for computed values
- **Returns**: State and handlers for parent component

**State Flow**:
1. Component mounts → `candidates` initialized from initialCandidates
2. User clicks Accept → `handleAccept(id)` → candidate status = 'accepted' → fade out animation → count updates
3. User clicks Discard → `handleDiscard(id)` → candidate status = 'discarded' → fade out animation → count updates
4. User clicks "Done Reviewing" → `isSubmitting` = true → Filter accepted → Submit to API
5. API responds → `isSubmitting` = false → Clear sessionStorage → Navigate to deck OR set `error`

---

### 6.3 Data Transfer Between Views

**Challenge**: Passing candidates from generation view to review view

**Solution**: Use sessionStorage with encryption for security

**Implementation**:

In AiGenerationForm (after successful generation):
```typescript
// Store candidates in sessionStorage
sessionStorage.setItem(
  `flashcard-candidates-${deckId}`,
  JSON.stringify(candidates)
);

// Navigate to review view
window.location.href = `/decks/${deckId}/review`;
```

In ReviewFlashcardsPage.astro (client-side script):
```typescript
// Retrieve candidates from sessionStorage
const storedData = sessionStorage.getItem(`flashcard-candidates-${deckId}`);

if (!storedData) {
  // No candidates found, redirect to generation page
  window.location.href = `/decks/${deckId}/generate`;
} else {
  const candidates = JSON.parse(storedData) as FlashcardCandidateDTO[];
  // Pass to AiReviewFlow component
}
```

In AiReviewFlow (after successful submission):
```typescript
// Clear candidates from sessionStorage
sessionStorage.removeItem(`flashcard-candidates-${deckId}`);

// Navigate to deck detail
window.location.href = `/decks/${deckId}`;
```

**Security Considerations**:
- sessionStorage is cleared on tab close
- Data is scoped to origin (same-origin policy)
- Consider encrypting sensitive data if needed (though flashcard content is not highly sensitive)
- Clear data after successful submission to prevent reuse

---

## 7. API Integration

### 7.1 Generate Flashcards API

**Endpoint**: `POST /api/decks/:deckId/flashcards/generate`

**Request**:
```typescript
// Type
type Request = GenerateFlashcardsCommand;

// Example
{
  "text": "... 1000+ characters of study material ..."
}
```

**Request Headers**:
```typescript
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>" // From Supabase session
}
```

**Response (Success - 200 OK)**:
```typescript
// Type
type Response = GenerateFlashcardsResponseDTO;

// Example
{
  "candidates": [
    {
      "front": "What is the capital of France?",
      "back": "Paris"
    },
    {
      "front": "What is the largest planet in our solar system?",
      "back": "Jupiter"
    }
    // ... minimum 5 total
  ],
  "total_generated": 8
}
```

**Error Responses**:
| Status | Error | Message | Handling |
|--------|-------|---------|----------|
| 400 | Bad Request | "Invalid deck ID format" | Should not occur (validated client-side) |
| 401 | Unauthorized | "Invalid or expired authentication token" | Redirect to login, clear session |
| 404 | Not Found | "Deck not found or access denied" | Show error toast, redirect to /decks |
| 422 | Validation Error | "Text must be at least 1000 characters" | Should not occur (validated client-side) |
| 500 | Internal Server Error | "Generation failed, please try again" | Show error toast, stay on page, allow retry |
| 503 | Service Unavailable | "AI service temporarily unavailable, please try again later" | Show error toast with retry, stay on page |

**Implementation in AiGenerationForm**:
```typescript
async function handleGenerate(text: string) {
  setIsGenerating(true);
  setError(null);

  try {
    const response = await fetch(`/api/decks/${deckId}/flashcards/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Generation failed');
    }

    const data: GenerateFlashcardsResponseDTO = await response.json();

    // Store in sessionStorage and navigate
    sessionStorage.setItem(
      `flashcard-candidates-${deckId}`,
      JSON.stringify(data.candidates)
    );

    window.location.href = `/decks/${deckId}/review`;

  } catch (err) {
    setError(err.message);
    toast.error(err.message);
  } finally {
    setIsGenerating(false);
  }
}
```

---

### 7.2 Batch Accept Flashcards API

**Endpoint**: `POST /api/decks/:deckId/flashcards/batch`

**Request**:
```typescript
// Type
type Request = AcceptFlashcardsCommand;

// Example
{
  "flashcards": [
    {
      "front": "What is the capital of France?",
      "back": "Paris"
    },
    {
      "front": "What is the largest planet in our solar system?",
      "back": "Jupiter"
    }
    // Only accepted candidates
  ]
}
```

**Request Headers**:
```typescript
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>" // From Supabase session
}
```

**Response (Success - 201 Created)**:
```typescript
// Type
type Response = AcceptFlashcardsResponseDTO;

// Example
{
  "created": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "deck_id": "deck-uuid-here",
      "front": "What is the capital of France?",
      "back": "Paris",
      "is_ai_generated": true,
      "next_review_date": "2024-01-15",
      "ease_factor": 2.5,
      "interval_days": 0,
      "repetitions": 0,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
    // ... all created flashcards
  ],
  "total_created": 2
}
```

**Error Responses**:
| Status | Error | Message | Handling |
|--------|-------|---------|----------|
| 400 | Bad Request | "Invalid input" | Should not occur (validated client-side) |
| 401 | Unauthorized | "Invalid or expired authentication token" | Redirect to login, clear session |
| 404 | Not Found | "Deck not found or access denied" | Show error toast, redirect to /decks |
| 422 | Validation Error | "Validation failed" | Show error details, allow retry |
| 500 | Internal Server Error | "Failed to create flashcards" | Show error toast with retry, preserve state |

**Implementation in AiReviewFlow**:
```typescript
async function handleDoneReviewing() {
  setIsSubmitting(true);
  setError(null);

  try {
    // Filter accepted candidates
    const flashcardsToSave = acceptedCandidates.map(c => ({
      front: c.front,
      back: c.back
    }));

    const response = await fetch(`/api/decks/${deckId}/flashcards/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ flashcards: flashcardsToSave })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save flashcards');
    }

    const data: AcceptFlashcardsResponseDTO = await response.json();

    // Clear sessionStorage
    sessionStorage.removeItem(`flashcard-candidates-${deckId}`);

    // Show success toast
    toast.success(`${data.total_created} flashcards added to ${deckName}`);

    // Navigate to deck detail
    window.location.href = `/decks/${deckId}`;

  } catch (err) {
    setError(err.message);
    toast.error(err.message);
    // Preserve state for retry
  } finally {
    setIsSubmitting(false);
  }
}
```

---

### 7.3 Authentication Token Handling

**Token Retrieval**:
```typescript
// In Astro component or React hook
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.access_token;

if (!accessToken) {
  // Redirect to login
  return Astro.redirect('/login');
}
```

**Token Refresh**:
- Supabase SDK automatically refreshes tokens
- Handle 401 errors by clearing session and redirecting to login

**Error Handling Pattern**:
```typescript
if (response.status === 401) {
  // Clear session
  await supabase.auth.signOut();

  // Redirect to login
  window.location.href = '/login';
  return;
}
```

---

## 8. User Interactions

### 8.1 AI Generation Input View

#### Interaction 1: Typing in Textarea
**User Action**: Types or pastes text into textarea

**Expected Outcome**:
1. `inputText` state updates with current value
2. Character counter updates in real-time (debounced by 100-200ms)
3. Counter color changes based on count:
   - Gray (0-999 chars): "Minimum 1,000 characters required"
   - Green (1000-10000 chars): "Ready to generate"
   - Red (10001+ chars): "Exceeds maximum of 10,000 characters"
4. Submit button enables/disables based on validation state
5. Status message updates to reflect current state

**Implementation**:
```typescript
<Textarea
  value={inputText}
  onChange={(e) => setInputText(e.target.value)}
  placeholder="Paste your study material here (1000-10000 characters)..."
  className="min-h-[300px]"
  autoFocus
/>
```

---

#### Interaction 2: Clicking Generate Button
**User Action**: Clicks "Generate Flashcards" button (when valid)

**Expected Outcome**:
1. Form validation runs (should already be valid due to disabled state)
2. `isGenerating` state set to true
3. LoadingScreen component appears with progress messages
4. API request sent to `/api/decks/:deckId/flashcards/generate`
5. Progress messages rotate every 4 seconds
6. On success:
   - Candidates stored in sessionStorage
   - Navigate to `/decks/${deckId}/review`
7. On error:
   - `isGenerating` set to false
   - Error toast displays with retry option
   - User stays on page with input preserved

**Implementation**:
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  if (characterCount.state !== 'valid') return;

  await handleGenerate(inputText);
}

<form onSubmit={handleSubmit}>
  {/* ... */}
  <Button
    type="submit"
    disabled={characterCount.state !== 'valid' || isGenerating}
  >
    Generate Flashcards
  </Button>
</form>
```

---

#### Interaction 3: Clicking Cancel Button
**User Action**: Clicks "Cancel" button

**Expected Outcome**:
1. If text present and not generating: Browser confirmation dialog appears
2. If confirmed: Navigate to `/decks/${deckId}`
3. If canceled: Stay on page
4. If no text: Navigate immediately without confirmation

**Implementation**:
```typescript
function handleCancel() {
  if (inputText.length > 0 && !isGenerating) {
    if (!confirm('Discard unsaved text?')) return;
  }

  window.location.href = `/decks/${deckId}`;
}

<Button
  type="button"
  variant="outline"
  onClick={handleCancel}
  disabled={isGenerating}
>
  Cancel
</Button>
```

---

#### Interaction 4: Clicking Cancel During Generation
**User Action**: Clicks "Cancel" button on LoadingScreen

**Expected Outcome**:
1. Attempt to abort fetch request (if possible)
2. `isGenerating` set to false
3. LoadingScreen closes
4. User returns to form with input preserved
5. Can retry generation or edit text

**Implementation**:
```typescript
const abortController = useRef<AbortController | null>(null);

async function handleGenerate(text: string) {
  abortController.current = new AbortController();

  try {
    const response = await fetch(url, {
      signal: abortController.current.signal,
      // ... other options
    });
    // ...
  } catch (err) {
    if (err.name === 'AbortError') {
      // Request was cancelled
      return;
    }
    // Handle other errors
  }
}

function handleCancelGeneration() {
  abortController.current?.abort();
  setIsGenerating(false);
}

<LoadingScreen onCancel={handleCancelGeneration} />
```

---

#### Interaction 5: Pressing Ctrl+Enter
**User Action**: Presses Ctrl+Enter (or Cmd+Enter on Mac) in textarea

**Expected Outcome**:
1. If input valid: Submit form (same as clicking Generate)
2. If input invalid: No action (button disabled)

**Implementation**:
```typescript
function handleKeyDown(e: React.KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (characterCount.state === 'valid') {
      handleSubmit(e as any);
    }
  }
}

<Textarea
  onKeyDown={handleKeyDown}
  // ... other props
/>
```

---

#### Interaction 6: Navigating Away with Unsaved Text
**User Action**: Closes tab, refreshes page, or navigates away

**Expected Outcome**:
1. If text present and not generating: Browser confirmation dialog appears
2. If confirmed: Navigation proceeds, text lost
3. If canceled: Stay on page, text preserved

**Implementation**:
```typescript
useEffect(() => {
  if (inputText.length === 0 || isGenerating) return;

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [inputText.length, isGenerating]);
```

---

### 8.2 AI Review View

#### Interaction 1: Clicking Accept on Candidate
**User Action**: Clicks "Accept" button on a candidate card

**Expected Outcome**:
1. Card fades out with smooth animation (300ms)
2. Candidate status updated to 'accepted'
3. Accepted count increments
4. Remaining count decrements
5. Progress header updates
6. Focus moves to next pending candidate
7. Screen reader announces: "Card accepted"

**Implementation**:
```typescript
function handleAccept(id: string) {
  setCandidates(prev =>
    prev.map(c => c.id === id ? { ...c, status: 'accepted' } : c)
  );

  // Announce to screen reader
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.textContent = 'Card accepted';
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);

  // Focus management
  focusNextPendingCandidate(id);
}

<AiCandidateCard
  candidate={candidate}
  onAccept={handleAccept}
  onDiscard={handleDiscard}
/>
```

---

#### Interaction 2: Clicking Discard on Candidate
**User Action**: Clicks "Discard" button on a candidate card

**Expected Outcome**:
1. Card fades out with smooth animation (300ms)
2. Candidate status updated to 'discarded'
3. Remaining count decrements
4. Progress header updates
5. Focus moves to next pending candidate
6. Screen reader announces: "Card discarded"

**Implementation**:
```typescript
function handleDiscard(id: string) {
  setCandidates(prev =>
    prev.map(c => c.id === id ? { ...c, status: 'discarded' } : c)
  );

  // Similar announcement and focus logic as Accept
}
```

---

#### Interaction 3: Pressing 'A' Key (Accept Shortcut)
**User Action**: Presses 'A' key while candidate card focused

**Expected Outcome**:
- Same as clicking Accept button on focused candidate

**Implementation**:
```typescript
// In AiCandidateCard component
function handleKeyDown(e: React.KeyboardEvent) {
  if (e.key === 'a' || e.key === 'A') {
    e.preventDefault();
    onAccept(candidate.id);
  } else if (e.key === 'd' || e.key === 'D') {
    e.preventDefault();
    onDiscard(candidate.id);
  }
}

<article
  tabIndex={0}
  onKeyDown={handleKeyDown}
  className="focus:ring-2 focus:ring-blue-500"
>
  {/* Card content */}
</article>
```

---

#### Interaction 4: Pressing 'D' Key (Discard Shortcut)
**User Action**: Presses 'D' key while candidate card focused

**Expected Outcome**:
- Same as clicking Discard button on focused candidate

---

#### Interaction 5: Clicking Done Reviewing
**User Action**: Clicks "Done Reviewing" button

**Expected Outcome**:
1. Filter candidates with status 'accepted'
2. `isSubmitting` state set to true
3. Loading indicator appears on button
4. API request sent to `/api/decks/:deckId/flashcards/batch`
5. On success:
   - Success toast: "X flashcards added to [Deck Name]"
   - Clear candidates from sessionStorage
   - Navigate to `/decks/${deckId}`
6. On error:
   - Error toast with retry option
   - Stay on review page
   - Review state preserved
   - `isSubmitting` set to false

**Implementation**:
```typescript
async function handleDone() {
  const flashcardsToSave = acceptedCandidates.map(c => ({
    front: c.front,
    back: c.back
  }));

  setIsSubmitting(true);

  try {
    const response = await fetch(`/api/decks/${deckId}/flashcards/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ flashcards: flashcardsToSave })
    });

    if (!response.ok) throw new Error('Failed to save flashcards');

    const data = await response.json();

    sessionStorage.removeItem(`flashcard-candidates-${deckId}`);
    toast.success(`${data.total_created} flashcards added to ${deckName}`);
    window.location.href = `/decks/${deckId}`;

  } catch (err) {
    toast.error('Failed to save flashcards. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
}

<Button
  onClick={handleDone}
  disabled={isSubmitting}
>
  {isSubmitting ? 'Saving...' : 'Done Reviewing'}
</Button>
```

---

#### Interaction 6: Pressing Escape Key
**User Action**: Presses Escape key

**Expected Outcome**:
1. Confirmation dialog appears: "Exit without saving? All review progress will be lost."
2. If confirmed: Navigate to `/decks/${deckId}`, lose all progress
3. If canceled: Stay on review page, preserve state

**Implementation**:
```typescript
useEffect(() => {
  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      const confirmed = confirm('Exit without saving? All review progress will be lost.');
      if (confirmed) {
        sessionStorage.removeItem(`flashcard-candidates-${deckId}`);
        window.location.href = `/decks/${deckId}`;
      }
    }
  }

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [deckId]);
```

---

#### Interaction 7: Browser Back Button
**User Action**: Clicks browser back button

**Expected Outcome**:
1. Browser confirmation dialog appears (via beforeunload)
2. If confirmed: Navigate back, lose review progress
3. If canceled: Stay on review page

**Implementation**:
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (candidates.some(c => c.status !== 'pending')) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [candidates]);
```

---

#### Interaction 8: Accepting All Cards (Stretch Goal)
**User Action**: Clicks "Accept All" button (if implemented)

**Expected Outcome**:
1. All pending candidates marked as 'accepted'
2. All cards fade out simultaneously
3. Accepted count jumps to total count
4. Remaining count becomes 0
5. Progress shows "All reviewed"

**Implementation** (optional):
```typescript
function handleAcceptAll() {
  setCandidates(prev =>
    prev.map(c => c.status === 'pending' ? { ...c, status: 'accepted' } : c)
  );
}

<Button
  variant="outline"
  onClick={handleAcceptAll}
  disabled={remainingCount === 0 || isSubmitting}
>
  Accept All ({remainingCount})
</Button>
```

---

## 9. Conditions and Validation

### 9.1 Generation View Validation

#### Validation 1: Character Count Minimum
**Condition**: `inputText.trim().length >= 1000`

**Affected Components**:
- AiGenerationForm: Submit button disabled state
- CharacterCounter: Color and message display

**Interface Effects**:
- **When false (< 1000)**:
  - Submit button: Disabled (`disabled={true}`)
  - Counter color: Gray (`text-gray-500`)
  - Status message: "Minimum 1,000 characters required"
  - Submit attempt: Prevented by disabled state

- **When true (>= 1000)**:
  - Submit button: Enabled (if also <= 10000)
  - Counter color: Green (`text-green-600`)
  - Status message: "Ready to generate"
  - Submit attempt: Allowed

**Implementation**:
```typescript
const isMinimumMet = characterCount.count >= 1000;
const isMaximumMet = characterCount.count <= 10000;
const isValid = isMinimumMet && isMaximumMet;

<Button
  type="submit"
  disabled={!isValid || isGenerating}
>
  Generate Flashcards
</Button>
```

---

#### Validation 2: Character Count Maximum
**Condition**: `inputText.trim().length <= 10000`

**Affected Components**:
- AiGenerationForm: Submit button disabled state
- CharacterCounter: Color and message display

**Interface Effects**:
- **When false (> 10000)**:
  - Submit button: Disabled (`disabled={true}`)
  - Counter color: Red (`text-red-600`)
  - Status message: "Exceeds maximum of 10,000 characters"
  - Submit attempt: Prevented by disabled state

- **When true (<= 10000)**:
  - Submit button: Enabled (if also >= 1000)
  - Counter color: Green (`text-green-600`)
  - Status message: "Ready to generate"
  - Submit attempt: Allowed

---

#### Validation 3: Non-Whitespace Content
**Condition**: `inputText.trim().length > 0` (content after trimming)

**Affected Components**:
- AiGenerationForm: useCharacterValidation hook

**Interface Effects**:
- Trimmed length used for all validation (not raw length)
- Prevents submitting text with only whitespace
- Server-side validation matches (uses trim)

**Implementation**:
```typescript
function useCharacterValidation(text: string): CharacterCountState {
  return useMemo(() => {
    const trimmedText = text.trim(); // Key: trim before counting
    const count = trimmedText.length;

    // ... validation logic
  }, [text]);
}
```

---

#### Validation 4: Valid Deck ID
**Condition**: `deckId` is a valid UUID format and deck exists

**Affected Components**:
- GenerateFlashcardsPage.astro: Server-side validation

**Interface Effects**:
- **When invalid**:
  - Page does not render
  - Redirect to `/decks` with error toast
  - 404 response

- **When valid**:
  - Page renders normally
  - Form receives deckId and deckName props

**Implementation** (in .astro file):
```typescript
const { id: deckId } = Astro.params;

// Validate UUID format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!deckId || !uuidRegex.test(deckId)) {
  return Astro.redirect('/decks');
}

// Fetch deck and verify ownership
const { data: deck, error } = await locals.supabase
  .from('decks')
  .select('id, name')
  .eq('id', deckId)
  .single();

if (error || !deck) {
  return Astro.redirect('/decks');
}
```

---

#### Validation 5: User Authentication
**Condition**: User has valid session with access token

**Affected Components**:
- GenerateFlashcardsPage.astro: Middleware and page-level check

**Interface Effects**:
- **When unauthenticated**:
  - Redirect to `/login`
  - Session cleared
  - Page does not render

- **When authenticated**:
  - Page renders normally
  - Access token available for API calls

**Implementation**:
```typescript
const { data: { session } } = await locals.supabase.auth.getSession();

if (!session) {
  return Astro.redirect('/login');
}
```

---

### 9.2 Review View Validation

#### Validation 1: Candidates Exist
**Condition**: At least 5 candidates received from generation

**Affected Components**:
- ReviewFlashcardsPage.astro: Client-side check
- AiReviewFlow: Initialization

**Interface Effects**:
- **When false (< 5 or none)**:
  - Error toast: "No candidates found"
  - Redirect to `/decks/${deckId}/generate`

- **When true (>= 5)**:
  - Review interface renders
  - All candidates displayed

**Implementation**:
```typescript
// In page script
const storedData = sessionStorage.getItem(`flashcard-candidates-${deckId}`);

if (!storedData) {
  window.location.href = `/decks/${deckId}/generate`;
}

const candidates = JSON.parse(storedData);

if (candidates.length < 5) {
  toast.error('Insufficient candidates generated');
  window.location.href = `/decks/${deckId}/generate`;
}
```

---

#### Validation 2: Valid Candidate Data
**Condition**: Each candidate has non-empty front and back

**Affected Components**:
- Backend validation (already guaranteed by generation endpoint)

**Interface Effects**:
- No client-side validation needed (data already validated)
- Trust data from generation endpoint
- Backend validates again on batch submission

---

#### Validation 3: At Least One Candidate (for submission)
**Condition**: User can submit with 0 accepted cards (allowed by design)

**Affected Components**:
- AiReviewFlow: handleDone function

**Interface Effects**:
- "Done Reviewing" button always enabled
- Submitting with 0 accepted cards:
  - Success response: `{ created: [], total_created: 0 }`
  - Success toast: "0 flashcards added to [Deck Name]"
  - Navigate to deck detail

**Implementation**:
```typescript
// No validation needed - allow empty submission
async function handleDone() {
  const flashcardsToSave = acceptedCandidates.map(c => ({
    front: c.front,
    back: c.back
  }));

  // flashcardsToSave may be empty array - this is valid
  // Backend will create 0 flashcards and return success

  // ... proceed with submission
}
```

---

### 9.3 Client-Side vs Server-Side Validation

**Client-Side Validation** (UX optimization):
- Character count (1000-10000)
- Non-empty fields
- UUID format
- Deck existence (pre-fetch)
- Session existence

**Server-Side Validation** (Security requirement):
- All client-side validations PLUS:
- Deck ownership verification
- Rate limiting (10 requests/hour)
- XSS sanitization
- SQL injection prevention (via Supabase parameterized queries)
- Token validity and expiration

**Principle**: Never trust client-side validation alone. Server MUST validate all inputs.

---

## 10. Error Handling

### 10.1 Generation View Errors

#### Error 1: AI Service Unavailable (503)
**Trigger**: Backend cannot reach AI service (OpenRouter.ai)

**User Experience**:
1. Loading screen disappears
2. Error toast appears: "AI service temporarily unavailable, please try again later"
3. Stay on generation page
4. Input text preserved
5. User can retry after dismissing toast

**Implementation**:
```typescript
if (response.status === 503) {
  toast.error('AI service temporarily unavailable, please try again later', {
    duration: 5000,
    icon: '⚠️'
  });
  setIsGenerating(false);
  return;
}
```

**Recovery**: User waits and retries (service issue, not user error)

---

#### Error 2: AI Generation Failed (500)
**Trigger**: AI service returns error or insufficient candidates

**User Experience**:
1. Loading screen disappears
2. Error toast appears: "Generation failed, please try again"
3. Stay on generation page
4. Input text preserved
5. User can modify text and retry

**Implementation**:
```typescript
if (response.status === 500) {
  const errorData = await response.json();
  toast.error(errorData.message || 'Generation failed, please try again', {
    duration: 4000
  });
  setIsGenerating(false);
  return;
}
```

**Recovery**: User can retry with same or different text

---

#### Error 3: Network Timeout
**Trigger**: Request takes too long or network connection lost

**User Experience**:
1. Loading screen shows for extended time
2. Request times out (browser default ~30-60 seconds)
3. Error toast appears: "Request timed out. Please check your connection and try again."
4. Stay on generation page
5. Input text preserved

**Implementation**:
```typescript
try {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000), // 30 second timeout
    // ... other options
  });
} catch (err) {
  if (err.name === 'TimeoutError') {
    toast.error('Request timed out. Please check your connection and try again.');
  } else if (err.name === 'AbortError') {
    // User cancelled - no error needed
    return;
  } else {
    toast.error('Network error. Please try again.');
  }
  setIsGenerating(false);
}
```

**Recovery**: User checks connection and retries

---

#### Error 4: Session Expired (401)
**Trigger**: User's authentication token expired during request

**User Experience**:
1. Loading screen disappears
2. Error toast appears: "Session expired. Please log in again."
3. Session cleared from Supabase
4. Redirect to `/login` with return URL
5. Input text NOT preserved (security)

**Implementation**:
```typescript
if (response.status === 401) {
  toast.error('Session expired. Please log in again.');
  await supabase.auth.signOut();
  window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
  return;
}
```

**Recovery**: User logs in again, may need to re-enter text

---

#### Error 5: Deck Not Found (404)
**Trigger**: Deck deleted or user lost access during generation

**User Experience**:
1. Loading screen disappears
2. Error toast appears: "Deck not found or access denied"
3. Redirect to `/decks` list
4. Input text lost

**Implementation**:
```typescript
if (response.status === 404) {
  toast.error('Deck not found or access denied');
  window.location.href = '/decks';
  return;
}
```

**Recovery**: User selects valid deck and starts over

---

#### Error 6: Validation Error (422)
**Trigger**: Server-side validation fails (should not occur with proper client validation)

**User Experience**:
1. Loading screen disappears
2. Error toast appears with specific validation message
3. Stay on generation page
4. Input text preserved
5. User corrects issue and retries

**Implementation**:
```typescript
if (response.status === 422) {
  const errorData = await response.json();
  const message = errorData.details?.[0]?.issue || 'Invalid input';
  toast.error(message);
  setIsGenerating(false);
  return;
}
```

**Recovery**: User corrects input based on error message

---

### 10.2 Review View Errors

#### Error 7: No Candidates in SessionStorage
**Trigger**: User navigates directly to review URL without generation

**User Experience**:
1. Page loads
2. Script checks sessionStorage
3. No candidates found
4. Info toast appears: "No candidates to review"
5. Redirect to `/decks/${deckId}/generate`

**Implementation**:
```typescript
// In page script
const storedData = sessionStorage.getItem(`flashcard-candidates-${deckId}`);

if (!storedData) {
  toast.info('No candidates to review. Please generate flashcards first.');
  window.location.href = `/decks/${deckId}/generate`;
}
```

**Recovery**: User generates flashcards first

---

#### Error 8: Batch Submission Failed (500)
**Trigger**: Database error or server issue during flashcard creation

**User Experience**:
1. "Done Reviewing" button shows loading
2. Request fails
3. Error toast appears: "Failed to save flashcards. Please try again."
4. Stay on review page
5. Review state preserved (can retry)
6. Button returns to normal state

**Implementation**:
```typescript
try {
  const response = await fetch(/* ... */);

  if (!response.ok) {
    throw new Error('Failed to save flashcards');
  }

  // Success handling
} catch (err) {
  toast.error('Failed to save flashcards. Please try again.', {
    action: {
      label: 'Retry',
      onClick: () => handleDone() // Retry same submission
    }
  });
} finally {
  setIsSubmitting(false);
}
```

**Recovery**: User clicks retry or "Done Reviewing" again

---

#### Error 9: All Cards Discarded
**Trigger**: User discards all candidates, clicks "Done Reviewing"

**User Experience**:
1. Batch submission with empty array
2. Success response: `{ created: [], total_created: 0 }`
3. Success toast appears: "0 flashcards added to [Deck Name]"
4. sessionStorage cleared
5. Navigate to `/decks/${deckId}`

**Implementation**:
```typescript
// This is NOT an error - it's valid behavior
const data = await response.json();

toast.success(`${data.total_created} flashcards added to ${deckName}`, {
  duration: 3000
});

// Proceed with navigation
```

**Recovery**: Not needed (intentional user action)

---

#### Error 10: Network Error During Submission
**Trigger**: Connection lost while submitting accepted cards

**User Experience**:
1. "Done Reviewing" button shows loading
2. Network error occurs
3. Error toast appears: "Network error. Your progress is saved. Please try again."
4. Stay on review page
5. Review state preserved (all accept/discard decisions intact)
6. User can retry submission

**Implementation**:
```typescript
try {
  const response = await fetch(/* ... */);
  // ...
} catch (err) {
  if (err.name === 'TypeError' && err.message.includes('fetch')) {
    toast.error('Network error. Your progress is saved. Please try again.', {
      duration: 5000
    });
  } else {
    toast.error('An unexpected error occurred. Please try again.');
  }
  setIsSubmitting(false);
  // Review state automatically preserved (React state not cleared)
}
```

**Recovery**: User checks connection and clicks "Done Reviewing" again

---

### 10.3 Edge Cases

#### Edge Case 1: Exactly 1000 or 10000 Characters
**Scenario**: User enters exactly the boundary values

**Handling**:
- 1000 characters: Valid (inclusive)
- 10000 characters: Valid (inclusive)
- Character counter shows green: "Ready to generate"
- Submit button enabled

**Implementation**: Use `>=` and `<=` in validation conditions

---

#### Edge Case 2: Long Text in Candidate Cards
**Scenario**: Candidate has very long front or back text

**Handling**:
- Set max-height on card content areas
- Apply `overflow-y: auto` for scrolling
- Show visual indicator for scrollable content (scrollbar or shadow)

**Implementation**:
```typescript
<CardContent className="max-h-[200px] overflow-y-auto">
  <p className="whitespace-pre-wrap">{candidate.back}</p>
</CardContent>
```

---

#### Edge Case 3: Rapid Accept/Discard Clicks
**Scenario**: User rapidly clicks multiple action buttons

**Handling**:
- Debounce or disable buttons during animation
- Prevent status updates if already processed
- Queue animations if multiple actions occur

**Implementation**:
```typescript
function handleAccept(id: string) {
  // Check if already processed
  const candidate = candidates.find(c => c.id === id);
  if (candidate?.status !== 'pending') return;

  // Proceed with update
  setCandidates(prev =>
    prev.map(c => c.id === id ? { ...c, status: 'accepted' } : c)
  );
}
```

---

#### Edge Case 4: Browser Back During Submission
**Scenario**: User clicks back while batch submission in progress

**Handling**:
- beforeunload event prevents navigation
- Show confirmation: "Submission in progress. Are you sure you want to leave?"
- If confirmed: Navigation proceeds, submission may fail (idempotent endpoint helpful)

**Implementation**:
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isSubmitting || candidates.some(c => c.status !== 'pending')) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isSubmitting, candidates]);
```

---

#### Edge Case 5: Multiple Tabs Open
**Scenario**: User opens generation/review in multiple tabs

**Handling**:
- sessionStorage is tab-scoped (each tab has own copy)
- Each tab operates independently
- Submitting in one tab doesn't affect others
- May create duplicate flashcards if both tabs submit

**Mitigation**:
- Consider adding timestamp to sessionStorage key
- Clear candidates immediately after successful submission
- Backend could implement deduplication (beyond MVP scope)

---

## 11. Implementation Steps

### Phase 1: Setup and Infrastructure

#### Step 1: Create Page Files
1. Create `src/pages/decks/[id]/generate.astro`
2. Create `src/pages/decks/[id]/review.astro`
3. Add `export const prerender = false` to both files
4. Set up basic layout structure

**Verification**: Pages accessible at `/decks/:id/generate` and `/decks/:id/review`

---

#### Step 2: Set Up Type Definitions
1. Review existing types in `src/types.ts`
2. Create new file `src/types/flashcard-generation.types.ts` for new types:
   - `CharacterCountState`
   - `CandidateWithStatus`
   - `AiGenerationFormProps`
   - `CharacterCounterProps`
   - `LoadingScreenProps`
   - `AiReviewFlowProps`
   - `ReviewProgressProps`
   - `AiCandidateCardProps`
3. Export all new types from `src/types.ts`

**Verification**: Types compile without errors, can be imported in components

---

#### Step 3: Install Required Shadcn/ui Components
```bash
npx shadcn@latest add textarea
npx shadcn@latest add button  # If not already installed
npx shadcn@latest add card
npx shadcn@latest add progress
npx shadcn@latest add toast
```

**Verification**: Components available in `src/components/ui/`

---

### Phase 2: AI Generation Input View

#### Step 4: Implement GenerateFlashcardsPage.astro
1. Add authentication check and deck validation
2. Query deck from Supabase
3. Handle error cases (not found, unauthorized)
4. Pass deckId and deckName to AiGenerationForm component
5. Add proper meta tags and page title

**Code Structure**:
```astro
---
const { id: deckId } = Astro.params;

// Validate session
const { data: { session } } = await locals.supabase.auth.getSession();
if (!session) {
  return Astro.redirect('/login');
}

// Validate and fetch deck
const { data: deck, error } = await locals.supabase
  .from('decks')
  .select('id, name')
  .eq('id', deckId)
  .single();

if (error || !deck) {
  return Astro.redirect('/decks');
}
---

<Layout title={`Generate Flashcards - ${deck.name}`}>
  <main class="container mx-auto px-4 py-8">
    <AiGenerationForm
      client:load
      deckId={deck.id}
      deckName={deck.name}
    />
  </main>
</Layout>
```

**Verification**: Page loads with proper authentication and deck validation

---

#### Step 5: Create useCharacterValidation Hook
1. Create `src/hooks/useCharacterValidation.ts`
2. Implement character counting logic
3. Return CharacterCountState with count, state, and message
4. Use useMemo for optimization

**Code**:
```typescript
import { useMemo } from 'react';
import type { CharacterCountState } from '@/types';

export function useCharacterValidation(text: string): CharacterCountState {
  return useMemo(() => {
    const trimmedText = text.trim();
    const count = trimmedText.length;

    if (count < 1000) {
      return {
        count,
        state: 'invalid-min',
        message: 'Minimum 1,000 characters required'
      };
    } else if (count > 10000) {
      return {
        count,
        state: 'invalid-max',
        message: 'Exceeds maximum of 10,000 characters'
      };
    } else {
      return {
        count,
        state: 'valid',
        message: 'Ready to generate'
      };
    }
  }, [text]);
}
```

**Verification**: Hook returns correct states for different input lengths

---

#### Step 6: Implement CharacterCounter Component
1. Create `src/components/CharacterCounter.tsx`
2. Accept count, state, and message props
3. Apply color classes based on state
4. Add aria-live for accessibility

**Code**:
```typescript
import type { CharacterCounterProps } from '@/types';

export function CharacterCounter({ count, state, message }: CharacterCounterProps) {
  const colorClasses = {
    'invalid-min': 'text-gray-500',
    'valid': 'text-green-600',
    'invalid-max': 'text-red-600'
  };

  return (
    <div className={`text-sm ${colorClasses[state]}`} aria-live="polite">
      <span className="font-medium">{count.toLocaleString()} / 10,000 characters</span>
      {message && <span className="ml-2">- {message}</span>}
    </div>
  );
}
```

**Verification**: Counter displays with correct colors for different states

---

#### Step 7: Create useNavigationGuard Hook
1. Create `src/hooks/useNavigationGuard.ts`
2. Set up beforeunload event listener
3. Show confirmation when shouldWarn is true
4. Clean up listener on unmount

**Code**: See Section 6.1 for implementation

**Verification**: Browser shows confirmation dialog when navigating with unsaved text

---

#### Step 8: Create useGenerationProgress Hook
1. Create `src/hooks/useGenerationProgress.ts`
2. Set up message rotation with setInterval
3. Return current message string
4. Clean up interval on unmount

**Code**: See Section 6.1 for implementation

**Verification**: Messages rotate every 4 seconds when used in component

---

#### Step 9: Implement LoadingScreen Component
1. Create `src/components/LoadingScreen.tsx`
2. Create modal overlay with backdrop
3. Add spinner animation
4. Use useGenerationProgress hook for messages
5. Add cancel button
6. Include Progress component from Shadcn/ui

**Code Structure**:
```typescript
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useGenerationProgress } from '@/hooks/useGenerationProgress';
import type { LoadingScreenProps } from '@/types';

export function LoadingScreen({ onCancel }: LoadingScreenProps) {
  const currentMessage = useGenerationProgress();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
         role="dialog"
         aria-modal="true"
         aria-label="Generating flashcards">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <div className="flex flex-col items-center space-y-4">
          {/* Spinner */}
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />

          {/* Progress message */}
          <p className="text-lg font-medium" aria-live="assertive">
            {currentMessage}
          </p>

          {/* Progress bar */}
          <Progress value={null} className="w-full" />

          {/* Cancel button */}
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Verification**: Loading screen appears with rotating messages and working cancel button

---

#### Step 10: Implement AiGenerationForm Component
1. Create `src/components/AiGenerationForm.tsx`
2. Set up state variables (inputText, isGenerating, error)
3. Use useCharacterValidation hook
4. Use useNavigationGuard hook
5. Implement form submission logic
6. Add API integration for generation endpoint
7. Handle success (store in sessionStorage, navigate)
8. Handle errors (show toast, stay on page)

**Code Structure** (see Section 4.2 for detailed implementation):
- Form with onSubmit handler
- Textarea with autoFocus
- CharacterCounter display
- Cancel and Submit buttons
- Conditional LoadingScreen

**Verification**:
- Form validates input correctly
- Submit button disabled when invalid
- Generation triggers API call
- Success navigates to review view
- Errors show toast and preserve input

---

### Phase 3: AI Review View

#### Step 11: Implement ReviewFlashcardsPage.astro
1. Add authentication check
2. Add client-side script to retrieve candidates from sessionStorage
3. Validate candidates exist (redirect if not)
4. Query deck for name display
5. Pass data to AiReviewFlow component

**Code Structure**:
```astro
---
const { id: deckId } = Astro.params;

// Auth check
const { data: { session } } = await locals.supabase.auth.getSession();
if (!session) {
  return Astro.redirect('/login');
}

// Fetch deck
const { data: deck, error } = await locals.supabase
  .from('decks')
  .select('id, name')
  .eq('id', deckId)
  .single();

if (error || !deck) {
  return Astro.redirect('/decks');
}
---

<Layout title="Review Flashcards">
  <div id="review-container" data-deck-id={deck.id} data-deck-name={deck.name}></div>
</Layout>

<script>
  import { createRoot } from 'react-dom/client';
  import { AiReviewFlow } from '@/components/AiReviewFlow';

  const container = document.getElementById('review-container');
  const deckId = container.dataset.deckId;
  const deckName = container.dataset.deckName;

  // Retrieve candidates
  const storedData = sessionStorage.getItem(`flashcard-candidates-${deckId}`);

  if (!storedData) {
    window.location.href = `/decks/${deckId}/generate`;
  } else {
    const candidates = JSON.parse(storedData);
    const root = createRoot(container);
    root.render(
      <AiReviewFlow
        deckId={deckId}
        deckName={deckName}
        initialCandidates={candidates}
      />
    );
  }
</script>
```

**Verification**: Page loads with candidates from sessionStorage, redirects if missing

---

#### Step 12: Create useReviewState Hook
1. Create `src/hooks/useReviewState.ts`
2. Initialize candidates with ids and status
3. Implement handleAccept and handleDiscard
4. Calculate computed values (acceptedCount, remainingCount, acceptedCandidates)
5. Use useCallback and useMemo for optimization

**Code**: See Section 6.2 for implementation

**Verification**: Hook manages candidate state correctly, provides working handlers

---

#### Step 13: Implement ReviewProgress Component
1. Create `src/components/ReviewProgress.tsx`
2. Display title, remaining count, and accepted count
3. Add aria-live for progress updates
4. Style as header section

**Code**: See Section 4.7 for implementation

**Verification**: Progress displays correct counts, updates when candidates change

---

#### Step 14: Implement AiCandidateCard Component
1. Create `src/components/AiCandidateCard.tsx`
2. Use Card, CardHeader, CardContent, CardFooter from Shadcn/ui
3. Display front and back text
4. Add Accept and Discard buttons
5. Implement keyboard shortcuts (A/D keys)
6. Add fade-out animation based on status
7. Add accessibility attributes

**Code Structure**:
```typescript
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AiCandidateCardProps } from '@/types';

export function AiCandidateCard({ candidate, onAccept, onDiscard }: AiCandidateCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      onAccept(candidate.id);
    } else if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      onDiscard(candidate.id);
    }
  };

  const isProcessed = candidate.status !== 'pending';

  return (
    <article
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`transition-opacity duration-300 ${isProcessed ? 'opacity-0' : 'opacity-100'}`}
      aria-label="Flashcard candidate"
    >
      <Card className="focus-within:ring-2 focus-within:ring-blue-500">
        <CardHeader>
          <h3 className="text-lg font-bold">{candidate.front}</h3>
        </CardHeader>
        <CardContent className="max-h-[200px] overflow-y-auto">
          <p className="text-gray-700 whitespace-pre-wrap">{candidate.back}</p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            onClick={() => onAccept(candidate.id)}
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={isProcessed}
          >
            Accept
          </Button>
          <Button
            onClick={() => onDiscard(candidate.id)}
            variant="outline"
            className="flex-1"
            disabled={isProcessed}
          >
            Discard
          </Button>
        </CardFooter>
      </Card>
    </article>
  );
}
```

**Verification**: Card displays correctly, buttons work, keyboard shortcuts functional, fade-out animation smooth

---

#### Step 15: Implement AiReviewFlow Component
1. Create `src/components/AiReviewFlow.tsx`
2. Use useReviewState hook
3. Render ReviewProgress component
4. Map candidates to AiCandidateCard components
5. Add "Done Reviewing" button
6. Implement batch submission logic
7. Add navigation guards (Escape key, beforeunload)
8. Handle success (toast, clear storage, navigate)
9. Handle errors (toast, preserve state)

**Code Structure** (see Section 4.6 for detailed implementation):
- Main container with review layout
- ReviewProgress header
- Scrollable list of AiCandidateCard
- Footer with summary and Done button
- Event listeners for keyboard shortcuts
- API integration for batch endpoint

**Verification**:
- All candidates display correctly
- Accept/Discard updates state and UI
- Progress tracks counts accurately
- Done button submits accepted cards
- Success navigates to deck detail
- Errors show toast and preserve state

---

### Phase 4: Integration and Polish

#### Step 16: Add Navigation Links
1. Add "Generate Flashcards" link to Deck Detail view (`/decks/[id]`)
2. Link should navigate to `/decks/${deckId}/generate`
3. Display prominently (e.g., primary button)

**Verification**: User can navigate from deck detail to generation view

---

#### Step 17: Implement Toast Notifications
1. Ensure toast provider is set up in Layout (if not already)
2. Test all toast notifications:
   - Generation success (implicit via navigation)
   - Generation failure
   - Service unavailable
   - Batch submission success
   - Batch submission failure
   - Session expired
   - Deck not found
3. Verify toast styling matches design system

**Verification**: All toasts appear with correct messages and styling

---

#### Step 18: Add Accessibility Features
1. Test keyboard navigation through forms and cards
2. Verify ARIA attributes on all interactive elements
3. Test with screen reader (ChromeVox, NVDA, or VoiceOver)
4. Ensure focus indicators are visible
5. Test keyboard shortcuts (Ctrl+Enter, A/D keys, Escape)
6. Verify color contrast meets WCAG AA standards

**Verification**: Views are fully keyboard-navigable and screen reader friendly

---

#### Step 19: Optimize Performance
1. Review all useMemo and useCallback usage
2. Add React.memo to pure components (CharacterCounter, ReviewProgress, AiCandidateCard)
3. Test with React DevTools Profiler
4. Ensure no unnecessary re-renders
5. Test with 20+ candidates to verify scrolling performance

**Code**:
```typescript
import React from 'react';

export const CharacterCounter = React.memo(function CharacterCounter({ count, state, message }: CharacterCounterProps) {
  // ... component code
});

export const ReviewProgress = React.memo(function ReviewProgress({ totalCount, remainingCount, acceptedCount }: ReviewProgressProps) {
  // ... component code
});

export const AiCandidateCard = React.memo(function AiCandidateCard({ candidate, onAccept, onDiscard }: AiCandidateCardProps) {
  // ... component code
});
```

**Verification**: Components only re-render when props change, smooth performance with many candidates

---

#### Step 20: Test Error Scenarios
1. Manually test each error scenario from Section 10
2. Verify error messages are user-friendly
3. Test recovery paths for each error
4. Verify navigation guards work correctly
5. Test edge cases (exactly 1000/10000 chars, rapid clicks, etc.)

**Test Checklist**:
- [ ] AI service unavailable (503)
- [ ] AI generation failed (500)
- [ ] Network timeout during generation
- [ ] Session expired (401)
- [ ] Deck not found (404)
- [ ] Validation error (422)
- [ ] No candidates in sessionStorage
- [ ] Batch submission failed
- [ ] All cards discarded (0 accepted)
- [ ] Network error during submission
- [ ] Exactly 1000 characters
- [ ] Exactly 10000 characters
- [ ] Long text in candidates
- [ ] Rapid accept/discard clicks
- [ ] Browser back during submission
- [ ] Navigation with unsaved text

**Verification**: All error scenarios handled gracefully

---

#### Step 21: Cross-Browser Testing
1. Test in Chrome (primary browser)
2. Test in Firefox
3. Test in Safari (if available)
4. Test in Edge
5. Verify beforeunload behavior in each browser
6. Test sessionStorage behavior
7. Verify animations and transitions

**Verification**: Views work correctly in all major browsers

---

#### Step 22: Responsive Design Testing
1. Test on mobile viewport (375px width)
2. Test on tablet viewport (768px width)
3. Test on desktop viewport (1024px+ width)
4. Verify textarea is usable on mobile
5. Verify candidate cards stack properly on mobile
6. Test touch interactions on mobile devices

**Verification**: Views are fully responsive and usable on all screen sizes

---

#### Step 23: Documentation and Code Comments
1. Add JSDoc comments to all custom hooks
2. Add component documentation comments
3. Document any complex logic or workarounds
4. Update CLAUDE.md if any new patterns introduced
5. Add inline comments for non-obvious code

**Verification**: Code is well-documented and maintainable

---

#### Step 24: Final Integration Testing
1. Test complete user flow from deck detail to generation to review to deck detail
2. Verify data persistence and cleanup
3. Test with real AI endpoint (if available)
4. Test with mock AI endpoint for development
5. Verify success metrics tracking (is_ai_generated flag)
6. Test concurrent usage scenarios

**User Flow Test**:
1. Navigate to deck detail → ✓
2. Click "Generate Flashcards" → ✓
3. Enter 1000+ characters → ✓
4. Click Generate → ✓
5. Wait for loading screen → ✓
6. Candidates appear in review view → ✓
7. Accept some, discard some → ✓
8. Click Done Reviewing → ✓
9. Success toast appears → ✓
10. Navigate to deck detail → ✓
11. Flashcards visible in deck → ✓
12. AI flag set correctly in database → ✓

**Verification**: Complete flow works end-to-end without errors

---

### Phase 5: Deployment Preparation

#### Step 25: Environment Variables
1. Verify SUPABASE_URL and SUPABASE_KEY are set
2. Add any new environment variables needed
3. Document required environment variables
4. Test with production-like environment

**Verification**: Application works with production environment variables

---

#### Step 26: Build and Preview
1. Run `npm run build` to test production build
2. Fix any build errors or warnings
3. Run `npm run preview` to test built application
4. Verify all views work in production mode
5. Check bundle size and optimize if needed

**Verification**: Application builds successfully and works in production mode

---

#### Step 27: Final Review
1. Review all code against PRD requirements
2. Verify all user stories are satisfied
3. Check code against CLAUDE.md guidelines
4. Run linter and fix any issues: `npm run lint:fix`
5. Format code: `npm run format`
6. Commit changes with descriptive message

**Verification**: Code is clean, follows guidelines, and meets all requirements

---

## Summary

This implementation plan provides a comprehensive guide to building the AI flashcard generation and review views. The plan is structured in logical phases, from setup through deployment preparation, with detailed component specifications, type definitions, and step-by-step implementation instructions.

**Key Success Factors**:
1. Proper validation at both client and server levels
2. Robust error handling for all scenarios
3. Accessibility compliance throughout
4. Smooth user experience with loading states and feedback
5. Secure data handling (no storage of original text, session-scoped candidates)
6. Performance optimization for smooth interactions

**Total Estimated Time**: 16-20 hours of focused development

**Priority Order**:
1. Phase 1 (Setup): 2 hours
2. Phase 2 (Generation View): 6-8 hours
3. Phase 3 (Review View): 6-8 hours
4. Phase 4 (Integration): 2-3 hours
5. Phase 5 (Deployment): 1 hour
