# View Implementation Plan: Deck List View (Main Dashboard)

## 1. Overview

The Deck List View serves as the primary navigation hub for the AI Flashcard Learning Platform. It displays all decks belonging to the authenticated user in a responsive grid layout, showing key statistics (total flashcards, cards due for review) for each deck. Users can perform CRUD operations on decks, navigate to study sessions, and access deck details. The view implements server-side rendering for initial data load with client-side React components for interactive features.

## 2. View Routing

**Primary Path**: `/decks`

**Authentication**: Required - redirects to `/login` if unauthenticated

**Related Paths**:
- `/decks/[id]` - Deck detail view (navigation target)
- `/decks/[id]/study` - Study session (navigation target)

## 3. Component Structure

```
DeckListPage.astro (SSR Entry Point)
└─ Layout.astro
   ├─ Header
   │  ├─ Logo
   │  ├─ Navigation ("My Decks" - aria-current="page")
   │  └─ UserMenu
   │     └─ Logout Button
   └─ Main (role="main")
      └─ DeckListView.tsx (React Island - Client-side)
         ├─ Header Section
         │  ├─ Page Title ("My Decks")
         │  └─ Button (Create Deck - primary CTA)
         ├─ Content Area (Conditional)
         │  ├─ DeckListSkeleton.tsx (when isLoading)
         │  ├─ EmptyDeckState.tsx (when decks.length === 0)
         │  └─ DeckGrid.tsx (when decks.length > 0)
         │     └─ DeckCard.tsx (repeated for each deck)
         │        ├─ Card Header (Deck Name)
         │        ├─ Card Body (Statistics)
         │        └─ Card Footer (Action Buttons)
         ├─ Pagination Controls (when total_pages > 1)
         ├─ CreateDeckModal.tsx (Dialog)
         ├─ EditDeckModal.tsx (Dialog)
         ├─ ConfirmDeleteDialog.tsx (Dialog)
         └─ Toaster (Shadcn/ui Toast Provider)
```

## 4. Component Details

### DeckListPage.astro

**Description**: Server-side rendered page wrapper that handles initial data fetching, authentication verification, and provides the layout structure. Fetches deck data during SSR and passes it to the client-side React component.

**Main Elements**:
- `<Layout>` - Base layout with navigation and header
- `<main>` - Semantic landmark for main content
- `<DeckListView>` - React island receiving SSR data as props

**Handled Events**: None (server-side only)

**Validation**:
- Verifies user authentication via `Astro.locals.supabase.auth.getUser()`
- Redirects to `/login` if user is not authenticated
- Validates query parameters from URL (page, limit, sort, order)

**Types**:
- `PaginatedResponseDTO<DeckDTO>` - Initial data from API
- `DeckListQueryParams` - Query parameters for filtering/sorting

**Props**: None (page component)

**Implementation Notes**:
- Extract token from `Astro.cookies.get('sb-access-token')`
- Make SSR fetch to `GET /api/decks` with Authorization header
- Handle fetch errors by showing error state or redirecting
- Pass `initialDecks` and `initialPagination` to DeckListView

---

### DeckListView.tsx

**Description**: Main client-side React component that manages the deck list state, handles user interactions, and orchestrates all CRUD operations. Serves as the state container for the entire view.

**Main Elements**:
- `<div>` - Root container with max-width and padding
- `<header>` - Contains page title and create button
- `<h1>` - Page title "My Decks"
- `<Button>` - Create Deck CTA
- Conditional rendering logic for loading/empty/content states
- `<DeckGrid>` or `<EmptyDeckState>` or `<DeckListSkeleton>`
- `<Pagination>` - Navigation controls (if needed)
- `<CreateDeckModal>`, `<EditDeckModal>`, `<ConfirmDeleteDialog>` - Modal dialogs

**Handled Events**:
- `onCreateDeckClick` - Opens create deck modal
- `onCreateDeckSubmit` - Calls API to create deck
- `onEditDeckClick` - Opens edit modal with deck data
- `onEditDeckSubmit` - Calls API to update deck
- `onDeleteDeckClick` - Opens delete confirmation dialog
- `onDeleteConfirm` - Calls API to delete deck
- `onPageChange` - Loads different page of decks
- `onDeckClick` - Navigates to deck detail view
- `onStartStudyClick` - Navigates to study session

**Validation**: None directly (delegates to child components)

**Types**:
- `DeckDTO[]` - Array of deck items
- `PaginationDTO` - Pagination metadata
- `CreateDeckCommand` - Create deck request
- `UpdateDeckCommand` - Update deck request
- `DeleteDeckResponseDTO` - Delete response

**Props**:
```typescript
interface DeckListViewProps {
  initialDecks: DeckDTO[];
  initialPagination: PaginationDTO;
}
```

**State Management**:
- Uses custom hook `useDeckList` for all deck operations
- Manages modal open/close states locally
- Tracks currently editing/deleting deck

---

### DeckGrid.tsx

**Description**: Presentational component that renders a responsive grid of deck cards. Handles responsive layout with Tailwind CSS grid utilities.

