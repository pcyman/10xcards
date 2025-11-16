import type { Database } from "./db/database.types";

// ============================================================================
// Database Entity Type Aliases
// ============================================================================

type DeckRow = Database["public"]["Tables"]["decks"]["Row"];
type FlashcardRow = Database["public"]["Tables"]["flashcards"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

// ============================================================================
// Deck DTOs
// ============================================================================

/**
 * Deck DTO with computed statistics
 * Extends database row with calculated fields: total_flashcards, cards_due, and next_review_date
 * Used in: GET /api/decks, GET /api/decks/:id, POST /api/decks, PATCH /api/decks/:id
 */
export type DeckDTO = Omit<DeckRow, "user_id"> & {
  total_flashcards: number;
  cards_due: number;
  next_review_date?: string | null;
};

/**
 * Command to create a new deck
 * Used in: POST /api/decks
 */
export interface CreateDeckCommand {
  name: string;
}

/**
 * Command to update an existing deck
 * Used in: PATCH /api/decks/:id
 */
export interface UpdateDeckCommand {
  name: string;
}

/**
 * Response DTO for deck deletion
 * Used in: DELETE /api/decks/:id
 */
export interface DeleteDeckResponseDTO {
  message: string;
  deleted_flashcards: number;
}

// ============================================================================
// Flashcard DTOs
// ============================================================================

/**
 * Flashcard DTO
 * Represents a complete flashcard with all spaced repetition metadata
 * Used in: GET /api/decks/:deckId/flashcards, GET /api/flashcards/:id,
 *          POST /api/decks/:deckId/flashcards, PATCH /api/flashcards/:id
 */
export type FlashcardDTO = Omit<FlashcardRow, "user_id">;

/**
 * Command to create a flashcard manually
 * Used in: POST /api/decks/:deckId/flashcards
 */
export interface CreateFlashcardCommand {
  front: string;
  back: string;
}

/**
 * Command to update an existing flashcard
 * Both fields are optional - at least one must be provided
 * Used in: PATCH /api/flashcards/:id
 */
export interface UpdateFlashcardCommand {
  front?: string;
  back?: string;
}

/**
 * Response DTO for flashcard deletion
 * Used in: DELETE /api/flashcards/:id
 */
export interface DeleteFlashcardResponseDTO {
  message: string;
}

/**
 * Flashcard candidate from AI generation
 * Contains only front and back text, not yet saved to database
 * Used in: POST /api/decks/:deckId/flashcards/generate (response)
 */
export interface FlashcardCandidateDTO {
  front: string;
  back: string;
}

/**
 * Command to generate flashcards using AI
 * Used in: POST /api/decks/:deckId/flashcards/generate
 */
export interface GenerateFlashcardsCommand {
  text: string;
}

/**
 * Response DTO for AI flashcard generation
 * Used in: POST /api/decks/:deckId/flashcards/generate
 */
export interface GenerateFlashcardsResponseDTO {
  candidates: FlashcardCandidateDTO[];
  total_generated: number;
}

/**
 * Command to accept and save AI-generated flashcards in batch
 * Used in: POST /api/decks/:deckId/flashcards/batch
 */
export interface AcceptFlashcardsCommand {
  flashcards: FlashcardCandidateDTO[];
}

/**
 * Response DTO for batch flashcard acceptance
 * Used in: POST /api/decks/:deckId/flashcards/batch
 */
export interface AcceptFlashcardsResponseDTO {
  created: FlashcardDTO[];
  total_created: number;
}

/**
 * Due flashcard DTO for study sessions
 * Contains only fields needed for studying (excludes timestamps, user_id, and AI flag)
 * Used in: GET /api/decks/:deckId/flashcards/due
 */
export type DueFlashcardDTO = Pick<
  FlashcardRow,
  "id" | "deck_id" | "front" | "back" | "ease_factor" | "interval_days" | "repetitions"
>;

// ============================================================================
// Review DTOs
// ============================================================================

/**
 * Review DTO
 * Represents a single review record with difficulty rating and scheduling info
 * Used in: GET /api/flashcards/:flashcardId/reviews, POST /api/flashcards/:id/review
 */
export type ReviewDTO = Omit<ReviewRow, "user_id">;

/**
 * Command to submit a flashcard review
 * Used in: POST /api/flashcards/:id/review
 */
export interface SubmitReviewCommand {
  difficulty_rating: number;
}

/**
 * Flashcard update data returned after review submission
 * Contains only the spaced repetition fields that were updated
 * Used in: POST /api/flashcards/:id/review (nested in response)
 */
export type FlashcardReviewUpdateDTO = Pick<
  FlashcardRow,
  "id" | "next_review_date" | "ease_factor" | "interval_days" | "repetitions" | "updated_at"
>;

/**
 * Response DTO for review submission
 * Returns both the updated flashcard state and the created review record
 * Used in: POST /api/flashcards/:id/review
 */
export interface ReviewResponseDTO {
  flashcard: FlashcardReviewUpdateDTO;
  review: ReviewDTO;
}

// ============================================================================
// Pagination DTOs
// ============================================================================

/**
 * Pagination metadata
 * Included in all paginated list responses
 */
export interface PaginationDTO {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * Generic paginated response wrapper
 * Used for all list endpoints that support pagination
 */
export interface PaginatedResponseDTO<T> {
  data: T[];
  pagination: PaginationDTO;
}

// ============================================================================
// Auth DTOs
// ============================================================================

/**
 * Form state for login view
 * Used in: LoginForm component (client-side state)
 */
export interface LoginFormData {
  email: string;
  password: string;
}

/**
 * Field-level validation errors for login form
 * Used in: LoginForm component (client-side state)
 */
export interface FormFieldError {
  email?: string;
  password?: string;
}

/**
 * Request payload for login API endpoint
 * Used in: POST /api/auth/login
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Success response from login API endpoint
 * Used in: POST /api/auth/login (success response)
 */
export interface LoginSuccessResponse {
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

/**
 * Error response from login API endpoint
 * Used in: POST /api/auth/login (error response)
 */
export interface LoginError {
  error: {
    message: string;
    code: string;
    field?: string;
  };
}

/**
 * Form state for registration view
 * Used in: RegisterForm component (client-side state)
 */
export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Field-level validation errors for registration form
 * Used in: RegisterForm component (client-side state)
 */
export interface RegisterFormFieldError {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

/**
 * Request payload for registration API endpoint
 * Used in: POST /api/auth/register
 */
export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Success response from registration API endpoint
 * Used in: POST /api/auth/register (success response)
 */
export interface RegisterSuccessResponse {
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

/**
 * Error response from registration API endpoint
 * Used in: POST /api/auth/register (error response)
 */
export interface RegisterError {
  error: {
    message: string;
    code: string;
    field?: string;
  };
}

/**
 * Password requirement definition for validation display
 * Used in: PasswordRequirements component
 */
export interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

// ============================================================================
// Query Parameter Types
// ============================================================================

/**
 * Query parameters for listing decks
 * Used in: GET /api/decks
 */
export interface DeckListQueryParams {
  page?: number;
  limit?: number;
  sort?: "created_at" | "updated_at" | "name";
  order?: "asc" | "desc";
}

/**
 * Query parameters for listing flashcards in a deck
 * Used in: GET /api/decks/:deckId/flashcards
 */
export interface FlashcardListQueryParams {
  page?: number;
  limit?: number;
  sort?: "created_at" | "updated_at" | "next_review_date";
  order?: "asc" | "desc";
  is_ai_generated?: boolean;
}

/**
 * Query parameters for getting due flashcards
 * Used in: GET /api/decks/:deckId/flashcards/due
 */
export interface DueFlashcardsQueryParams {
  limit?: number;
}

/**
 * Query parameters for review history
 * Used in: GET /api/flashcards/:flashcardId/reviews
 */
export interface ReviewHistoryQueryParams {
  page?: number;
  limit?: number;
  order?: "asc" | "desc";
}

// ============================================================================
// AI Generation View Types
// ============================================================================

/**
 * Character count validation state
 * Used in: AiGenerationForm component
 */
export interface CharacterCountState {
  count: number;
  state: 'invalid-min' | 'valid' | 'invalid-max';
  message: string;
}

/**
 * Candidate with UI status tracking
 * Used in: AiReviewFlow component
 */
export interface CandidateWithStatus extends FlashcardCandidateDTO {
  id: string;
  status: 'pending' | 'accepted' | 'discarded';
}

/**
 * Props for AiGenerationForm component
 */
export interface AiGenerationFormProps {
  deckId: string;
  deckName: string;
}

/**
 * Props for CharacterCounter component
 */
export interface CharacterCounterProps {
  count: number;
  state: 'invalid-min' | 'valid' | 'invalid-max';
  message: string;
}

/**
 * Props for LoadingScreen component
 */
export interface LoadingScreenProps {
  onCancel: () => void;
}

/**
 * Props for AiReviewFlow component
 */
export interface AiReviewFlowProps {
  deckId: string;
  deckName: string;
  initialCandidates: FlashcardCandidateDTO[];
}

/**
 * Props for ReviewProgress component
 */
export interface ReviewProgressProps {
  totalCount: number;
  remainingCount: number;
  acceptedCount: number;
}

/**
 * Props for AiCandidateCard component
 */
export interface AiCandidateCardProps {
  candidate: CandidateWithStatus;
  onAccept: (id: string) => void;
  onDiscard: (id: string) => void;
}
