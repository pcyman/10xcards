import type { createServerClient } from "@/db/supabase.client";
import type { CreateDeckCommand, UpdateDeckCommand, DeckDTO, DeckListQueryParams, PaginatedResponseDTO } from "@/types";

// Type alias for the per-request Supabase client
type SupabaseServerClient = ReturnType<typeof createServerClient>;

/**
 * Custom error for deck-related operations
 */
export class DeckServiceError extends Error {
  constructor(message = "Deck service operation failed") {
    super(message);
    this.name = "DeckServiceError";
  }
}

/**
 * DeckService handles all deck-related business logic
 * Provides methods for CRUD operations and deck statistics
 */
export class DeckService {
  /**
   * Create a new deck for a user
   *
   * Creates a new deck owned by the authenticated user with initial statistics (0 flashcards, 0 cards due).
   * Enforces unique deck names per user via database constraint.
   *
   * @param supabase - Authenticated Supabase client from context.locals
   * @param userId - ID of authenticated user
   * @param command - CreateDeckCommand containing the deck name
   * @returns DeckDTO with computed statistics
   * @throws Error with 'DECK_NAME_EXISTS' message if duplicate deck name
   * @throws Error with 'INVALID_DECK_NAME' message if name violates check constraint
   * @throws DeckServiceError if database operation fails
   */
  async createDeck(supabase: SupabaseServerClient, userId: string, command: CreateDeckCommand): Promise<DeckDTO> {
    try {
      // ========================================================================
      // Step 1: Insert deck into database
      // ========================================================================
      const { data: deck, error } = await supabase
        .from("decks")
        .insert({
          user_id: userId,
          name: command.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id, name, created_at, updated_at")
        .single();

      // ========================================================================
      // Step 2: Handle database constraint violations
      // ========================================================================
      // Handle unique constraint violation (user_id, name)
      if (error?.code === "23505") {
        throw new Error("DECK_NAME_EXISTS");
      }

      // Handle check constraint violation (trim(name) != '')
      if (error?.code === "23514") {
        throw new Error("INVALID_DECK_NAME");
      }

      if (error) {
        throw new DeckServiceError(`Failed to create deck: ${error.message}`);
      }

      if (!deck) {
        throw new DeckServiceError("No deck returned after creation");
      }

      // ========================================================================
      // Step 3: Return DTO with computed statistics
      // ========================================================================
      // For new decks, all statistics are zero/null (no flashcards yet)
      return {
        id: deck.id,
        name: deck.name,
        created_at: deck.created_at,
        updated_at: deck.updated_at,
        total_flashcards: 0,
        cards_due: 0,
        next_review_date: null,
      };
    } catch (error) {
      // Re-throw known errors (DECK_NAME_EXISTS, INVALID_DECK_NAME)
      if (error instanceof Error && (error.message === "DECK_NAME_EXISTS" || error.message === "INVALID_DECK_NAME")) {
        throw error;
      }

      // Re-throw DeckServiceError
      if (error instanceof DeckServiceError) {
        throw error;
      }

      // Log and wrap unexpected errors
      console.error("Unexpected error in createDeck:", error);
      throw new DeckServiceError("Failed to create deck");
    }
  }

  /**
   * List all decks for a user with pagination and statistics
   *
   * Fetches decks with computed metadata:
   * - total_flashcards: Total number of cards in deck
   * - cards_due: Number of cards due for review (next_review_date <= now)
   * - next_review_date: Earliest upcoming review date
   *
   * @param supabase - Authenticated Supabase client from context.locals
   * @param userId - ID of authenticated user
   * @param params - Query parameters for pagination and sorting
   * @returns Paginated response with deck data and metadata
   * @throws DeckServiceError if database query fails
   */
  async listDecks(
    supabase: SupabaseServerClient,
    userId: string,
    params: DeckListQueryParams
  ): Promise<PaginatedResponseDTO<DeckDTO>> {
    const { page = 1, limit = 20, sort = "created_at", order = "desc" } = params;

    try {
      // ========================================================================
      // Step 1: Count total decks for pagination metadata
      // ========================================================================
      const { count, error: countError } = await supabase
        .from("decks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (countError) {
        throw new DeckServiceError(`Failed to count decks: ${countError.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      // ========================================================================
      // Step 2: Calculate pagination offset
      // ========================================================================
      const offset = (page - 1) * limit;
      const rangeFrom = offset;
      const rangeTo = offset + limit - 1;

      // ========================================================================
      // Step 3: Fetch decks with statistics
      // ========================================================================
      // Note: Supabase doesn't support complex JOINs with aggregations directly in the query builder
      // We need to fetch decks first, then calculate statistics separately

      const { data: decks, error: decksError } = await supabase
        .from("decks")
        .select("id, name, created_at, updated_at")
        .eq("user_id", userId)
        .order(sort, { ascending: order === "asc" })
        .range(rangeFrom, rangeTo);

      if (decksError) {
        throw new DeckServiceError(`Failed to fetch decks: ${decksError.message}`);
      }

      if (!decks || decks.length === 0) {
        // Return empty response if no decks found
        return {
          data: [],
          pagination: {
            page,
            limit,
            total,
            total_pages: totalPages,
          },
        };
      }

      // ========================================================================
      // Step 4: Fetch flashcard statistics for each deck
      // ========================================================================
      const deckIds = decks.map((deck) => deck.id);

      // Fetch all flashcards for these decks
      const { data: flashcards, error: flashcardsError } = await supabase
        .from("flashcards")
        .select("id, deck_id, next_review_date")
        .in("deck_id", deckIds);

      if (flashcardsError) {
        throw new DeckServiceError(`Failed to fetch flashcard statistics: ${flashcardsError.message}`);
      }

      // ========================================================================
      // Step 5: Calculate statistics for each deck
      // ========================================================================
      const now = new Date();

      // Group flashcards by deck_id and calculate statistics
      const deckStatsMap = new Map<
        string,
        {
          total: number;
          due: number;
          nextReview: string | null;
        }
      >();

      // Initialize stats for all decks
      deckIds.forEach((deckId) => {
        deckStatsMap.set(deckId, {
          total: 0,
          due: 0,
          nextReview: null,
        });
      });

      // Calculate statistics from flashcards
      flashcards?.forEach((flashcard) => {
        const stats = deckStatsMap.get(flashcard.deck_id);
        if (stats) {
          stats.total += 1;

          // Check if card is due
          if (flashcard.next_review_date) {
            const nextReview = new Date(flashcard.next_review_date);
            if (nextReview <= now) {
              stats.due += 1;
            }

            // Track earliest review date
            if (!stats.nextReview || nextReview < new Date(stats.nextReview)) {
              stats.nextReview = flashcard.next_review_date;
            }
          }
        }
      });

      // ========================================================================
      // Step 6: Map decks to DTOs with statistics
      // ========================================================================
      const deckDTOs: DeckDTO[] = decks.map((deck) => {
        const stats = deckStatsMap.get(deck.id) || {
          total: 0,
          due: 0,
          nextReview: null,
        };

        return {
          id: deck.id,
          name: deck.name,
          created_at: deck.created_at,
          updated_at: deck.updated_at,
          total_flashcards: stats.total,
          cards_due: stats.due,
          next_review_date: stats.nextReview,
        };
      });

      // ========================================================================
      // Step 7: Return paginated response
      // ========================================================================
      return {
        data: deckDTOs,
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
        },
      };
    } catch (error) {
      if (error instanceof DeckServiceError) {
        throw error;
      }

      // Log unexpected errors
      console.error("Unexpected error in listDecks:", error);
      throw new DeckServiceError("Failed to list decks");
    }
  }

  /**
   * Update an existing deck name
   *
   * Updates the name of a deck with strict ownership verification.
   * Enforces unique deck names per user via database constraint.
   * Returns the updated deck with computed statistics.
   *
   * @param supabase - Authenticated Supabase client from context.locals
   * @param userId - ID of authenticated user
   * @param deckId - ID of the deck to update
   * @param command - UpdateDeckCommand containing the new deck name
   * @returns DeckDTO with computed statistics
   * @throws Error with 'DECK_NOT_FOUND' message if deck doesn't exist or doesn't belong to user
   * @throws Error with 'DUPLICATE_DECK_NAME' message if duplicate deck name
   * @throws DeckServiceError if database operation fails
   */
  async updateDeck(
    supabase: SupabaseServerClient,
    userId: string,
    deckId: string,
    command: UpdateDeckCommand
  ): Promise<DeckDTO> {
    try {
      // ========================================================================
      // Step 1: Update deck with ownership verification
      // ========================================================================
      const { data: deck, error: updateError } = await supabase
        .from("decks")
        .update({
          name: command.name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", deckId)
        .eq("user_id", userId)
        .select("id, name, created_at, updated_at")
        .single();

      // ========================================================================
      // Step 2: Handle database errors and constraints
      // ========================================================================
      // Handle unique constraint violation (user_id, name)
      if (updateError?.code === "23505") {
        throw new Error("DUPLICATE_DECK_NAME");
      }

      if (updateError) {
        throw new DeckServiceError(`Failed to update deck: ${updateError.message}`);
      }

      // If no deck was returned, it either doesn't exist or doesn't belong to user
      if (!deck) {
        throw new Error("DECK_NOT_FOUND");
      }

      // ========================================================================
      // Step 3: Compute deck statistics
      // ========================================================================
      const stats = await this.computeDeckStatistics(supabase, deckId, userId);

      // ========================================================================
      // Step 4: Return DTO with computed statistics
      // ========================================================================
      return {
        id: deck.id,
        name: deck.name,
        created_at: deck.created_at,
        updated_at: deck.updated_at,
        ...stats,
      };
    } catch (error) {
      // Re-throw known errors (DECK_NOT_FOUND, DUPLICATE_DECK_NAME)
      if (error instanceof Error && (error.message === "DECK_NOT_FOUND" || error.message === "DUPLICATE_DECK_NAME")) {
        throw error;
      }

      // Re-throw DeckServiceError
      if (error instanceof DeckServiceError) {
        throw error;
      }

      // Log and wrap unexpected errors
      console.error("Unexpected error in updateDeck:", error);
      throw new DeckServiceError("Failed to update deck");
    }
  }

  /**
   * Delete a deck and all its associated flashcards and reviews
   *
   * Permanently deletes a deck with ownership verification. The database CASCADE
   * constraints automatically handle deletion of associated flashcards and reviews.
   * Returns the count of deleted flashcards for user feedback.
   *
   * @param supabase - Authenticated Supabase client from context.locals
   * @param userId - ID of authenticated user
   * @param deckId - ID of the deck to delete
   * @returns Object with deleted_flashcards count, or null if deck not found
   * @throws DeckServiceError if database operation fails
   */
  async deleteDeck(
    supabase: SupabaseServerClient,
    userId: string,
    deckId: string
  ): Promise<{ deleted_flashcards: number } | null> {
    try {
      // ========================================================================
      // Step 1: Count flashcards before deletion
      // ========================================================================
      const { count, error: countError } = await supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .eq("deck_id", deckId)
        .eq("user_id", userId);

      if (countError) {
        throw new DeckServiceError(`Failed to count flashcards: ${countError.message}`);
      }

      const flashcardCount = count ?? 0;

      // ========================================================================
      // Step 2: Delete deck with ownership verification
      // ========================================================================
      const { data, error: deleteError } = await supabase
        .from("decks")
        .delete()
        .eq("id", deckId)
        .eq("user_id", userId)
        .select("id")
        .single();

      // If no data returned, deck doesn't exist or doesn't belong to user
      if (deleteError || !data) {
        return null;
      }

      // ========================================================================
      // Step 3: Return flashcard count for user feedback
      // ========================================================================
      return {
        deleted_flashcards: flashcardCount,
      };
    } catch (error) {
      // Re-throw DeckServiceError
      if (error instanceof DeckServiceError) {
        throw error;
      }

      // Log and wrap unexpected errors
      console.error("Unexpected error in deleteDeck:", error);
      throw new DeckServiceError("Failed to delete deck");
    }
  }

  /**
   * Get a single deck with computed statistics
   *
   * Fetches deck details with ownership verification and computes statistics:
   * - total_flashcards: Total number of cards in deck
   * - cards_due: Number of cards due for review (next_review_date <= now)
   * - next_review_date: Earliest upcoming review date
   *
   * @param supabase - Authenticated Supabase client from context.locals
   * @param userId - ID of authenticated user
   * @param deckId - UUID of the deck to retrieve
   * @returns DeckDTO with computed statistics, or null if not found/unauthorized
   * @throws DeckServiceError if database query fails
   */
  async getDeck(supabase: SupabaseServerClient, userId: string, deckId: string): Promise<DeckDTO | null> {
    try {
      // ========================================================================
      // Step 1: Fetch deck with ownership verification
      // ========================================================================
      const { data: deck, error } = await supabase
        .from("decks")
        .select("id, name, created_at, updated_at")
        .eq("id", deckId)
        .eq("user_id", userId)
        .maybeSingle();

      // ========================================================================
      // Step 2: Handle database errors
      // ========================================================================
      if (error) {
        throw new DeckServiceError(`Failed to fetch deck: ${error.message}`);
      }

      // ========================================================================
      // Step 3: Return null if deck not found or unauthorized
      // ========================================================================
      if (!deck) {
        return null;
      }

      // ========================================================================
      // Step 4: Compute deck statistics
      // ========================================================================
      const stats = await this.computeDeckStatistics(supabase, deckId, userId);

      // ========================================================================
      // Step 5: Return DTO with computed statistics
      // ========================================================================
      return {
        id: deck.id,
        name: deck.name,
        created_at: deck.created_at,
        updated_at: deck.updated_at,
        ...stats,
      };
    } catch (error) {
      // Re-throw DeckServiceError
      if (error instanceof DeckServiceError) {
        throw error;
      }

      // Log and wrap unexpected errors
      console.error("Unexpected error in getDeck:", error);
      throw new DeckServiceError("Failed to get deck");
    }
  }

  /**
   * Compute statistics for a deck
   *
   * @param supabase - Authenticated Supabase client
   * @param deckId - ID of the deck
   * @param userId - ID of the user (for security)
   * @returns Object containing total_flashcards, cards_due, and next_review_date
   * @private
   */
  private async computeDeckStatistics(
    supabase: SupabaseServerClient,
    deckId: string,
    userId: string
  ): Promise<{
    total_flashcards: number;
    cards_due: number;
    next_review_date: string | null;
  }> {
    const now = new Date().toISOString();

    // ========================================================================
    // Total flashcards count
    // ========================================================================
    const { count: total, error: totalError } = await supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("deck_id", deckId)
      .eq("user_id", userId);

    if (totalError) {
      throw new DeckServiceError(`Failed to count total flashcards: ${totalError.message}`);
    }

    // ========================================================================
    // Cards due count
    // ========================================================================
    const { count: due, error: dueError } = await supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("deck_id", deckId)
      .eq("user_id", userId)
      .lte("next_review_date", now);

    if (dueError) {
      throw new DeckServiceError(`Failed to count cards due: ${dueError.message}`);
    }

    // ========================================================================
    // Next review date
    // ========================================================================
    const { data: nextCard, error: nextError } = await supabase
      .from("flashcards")
      .select("next_review_date")
      .eq("deck_id", deckId)
      .eq("user_id", userId)
      .gt("next_review_date", now)
      .order("next_review_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextError) {
      throw new DeckServiceError(`Failed to get next review date: ${nextError.message}`);
    }

    return {
      total_flashcards: total ?? 0,
      cards_due: due ?? 0,
      next_review_date: nextCard?.next_review_date ?? null,
    };
  }
}

/**
 * Singleton deck service instance
 */
export const deckService = new DeckService();
