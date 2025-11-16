# View Implementation Plan: Deck Detail View

## 1. Overview

The Deck Detail View is the central hub for managing flashcards within a specific deck. It displays all flashcards in a paginated list, provides deck management actions (edit name, delete), and serves as the gateway to AI flashcard generation and study sessions. Users can create flashcards manually, edit existing ones, delete unwanted cards, and see metadata such as AI-generation status and timestamps. The view implements optimistic UI updates for smooth user experience and handles empty states gracefully.

## 2. View Routing

**Path**: `/decks/[id]`

**Route Type**: Dynamic SSR route (Astro page with React islands)

**Authentication**: Required - redirects to `/login` if not authenticated

**File Location**: `src/pages/decks/[id].astro`

## 3. Component Structure

```
DeckDetailPage.astro (Astro SSR page)
├── Layout.astro
│   ├── TopNavigation (shared component)
│   └── main
│       └── DeckDetailView.tsx (React root component)
│           ├── DeckHeader.tsx (React)
│           │   ├── Deck title (inline editable)
│           │   ├── Stats (Badge components from Shadcn)
│           │   └── Action buttons (Button from Shadcn)
│           ├── Conditional rendering:
│           │   ├── EmptyDeckState.tsx (when flashcards.length === 0)
│           │   └── FlashcardList.tsx (when flashcards.length > 0)
│           │       ├── FlashcardListItem.tsx (multiple instances)
│           │       │   ├── Card (Shadcn)
│           │       │   ├── Badge (AI indicator)
│           │       │   ├── Date displays
│           │       │   └── Action buttons (edit/delete)
│           │       └── LoadMoreButton.tsx
│           ├── FlashcardModal.tsx (Dialog from Shadcn)
│           │   ├── Form inputs
│           │   ├── Validation errors
│           │   └── Action buttons
│           └── ConfirmDialog.tsx (AlertDialog from Shadcn)
```

## 4. Component Details

### 4.1. DeckDetailPage.astro (Astro Page)

**Description**: Server-side rendered page component that handles initial data fetching and authentication. Fetches deck details and initial page of flashcards, then passes data to React components.

**Main Elements**:
- `<Layout>` wrapper with navigation
- `<DeckDetailView>` client-side React component with `client:load` directive
- Error handling for 404 (deck not found)
- Redirect logic for unauthenticated users

**Handled Events**: None (SSR only)

**Validation**:
- Check `locals.session` exists (authentication)
- Validate deck ID is valid UUID format
- Handle 404 response if deck not found or doesn't belong to user
- Handle authentication errors

**Types**:
- `DeckDTO` - deck information with stats
- `PaginatedResponseDTO<FlashcardDTO>` - initial flashcards

**Props**: None (top-level page)

**Server-Side Logic**:
```typescript
// Fetch deck details
const deckResponse = await fetch(`${Astro.url.origin}/api/decks/${id}`, {
  headers: { Authorization: `Bearer ${locals.session.access_token}` }
});

// Fetch initial flashcards
const flashcardsResponse = await fetch(
  `${Astro.url.origin}/api/decks/${id}/flashcards?page=1&limit=50`,
  { headers: { Authorization: `Bearer ${locals.session.access_token}` } }
);
```

---

### 4.2. DeckDetailView.tsx (React Root Component)

**Description**: Main client-side React component that orchestrates all child components and manages overall state. Coordinates modal visibility, confirmation dialogs, and data flow between components.

**Main Elements**:
- `<DeckHeader>` - deck information and actions
- Conditional: `<EmptyDeckState>` or `<FlashcardList>`
- `<FlashcardModal>` - controlled by modalState
- `<ConfirmDialog>` - controlled by deleteConfirmState

**Handled Events**:
- Open create modal
- Open edit modal with flashcard data
- Open delete confirmation
- Handle modal close
- Handle flashcard mutations (create, update, delete)

**Validation**: None directly (delegates to children)

**Types**:
- `DeckDTO` - deck information
- `PaginatedResponseDTO<FlashcardDTO>` - flashcard list
- `ModalState` - modal visibility and mode
- `DeleteConfirmState` - deletion confirmation state

**Props**:
```typescript
interface DeckDetailViewProps {
  initialDeck: DeckDTO;
  initialFlashcards: PaginatedResponseDTO<FlashcardDTO>;
  deckId: string;
}
```

**State Management**:
```typescript
const [modalState, setModalState] = useState<ModalState>({
  isOpen: false,
  mode: 'create',
  flashcard: undefined
});

const [deleteConfirmState, setDeleteConfirmState] = useState<DeleteConfirmState>({
  isOpen: false,
  flashcardId: null,
  flashcardFront: null
});

// Custom hooks for data management
const { deck, updateDeckName } = useDeckInfo(initialDeck);
const {
  flashcards,
  pagination,
  loadMore,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  isLoadingMore
} = useDeckFlashcards(deckId, initialFlashcards);
```

---

### 4.3. DeckHeader.tsx (React Component)

**Description**: Displays deck name (inline editable), statistics badges, and action buttons for study, AI generation, and manual creation.

**Main Elements**:
- Deck name as `<h1>` (editable inline or with edit button)
- Stats section with Badge components:
  - Total flashcards count
  - Cards due badge (highlighted if > 0)
