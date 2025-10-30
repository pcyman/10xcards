import type { supabaseClient } from "@/db/supabase.client";
import type { DeckDTO, DeckListQueryParams, PaginatedResponseDTO } from "@/types";

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
    supabase: typeof supabaseClient,
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
}

/**
 * Singleton deck service instance
 */
export const deckService = new DeckService();
