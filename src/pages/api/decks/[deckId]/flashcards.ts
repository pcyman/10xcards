import type { APIRoute } from "astro";
import { z } from "zod";
import type { CreateFlashcardCommand } from "@/types";
import { flashcardService, FlashcardServiceError } from "@/lib/services/flashcard.service";

// Disable prerendering for this dynamic API route
export const prerender = false;

/**
 * Validation schema for deckId path parameter
 */
const deckIdSchema = z.string().uuid("Invalid deck ID format");

/**
 * Validation schema for query parameters
 */
const queryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sort: z.enum(["created_at", "updated_at", "next_review_date"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  is_ai_generated: z.coerce.boolean().optional(),
});

/**
 * Validation schema for creating a flashcard
 */
const createFlashcardSchema = z.object({
  front: z
    .string()
    .min(1, "Front text is required")
    .refine((val) => val.trim().length > 0, {
      message: "Front text cannot be empty or whitespace-only",
    }),
  back: z
    .string()
    .min(1, "Back text is required")
    .refine((val) => val.trim().length > 0, {
      message: "Back text cannot be empty or whitespace-only",
    }),
});

/**
 * GET /api/decks/:deckId/flashcards
 *
 * List all flashcards in a specific deck with pagination and filtering
 *
 * Path Parameters:
 * @param deckId - UUID of the deck
 *
 * Query Parameters:
 * @param page - Page number (default: 1, min: 1)
 * @param limit - Items per page (default: 50, min: 1, max: 200)
 * @param sort - Sort field (default: 'created_at', options: 'created_at' | 'updated_at' | 'next_review_date')
 * @param order - Sort order (default: 'desc', options: 'asc' | 'desc')
 * @param is_ai_generated - Filter by AI generation status (optional boolean)
 *
 * @returns Paginated list of flashcards in the deck
 */
export const GET: APIRoute = async ({ params, locals, url }) => {
  try {
    // ========================================================================
    // Step 1: Authentication
    // ========================================================================
    // Check if user is authenticated via session (set by middleware)
    if (!locals.session) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user from Supabase
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or expired authentication token",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // Step 2: Validate Path Parameter (deckId)
    // ========================================================================
    const deckIdValidation = deckIdSchema.safeParse(params.deckId);

    if (!deckIdValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid deck ID format",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const deckId = deckIdValidation.data;

    // ========================================================================
    // Step 3: Validate Query Parameters
    // ========================================================================
    const queryParams = Object.fromEntries(url.searchParams);
    const validationResult = queryParamsSchema.safeParse(queryParams);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid query parameters",
          details: validationResult.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { page, limit, sort, order, is_ai_generated } = validationResult.data;

    // ========================================================================
    // Step 4: Call Service to List Flashcards
    // ========================================================================
    const result = await flashcardService.listFlashcardsInDeck(locals.supabase, {
      deckId,
      userId: user.id,
      page,
      limit,
      sort,
      order,
      isAiGenerated: is_ai_generated,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ========================================================================
    // Step 5: Error Handling
    // ========================================================================
    // Handle deck not found specifically
    if (error instanceof Error && error.message === "DECK_NOT_FOUND") {
      return new Response(
        JSON.stringify({
          error: "Deck not found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle FlashcardService errors
    if (error instanceof FlashcardServiceError) {
      console.error("FlashcardService error in GET /api/decks/:deckId/flashcards:", {
        message: error.message,
        error,
      });

      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to retrieve flashcards",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/decks/:deckId/flashcards:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

/**
 * POST /api/decks/:deckId/flashcards
 *
 * Create a new flashcard manually in a specific deck
 *
 * Path Parameters:
 * @param deckId - UUID of the deck
 *
 * Request Body:
 * @param front - Front text of flashcard (required, non-empty)
 * @param back - Back text of flashcard (required, non-empty)
 *
 * @returns Created flashcard with default spaced repetition values (201 Created)
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // ========================================================================
    // Step 1: Authentication
    // ========================================================================
    // Check if user is authenticated via session (set by middleware)
    if (!locals.session) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user from Supabase
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or expired authentication token",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // Step 2: Validate Path Parameter (deckId)
    // ========================================================================
    const deckIdValidation = deckIdSchema.safeParse(params.deckId);

    if (!deckIdValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid deck ID format",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const deckId = deckIdValidation.data;

    // ========================================================================
    // Step 3: Parse and Validate Request Body
    // ========================================================================
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid JSON in request body",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validationResult = createFlashcardSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: validationResult.error.errors[0].message,
          details: validationResult.error.errors,
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const command: CreateFlashcardCommand = validationResult.data;

    // ========================================================================
    // Step 4: Create Flashcard via Service
    // ========================================================================
    const flashcard = await flashcardService.createFlashcard(locals.supabase, {
      deckId,
      userId: user.id,
      command,
    });

    // ========================================================================
    // Step 5: Return Created Flashcard
    // ========================================================================
    return new Response(JSON.stringify(flashcard), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ========================================================================
    // Step 6: Error Handling
    // ========================================================================
    // Handle deck not found specifically
    if (error instanceof Error && error.message === "DECK_NOT_FOUND") {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Deck not found or does not belong to user",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle FlashcardService errors
    if (error instanceof FlashcardServiceError) {
      console.error("FlashcardService error in POST /api/decks/:deckId/flashcards:", {
        message: error.message,
        error,
      });

      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to create flashcard",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Catch-all for unexpected errors
    console.error("Unexpected error in POST /api/decks/:deckId/flashcards:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