- Action buttons group:
  - "Start Study" button (disabled if cards_due === 0)
  - "Generate with AI" button
  - "Create Flashcard" button

**Handled Events**:
- Edit deck name: Click name or edit icon → inline input
- Save deck name: Enter key or blur event
- Cancel edit: Escape key
- Start study: Navigate to `/decks/[id]/study`
- Generate with AI: Navigate to `/decks/[id]/generate`
- Create flashcard: Open modal via callback

**Validation**:
- Deck name cannot be empty or whitespace-only
- Deck name length 1-255 characters
- Disable "Start Study" when `cards_due === 0`

**Types**:
- `DeckDTO` - deck information

**Props**:
```typescript
interface DeckHeaderProps {
  deck: DeckDTO;
  onUpdateDeckName: (name: string) => Promise<void>;
  onCreateFlashcard: () => void;
  isUpdating?: boolean;
}
```

**Local State**:
```typescript
const [isEditingName, setIsEditingName] = useState(false);
const [editedName, setEditedName] = useState(deck.name);
const [nameError, setNameError] = useState<string | null>(null);
```

---

### 4.4. FlashcardList.tsx (React Component)

**Description**: Renders paginated list of flashcards and handles "Load More" functionality. Coordinates flashcard item actions (edit, delete).

**Main Elements**:
- `<ul>` with `role="list"` containing flashcard items
- Each item is `<FlashcardListItem>` component
- "Load More" button at bottom (if hasMore)
- Loading skeleton during initial load or pagination

**Handled Events**:
- Load more: Fetch next page
- Edit flashcard: Open modal with flashcard data
- Delete flashcard: Open confirmation dialog

**Validation**: None directly

**Types**:
- `FlashcardDTO[]` - array of flashcards
- `PaginationDTO` - pagination metadata

**Props**:
```typescript
interface FlashcardListProps {
  flashcards: FlashcardDTO[];
  pagination: PaginationDTO;
  onLoadMore: () => Promise<void>;
  onEditFlashcard: (flashcard: FlashcardDTO) => void;
  onDeleteFlashcard: (id: string, front: string) => void;
  isLoadingMore: boolean;
}
```

---

### 4.5. FlashcardListItem.tsx (React Component)

**Description**: Displays individual flashcard with front/back text, AI badge, metadata, and action buttons.

**Main Elements**:
- `<article>` wrapper for semantic HTML
- Card component from Shadcn/ui
- Front text section (truncated if > 200 chars)
- Back text section (truncated if > 200 chars)
- Badge "AI" if `is_ai_generated === true`
- Metadata footer:
  - Created date
  - "Edited [date]" if `updated_at > created_at`
- Action buttons (edit, delete) - visible on hover (desktop) or always (mobile)

**Handled Events**:
- Edit button click: Call `onEdit` with flashcard
- Delete button click: Call `onDelete` with flashcard id
- Expand/collapse long text (optional enhancement)

**Validation**: None

**Types**:
- `FlashcardDTO` - flashcard data

**Props**:
```typescript
interface FlashcardListItemProps {
  flashcard: FlashcardDTO;
  onEdit: (flashcard: FlashcardDTO) => void;
  onDelete: (id: string, front: string) => void;
}
```

**Text Truncation Logic**:
```typescript
const TRUNCATE_LENGTH = 200;
const shouldTruncate = (text: string) => text.length > TRUNCATE_LENGTH;
const truncate = (text: string) =>
  shouldTruncate(text) ? text.slice(0, TRUNCATE_LENGTH) + '...' : text;
```

---

### 4.6. FlashcardModal.tsx (React Component)

**Description**: Modal dialog for creating or editing flashcards. Handles form state, validation, and submission.

**Main Elements**:
- Dialog component from Shadcn/ui
- Dialog title: "Create Flashcard" or "Edit Flashcard"
- Form with two textarea fields:
  - Front (labeled, required)
  - Back (labeled, required)
- Error messages below each field
- Footer with action buttons:
  - Cancel button
  - Save button (disabled while submitting or if invalid)

**Handled Events**:
- Field change: Update form state, clear errors
- Submit: Validate and call onCreate or onUpdate
- Cancel: Close modal, reset form
- Escape key: Close modal

**Validation**:
- Front field:
  - Cannot be empty
  - Cannot be whitespace-only
  - Error: "Front text cannot be empty or whitespace-only"
- Back field:
  - Cannot be empty
  - Cannot be whitespace-only
  - Error: "Back text cannot be empty or whitespace-only"
- For edit mode:
  - At least one field must be different from original
  - Error: "No changes detected"

**Types**:
- `CreateFlashcardCommand` - for create mode
- `UpdateFlashcardCommand` - for edit mode
- `FlashcardDTO` - when editing

**Props**:
```typescript
interface FlashcardModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  flashcard?: FlashcardDTO; // required if mode === 'edit'
  onClose: () => void;
  onCreate?: (command: CreateFlashcardCommand) => Promise<void>;
  onUpdate?: (id: string, command: UpdateFlashcardCommand) => Promise<void>;
}
```

**Form State**:
```typescript
interface FlashcardFormState {
  front: string;
  back: string;
  errors: {
    front?: string;
    back?: string;
    general?: string;
  };
}

const [formState, setFormState] = useState<FlashcardFormState>({
  front: flashcard?.front || '',
  back: flashcard?.back || '',
  errors: {}
});

const [isSubmitting, setIsSubmitting] = useState(false);
```

