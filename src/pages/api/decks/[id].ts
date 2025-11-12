import type { APIRoute } from "astro";
import type { UpdateDeckCommand } from "@/types";
import { deckService, DeckServiceError } from "@/lib/services/deck.service";
import { updateDeckSchema, uuidSchema } from "@/lib/validation/deck.schemas";

// Disable prerendering for this dynamic API route
export const prerender = false;

/**
 * PATCH /api/decks/:id
 *
 * Update an existing deck name for the authenticated user
 *
 * Path Parameters:
 * @param id - UUID of the deck to update
 *
 * Request Body:
 * @param name - New deck name (1-255 characters, non-empty, no whitespace-only)
 *
 * @returns Updated deck with computed statistics (200 OK)
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

    // Get user from Supabase
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
    // Step 2: Validate deck ID
    // ========================================================================
    const { id } = params;
    const uuidValidation = uuidSchema.safeParse(id);

    if (!uuidValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid deck ID format",
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

    const validation = updateDeckSchema.safeParse(body);

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
    // Step 4: Update deck via service
    // ========================================================================
    const command: UpdateDeckCommand = validation.data;
    const updatedDeck = await deckService.updateDeck(locals.supabase, user.id, uuidValidation.data, command);

    // ========================================================================
    // Step 5: Return success response
    // ========================================================================
    return new Response(JSON.stringify(updatedDeck), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ========================================================================
    // Step 6: Handle service-level errors
    // ========================================================================
    if (error instanceof Error) {
      // Handle deck not found or unauthorized access
      if (error.message === "DECK_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: {
              message: "Deck not found",
              code: "DECK_NOT_FOUND",
            },
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle duplicate deck name
      if (error.message === "DUPLICATE_DECK_NAME") {
        return new Response(
          JSON.stringify({
            error: {
              message: "A deck with this name already exists",
              code: "DUPLICATE_DECK_NAME",
            },
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Handle DeckService errors
    if (error instanceof DeckServiceError) {
      console.error("DeckService error in PATCH /api/decks/:id:", {
        timestamp: new Date().toISOString(),
        userId: locals.session?.user?.id ?? "unknown",
        deckId: params.id,
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
    console.error("Unexpected error in PATCH /api/decks/:id:", {
      timestamp: new Date().toISOString(),
      userId: locals.session?.user?.id ?? "unknown",
      deckId: params.id,
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