**Main Elements**:
- `<div>` - Grid container with responsive columns
  - Classes: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- `<DeckCard>` - Repeated for each deck in array

**Handled Events**: None (presentational)

**Validation**: None

**Types**:
- `DeckDTO[]` - Array of decks to display

**Props**:
```typescript
interface DeckGridProps {
  decks: DeckDTO[];
  onDeckClick: (deckId: string) => void;
  onStartStudy: (deckId: string) => void;
  onEditDeck: (deck: DeckDTO) => void;
  onDeleteDeck: (deck: DeckDTO) => void;
}
```

---

### DeckCard.tsx

**Description**: Individual deck card component displaying deck name, statistics, and action buttons. Uses Shadcn/ui Card component as base with custom styling for due cards.

**Main Elements**:
- `<Card>` - Shadcn/ui Card wrapper (with conditional border styling for due cards)
- `<CardHeader>` - Deck name section
  - `<CardTitle>` - Deck name as clickable heading
- `<CardContent>` - Statistics section
  - `<div>` - Total flashcards count with icon
  - `<Badge>` - Cards due count (highlighted if > 0)
- `<CardFooter>` - Action buttons section
  - `<Button variant="default">` - Start Study (primary if cards_due > 0)
  - `<Button variant="outline">` - View Deck
  - `<Button variant="ghost" size="icon">` - Edit (pencil icon)
  - `<Button variant="ghost" size="icon">` - Delete (trash icon)

**Handled Events**:
- `onClick` on card/title - Navigate to deck detail
- `onStartStudyClick` - Navigate to study session
- `onEditClick` - Open edit modal
- `onDeleteClick` - Open delete confirmation

**Validation**:
- Study button disabled if `cards_due === 0`
- Tooltip shown on disabled study button: "No cards due for review"

**Types**:
- `DeckDTO` - Deck data

**Props**:
```typescript
interface DeckCardProps {
  deck: DeckDTO;
  onDeckClick: (deckId: string) => void;
  onStartStudy: (deckId: string) => void;
  onEdit: (deck: DeckDTO) => void;
  onDelete: (deck: DeckDTO) => void;
}
```

**Accessibility**:
- Card wrapped in `<article>` tag
- Heading level appropriate for page hierarchy
- Icon-only buttons have `aria-label` attributes
- Disabled state properly communicated
- Keyboard navigation supported

---

### CreateDeckModal.tsx

**Description**: Modal dialog for creating a new deck. Contains a form with a single text input for deck name and validation feedback.

**Main Elements**:
- `<Dialog>` - Shadcn/ui Dialog wrapper
- `<DialogContent>` - Modal content container
- `<DialogHeader>` - Modal header section
  - `<DialogTitle>` - "Create New Deck"
  - `<DialogDescription>` - Helper text
- `<form>` - Form element with onSubmit handler
  - `<Label htmlFor="name">` - "Deck Name" label
  - `<Input id="name">` - Text input for deck name
  - `<p>` - Error message display (conditional)
- `<DialogFooter>` - Modal footer with actions
  - `<Button variant="outline">` - Cancel
  - `<Button type="submit">` - Create (disabled while invalid/submitting)

**Handled Events**:
- `onSubmit` - Validates and submits form
- `onChange` - Updates name value, clears errors
- `onCancel` - Closes modal without saving
- `onOpenChange` - Handles dialog open/close

**Validation**:
- Name required: `name.trim().length >= 1`
- Name max length: `name.length <= 255`
- No whitespace-only: `name.trim().length > 0`
- Show inline error message below input
- Disable submit button while invalid or submitting
- Clear errors on input change

**Types**:
- `CreateDeckCommand` - Form submission data

**Props**:
```typescript
interface CreateDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (command: CreateDeckCommand) => Promise<void>;
}
```

**State**:
- `name: string` - Input value
- `errors: { name?: string }` - Validation errors
- `isSubmitting: boolean` - Submission state

**Accessibility**:
- Focus trap within modal
- Focus on input when opened
- Esc key closes modal
- Click outside closes modal
- Proper ARIA attributes from Shadcn/ui Dialog

---

### EditDeckModal.tsx

**Description**: Modal dialog for editing an existing deck's name. Functionally identical to CreateDeckModal but pre-populated with current deck data.

**Main Elements**:
- Same structure as CreateDeckModal
- `<DialogTitle>` - "Edit Deck"
- Input pre-filled with current deck name

**Handled Events**: Same as CreateDeckModal

**Validation**: Same as CreateDeckModal

**Types**:
- `UpdateDeckCommand` - Form submission data
- `DeckDTO` - Current deck data

**Props**:
```typescript
interface EditDeckModalProps {
  open: boolean;
  deck: DeckDTO | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (deckId: string, command: UpdateDeckCommand) => Promise<void>;
}
```

**State**: Same as CreateDeckModal

**Implementation Notes**:
- Reset form when deck prop changes
- Handle null deck gracefully
- Show current deck name in dialog description

---

### ConfirmDeleteDialog.tsx

**Description**: Confirmation dialog for deck deletion. Warns user about permanent deletion and shows count of flashcards that will be deleted.