**Validation Function**:
```typescript
const validate = (): boolean => {
  const errors: FlashcardFormState['errors'] = {};

  if (!formState.front.trim()) {
    errors.front = 'Front text cannot be empty or whitespace-only';
  }

  if (!formState.back.trim()) {
    errors.back = 'Back text cannot be empty or whitespace-only';
  }

  if (mode === 'edit' && flashcard) {
    const hasChanges =
      formState.front.trim() !== flashcard.front ||
      formState.back.trim() !== flashcard.back;

    if (!hasChanges) {
      errors.general = 'No changes detected';
    }
  }

  setFormState(prev => ({ ...prev, errors }));
  return Object.keys(errors).length === 0;
};
```

---

### 4.7. ConfirmDialog.tsx (React Component)

**Description**: Confirmation dialog for destructive actions (delete flashcard). Uses AlertDialog from Shadcn/ui.

**Main Elements**:
- AlertDialog component from Shadcn/ui
- Title: "Delete Flashcard"
- Description: "Are you sure you want to delete '[front text]'? This action cannot be undone."
- Action buttons:
  - Cancel (default)
  - Delete (destructive variant)

**Handled Events**:
- Confirm: Call onConfirm callback
- Cancel: Call onCancel callback

**Validation**: None

**Types**: None specific

**Props**:
```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isDestructive?: boolean;
}
```

---

### 4.8. EmptyDeckState.tsx (React Component)

**Description**: Displayed when deck has no flashcards. Provides CTAs for AI generation and manual creation.

**Main Elements**:
- Icon or illustration
- Heading: "This deck has no flashcards yet"
- Subtext: "Get started by generating flashcards with AI or creating them manually"
- Action buttons:
  - "Generate with AI" (primary button)
  - "Create Manually" (secondary button)

**Handled Events**:
- Generate with AI: Navigate to `/decks/[id]/generate`
- Create manually: Open flashcard modal

**Validation**: None

**Types**: None

**Props**:
```typescript
interface EmptyDeckStateProps {
  deckId: string;
  onCreateManually: () => void;
}
```

---

### 4.9. LoadMoreButton.tsx (React Component)

**Description**: Button for loading additional flashcards with loading state.

**Main Elements**:
- Button component from Shadcn/ui
- Text: "Load More ([remaining] remaining)"
- Loading spinner when `isLoading === true`

**Handled Events**:
- Click: Call onLoadMore callback

**Validation**: Disabled when isLoading or no more items

**Types**: None

**Props**:
```typescript
interface LoadMoreButtonProps {
  onLoadMore: () => Promise<void>;
  isLoading: boolean;
  remaining: number;
  hasMore: boolean;
}
```

## 5. Types

### 5.1. Existing Types (from src/types.ts)

These types are already defined and should be imported:

```typescript
import type {
  DeckDTO,
  FlashcardDTO,
  CreateFlashcardCommand,
  UpdateFlashcardCommand,
  DeleteFlashcardResponseDTO,
  PaginatedResponseDTO,
  PaginationDTO
} from '@/types';
```

**DeckDTO**:
```typescript
{
  id: string;                    // UUID
  name: string;                  // Deck name
  created_at: string;           // ISO timestamp
  updated_at: string;           // ISO timestamp
  total_flashcards: number;     // Computed count
  cards_due: number;            // Computed count of due cards
  next_review_date: string | null; // ISO date or null
}
```

**FlashcardDTO**:
```typescript
{
  id: string;                    // UUID
  deck_id: string;              // UUID reference
  front: string;                // Front text
  back: string;                 // Back text
  is_ai_generated: boolean;     // Creation method flag
  next_review_date: string;     // ISO date
  ease_factor: number;          // Spaced repetition param
  interval_days: number;        // Spaced repetition param
  repetitions: number;          // Spaced repetition param
  created_at: string;           // ISO timestamp
  updated_at: string;           // ISO timestamp
}
```

**CreateFlashcardCommand**:
```typescript
{
  front: string;  // Required, non-empty, no whitespace-only
  back: string;   // Required, non-empty, no whitespace-only
}
```

**UpdateFlashcardCommand**:
```typescript
{
  front?: string;  // Optional, if provided: non-empty, no whitespace-only
  back?: string;   // Optional, if provided: non-empty, no whitespace-only
}
```

**PaginatedResponseDTO<T>**:
```typescript
{
  data: T[];           // Array of items
  pagination: {
    page: number;      // Current page
    limit: number;     // Items per page
    total: number;     // Total item count
    total_pages: number; // Total page count
  };
}
```

### 5.2. New ViewModel Types

Create new file: `src/lib/types/deck-view.types.ts`

**ModalState**:
```typescript
export interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  flashcard?: FlashcardDTO; // Present only in edit mode
}
```

**DeleteConfirmState**:
```typescript
export interface DeleteConfirmState {
  isOpen: boolean;
  flashcardId: string | null;
  flashcardFront: string | null; // For display in confirmation message
}
```

**FlashcardFormState**:
```typescript
export interface FlashcardFormState {
  front: string;
  back: string;
  errors: {
    front?: string;
    back?: string;
    general?: string;
  };
}
```

