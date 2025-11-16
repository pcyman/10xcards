import type { APIRoute } from "astro";
import { z } from "zod";
import type { AcceptFlashcardsCommand } from "@/types";
import { flashcardService, FlashcardServiceError } from "@/lib/services/flashcard.service";

// Disable prerendering for this dynamic API route
export const prerender = false;

/**
 * Validation schema for deckId path parameter
 */
const deckIdSchema = z.string().uuid("Invalid deck ID format");

/**
 * Validation schema for individual flashcard candidate
 */
const flashcardCandidateSchema = z.object({
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
 * Validation schema for batch flashcard acceptance
 */
const acceptFlashcardsSchema = z.object({
  flashcards: z
    .array(flashcardCandidateSchema)
    .min(1, "At least one flashcard is required")
    .max(100, "Maximum 100 flashcards allowed per batch"),
});

/**
 * POST /api/decks/:deckId/flashcards/batch
 *
 * Accept and save selected AI-generated flashcard candidates in batch
 *
 * Path Parameters:
 * @param deckId - UUID of the deck
 *
 * Request Body:
 * @param flashcards - Array of flashcard candidates with front and back text
 *
 * @returns Created flashcards with metadata (201 Created)
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

    const validationResult = acceptFlashcardsSchema.safeParse(body);

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

    const command: AcceptFlashcardsCommand = validationResult.data;

    // ========================================================================
    // Step 4: Batch Create Flashcards via Service
    // ========================================================================
    const result = await flashcardService.batchCreateFlashcards(locals.supabase, {
      deckId,
      userId: user.id,
      candidates: command.flashcards,
    });

    // ========================================================================
    // Step 5: Return Created Flashcards
    // ========================================================================
    return new Response(JSON.stringify(result), {
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
      console.error("FlashcardService error in POST /api/decks/:deckId/flashcards/batch:", {
        message: error.message,
        error,
      });

      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to create flashcards",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Catch-all for unexpected errors
    console.error("Unexpected error in POST /api/decks/:deckId/flashcards/batch:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