**Main Elements**:
- `<AlertDialog>` - Shadcn/ui AlertDialog wrapper
- `<AlertDialogContent>` - Dialog content
- `<AlertDialogHeader>` - Header section
  - `<AlertDialogTitle>` - "Delete Deck?"
  - `<AlertDialogDescription>` - Warning message with flashcard count
- `<AlertDialogFooter>` - Action buttons
  - `<AlertDialogCancel>` - Cancel button
  - `<AlertDialogAction>` - Confirm delete (destructive variant)

**Handled Events**:
- `onConfirm` - Executes deletion
- `onCancel` - Closes dialog without action
- `onOpenChange` - Handles dialog state

**Validation**: None (confirmation only)

**Types**:
- `DeckDTO` - Deck being deleted

**Props**:
```typescript
interface ConfirmDeleteDialogProps {
  open: boolean;
  deck: DeckDTO | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (deckId: string) => Promise<void>;
}
```

**State**:
- `isDeleting: boolean` - Deletion in progress

**Accessibility**:
- Role="alertdialog" from Shadcn/ui
- Focus on cancel button by default
- Clear warning message
- Explicit confirmation required

---

### EmptyDeckState.tsx

**Description**: Empty state component shown when user has no decks. Provides friendly messaging and prominent CTA to create first deck.

**Main Elements**:
- `<div>` - Container with centered content and padding
- `<div>` - Icon container (large empty folder icon)
- `<h2>` - Heading: "No Decks Yet"
- `<p>` - Description: "Welcome! Create your first deck to get started."
- `<Button>` - Large "Create Your First Deck" CTA

**Handled Events**:
- `onCreateClick` - Opens create deck modal

**Validation**: None

**Types**: None

**Props**:
```typescript
interface EmptyDeckStateProps {
  onCreateClick: () => void;
}
```

**Accessibility**:
- Semantic heading structure
- Descriptive button text
- Icon has aria-hidden="true"

---

### DeckListSkeleton.tsx

**Description**: Loading skeleton component that mimics the deck grid layout while data is being fetched.

**Main Elements**:
- `<div>` - Grid container (same classes as DeckGrid)
- Multiple `<Card>` - Skeleton cards (3-6 cards)
  - `<CardHeader>` - Skeleton title line
  - `<CardContent>` - Skeleton stat lines
  - `<CardFooter>` - Skeleton button shapes

**Handled Events**: None

**Validation**: None

**Types**: None

**Props**:
```typescript
interface DeckListSkeletonProps {
  count?: number; // Number of skeleton cards to show (default: 6)
}
```

**Implementation Notes**:
- Use Shadcn/ui Skeleton component
- Pulse animation
- Match actual card dimensions

---

### Pagination Controls

**Description**: Pagination component for navigating between pages of decks. Uses Shadcn/ui Pagination components.

**Main Elements**:
- `<Pagination>` - Wrapper
- `<PaginationContent>` - Content container
- `<PaginationItem>` - Previous button
- `<PaginationItem>` - Page numbers (with ellipsis for large ranges)
- `<PaginationItem>` - Next button

**Handled Events**:
- `onPageChange` - Navigates to selected page

**Validation**:
- Disable previous on page 1
- Disable next on last page
- Validate page within bounds

**Types**:
- `PaginationDTO` - Pagination metadata

**Props**:
```typescript
interface PaginationControlsProps {
  pagination: PaginationDTO;
  onPageChange: (page: number) => void;
}
```

---

### Toast Notifications

**Description**: Uses Shadcn/ui Toast component system for success/error notifications.

**Toast Types**:
- Success: "Deck created successfully", "Deck updated", "Deck deleted"
- Error: API error messages

**Implementation**:
- Wrap DeckListView in `<Toaster>` component
- Use `useToast()` hook from Shadcn/ui
- Call `toast({ title, description, variant })` on events

## 5. Types

All required types already exist in `src/types.ts`:

### DeckDTO
```typescript
type DeckDTO = Omit<DeckRow, "user_id"> & {
  total_flashcards: number;
  cards_due: number;
  next_review_date?: string | null;
};
```
**Fields**:
- `id: string` - UUID of the deck
- `name: string` - Deck name (1-255 characters)
- `created_at: string` - ISO timestamp of creation
- `updated_at: string` - ISO timestamp of last update
- `total_flashcards: number` - Count of all flashcards in deck
- `cards_due: number` - Count of flashcards due for review today
- `next_review_date?: string | null` - ISO date of next review (optional)

### CreateDeckCommand
```typescript
interface CreateDeckCommand {
  name: string;
}
```
**Usage**: Request body for POST /api/decks

### UpdateDeckCommand
```typescript
interface UpdateDeckCommand {
  name: string;
}
```
**Usage**: Request body for PATCH /api/decks/:id

### DeleteDeckResponseDTO
```typescript
interface DeleteDeckResponseDTO {
  message: string;
  deleted_flashcards: number;
}
```
**Usage**: Response body for DELETE /api/decks/:id

### PaginatedResponseDTO<T>
```typescript
interface PaginatedResponseDTO<T> {
  data: T[];
  pagination: PaginationDTO;
}
```
**Usage**: Wrapper for list responses from GET /api/decks