**FlashcardListState** (used internally in custom hook):
```typescript
export interface FlashcardListState {
  flashcards: FlashcardDTO[];
  pagination: PaginationDTO;
  isLoadingMore: boolean;
  hasMore: boolean;
}
```

**DeckInfoState** (used internally in custom hook):
```typescript
export interface DeckInfoState {
  deck: DeckDTO;
  isUpdating: boolean;
}
```

## 6. State Management

### 6.1. Overview

State management follows React 19 patterns with hooks and optimistic updates. State is distributed across components with custom hooks encapsulating complex logic.

### 6.2. Custom Hooks

#### useDeckFlashcards

**Location**: `src/components/hooks/useDeckFlashcards.ts`

**Purpose**: Manages flashcard list, pagination, and all CRUD operations with optimistic updates.

**Interface**:
```typescript
interface UseDeckFlashcardsReturn {
  flashcards: FlashcardDTO[];
  pagination: PaginationDTO;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  createFlashcard: (command: CreateFlashcardCommand) => Promise<void>;
  updateFlashcard: (id: string, command: UpdateFlashcardCommand) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
}

export function useDeckFlashcards(
  deckId: string,
  initialData: PaginatedResponseDTO<FlashcardDTO>
): UseDeckFlashcardsReturn
```

**Implementation Details**:
```typescript
export function useDeckFlashcards(
  deckId: string,
  initialData: PaginatedResponseDTO<FlashcardDTO>
): UseDeckFlashcardsReturn {
  const [flashcards, setFlashcards] = useState(initialData.data);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const hasMore = pagination.page < pagination.total_pages;

  // Load more flashcards
  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const response = await fetch(
        `/api/decks/${deckId}/flashcards?page=${pagination.page + 1}&limit=50`
      );
      const data: PaginatedResponseDTO<FlashcardDTO> = await response.json();

      setFlashcards(prev => [...prev, ...data.data]);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to load more flashcards:', error);
      // Show error toast
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Create flashcard with optimistic update
  const createFlashcard = async (command: CreateFlashcardCommand) => {
    // Optimistic flashcard (temporary)
    const optimisticFlashcard: FlashcardDTO = {
      id: `temp-${Date.now()}`,
      deck_id: deckId,
      front: command.front,
      back: command.back,
      is_ai_generated: false,
      next_review_date: new Date().toISOString(),
      ease_factor: 2.5,
      interval_days: 0,
      repetitions: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Optimistic update
    setFlashcards(prev => [optimisticFlashcard, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));

    try {
      const response = await fetch(`/api/decks/${deckId}/flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
      });

      if (!response.ok) throw new Error('Failed to create flashcard');

      const created: FlashcardDTO = await response.json();

      // Replace optimistic with real data
      setFlashcards(prev =>
        prev.map(f => f.id === optimisticFlashcard.id ? created : f)
      );
    } catch (error) {
      // Rollback on error
      setFlashcards(prev => prev.filter(f => f.id !== optimisticFlashcard.id));
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      throw error; // Re-throw for component error handling
    }
  };

  // Update flashcard with optimistic update
  const updateFlashcard = async (id: string, command: UpdateFlashcardCommand) => {
    // Store previous state for rollback
    const prevFlashcards = [...flashcards];

    // Optimistic update
    setFlashcards(prev =>
      prev.map(f =>
        f.id === id
          ? { ...f, ...command, updated_at: new Date().toISOString() }
          : f
      )
    );

    try {
      const response = await fetch(`/api/flashcards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
      });

      if (!response.ok) throw new Error('Failed to update flashcard');

      const updated: FlashcardDTO = await response.json();

      // Replace with server response
      setFlashcards(prev => prev.map(f => f.id === id ? updated : f));
    } catch (error) {
      // Rollback on error
      setFlashcards(prevFlashcards);
      throw error;
    }
  };

  // Delete flashcard with optimistic update
  const deleteFlashcard = async (id: string) => {
    // Store for rollback
    const prevFlashcards = [...flashcards];
    const prevPagination = { ...pagination };

    // Optimistic update
    setFlashcards(prev => prev.filter(f => f.id !== id));
    setPagination(prev => ({ ...prev, total: prev.total - 1 }));

    try {
      const response = await fetch(`/api/flashcards/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete flashcard');
    } catch (error) {
      // Rollback on error
      setFlashcards(prevFlashcards);
      setPagination(prevPagination);
      throw error;
    }
  };

  return {
    flashcards,
    pagination,
    isLoadingMore,
    hasMore,
    loadMore,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard
  };
}
```

#### useDeckInfo

**Location**: `src/components/hooks/useDeckInfo.ts`

**Purpose**: Manages deck information and name updates.

**Interface**:
```typescript
interface UseDeckInfoReturn {
  deck: DeckDTO;
  isUpdating: boolean;
  updateDeckName: (name: string) => Promise<void>;
  refreshDeck: () => Promise<void>;
}

