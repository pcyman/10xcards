import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { handleError, ErrorCode } from "@/lib/errors/handler";
import type { Database } from "@/db/database.types";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    // Parse request body to get refresh token
    let body: { refresh_token?: string };
    try {
      body = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid JSON in request body",
            code: ErrorCode.VALIDATION_ERROR,
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { refresh_token } = body;

    if (!refresh_token) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Refresh token is required",
            code: ErrorCode.INVALID_REFRESH_TOKEN,
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create a standalone Supabase client (not using cookies)
    const supabase = createClient<Database>(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_KEY,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      return handleError(error, "refresh");
    }

    // Return new session tokens
    return new Response(
      JSON.stringify({
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at!,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleError(error, "refresh");
  }
};
