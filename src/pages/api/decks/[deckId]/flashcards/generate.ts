import type { APIRoute } from "astro";
import { z } from "zod";
import type { GenerateFlashcardsCommand, GenerateFlashcardsResponseDTO } from "@/types";
import { aiService, ServiceUnavailableError } from "@/lib/services/ai.service";

// Disable prerendering for this dynamic API route
export const prerender = false;

/**
 * Validation schema for deck ID parameter
 */
const deckIdSchema = z.string().uuid("Invalid deck ID format");

/**
 * Validation schema for flashcard generation request body
 */
const generateFlashcardsSchema = z.object({
  text: z
    .string()
    .min(1000, "Text must be at least 1000 characters")
    .max(10000, "Text must not exceed 10000 characters")
    .refine((val) => val.trim().length >= 1000, {
      message: "Text must contain at least 1000 non-whitespace characters",
    }),
});

/**
 * POST /api/decks/:deckId/flashcards/generate
 *
 * Generate flashcard candidates from user-provided text using AI
 *
 * @param deckId - UUID of the target deck (must exist and belong to authenticated user)
 * @param text - User-provided text (1000-10000 characters)
 * @returns Array of flashcard candidates (minimum 5)
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // ========================================================================
    // Step 1: Authentication
    // ========================================================================
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Missing or invalid authentication token",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify user authentication
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
    // Step 2: Validate Deck ID Parameter
    // ========================================================================
    const { deckId } = params;

    const deckIdValidation = deckIdSchema.safeParse(deckId);
    if (!deckIdValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid deck ID format",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // Step 3: Verify Deck Ownership
    // ========================================================================
    const { data: deck, error: deckError } = await locals.supabase
      .from("decks")
      .select("id")
      .eq("id", deckId)
      .eq("user_id", user.id)
      .single();

    if (deckError || !deck) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Deck not found or access denied",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // Step 4: Parse and Validate Request Body
    // ========================================================================
    let body: GenerateFlashcardsCommand;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Invalid JSON in request body",
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const validation = generateFlashcardsSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Invalid request body",
          details: validation.error.errors.map((err) => ({
            field: err.path.join("."),
            issue: err.message,
          })),
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // Step 5: Generate Flashcards with AI Service
    // ========================================================================
    let candidates;
    try {
      candidates = await aiService.generateFlashcards(validation.data.text);
    } catch (error) {
      // Handle AI service unavailability
      if (error instanceof ServiceUnavailableError) {
        return new Response(
          JSON.stringify({
            error: "Service Unavailable",
            message: "AI service temporarily unavailable, please try again later",
          }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }

      // Log error for monitoring
      console.error("AI generation failed:", error);

      // Handle general generation errors
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Generation failed, please try again",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // Step 6: Validate Minimum Candidate Count
    // ========================================================================
    if (candidates.length < 5) {
      console.error("Insufficient candidates generated:", candidates.length);
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Generation failed, please try again",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // Step 7: Return Success Response
    // ========================================================================
    const response: GenerateFlashcardsResponseDTO = {
      candidates,
      total_generated: candidates.length,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all error handler for unexpected errors
    console.error("Unexpected error in generate flashcards:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Generation failed, please try again",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
