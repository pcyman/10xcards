import type { APIRoute } from 'astro';
import { handleError, ErrorCode } from '@/lib/errors/handler';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    // Get Supabase client from context
    const supabase = context.locals.supabase;

    // Get current session to extract refresh token
    const { data: { session: currentSession } } = await supabase.auth.getSession();

    if (!currentSession?.refresh_token) {
      return new Response(JSON.stringify({
        error: {
          message: 'Invalid refresh token',
          code: ErrorCode.INVALID_REFRESH_TOKEN,
        },
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: currentSession.refresh_token,
    });

    if (error) {
      return handleError(error, 'refresh');
    }

    // Return new session data
    return new Response(JSON.stringify({
      session: {
        access_token: data.session!.access_token,
        refresh_token: data.session!.refresh_token,
        expires_at: data.session!.expires_at,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return handleError(error, 'refresh');
  }
};
