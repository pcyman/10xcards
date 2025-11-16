import type { createServerClient } from "@/db/supabase.client";
import type {
  FlashcardDTO,
  PaginatedResponseDTO,
  CreateFlashcardCommand,
  UpdateFlashcardCommand,
  AcceptFlashcardsResponseDTO,
  FlashcardCandidateDTO,
} from "@/types";

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
 * Custom error for not found operations
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
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
 * Parameters for creating a flashcard
 */
export interface CreateFlashcardParams {
  deckId: string;
  userId: string;
  command: CreateFlashcardCommand;
}

/**
 * Parameters for updating a flashcard
 */
export interface UpdateFlashcardParams {
  flashcardId: string;
  userId: string;
  command: UpdateFlashcardCommand;
}

/**
 * Parameters for batch creating AI-generated flashcards
 */
export interface BatchCreateFlashcardsParams {
  deckId: string;
  userId: string;
  candidates: FlashcardCandidateDTO[];
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
  async getFlashcardById(supabase: SupabaseServerClient, id: string): Promise<FlashcardDTO | null> {
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
      dataQuery = dataQuery.order(sort, { ascending: order === "asc" }).range(offset, offset + limit - 1);

      // ========================================================================
      // Step 3: Execute queries in parallel
      // ========================================================================
      const [dataResult, countResult] = await Promise.all([dataQuery, countQuery]);

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

  /**
   * Create a new flashcard manually in a deck
   *
   * Creates a flashcard with is_ai_generated=false and default spaced repetition values.
   * Verifies deck ownership before creation.
   *
   * @param supabase - Authenticated Supabase client from context.locals
   * @param params - CreateFlashcardParams containing deck ID, user ID, and flashcard data
   * @returns FlashcardDTO of the created flashcard
   * @throws Error with 'DECK_NOT_FOUND' message if deck doesn't exist or doesn't belong to user
   * @throws FlashcardServiceError if database operation fails
   */
  async createFlashcard(supabase: SupabaseServerClient, params: CreateFlashcardParams): Promise<FlashcardDTO> {
    const { deckId, userId, command } = params;

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
      // Step 2: Insert flashcard with default spaced repetition values
      // ========================================================================
      const { data: flashcard, error: insertError } = await supabase
        .from("flashcards")
        .insert({
          deck_id: deckId,
          user_id: userId,
          front: command.front,
          back: command.back,
          is_ai_generated: false,
          // Default values are set by database:
          // - next_review_date: current_date
          // - ease_factor: 2.5
          // - interval_days: 0
          // - repetitions: 0
        })
        .select(
          "id, deck_id, front, back, is_ai_generated, next_review_date, ease_factor, interval_days, repetitions, created_at, updated_at"
        )
        .single();

      if (insertError) {
        throw new FlashcardServiceError(`Failed to create flashcard: ${insertError.message}`);
      }

      return flashcard as FlashcardDTO;
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
      console.error("Unexpected error in createFlashcard:", error);
      throw new FlashcardServiceError("Failed to create flashcard");
    }
  }

  /**
   * Update an existing flashcard's content
   *
   * Updates front and/or back text of a flashcard.
   * Verifies flashcard ownership before update.
   * The updated_at timestamp is automatically set by database trigger.
   *
   * @param supabase - Authenticated Supabase client from context.locals
   * @param params - UpdateFlashcardParams containing flashcard ID, user ID, and update data
   * @returns FlashcardDTO of the updated flashcard
   * @throws Error with 'FLASHCARD_NOT_FOUND' message if flashcard doesn't exist or doesn't belong to user
   * @throws FlashcardServiceError if database operation fails
   */
  async updateFlashcard(supabase: SupabaseServerClient, params: UpdateFlashcardParams): Promise<FlashcardDTO> {
    const { flashcardId, userId, command } = params;

    try {
      // ========================================================================
      // Step 1: Build update object with only provided fields
      // ========================================================================
      const updateData: { front?: string; back?: string } = {};

      if (command.front !== undefined) {
        updateData.front = command.front;
      }

      if (command.back !== undefined) {
        updateData.back = command.back;
      }

      // ========================================================================
      // Step 2: Update flashcard with ownership verification
      // ========================================================================
      const { data: flashcard, error: updateError } = await supabase
        .from("flashcards")
        .update(updateData)
        .eq("id", flashcardId)
        .eq("user_id", userId)
        .select(
          "id, deck_id, front, back, is_ai_generated, next_review_date, ease_factor, interval_days, repetitions, created_at, updated_at"
        )
        .single();

      // ========================================================================
      // Step 3: Handle database errors
      // ========================================================================
      if (updateError) {
        throw new FlashcardServiceError(`Failed to update flashcard: ${updateError.message}`);
      }

      // If no flashcard was returned, it either doesn't exist or doesn't belong to user
      if (!flashcard) {
        throw new Error("FLASHCARD_NOT_FOUND");
      }

      // ========================================================================
      // Step 4: Return updated flashcard DTO
      // ========================================================================
      return flashcard as FlashcardDTO;
    } catch (error) {
      // Re-throw known errors (FLASHCARD_NOT_FOUND)
      if (error instanceof Error && error.message === "FLASHCARD_NOT_FOUND") {
        throw error;
      }

      // Re-throw FlashcardServiceError
      if (error instanceof FlashcardServiceError) {
        throw error;
      }

      // Log and wrap unexpected errors
      console.error("Unexpected error in updateFlashcard:", error);
      throw new FlashcardServiceError("Failed to update flashcard");
    }
  }

