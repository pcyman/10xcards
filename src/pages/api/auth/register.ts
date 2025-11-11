import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { registerSchema } from "@/lib/validation/auth.schemas";
import { validateRequest, createValidationErrorResponse } from "@/lib/validation/validator";
import { handleError } from "@/lib/errors/handler";
import type { Database } from "@/db/database.types";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    // Validate request body
    const validation = await validateRequest(context, registerSchema);

    if (!validation.success) {
      return createValidationErrorResponse(validation.errors!);
    }

    const { email, password } = validation.data!;

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

    // Attempt to create user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, // No email confirmation
      },
    });

    if (error) {
      return handleError(error, "register");
    }

    // Return success response with user info and session tokens
    return new Response(
      JSON.stringify({
        user: {
          id: data.user!.id,
          email: data.user!.email,
        },
        session: {
          access_token: data.session!.access_token,
          refresh_token: data.session!.refresh_token,
          expires_at: data.session!.expires_at!,
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleError(error, "register");
  }
};
