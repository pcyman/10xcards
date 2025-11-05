import type { APIRoute } from 'astro';
import { loginSchema } from '@/lib/validation/auth.schemas';
import { validateRequest, createValidationErrorResponse } from '@/lib/validation/validator';
import { handleError } from '@/lib/errors/handler';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    // Validate request body
    const validation = await validateRequest(context, loginSchema);

    if (!validation.success) {
      return createValidationErrorResponse(validation.errors!);
    }

    const { email, password } = validation.data!;

    // Get Supabase client from context
    const supabase = context.locals.supabase;

    // Attempt to authenticate
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return handleError(error, 'login');
    }

    // Return success response with user and session
    return new Response(JSON.stringify({
      user: {
        id: data.user!.id,
        email: data.user!.email,
      },
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
    return handleError(error, 'login');
  }
};