  /**
   * Batch create AI-generated flashcards in a deck
   *
   * Creates multiple flashcards with is_ai_generated=true and default spaced repetition values.
   * Verifies deck ownership before creation.
   * Uses batch insert for efficiency - all flashcards created atomically.
   *
   * @param supabase - Authenticated Supabase client from context.locals
   * @param params - BatchCreateFlashcardsParams containing deck ID, user ID, and flashcard candidates
   * @returns AcceptFlashcardsResponseDTO with created flashcards and count
   * @throws Error with 'DECK_NOT_FOUND' message if deck doesn't exist or doesn't belong to user
   * @throws FlashcardServiceError if database operation fails
   */
  async batchCreateFlashcards(
    supabase: SupabaseServerClient,
    params: BatchCreateFlashcardsParams
  ): Promise<AcceptFlashcardsResponseDTO> {
    const { deckId, userId, candidates } = params;

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
      // Step 2: Prepare batch insert data
      // ========================================================================
      const flashcardsToInsert = candidates.map((candidate) => ({
        deck_id: deckId,
        user_id: userId,
        front: candidate.front,
        back: candidate.back,
        is_ai_generated: true,
        // Default values are set by database:
        // - next_review_date: current_date
        // - ease_factor: 2.5
        // - interval_days: 0
        // - repetitions: 0
      }));

      // ========================================================================
      // Step 3: Batch insert flashcards
      // ========================================================================
      const { data: createdFlashcards, error: insertError } = await supabase
        .from("flashcards")
        .insert(flashcardsToInsert)
        .select(
          "id, deck_id, front, back, is_ai_generated, next_review_date, ease_factor, interval_days, repetitions, created_at, updated_at"
        );

      if (insertError) {
        throw new FlashcardServiceError(`Failed to create flashcards: ${insertError.message}`);
      }

      // ========================================================================
      // Step 4: Build and return response DTO
      // ========================================================================
      return {
        created: createdFlashcards as FlashcardDTO[],
        total_created: createdFlashcards.length,
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
      console.error("Unexpected error in batchCreateFlashcards:", error);
      throw new FlashcardServiceError("Failed to batch create flashcards");
    }
  }

  /**
   * Delete a flashcard and all its associated review history
   *
   * Permanently removes a flashcard from the database with CASCADE deletion of reviews.
   * Verifies flashcard ownership before deletion to prevent unauthorized access.
   * This operation is idempotent - subsequent calls return NotFoundError.
   *
   * @param supabase - Authenticated Supabase client from context.locals
   * @param flashcardId - UUID of the flashcard to delete
   * @param userId - UUID of the authenticated user
   * @returns Promise<void> on successful deletion
   * @throws NotFoundError if flashcard doesn't exist or doesn't belong to user
   * @throws FlashcardServiceError if database operation fails
   */
  async deleteFlashcard(supabase: SupabaseServerClient, flashcardId: string, userId: string): Promise<void> {
    try {
      // ========================================================================
      // Step 1: Delete flashcard with ownership verification
      // ========================================================================
      // Using DELETE with RETURNING to verify the flashcard existed and was deleted
      // If no rows returned, flashcard not found or unauthorized
      const { data, error } = await supabase
        .from("flashcards")
        .delete()
        .eq("id", flashcardId)
        .eq("user_id", userId)
        .select("id")
        .single();

      // ========================================================================
      // Step 2: Handle database errors
      // ========================================================================
      if (error || !data) {
        // PGRST116 = PostgrestError: "JSON object requested, multiple (or no) rows returned"
        // This means no rows were deleted (flashcard not found or unauthorized)
        if (error?.code === "PGRST116") {
          throw new NotFoundError("Flashcard not found");
        }
        throw error || new Error("Failed to delete flashcard");
      }

      // Successful deletion - CASCADE constraint automatically deleted related reviews
    } catch (error) {
      // Re-throw NotFoundError
      if (error instanceof NotFoundError) {
        throw error;
      }

      // Re-throw FlashcardServiceError
      if (error instanceof FlashcardServiceError) {
        throw error;
      }

      // Log and wrap unexpected errors
      console.error("Unexpected error in deleteFlashcard:", error);
      throw new FlashcardServiceError("Failed to delete flashcard");
    }
  }
}

/**
 * Singleton flashcard service instance
 */
export const flashcardService = new FlashcardService();