### PaginationDTO
```typescript
interface PaginationDTO {
  page: number;        // Current page (1-indexed)
  limit: number;       // Items per page
  total: number;       // Total items across all pages
  total_pages: number; // Total number of pages
}
```

### DeckListQueryParams
```typescript
interface DeckListQueryParams {
  page?: number;
  limit?: number;
  sort?: "created_at" | "updated_at" | "name";
  order?: "asc" | "desc";
}
```
**Usage**: Query parameters for GET /api/decks

### Additional Local Types

**DeckFormState** (local to form components):
```typescript
interface DeckFormState {
  name: string;
  errors: {
    name?: string;
  };
}
```

**DeckActionHandlers** (local to DeckListView):
```typescript
interface DeckActionHandlers {
  onDeckClick: (deckId: string) => void;
  onStartStudy: (deckId: string) => void;
  onEdit: (deck: DeckDTO) => void;
  onDelete: (deck: DeckDTO) => void;
}
```

## 6. State Management

State management is handled through a custom hook pattern with local component state.

### Custom Hook: useDeckList

**Location**: `src/components/hooks/useDeckList.ts`

**Purpose**: Encapsulates all deck list logic including fetching, CRUD operations, pagination, and error handling. Provides a clean API for the view component.

**Hook Signature**:
```typescript
function useDeckList(
  initialDecks: DeckDTO[],
  initialPagination: PaginationDTO
): UseDeckListReturn {
  // Implementation
}

interface UseDeckListReturn {
  // State
  decks: DeckDTO[];
  pagination: PaginationDTO;
  isLoading: boolean;
  error: string | null;

  // Actions
  createDeck: (command: CreateDeckCommand) => Promise<void>;
  updateDeck: (id: string, command: UpdateDeckCommand) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;
  loadPage: (page: number) => Promise<void>;
  refetch: () => Promise<void>;
}
```

**Internal State**:
- `decks` - Array of DeckDTO objects
- `pagination` - Pagination metadata
- `isLoading` - Boolean flag for loading state
- `error` - Error message string or null

**Implementation Details**:
1. Initialize state with SSR data (initialDecks, initialPagination)
2. Use `useToast()` hook for notifications
3. Implement API calls with proper error handling:
   - GET /api/decks for pagination
   - POST /api/decks for creation
   - PATCH /api/decks/:id for updates
   - DELETE /api/decks/:id for deletion
4. Use optimistic updates where appropriate:
   - Immediately add created deck to local state
   - Immediately update edited deck in local state
   - Immediately remove deleted deck from local state
   - Revert on API error
5. Use `useCallback` for memoized action handlers
6. Extract token from cookies or session storage for API calls
7. Handle authentication errors by redirecting to login

**Error Handling**:
- Network errors: Show generic error toast
- 401 Unauthorized: Redirect to /login
- 400/422 Validation: Show specific error message
- 409 Conflict: Return error to form for inline display
- 500 Server: Show generic error with retry option

### Custom Hook: useDeckForm

**Location**: `src/components/hooks/useDeckForm.ts`

**Purpose**: Handles form state, validation, and submission for create/edit deck modals.

**Hook Signature**:
```typescript
function useDeckForm(
  initialName: string,
  onSubmit: (name: string) => Promise<void>
): UseDeckFormReturn {
  // Implementation
}

interface UseDeckFormReturn {
  name: string;
  errors: { name?: string };
  isValid: boolean;
  isSubmitting: boolean;
  setName: (name: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  reset: () => void;
}
```

**Validation Rules**:
1. Name required: `name.trim().length >= 1`
   - Error: "Deck name is required"
2. Name max length: `name.length <= 255`
   - Error: "Deck name must not exceed 255 characters"
3. No whitespace-only: `name.trim().length > 0`
   - Error: "Deck name cannot be empty or whitespace-only"

**Implementation Details**:
1. Validate on blur and submit
2. Clear errors on input change
3. Trim name before submission
4. Set isSubmitting during async operation
5. Handle API errors returned from onSubmit

### Component-Level State

**DeckListView.tsx**:
- `isCreateModalOpen: boolean` - Create modal visibility
- `editingDeck: DeckDTO | null` - Currently editing deck
- `deletingDeck: DeckDTO | null` - Currently deleting deck

These are simple UI state variables managed with `useState`.

## 7. API Integration

### Token Management

**Token Location**: Stored in httpOnly cookies by Astro middleware
- Cookie name: `sb-access-token`
- Accessed via `Astro.cookies.get()` in SSR
- Sent automatically in fetch requests with credentials

**Authorization Header**:
```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### SSR Initial Fetch (in DeckListPage.astro)

**Endpoint**: `GET /api/decks`

**Request**:
```typescript
const token = Astro.cookies.get('sb-access-token')?.value;

