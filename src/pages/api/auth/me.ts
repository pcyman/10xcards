import type { APIRoute } from 'astro';
import { handleError, ErrorCode } from '@/lib/errors/handler';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    // Check if user is authenticated (via middleware)
    const user = context.locals.user;

    if (!user) {
      return new Response(JSON.stringify({
        error: {
          message: 'Not authenticated',
          code: ErrorCode.UNAUTHORIZED,
        },
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get Supabase client from context
    const supabase = context.locals.supabase;

    // Get full user data from Supabase
    const { data: { user: fullUser }, error } = await supabase.auth.getUser();

    if (error || !fullUser) {
      return handleError(error, 'me');
    }

    // Return sanitized user data
    return new Response(JSON.stringify({
      user: {
        id: fullUser.id,
        email: fullUser.email,
        created_at: fullUser.created_at,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return handleError(error, 'me');
  }
};
