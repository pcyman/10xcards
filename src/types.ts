import type { Database } from './db/database.types'

// ============================================================================
// Database Entity Type Aliases
// ============================================================================

type DeckRow = Database['public']['Tables']['decks']['Row']
type FlashcardRow = Database['public']['Tables']['flashcards']['Row']
type ReviewRow = Database['public']['Tables']['reviews']['Row']

// ============================================================================
// Deck DTOs
// ============================================================================

/**
 * Deck DTO with computed statistics
 * Extends database row with calculated fields: total_flashcards, cards_due, and next_review_date
 * Used in: GET /api/decks, GET /api/decks/:id, POST /api/decks, PATCH /api/decks/:id
 */
export type DeckDTO = Omit<DeckRow, 'user_id'> & {
  total_flashcards: number
  cards_due: number
  next_review_date?: string | null
}

/**
 * Command to create a new deck
 * Used in: POST /api/decks
 */
export type CreateDeckCommand = {
  name: string
}

/**
 * Command to update an existing deck
 * Used in: PATCH /api/decks/:id
 */
export type UpdateDeckCommand = {
  name: string
}

/**
 * Response DTO for deck deletion
 * Used in: DELETE /api/decks/:id
 */
export type DeleteDeckResponseDTO = {
  message: string
  deleted_flashcards: number
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
export type FlashcardDTO = Omit<FlashcardRow, 'user_id'>

/**
 * Command to create a flashcard manually
 * Used in: POST /api/decks/:deckId/flashcards
 */
export type CreateFlashcardCommand = {
  front: string
  back: string
}

/**
 * Command to update an existing flashcard
 * Both fields are optional - at least one must be provided
 * Used in: PATCH /api/flashcards/:id
 */
export type UpdateFlashcardCommand = {
  front?: string
  back?: string
}

/**
 * Response DTO for flashcard deletion
 * Used in: DELETE /api/flashcards/:id
 */
export type DeleteFlashcardResponseDTO = {
  message: string
}

/**
 * Flashcard candidate from AI generation
 * Contains only front and back text, not yet saved to database
 * Used in: POST /api/decks/:deckId/flashcards/generate (response)
 */
export type FlashcardCandidateDTO = {
  front: string
  back: string
}

/**
 * Command to generate flashcards using AI
 * Used in: POST /api/decks/:deckId/flashcards/generate
 */
export type GenerateFlashcardsCommand = {
  text: string
}

/**
 * Response DTO for AI flashcard generation
 * Used in: POST /api/decks/:deckId/flashcards/generate
 */
export type GenerateFlashcardsResponseDTO = {
  candidates: FlashcardCandidateDTO[]
  total_generated: number
}

/**
 * Command to accept and save AI-generated flashcards in batch
 * Used in: POST /api/decks/:deckId/flashcards/batch
 */
export type AcceptFlashcardsCommand = {
  flashcards: FlashcardCandidateDTO[]
}

/**
 * Response DTO for batch flashcard acceptance
 * Used in: POST /api/decks/:deckId/flashcards/batch
 */
export type AcceptFlashcardsResponseDTO = {
  created: FlashcardDTO[]
  total_created: number
}

/**
 * Due flashcard DTO for study sessions
 * Contains only fields needed for studying (excludes timestamps, user_id, and AI flag)
 * Used in: GET /api/decks/:deckId/flashcards/due
 */
export type DueFlashcardDTO = Pick<
  FlashcardRow,
  'id' | 'deck_id' | 'front' | 'back' | 'ease_factor' | 'interval_days' | 'repetitions'
>

// ============================================================================
// Review DTOs
// ============================================================================

/**
 * Review DTO
 * Represents a single review record with difficulty rating and scheduling info
 * Used in: GET /api/flashcards/:flashcardId/reviews, POST /api/flashcards/:id/review
 */
export type ReviewDTO = Omit<ReviewRow, 'user_id'>

/**
 * Command to submit a flashcard review
 * Used in: POST /api/flashcards/:id/review
 */
export type SubmitReviewCommand = {
  difficulty_rating: number
}

/**
 * Flashcard update data returned after review submission
 * Contains only the spaced repetition fields that were updated
 * Used in: POST /api/flashcards/:id/review (nested in response)
 */
export type FlashcardReviewUpdateDTO = Pick<
  FlashcardRow,
  'id' | 'next_review_date' | 'ease_factor' | 'interval_days' | 'repetitions' | 'updated_at'
>

/**
 * Response DTO for review submission
 * Returns both the updated flashcard state and the created review record
 * Used in: POST /api/flashcards/:id/review
 */
export type ReviewResponseDTO = {
  flashcard: FlashcardReviewUpdateDTO
  review: ReviewDTO
}

// ============================================================================
// Pagination DTOs
// ============================================================================

/**
 * Pagination metadata
 * Included in all paginated list responses
 */
export type PaginationDTO = {
  page: number
  limit: number
  total: number
  total_pages: number
}

/**
 * Generic paginated response wrapper
 * Used for all list endpoints that support pagination
 */
export type PaginatedResponseDTO<T> = {
  data: T[]
  pagination: PaginationDTO
}

// ============================================================================
// Query Parameter Types
// ============================================================================

/**
 * Query parameters for listing decks
 * Used in: GET /api/decks
 */
export type DeckListQueryParams = {
  page?: number
  limit?: number
  sort?: 'created_at' | 'updated_at' | 'name'
  order?: 'asc' | 'desc'
}

/**
 * Query parameters for listing flashcards in a deck
 * Used in: GET /api/decks/:deckId/flashcards
 */
export type FlashcardListQueryParams = {
  page?: number
  limit?: number
  sort?: 'created_at' | 'updated_at' | 'next_review_date'
  order?: 'asc' | 'desc'
  is_ai_generated?: boolean
}

/**
 * Query parameters for getting due flashcards
 * Used in: GET /api/decks/:deckId/flashcards/due
 */
export type DueFlashcardsQueryParams = {
  limit?: number
}

/**
 * Query parameters for review history
 * Used in: GET /api/flashcards/:flashcardId/reviews
 */
export type ReviewHistoryQueryParams = {
  page?: number
  limit?: number
  order?: 'asc' | 'desc'
}