export function useDeckInfo(initialDeck: DeckDTO): UseDeckInfoReturn
```

**Implementation**:
```typescript
export function useDeckInfo(initialDeck: DeckDTO): UseDeckInfoReturn {
  const [deck, setDeck] = useState(initialDeck);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateDeckName = async (name: string) => {
    const prevDeck = { ...deck };

    // Optimistic update
    setDeck(prev => ({ ...prev, name, updated_at: new Date().toISOString() }));
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/decks/${deck.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!response.ok) throw new Error('Failed to update deck name');

      const updated: DeckDTO = await response.json();
      setDeck(updated);
    } catch (error) {
      // Rollback
      setDeck(prevDeck);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const refreshDeck = async () => {
    try {
      const response = await fetch(`/api/decks/${deck.id}`);
      if (!response.ok) throw new Error('Failed to refresh deck');

      const updated: DeckDTO = await response.json();
      setDeck(updated);
    } catch (error) {
      console.error('Failed to refresh deck:', error);
    }
  };

  return { deck, isUpdating, updateDeckName, refreshDeck };
}
```

### 6.3. Component-Level State

**DeckDetailView.tsx**:
- `modalState: ModalState` - controls FlashcardModal
- `deleteConfirmState: DeleteConfirmState` - controls ConfirmDialog

**DeckHeader.tsx**:
- `isEditingName: boolean` - inline edit mode
- `editedName: string` - temporary name during edit
- `nameError: string | null` - validation error

**FlashcardModal.tsx**:
- `formState: FlashcardFormState` - form inputs and errors
- `isSubmitting: boolean` - submission state

## 7. API Integration

### 7.1. SSR Data Fetching (Server-Side)

**Location**: `src/pages/decks/[id].astro`

**Fetch Deck Details**:
```typescript
const deckResponse = await fetch(`${Astro.url.origin}/api/decks/${id}`, {
  headers: {
    Cookie: Astro.request.headers.get('Cookie') || ''
  }
});

if (!deckResponse.ok) {
  return Astro.redirect('/404');
}

const deck: DeckDTO = await deckResponse.json();
```

**Fetch Initial Flashcards**:
```typescript
const flashcardsResponse = await fetch(
  `${Astro.url.origin}/api/decks/${id}/flashcards?page=1&limit=50&sort=created_at&order=desc`,
  {
    headers: {
      Cookie: Astro.request.headers.get('Cookie') || ''
    }
  }
);

const flashcardsData: PaginatedResponseDTO<FlashcardDTO> = await flashcardsResponse.json();
```

### 7.2. Client-Side API Calls

All client-side API calls use fetch with automatic cookie handling.

**Load More Flashcards**:
```typescript
// Request
GET /api/decks/:deckId/flashcards?page=2&limit=50

// Response Type
PaginatedResponseDTO<FlashcardDTO>

// Error Handling
- 401: Redirect to login
- 404: Show "Deck not found" error
- 500: Show generic error toast
```

**Create Flashcard**:
```typescript
// Request
POST /api/decks/:deckId/flashcards
Content-Type: application/json

Body: CreateFlashcardCommand
{
  "front": "string",
  "back": "string"
}

// Response Type (201 Created)
FlashcardDTO

// Error Handling
- 400/422: Show validation errors in modal
- 401: Redirect to login
- 404: Show "Deck not found" error
- 500: Show generic error, keep modal open
```

**Update Flashcard**:
```typescript
// Request
PATCH /api/flashcards/:id
Content-Type: application/json

Body: UpdateFlashcardCommand
{
  "front"?: "string",
  "back"?: "string"
}

// Response Type (200 OK)
FlashcardDTO

// Error Handling
- 400/422: Show validation errors in modal
- 401: Redirect to login
- 404: Show "Flashcard not found", close modal, refresh list
- 500: Show generic error, keep modal open
```

**Delete Flashcard**:
```typescript
// Request
DELETE /api/flashcards/:id

// Response Type (200 OK)
DeleteFlashcardResponseDTO
{
  "message": "string"
}

// Error Handling
- 401: Redirect to login
- 404: Silent success (already deleted)
- 500: Show error, rollback optimistic update
```

**Update Deck Name**:
```typescript
// Request
PATCH /api/decks/:id
Content-Type: application/json

Body: UpdateDeckCommand
{
  "name": "string"
}

// Response Type (200 OK)
DeckDTO

// Error Handling
- 400/422: Show validation error inline
- 409: Show "Duplicate deck name" error
- 401: Redirect to login
- 404: Show "Deck not found"
- 500: Show generic error
```

### 7.3. Error Response Handling

Standard error response format:
```typescript
{
  error: {
    message: string;
    code: string;
    field?: string;
  }
}
```

**Global Error Handler**:
```typescript
async function handleApiError(response: Response) {
  if (response.status === 401) {
    window.location.href = '/login';
    return;
  }

  const errorData = await response.json().catch(() => ({
    error: { message: 'An unexpected error occurred', code: 'UNKNOWN' }
  }));

  return errorData.error;
}
```

## 8. User Interactions

### 8.1. View Deck
**Flow**:
1. User navigates to `/decks/[id]`
2. Server fetches deck and flashcards
3. Page renders with data
4. If deck not found or unauthorized → 404 page

**Expected Outcome**: Deck details and flashcards displayed

---

### 8.2. Edit Deck Name
**Flow**:
1. User clicks deck name or edit icon
2. Inline input appears with current name
3. User modifies name
4. User presses Enter or clicks save
5. Validation runs (non-empty, 1-255 chars)
6. If valid: Optimistic update, API call
7. If invalid: Show error inline

**Expected Outcome**: Deck name updated, or error shown

**Keyboard Shortcuts**:
- Enter: Save
- Escape: Cancel

---

### 8.3. Create Flashcard
**Flow**:
1. User clicks "Create Flashcard" button
2. Modal opens with empty form
3. User enters front text
4. User enters back text
5. User clicks "Save"
6. Validation runs
7. If valid: Optimistic update, API call, modal closes
8. If invalid: Show errors below fields

**Expected Outcome**: New flashcard appears at top of list

**Validation Messages**:
- "Front text cannot be empty or whitespace-only"
- "Back text cannot be empty or whitespace-only"

---

### 8.4. Edit Flashcard
**Flow**:
1. User clicks edit icon on flashcard
2. Modal opens with pre-filled form
3. User modifies front and/or back text
4. User clicks "Save"
5. Validation runs
6. If valid and changed: Optimistic update, API call, modal closes
7. If no changes: Show "No changes detected"
8. If invalid: Show errors

**Expected Outcome**: Flashcard updated in list, "Edited [date]" shown

---

### 8.5. Delete Flashcard
**Flow**:
1. User clicks delete icon on flashcard
2. Confirmation dialog appears
3. Dialog shows: "Are you sure you want to delete '[front text]'?"
4. User clicks "Delete"
5. Optimistic removal from list
6. API call
7. If error: Rollback, show error toast

**Expected Outcome**: Flashcard removed from list

**Alternative**: User clicks "Cancel" → dialog closes, no action

---

### 8.6. Load More Flashcards
**Flow**:
1. User scrolls to bottom of list
2. User clicks "Load More (X remaining)"
3. Button shows loading spinner
4. API fetches next page
5. New flashcards appended to list
6. Pagination state updated

**Expected Outcome**: Next 50 flashcards displayed

**Edge Case**: If on last page, button hidden

---

### 8.7. Start Study Session
**Flow**:
1. User clicks "Start Study" button
2. Navigate to `/decks/[id]/study`

**Expected Outcome**: Study session page loads

**Edge Case**: If `cards_due === 0`, button disabled with tooltip "No cards due for review today"

---

### 8.8. Navigate to AI Generation
**Flow**:
1. User clicks "Generate with AI" button
2. Navigate to `/decks/[id]/generate`

**Expected Outcome**: AI generation page loads

---

### 8.9. Empty Deck State
**Flow**:
1. User views deck with 0 flashcards
2. Empty state displayed with two CTAs
3. User clicks "Generate with AI" → navigate to generation
4. OR user clicks "Create Manually" → open create modal

**Expected Outcome**: Appropriate next action initiated

## 9. Conditions and Validation

### 9.1. Deck Name Validation

**Component**: DeckHeader.tsx

**Conditions**:
- Length: 1-255 characters
- Cannot be empty
- Cannot be whitespace-only

**Client-Side Validation**:
```typescript
const validateDeckName = (name: string): string | null => {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return 'Deck name cannot be empty';
  }

  if (trimmed.length > 255) {
    return 'Deck name must be 255 characters or less';
  }

  return null;
};
```

**UI Impact**:
- Error shown inline below input
- Save button disabled if invalid
- Red border on input field

---

### 9.2. Flashcard Field Validation

**Component**: FlashcardModal.tsx

**Conditions**:
- Front: Required, non-empty, no whitespace-only
- Back: Required, non-empty, no whitespace-only

**Client-Side Validation**:
```typescript
const validateFlashcardForm = (formState: FlashcardFormState): boolean => {
  const errors: FlashcardFormState['errors'] = {};

  if (!formState.front.trim()) {
    errors.front = 'Front text cannot be empty or whitespace-only';
  }

  if (!formState.back.trim()) {
    errors.back = 'Back text cannot be empty or whitespace-only';
  }

  return Object.keys(errors).length === 0;
};
```

**UI Impact**:
- Errors shown below respective fields
- Save button disabled if invalid
- Red border on invalid fields

---

### 9.3. Edit Mode Change Detection

**Component**: FlashcardModal.tsx (edit mode)

**Condition**: At least one field must differ from original

**Validation**:
```typescript
const hasChanges = (
  formState: FlashcardFormState,
  original: FlashcardDTO
): boolean => {
  return (
    formState.front.trim() !== original.front ||
    formState.back.trim() !== original.back
  );
};
```

**UI Impact**:
- If no changes: Show message "No changes detected"
- Save button disabled if no changes

---

### 9.4. Study Button Enable/Disable

**Component**: DeckHeader.tsx

**Condition**: `deck.cards_due > 0`

**UI Impact**:
```typescript
const canStartStudy = deck.cards_due > 0;

