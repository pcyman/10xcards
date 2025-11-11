import type { APIRoute } from "astro";
import { handleError, ErrorCode } from "@/lib/errors/handler";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    // Get per-request Supabase client from context (uses cookies)
    const supabase = context.locals.supabase;

    // Get current session from cookies to extract refresh token
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession?.refresh_token) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid refresh token",
            code: ErrorCode.INVALID_REFRESH_TOKEN,
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Refresh the session - this automatically updates cookies
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: currentSession.refresh_token,
    });

    if (error) {
      return handleError(error, "refresh");
    }

    // Return success - session is automatically stored in cookies
    return new Response(
      JSON.stringify({
        message: "Session refreshed successfully",
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
