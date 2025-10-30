import type { APIRoute } from "astro";
import { z } from "zod";
import type { CreateDeckCommand, DeckListQueryParams } from "@/types";
import { deckService, DeckServiceError } from "@/lib/services/deck.service";

// Disable prerendering for this dynamic API route
export const prerender = false;

/**
 * Validation schema for query parameters
 */
const queryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["created_at", "updated_at", "name"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Validation schema for creating a deck
 */
const createDeckSchema = z.object({
  name: z
    .string()
    .min(1, "Deck name is required")
    .max(255, "Deck name must not exceed 255 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Deck name cannot be empty or whitespace-only",
    }),
});

/**
 * GET /api/decks
 *
 * List all decks belonging to the authenticated user with pagination
 *
 * Query Parameters:
 * @param page - Page number (default: 1, min: 1)
 * @param limit - Items per page (default: 20, min: 1, max: 100)
 * @param sort - Sort field (default: 'created_at', options: 'created_at' | 'updated_at' | 'name')
 * @param order - Sort order (default: 'desc', options: 'asc' | 'desc')
 *
 * @returns Paginated list of decks with statistics
 */
export const GET: APIRoute = async ({ request, locals, url }) => {
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
    // Step 2: Validate Query Parameters
    // ========================================================================
    const queryParams = Object.fromEntries(url.searchParams);
    const validationResult = queryParamsSchema.safeParse(queryParams);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid query parameters",
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // Step 3: Call Service to List Decks
    // ========================================================================
    const result = await deckService.listDecks(locals.supabase, user.id, validationResult.data as DeckListQueryParams);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ========================================================================
    // Step 4: Error Handling
    // ========================================================================
    if (error instanceof DeckServiceError) {
      console.error("DeckService error in GET /api/decks:", {
        message: error.message,
        error,
      });

      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to retrieve decks",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/decks:", error);

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
 * POST /api/decks
 *
 * Create a new deck for the authenticated user
 *
 * Request Body:
 * @param name - Deck name (1-255 characters, non-empty, no whitespace-only)
 *
 * @returns Created deck with initial statistics (201 Created)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // ========================================================================
    // Step 1: Authentication
    // ========================================================================
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // Step 2: Parse and Validate Request Body
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

    const result = createDeckSchema.safeParse(body);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: result.error.errors[0].message,
          details: result.error.errors,
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // Step 3: Create Deck via Service
    // ========================================================================
    const command: CreateDeckCommand = result.data;
    const deck = await deckService.createDeck(locals.supabase, user.id, command);

    // ========================================================================
    // Step 4: Return Created Deck
    // ========================================================================
    return new Response(JSON.stringify(deck), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ========================================================================
    // Step 5: Error Handling
    // ========================================================================
    if (error instanceof Error) {
      // Handle duplicate deck name
      if (error.message === "DECK_NAME_EXISTS") {
        return new Response(
          JSON.stringify({
            error: "Conflict",
            message: "A deck with this name already exists",
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }

      // Handle invalid deck name (check constraint)
      if (error.message === "INVALID_DECK_NAME") {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Deck name cannot be empty or whitespace-only",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Handle DeckService errors
    if (error instanceof DeckServiceError) {
      console.error("DeckService error in POST /api/decks:", {
        message: error.message,
        error,
      });

      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to create deck",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Catch-all for unexpected errors
    console.error("Unexpected error in POST /api/decks:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
