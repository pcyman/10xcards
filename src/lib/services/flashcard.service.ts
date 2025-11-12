import type { createServerClient } from "@/db/supabase.client";
import type { FlashcardDTO, PaginatedResponseDTO } from "@/types";

// Type alias for the per-request Supabase client
type SupabaseServerClient = ReturnType<typeof createServerClient>;

/**
 * Custom error for flashcard-related operations
 */
export class FlashcardServiceError extends Error {
  constructor(message = "Flashcard service operation failed") {
    super(message);
    this.name = "FlashcardServiceError";
  }
}

/**
 * Parameters for listing flashcards in a deck
 */
export interface ListFlashcardsParams {
  deckId: string;
  userId: string;
  page: number;
  limit: number;
  sort: "created_at" | "updated_at" | "next_review_date";
  order: "asc" | "desc";
  isAiGenerated?: boolean;
}

/**
 * FlashcardService handles all flashcard-related business logic
 * Provides methods for CRUD operations and flashcard queries
 */
export class FlashcardService {
  /**
   * Get a single flashcard by ID
   *
   * Fetches detailed information about a specific flashcard.
   * RLS policies automatically ensure the flashcard belongs to the authenticated user.
   *
   * @param supabase - Authenticated Supabase client from context.locals
   * @param id - UUID of the flashcard to retrieve
   * @returns FlashcardDTO if found, null if not found or not owned by user
   * @throws FlashcardServiceError if database operation fails
   */
  async getFlashcardById(
    supabase: SupabaseServerClient,
    id: string
  ): Promise<FlashcardDTO | null> {
    try {
      const { data, error } = await supabase
        .from("flashcards")
        .select(
          "id, deck_id, front, back, is_ai_generated, next_review_date, ease_factor, interval_days, repetitions, created_at, updated_at"
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Database error fetching flashcard:", error);
        throw new FlashcardServiceError(`Failed to fetch flashcard: ${error.message}`);
      }

      // Return null if flashcard not found or not owned by user (filtered by RLS)
      return data as FlashcardDTO | null;
    } catch (error) {
      // Re-throw FlashcardServiceError
      if (error instanceof FlashcardServiceError) {
        throw error;
      }

      // Log and wrap unexpected errors
      console.error("Unexpected error in getFlashcardById:", error);
      throw new FlashcardServiceError("Failed to fetch flashcard");
    }
  }

  /**
   * List flashcards in a deck with pagination and filtering
   *
   * Fetches paginated flashcards with optional AI generation filter.
   * Enforces deck ownership verification before returning flashcards.
   *
   * @param supabase - Authenticated Supabase client from context.locals
   * @param params - ListFlashcardsParams containing query parameters
   * @returns Paginated response with flashcard data and metadata
   * @throws Error with 'DECK_NOT_FOUND' message if deck doesn't exist or doesn't belong to user
   * @throws FlashcardServiceError if database operation fails
   */
  async listFlashcardsInDeck(
    supabase: SupabaseServerClient,
    params: ListFlashcardsParams
  ): Promise<PaginatedResponseDTO<FlashcardDTO>> {
    const { deckId, userId, page, limit, sort, order, isAiGenerated } = params;

    try {
      // ========================================================================
      // Step 1: Verify deck ownership
      // ========================================================================
      const { data: deck, error: deckError } = await supabase
        .from("decks")
        .select("id")
        .eq("id", deckId)
        .eq("user_id", userId)
        .maybeSingle();

      if (deckError) {
        throw new FlashcardServiceError(`Failed to verify deck ownership: ${deckError.message}`);
      }

      if (!deck) {
        throw new Error("DECK_NOT_FOUND");
      }

      // ========================================================================
      // Step 2: Build flashcard query
      // ========================================================================
      const offset = (page - 1) * limit;

      let dataQuery = supabase
        .from("flashcards")
        .select(
          "id, deck_id, front, back, is_ai_generated, next_review_date, ease_factor, interval_days, repetitions, created_at, updated_at"
        )
        .eq("deck_id", deckId)
        .eq("user_id", userId);

      let countQuery = supabase
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("deck_id", deckId)
        .eq("user_id", userId);

      // Apply optional AI generation filter
      if (isAiGenerated !== undefined) {
        dataQuery = dataQuery.eq("is_ai_generated", isAiGenerated);
        countQuery = countQuery.eq("is_ai_generated", isAiGenerated);
      }

      // Apply sorting and pagination to data query
      dataQuery = dataQuery
        .order(sort, { ascending: order === "asc" })
        .range(offset, offset + limit - 1);

      // ========================================================================
      // Step 3: Execute queries in parallel
      // ========================================================================
      const [dataResult, countResult] = await Promise.all([
        dataQuery,
        countQuery,
      ]);

      if (dataResult.error) {
        throw new FlashcardServiceError(`Failed to fetch flashcards: ${dataResult.error.message}`);
      }

      if (countResult.error) {
        throw new FlashcardServiceError(`Failed to count flashcards: ${countResult.error.message}`);
      }

      // ========================================================================
      // Step 4: Build paginated response
      // ========================================================================
      const total = countResult.count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: dataResult.data as FlashcardDTO[],
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
        },
      };
    } catch (error) {
      // Re-throw known errors (DECK_NOT_FOUND)
      if (error instanceof Error && error.message === "DECK_NOT_FOUND") {
        throw error;
      }

      // Re-throw FlashcardServiceError
      if (error instanceof FlashcardServiceError) {
        throw error;
      }

      // Log and wrap unexpected errors
      console.error("Unexpected error in listFlashcardsInDeck:", error);
      throw new FlashcardServiceError("Failed to list flashcards");
    }
  }
}

/**
 * Singleton flashcard service instance
 */
export const flashcardService = new FlashcardService();