<Button
  disabled={!canStartStudy}
  aria-disabled={!canStartStudy}
  title={!canStartStudy ? 'No cards due for review today' : undefined}
>
  Start Study
</Button>
```

---

### 9.5. Load More Button Visibility

**Component**: FlashcardList.tsx

**Condition**: `pagination.page < pagination.total_pages`

**UI Impact**:
```typescript
const hasMore = pagination.page < pagination.total_pages;
const remaining = pagination.total - flashcards.length;

{hasMore && (
  <LoadMoreButton
    onLoadMore={loadMore}
    isLoading={isLoadingMore}
    remaining={remaining}
    hasMore={hasMore}
  />
)}
```

---

### 9.6. Empty Deck State Display

**Component**: DeckDetailView.tsx

**Condition**: `flashcards.length === 0`

**UI Impact**:
```typescript
{flashcards.length === 0 ? (
  <EmptyDeckState
    deckId={deckId}
    onCreateManually={handleOpenCreateModal}
  />
) : (
  <FlashcardList
    flashcards={flashcards}
    pagination={pagination}
    onLoadMore={loadMore}
    onEditFlashcard={handleEditFlashcard}
    onDeleteFlashcard={handleDeleteFlashcard}
    isLoadingMore={isLoadingMore}
  />
)}
```

---

### 9.7. AI Badge Display

**Component**: FlashcardListItem.tsx

**Condition**: `flashcard.is_ai_generated === true`

**UI Impact**:
```typescript
{flashcard.is_ai_generated && (
  <Badge
    variant="secondary"
    aria-label="AI-generated flashcard"
  >
    AI
  </Badge>
)}
```

---

### 9.8. Edit Date Display

**Component**: FlashcardListItem.tsx

**Condition**: `flashcard.updated_at > flashcard.created_at`

**UI Impact**:
```typescript
const wasEdited = new Date(flashcard.updated_at) > new Date(flashcard.created_at);

