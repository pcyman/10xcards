import type { APIRoute } from "astro";
import type { UpdateFlashcardCommand, DeleteFlashcardResponseDTO } from "@/types";
import { flashcardService, FlashcardServiceError, NotFoundError } from "@/lib/services/flashcard.service";
import { uuidSchema } from "@/lib/validation/deck.schemas";
import { updateFlashcardSchema } from "@/lib/validation/flashcard.schemas";

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

/**
 * PATCH /api/flashcards/:id
 *
 * Update the front and/or back text of an existing flashcard.
 * This is a partial update operation where either field can be updated independently.
 * The endpoint enforces user ownership through authentication and explicit user_id checks.
 *
 * Path Parameters:
 * @param id - UUID of the flashcard to update
 *
 * Request Body:
 * @param front - (optional) New front text (must not be empty or whitespace-only if provided)
 * @param back - (optional) New back text (must not be empty or whitespace-only if provided)
 *
 * At least one field must be provided in the request body.
 *
 * Response (200 OK):
 * Returns complete FlashcardDTO with all fields including updated content
 *
 * Error Responses:
 * - 400: Invalid UUID format or invalid JSON
 * - 401: Missing or invalid JWT token
 * - 404: Flashcard not found or not owned by user
 * - 422: Validation error (no fields provided, empty/whitespace-only content)
 * - 500: Database or server error
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
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
    // Step 3: Parse and validate request body
    // ========================================================================
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid JSON in request body",
            code: "INVALID_JSON",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validation = updateFlashcardSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            message: firstError.message,
            code: "VALIDATION_ERROR",
            field: firstError.path.join("."),
          },
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // Step 4: Call service to update flashcard
    // ========================================================================
    const command = validation.data as UpdateFlashcardCommand;

    const flashcard = await flashcardService.updateFlashcard(locals.supabase, {
      flashcardId: uuidValidation.data,
      userId: user.id,
      command,
    });

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
    // Handle FLASHCARD_NOT_FOUND error
    if (error instanceof Error && error.message === "FLASHCARD_NOT_FOUND") {
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

    // Handle FlashcardService errors
    if (error instanceof FlashcardServiceError) {
      console.error("FlashcardService error in PATCH /api/flashcards/:id:", {
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
    console.error("Unexpected error in PATCH /api/flashcards/:id:", {
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

/**
 * DELETE /api/flashcards/:id
 *
 * Permanently delete a flashcard and all its associated review history.
 * This is a destructive operation that cannot be undone.
 * The endpoint enforces user ownership through authentication and explicit user_id checks.
 * CASCADE deletion automatically removes all related review records.
 *
 * Path Parameters:
 * @param id - UUID of the flashcard to delete
 *
 * Response (200 OK):
 * Returns DeleteFlashcardResponseDTO with success message
 *
 * Error Responses:
 * - 400: Invalid UUID format
 * - 401: Missing or invalid JWT token
 * - 404: Flashcard not found or not owned by user
 * - 500: Database or server error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
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
    // Step 3: Delete flashcard via service
    // ========================================================================
    // Service verifies ownership and performs CASCADE deletion of reviews
    await flashcardService.deleteFlashcard(locals.supabase, uuidValidation.data, user.id);

    // ========================================================================
    // Step 4: Return success response
    // ========================================================================
    const response: DeleteFlashcardResponseDTO = {
      message: "Flashcard deleted successfully",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    // ========================================================================
    // Step 5: Handle service-level errors
    // ========================================================================
    // Handle NotFoundError (flashcard doesn't exist or not owned by user)
    if (error instanceof NotFoundError) {
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

    // Handle FlashcardService errors
    if (error instanceof FlashcardServiceError) {
      console.error("FlashcardService error in DELETE /api/flashcards/:id:", {
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
    console.error("Unexpected error in DELETE /api/flashcards/:id:", {
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