const response = await fetch(`${Astro.url.origin}/api/decks?page=1&limit=20&sort=created_at&order=desc`, {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

if (!response.ok) {
  if (response.status === 401) {
    return Astro.redirect('/login');
  }
  throw new Error('Failed to fetch decks');
}

const data: PaginatedResponseDTO<DeckDTO> = await response.json();
```

**Response Type**: `PaginatedResponseDTO<DeckDTO>`

**Error Handling**:
- 401: Redirect to /login
- Other errors: Show error state in view

### Client-Side API Calls

**Helper Function** (in `src/lib/api/deck-api.ts`):
```typescript
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAuthToken(); // Get from cookies or storage

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
  }

  return response;
}
```

### API Functions

**1. Create Deck**
```typescript
async function createDeck(command: CreateDeckCommand): Promise<DeckDTO> {
  const response = await fetchWithAuth('/api/decks', {
    method: 'POST',
    body: JSON.stringify(command),
  });

  return response.json();
}
```
**Request Type**: `CreateDeckCommand`
**Response Type**: `DeckDTO`
**Status**: 201 Created
**Errors**: 400, 401, 409, 422, 500

**2. Update Deck**
```typescript
async function updateDeck(id: string, command: UpdateDeckCommand): Promise<DeckDTO> {
  const response = await fetchWithAuth(`/api/decks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(command),
  });

  return response.json();
}
```
**Request Type**: `UpdateDeckCommand`
**Response Type**: `DeckDTO`
**Status**: 200 OK
**Errors**: 400, 401, 404, 409, 422, 500

**3. Delete Deck**
```typescript
async function deleteDeck(id: string): Promise<DeleteDeckResponseDTO> {
  const response = await fetchWithAuth(`/api/decks/${id}`, {
    method: 'DELETE',
  });

  return response.json();
}
```
**Request Type**: None
**Response Type**: `DeleteDeckResponseDTO`
**Status**: 200 OK
**Errors**: 401, 404, 500

**4. List Decks (Pagination)**
```typescript
async function listDecks(params: DeckListQueryParams): Promise<PaginatedResponseDTO<DeckDTO>> {
  const queryString = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)])
  ).toString();

  const response = await fetchWithAuth(`/api/decks?${queryString}`);

  return response.json();
}
```
**Request Type**: `DeckListQueryParams`
**Response Type**: `PaginatedResponseDTO<DeckDTO>`
**Status**: 200 OK
**Errors**: 400, 401, 500

## 8. User Interactions

### 1. Viewing Deck List

**Trigger**: User navigates to `/decks` or page loads

**Flow**:
1. Astro SSR runs, fetches initial data via GET /api/decks
2. Page renders with initial deck data
3. React component hydrates with SSR data
4. Deck grid displays with all deck cards
5. If no decks, EmptyDeckState shown
6. If loading error occurred, error message shown

**UI Updates**:
- Deck cards display in responsive grid
- Loading skeleton if still fetching
- Empty state if no decks
- Error message if fetch failed

### 2. Creating a Deck

**Trigger**: User clicks "Create Deck" button

**Flow**:
1. Create modal opens (`isCreateModalOpen = true`)
2. User enters deck name in input field
3. Input validates on change (clears errors)
4. Input validates on blur (shows errors if invalid)
5. User clicks "Create" button
6. Form validates before submission
7. If valid:
   - `isSubmitting = true`
   - POST to /api/decks with CreateDeckCommand
   - On success:
     - Add new deck to local state (optimistic update)
     - Close modal
     - Show success toast: "Deck created successfully"
     - Reset form
   - On error:
     - Show error toast or inline error (if 409 conflict)
     - Keep modal open
     - `isSubmitting = false`

**Validation Feedback**:
- Inline error below input field
- Submit button disabled while invalid or submitting
- Error message specific to validation rule violated

### 3. Editing Deck Name

**Trigger**: User clicks edit button (pencil icon) on deck card

**Flow**:
1. Set `editingDeck = deck`
2. Edit modal opens pre-filled with current name
3. User modifies deck name
4. Validation same as create
5. User clicks "Save" button
6. Form validates before submission
7. If valid:
   - `isSubmitting = true`
   - PATCH to /api/decks/:id with UpdateDeckCommand
   - On success:
     - Update deck in local state
     - Close modal
     - Show success toast: "Deck updated successfully"
     - Reset form
   - On error:
     - Show error toast or inline error
     - Keep modal open
     - `isSubmitting = false`

**Validation Feedback**: Same as create

### 4. Deleting a Deck

**Trigger**: User clicks delete button (trash icon) on deck card

**Flow**:
1. Set `deletingDeck = deck`
2. Confirmation dialog opens
3. Dialog shows warning with flashcard count
4. User clicks "Cancel" → Close dialog, no action
5. User clicks "Confirm Delete":
   - `isDeleting = true`
   - DELETE to /api/decks/:id
   - On success:
     - Remove deck from local state
     - Close dialog
     - Show success toast: "Deck deleted successfully. X flashcards removed."
     - If current page empty and not page 1, load previous page
   - On error:
     - Show error toast
     - Close dialog
     - `isDeleting = false`

**Confirmation Message**:
"Are you sure you want to delete '{deckName}'? This will permanently remove {total_flashcards} flashcard(s). This action cannot be undone."

### 5. Starting Study Session

**Trigger**: User clicks "Start Study" button on deck card

**Flow**:
1. Check if `cards_due > 0`
2. If yes: Navigate to `/decks/${deck.id}/study`
3. If no: Button disabled with tooltip

**Button State**:
- Primary variant if `cards_due > 0`
- Disabled if `cards_due === 0`
- Tooltip on hover: "No cards due for review today"

### 6. Viewing Deck Details

**Trigger**: User clicks deck card (anywhere except action buttons)

**Flow**:
1. Navigate to `/decks/${deck.id}`

**Implementation**: Use Astro's `<a>` tag or React Router navigation

### 7. Pagination

**Trigger**: User clicks page number, next, or previous button

**Flow**:
1. Extract target page number
2. Validate page within bounds (1 to total_pages)
3. Call `loadPage(page)`
4. Set `isLoading = true`
5. GET to /api/decks?page={page}&...
6. On success:
   - Replace `decks` state with new data
   - Update `pagination` state
   - Scroll to top of page
   - `isLoading = false`
7. On error:
   - Show error toast
   - Keep current data
   - `isLoading = false`

**UI During Loading**:
- Show loading skeleton over current content
- Disable pagination controls

## 9. Conditions and Validation

### Client-Side Validation (Forms)

**Create/Edit Deck Modal**:

1. **Name Required**
   - Condition: `name.trim().length < 1`
   - Error: "Deck name is required"
   - UI: Red text below input, submit button disabled
   - Checked: On blur, on submit

2. **Name Max Length**
   - Condition: `name.length > 255`
   - Error: "Deck name must not exceed 255 characters"
   - UI: Red text below input, submit button disabled
   - Checked: On change, on blur, on submit

3. **Name Not Whitespace Only**
   - Condition: `name.trim().length === 0 && name.length > 0`
   - Error: "Deck name cannot be empty or whitespace-only"
   - UI: Red text below input, submit button disabled
   - Checked: On blur, on submit

4. **Duplicate Name** (server-side)
   - Condition: API returns 409 Conflict
   - Error: "A deck with this name already exists"
   - UI: Red text below input, keep modal open
   - Checked: On submit response

### UI Conditional Rendering

**Empty State**:
- Condition: `decks.length === 0 && !isLoading && !error`
- Component: `<EmptyDeckState>`
- Message: "No Decks Yet" with "Create Your First Deck" button

**Loading State**:
- Condition: `isLoading`
- Component: `<DeckListSkeleton>`
- UI: 6 skeleton cards in grid

**Error State**:
- Condition: `error !== null && !isLoading`
- Component: Error message banner
- UI: Red banner with retry button

**Deck Grid**:
- Condition: `decks.length > 0 && !isLoading`
- Component: `<DeckGrid>`
- UI: Responsive grid of deck cards

**Pagination**:
- Condition: `pagination.total_pages > 1`
- Component: `<PaginationControls>`
- UI: Page numbers with prev/next

### Deck Card Conditional Styling

**Due Cards Highlight**:
- Condition: `deck.cards_due > 0`
- UI: Blue border on card, blue badge for due count
- Classes: `border-blue-500 border-2`

**Study Button State**:
- Condition: `deck.cards_due > 0`
- UI: Primary variant button (enabled)
- Condition: `deck.cards_due === 0`
- UI: Disabled button with tooltip

### Button States

**Create/Edit Submit Button**:
- Disabled when: `!isValid || isSubmitting`
- Shows loading spinner when: `isSubmitting`

**Delete Confirm Button**:
- Disabled when: `isDeleting`
- Shows loading spinner when: `isDeleting`

**Pagination Buttons**:
- Previous disabled when: `pagination.page === 1`
- Next disabled when: `pagination.page === pagination.total_pages`
- All disabled when: `isLoading`

## 10. Error Handling

### API Error Scenarios

**1. Authentication Error (401)**
- **Cause**: Invalid, expired, or missing token
- **Handling**: Automatic redirect to `/login`
- **Implementation**: Catch in fetchWithAuth helper
- **User Feedback**: None (immediate redirect)

**2. Network Error**
- **Cause**: No internet connection, server unreachable
- **Handling**: Show error toast, keep current state
- **Message**: "Network error. Please check your connection and try again."
- **Recovery**: Retry button in toast

**3. Validation Error (400/422)**
- **Cause**: Invalid request data (should be rare due to client validation)
- **Handling**: Show error toast with details
- **Message**: Use API error message or generic "Invalid request"
- **Recovery**: User fixes input and retries

**4. Conflict Error (409)**
- **Cause**: Duplicate deck name
- **Handling**: Show inline error in form
- **Message**: "A deck with this name already exists"
- **Recovery**: User enters different name

**5. Not Found Error (404)**
- **Cause**: Deck deleted by another session
- **Handling**: Show error toast, remove from local state
- **Message**: "Deck not found. It may have been deleted."
- **Recovery**: Refresh list

**6. Server Error (500)**
- **Cause**: Internal server error
- **Handling**: Show error toast
- **Message**: "An unexpected error occurred. Please try again later."
- **Recovery**: Retry button

### Edge Cases

**1. Empty Deck List**
- **Scenario**: User has no decks
- **Handling**: Show EmptyDeckState component
- **UI**: Friendly message with large "Create Your First Deck" button
- **Navigation**: Create button opens create modal

**2. All Decks Deleted from Current Page**
- **Scenario**: Delete last deck on page > 1
- **Handling**: Automatically load previous page
- **Implementation**: Check `decks.length === 1 && pagination.page > 1` before delete

**3. Concurrent Modifications**
- **Scenario**: Deck modified in another tab/session
- **Handling**: Show stale data with eventual consistency
- **Recovery**: Manual refresh button or automatic polling (future enhancement)

**4. Slow Network**
- **Scenario**: API calls take >2 seconds
- **Handling**: Show loading state immediately
- **UI**: Disable interactions, show skeleton/spinner
- **Timeout**: Consider timeout after 30 seconds

**5. Pagination Out of Bounds**
- **Scenario**: Request page beyond total_pages
- **Handling**: Clamp to valid range before request
- **Implementation**: `Math.min(requestedPage, pagination.total_pages)`

**6. Invalid Query Parameters**
- **Scenario**: Manually edited URL with bad params
- **Handling**: Server returns 400, use defaults
- **Recovery**: Load with default params (page 1)

### Error Display Patterns

**Toast Notifications** (for transient feedback):
- API success messages
- API error messages (non-validation)
- Network errors
- Server errors

**Inline Form Errors** (for validation):
- Field-level validation errors
- Duplicate name conflicts
- Below input field in red text

**Empty States** (for missing data):
- No decks exist
- Friendly illustration + message + CTA

**Error Banners** (for page-level errors):
- Failed to load initial data
- Above content with retry action

**Modal Confirmations** (for destructive actions):
- Delete deck warning
- AlertDialog with clear messaging

### Error Recovery Actions

1. **Retry Button**: For network/server errors
2. **Refresh Button**: For stale data
3. **Dismiss Button**: For non-critical errors
4. **Auto-dismiss**: Success toasts after 3 seconds
5. **Persistent Errors**: Errors that require action stay visible

## 11. Implementation Steps

### Step 1: Set Up Project Structure

1. Create directory structure:
   ```
   src/
   ├── pages/
   │   └── decks/
   │       └── index.astro
   ├── components/
   │   ├── decks/
   │   │   ├── DeckListView.tsx
   │   │   ├── DeckGrid.tsx
   │   │   ├── DeckCard.tsx
   │   │   ├── CreateDeckModal.tsx
   │   │   ├── EditDeckModal.tsx
   │   │   ├── ConfirmDeleteDialog.tsx
   │   │   ├── EmptyDeckState.tsx
   │   │   └── DeckListSkeleton.tsx
   │   └── hooks/
   │       ├── useDeckList.ts
   │       └── useDeckForm.ts
   └── lib/
       └── api/
           └── deck-api.ts
   ```

2. Install required Shadcn/ui components:
   ```bash
   npx shadcn@latest add card
   npx shadcn@latest add button
   npx shadcn@latest add dialog
   npx shadcn@latest add alert-dialog
   npx shadcn@latest add input
   npx shadcn@latest add label
   npx shadcn@latest add badge
   npx shadcn@latest add skeleton
   npx shadcn@latest add toast
   ```

### Step 2: Implement API Helper Functions

1. Create `src/lib/api/deck-api.ts`
2. Implement `fetchWithAuth` helper function
3. Implement CRUD functions:
   - `listDecks(params: DeckListQueryParams)`
   - `createDeck(command: CreateDeckCommand)`
   - `updateDeck(id: string, command: UpdateDeckCommand)`
   - `deleteDeck(id: string)`
4. Add proper TypeScript types from `src/types.ts`
5. Implement error handling and auth redirect logic

### Step 3: Create Custom Hooks

1. **Implement `useDeckForm` hook** (`src/components/hooks/useDeckForm.ts`):
   - Set up state: name, errors, isSubmitting
   - Implement validation functions for all rules
   - Create handleChange with error clearing
   - Create handleSubmit with validation and async submission
   - Create reset function
   - Return hook interface

2. **Implement `useDeckList` hook** (`src/components/hooks/useDeckList.ts`):
   - Set up state: decks, pagination, isLoading, error
   - Initialize with SSR props
   - Implement createDeck with optimistic update
   - Implement updateDeck with optimistic update
   - Implement deleteDeck with optimistic update
   - Implement loadPage for pagination
   - Implement refetch for manual refresh
   - Add toast notifications for all actions
   - Wrap handlers in useCallback
   - Return hook interface

### Step 4: Build Presentational Components

1. **DeckListSkeleton.tsx**:
   - Import Skeleton, Card from Shadcn/ui
   - Create grid with 6 skeleton cards
   - Match DeckCard dimensions
   - Use pulse animation

2. **EmptyDeckState.tsx**:
   - Import Button from Shadcn/ui
   - Add icon (use lucide-react icons)
   - Add heading and description
   - Add large CTA button
   - Center content with Tailwind

3. **DeckCard.tsx**:
   - Import Card, Badge, Button from Shadcn/ui
   - Receive deck prop and action handlers
   - Render card with header (name), content (stats), footer (buttons)
   - Add conditional border styling for due cards
   - Implement all event handlers
   - Add ARIA attributes
   - Wrap in `<article>` tag
   - Add icons from lucide-react

4. **DeckGrid.tsx**:
   - Receive decks array and handlers
   - Create responsive grid with Tailwind
   - Map over decks to render DeckCard components
   - Pass through all handlers

### Step 5: Build Modal Components

1. **CreateDeckModal.tsx**:
   - Import Dialog, Input, Label, Button from Shadcn/ui
   - Use useDeckForm hook
   - Build form structure with validation
   - Handle open/close state
   - Add accessibility attributes
   - Implement focus management
   - Add loading state to submit button

2. **EditDeckModal.tsx**:
   - Similar to CreateDeckModal
   - Accept deck prop for pre-filling
   - Reset form when deck changes
   - Handle null deck gracefully

3. **ConfirmDeleteDialog.tsx**:
   - Import AlertDialog from Shadcn/ui
   - Accept deck prop
   - Show deck name and flashcard count
   - Add warning message
   - Implement confirm/cancel handlers
   - Add loading state to confirm button

### Step 6: Build Main View Component

1. **DeckListView.tsx**:
   - Import all child components
   - Import useDeckList hook
   - Set up local state for modals
   - Initialize useDeckList with props
   - Create action handlers for all interactions
   - Implement conditional rendering logic:
     - Loading → DeckListSkeleton
     - Empty → EmptyDeckState
     - Error → Error banner
     - Success → DeckGrid
   - Add pagination controls if needed
   - Wrap in Toaster provider
   - Implement navigation handlers

### Step 7: Create Astro Page

1. **DeckListPage.astro** (`src/pages/decks/index.astro`):
   - Import Layout component
   - Check authentication:
     ```typescript
     const { data: { user }, error } = await Astro.locals.supabase.auth.getUser();
     if (error || !user) return Astro.redirect('/login');
     ```
   - Fetch initial data:
     ```typescript
     const token = Astro.cookies.get('sb-access-token')?.value;
     const response = await fetch(`${Astro.url.origin}/api/decks?page=1&limit=20`, {
       headers: { 'Authorization': `Bearer ${token}` }
     });
     const data = await response.json();
     ```
   - Handle fetch errors
   - Render Layout with DeckListView:
     ```astro
     <Layout title="My Decks">
       <DeckListView
         initialDecks={data.data}
         initialPagination={data.pagination}
         client:load
       />
     </Layout>
     ```

### Step 8: Add Styling and Responsiveness

1. Ensure all components use Tailwind utility classes
2. Test responsive grid at all breakpoints:
   - Mobile (< 768px): 1 column
   - Tablet (768px - 1024px): 2 columns
   - Desktop (> 1024px): 3 columns
3. Add hover effects to interactive elements
4. Ensure proper spacing and padding
5. Test dark mode styling (if applicable)

### Step 9: Implement Accessibility

1. Add ARIA attributes to all components:
   - `aria-label` on icon-only buttons
   - `aria-current="page"` on nav link
   - `aria-live` for dynamic content (toasts)
   - `aria-describedby` for form errors
2. Test keyboard navigation:
   - Tab through all interactive elements
   - Enter/Space to activate buttons
   - Escape to close modals
3. Ensure focus management:
   - Focus trap in modals
   - Return focus after modal close
   - Visible focus indicators
4. Test with screen reader

### Step 10: Testing and Refinement

1. **Manual Testing**:
   - Test all CRUD operations
   - Test pagination
   - Test empty state
   - Test error scenarios (disconnect network)
   - Test loading states
   - Test validation (all rules)
   - Test responsive layout

2. **Edge Case Testing**:
   - Delete last deck on page > 1
   - Create deck with duplicate name
   - Edit deck to duplicate name
   - Network timeout
   - Invalid token (manual cookie deletion)

3. **Cross-browser Testing**:
   - Chrome
   - Firefox
   - Safari
   - Edge

4. **Performance**:
   - Check initial load time
   - Check hydration performance
   - Optimize bundle size if needed
   - Add React.memo to DeckCard if needed

### Step 11: Final Integration

1. Ensure navigation links work:
   - Logo → Home
   - "My Decks" → /decks (current)
   - Logout → Clear session, redirect to /login
   - Deck card → /decks/:id
   - Start Study → /decks/:id/study

2. Test session management:
   - Login → Navigate to /decks
   - Logout → Clear auth, redirect to /login
   - Session persistence across refreshes

3. Verify security:
   - RLS prevents viewing other users' decks
   - Invalid tokens redirect to login
   - CSRF protection on mutations

4. Production build testing:
   ```bash
   npm run build
   npm run preview
   ```

### Step 12: Documentation and Cleanup

1. Add JSDoc comments to all exported functions/components
2. Remove console.log statements (ESLint should catch these)
3. Ensure all TypeScript types are properly defined
4. Run linter and formatter:
   ```bash
   npm run lint:fix
   npm run format
   ```
5. Commit changes with descriptive commit message

---

**Implementation Complete**: The Deck List View should now be fully functional with all features, proper error handling, accessibility support, and responsive design.