{wasEdited && (
  <span className="text-sm text-muted-foreground">
    Edited {formatRelativeDate(flashcard.updated_at)}
  </span>
)}
```

## 10. Error Handling

### 10.1. Authentication Errors (401)

**Scenario**: Session expired or invalid token

**Handling**:
- Detect 401 response in any API call
- Redirect to `/login` immediately
- No toast notification needed

**Implementation**:
```typescript
if (response.status === 401) {
  window.location.href = '/login';
  return;
}
```

---

### 10.2. Deck Not Found (404)

**Scenario**: Deck doesn't exist or doesn't belong to user

**Handling**:
- SSR: Return 404 page
- Client-side: Show error toast, redirect to `/decks`

**Implementation (SSR)**:
```typescript
const deckResponse = await fetch(`/api/decks/${id}`);
if (!deckResponse.ok) {
  return Astro.redirect('/404');
}
```

---

### 10.3. Flashcard Not Found (404)

**Scenario**: Flashcard deleted in another session

**Handling**:
- Remove from local state silently
- Show toast: "Flashcard no longer exists"
- Close modal if open

**Implementation**:
```typescript
catch (error) {
  if (response?.status === 404) {
    // Remove from local state
    setFlashcards(prev => prev.filter(f => f.id !== id));
    showToast('Flashcard no longer exists', 'info');
  }
}
```

---

### 10.4. Validation Errors (400, 422)

**Scenario**: Client-side validation missed something or server validation failed

**Handling**:
- Parse error response
- Show field-specific errors in form
- Keep modal open for correction

**Implementation**:
```typescript
if (response.status === 400 || response.status === 422) {
  const errorData = await response.json();

  if (errorData.error.field) {
    setFormState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [errorData.error.field]: errorData.error.message
      }
    }));
  } else {
    setFormState(prev => ({
      ...prev,
      errors: { general: errorData.error.message }
    }));
  }

  return;
}
```

---

### 10.5. Duplicate Deck Name (409)

**Scenario**: User tries to rename deck to existing name

**Handling**:
- Show error message inline
- Rollback optimistic update
- Keep edit mode active

**Implementation**:
```typescript
if (response.status === 409) {
  setNameError('A deck with this name already exists');
  setDeck(prevDeck); // Rollback
  return;
}
```

---

### 10.6. Server Errors (500)

**Scenario**: Database error, unexpected server error

**Handling**:
- Show generic error toast
- Rollback optimistic updates
- Log error for debugging
- Keep UI in usable state

**Implementation**:
```typescript
catch (error) {
  console.error('API error:', error);

  // Rollback optimistic update
  setFlashcards(prevFlashcards);

  // Show toast
  showToast(
    'Something went wrong. Please try again.',
    'error'
  );
}
```

---

### 10.7. Network Errors

**Scenario**: No internet connection, timeout

**Handling**:
- Show "Connection lost" message
- Rollback optimistic updates
- Provide retry option

**Implementation**:
```typescript
catch (error) {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    showToast(
      'Connection lost. Please check your internet connection.',
      'error',
      { action: { label: 'Retry', onClick: retryLastAction } }
    );
  }
}
```

---

### 10.8. Optimistic Update Rollback Strategy

**Pattern**: Store previous state before optimistic update

**Implementation**:
```typescript
// Before optimistic update
const prevState = { ...currentState };

// Optimistic update
setCurrentState(newState);

