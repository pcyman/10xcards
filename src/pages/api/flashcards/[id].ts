import type { APIRoute } from "astro";
import { flashcardService, FlashcardServiceError } from "@/lib/services/flashcard.service";
import { uuidSchema } from "@/lib/validation/deck.schemas";

// Disable prerendering for this dynamic API route
export const prerender = false;

/**
 * GET /api/flashcards/:id
 *
 * Retrieve detailed information about a specific flashcard by its UUID.
 * Returns all flashcard data including content (front/back), spaced repetition metadata, and timestamps.
 * The endpoint enforces user ownership through authentication and Row Level Security (RLS) policies.
 *
 * Path Parameters:
 * @param id - UUID of the flashcard to retrieve
 *
 * Response (200 OK):
 * Returns FlashcardDTO with all flashcard fields except user_id
 *
 * Error Responses:
 * - 400: Invalid UUID format
 * - 401: Missing or invalid JWT token
 * - 404: Flashcard not found or not owned by user
 * - 500: Database or server error
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // ========================================================================
    // Step 1: Authentication
    // ========================================================================
    // Check if user is authenticated via session (set by middleware)
    if (!locals.session) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid or expired authentication token",
            code: "UNAUTHORIZED",
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get user from Supabase to ensure session is valid
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid or expired authentication token",
            code: "UNAUTHORIZED",
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // Step 2: Validate flashcard ID
    // ========================================================================
    const { id } = params;
    const uuidValidation = uuidSchema.safeParse(id);

    if (!uuidValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid flashcard ID format",
            code: "INVALID_UUID",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // Step 3: Fetch flashcard via service
    // ========================================================================
    // Service uses RLS to automatically filter by user_id
    const flashcard = await flashcardService.getFlashcardById(locals.supabase, uuidValidation.data);

    // ========================================================================
    // Step 4: Handle not found
    // ========================================================================
    // Return 404 if flashcard doesn't exist or user doesn't own it
    // This prevents flashcard ID enumeration by returning same error for both cases
    if (!flashcard) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Flashcard not found",
            code: "FLASHCARD_NOT_FOUND",
          },
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // Step 5: Return success response
    // ========================================================================
    return new Response(JSON.stringify(flashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ========================================================================
    // Step 6: Handle service-level errors
    // ========================================================================
    // Handle FlashcardService errors
    if (error instanceof FlashcardServiceError) {
      console.error("FlashcardService error in GET /api/flashcards/:id:", {
        timestamp: new Date().toISOString(),
        userId: locals.session?.user?.id ?? "unknown",
        flashcardId: params.id,
        message: error.message,
        error,
      });

      return new Response(
        JSON.stringify({
          error: {
            message: "An unexpected error occurred",
            code: "INTERNAL_SERVER_ERROR",
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Log unexpected errors
    console.error("Unexpected error in GET /api/flashcards/:id:", {
      timestamp: new Date().toISOString(),
      userId: locals.session?.user?.id ?? "unknown",
      flashcardId: params.id,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });

    // Return generic error
    return new Response(
      JSON.stringify({
        error: {
          message: "An unexpected error occurred",
          code: "INTERNAL_SERVER_ERROR",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
