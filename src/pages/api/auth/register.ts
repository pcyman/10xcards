import type { APIRoute } from 'astro';
import { registerSchema } from '@/lib/validation/auth.schemas';
import { validateRequest, createValidationErrorResponse } from '@/lib/validation/validator';
import { handleError } from '@/lib/errors/handler';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    // Validate request body
    const validation = await validateRequest(context, registerSchema);

    if (!validation.success) {
      return createValidationErrorResponse(validation.errors!);
    }

    const { email, password } = validation.data!;

    // Get Supabase client from context
    const supabase = context.locals.supabase;

    // Attempt to create user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, // No email confirmation
      },
    });

    if (error) {
      return handleError(error, 'register');
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
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return handleError(error, 'register');
  }
};