try {
  await apiCall();
} catch (error) {
  // Rollback
  setCurrentState(prevState);
  handleError(error);
}
```

---

### 10.9. Toast Notifications

**Usage**: Use toast for non-blocking feedback

**Success**:
- "Flashcard created"
- "Flashcard updated"
- "Flashcard deleted"
- "Deck name updated"

**Error**:
- "Failed to create flashcard"
- "Failed to update flashcard"
- "Connection lost"

**Info**:
- "Flashcard no longer exists"

**Implementation**: Use toast library (e.g., sonner via Shadcn)

## 11. Implementation Steps

### Step 1: Set up file structure
Create the following files:
- `src/pages/decks/[id].astro` - Main page
- `src/components/deck-detail/DeckDetailView.tsx`
- `src/components/deck-detail/DeckHeader.tsx`
- `src/components/deck-detail/FlashcardList.tsx`
- `src/components/deck-detail/FlashcardListItem.tsx`
- `src/components/deck-detail/FlashcardModal.tsx`
- `src/components/deck-detail/EmptyDeckState.tsx`
- `src/components/deck-detail/LoadMoreButton.tsx`
- `src/components/ui/ConfirmDialog.tsx` (reusable)
- `src/components/hooks/useDeckFlashcards.ts`
- `src/components/hooks/useDeckInfo.ts`
- `src/lib/types/deck-view.types.ts`

### Step 2: Implement Astro page with SSR
In `src/pages/decks/[id].astro`:
1. Check authentication via `locals.session`
2. Validate deck ID parameter
3. Fetch deck details from API
4. Fetch initial flashcards (page 1, limit 50)
5. Handle 404 if deck not found
6. Pass data to DeckDetailView component
7. Add proper meta tags and title

### Step 3: Create custom hooks
Implement `useDeckFlashcards.ts`:
1. Initialize state from props
2. Implement loadMore function
3. Implement createFlashcard with optimistic update
4. Implement updateFlashcard with optimistic update
5. Implement deleteFlashcard with optimistic update
6. Add error handling and rollback logic

Implement `useDeckInfo.ts`:
1. Initialize deck state
2. Implement updateDeckName with optimistic update
3. Implement refreshDeck function
4. Add error handling

### Step 4: Build DeckHeader component
1. Create component structure with deck info
2. Add stats badges (total flashcards, cards due)
3. Implement inline name editing
4. Add validation for deck name
5. Add action buttons with proper disabled states
6. Integrate with useDeckInfo hook
7. Add accessibility attributes

### Step 5: Build FlashcardListItem component
1. Create Card layout from Shadcn
2. Display front and back text with truncation
3. Add AI badge conditionally
4. Display creation date
5. Display edited date if applicable
6. Add edit and delete buttons
7. Add hover states (desktop) and always-visible (mobile)
8. Add accessibility labels

### Step 6: Build FlashcardList component
1. Create list container with semantic HTML
2. Map flashcards to FlashcardListItem components
3. Add LoadMoreButton at bottom
4. Handle edit and delete callbacks
5. Pass pagination data to LoadMoreButton
6. Add loading skeleton for initial load

### Step 7: Build EmptyDeckState component
1. Create centered layout with icon
2. Add heading and description
3. Add two CTA buttons
4. Wire up navigation and callbacks
5. Add proper styling

### Step 8: Build FlashcardModal component
1. Use Dialog component from Shadcn
2. Create form with front and back textareas
3. Implement form state management
4. Add validation logic
5. Handle create vs edit modes
6. Add submit and cancel handlers
7. Add loading state during submission
8. Display validation errors
9. Add accessibility attributes

### Step 9: Build ConfirmDialog component
1. Use AlertDialog from Shadcn
2. Accept props for title, description, callbacks
3. Add destructive button styling
4. Handle confirm and cancel
5. Add keyboard support (Enter, Escape)

### Step 10: Build DeckDetailView root component
1. Create component structure
2. Initialize custom hooks (useDeckFlashcards, useDeckInfo)
3. Set up modal state management
4. Set up delete confirmation state
5. Create handler functions for all actions
6. Wire up child components
7. Add conditional rendering (empty vs list)
8. Handle modal open/close
9. Handle confirmation dialog

### Step 11: Add error handling and toasts
1. Install toast library (sonner)
2. Add toast provider to layout
3. Implement error handlers in custom hooks
4. Add success toasts for actions
5. Add error toasts with retry options
6. Handle 401 redirects globally

### Step 12: Add loading states
1. Create skeleton components
2. Add loading states to buttons
3. Add loading spinner to LoadMoreButton
4. Show loading during form submission
5. Add optimistic update indicators

### Step 13: Implement accessibility features
1. Add ARIA labels to all interactive elements
2. Ensure keyboard navigation works
3. Add focus management for modals
4. Test with screen reader
5. Add skip links if needed
6. Ensure color contrast meets WCAG standards

### Step 14: Add styling and responsive design
1. Apply Tailwind classes for layout
2. Implement responsive breakpoints
3. Add hover states for desktop
4. Ensure touch-friendly on mobile
5. Test truncation and expansion
6. Add smooth transitions
7. Implement sticky header on scroll (optional)

### Step 15: Test all user flows
1. Test viewing empty deck
2. Test creating flashcard
3. Test editing flashcard
4. Test deleting flashcard
5. Test pagination
6. Test deck name edit
7. Test navigation to study and generation
8. Test error scenarios
9. Test optimistic updates and rollbacks
10. Test accessibility with keyboard only

### Step 16: Performance optimization
1. Use React.memo for FlashcardListItem
2. Use useCallback for event handlers
3. Optimize re-renders
4. Test with large number of flashcards
5. Implement virtualization if needed (future)

### Step 17: Final polish
1. Review all error messages for clarity
2. Ensure consistent spacing and alignment
3. Add animations for state changes
4. Test on different screen sizes
5. Test on different browsers
6. Review accessibility
7. Add loading states everywhere needed
8. Final code review and cleanup

---

## End of Implementation Plan
