import type { APIRoute } from 'astro';
import { handleError, ErrorCode } from '@/lib/errors/handler';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    // Check if user is authenticated
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

    // Sign out (this will clear cookies via the storage adapter)
    const { error } = await supabase.auth.signOut();

    if (error) {
      // Log error but still clear cookies
      console.error('[logout] Supabase signOut error:', error);
    }

    // Return success response
    return new Response(JSON.stringify({
      message: 'Logged out successfully',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return handleError(error, 'logout');
  }
};
