import type { APIRoute } from "astro";
import { loginSchema } from "@/lib/validation/auth.schemas";
import { validateRequest, createValidationErrorResponse } from "@/lib/validation/validator";
import { handleError } from "@/lib/errors/handler";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    // Validate request body
    const validation = await validateRequest(context, loginSchema);

    if (!validation.success) {
      return createValidationErrorResponse(validation.errors!);
    }

    const { email, password } = validation.data!;

    // Get per-request Supabase client from context (uses cookies)
    const supabase = context.locals.supabase;

    // Attempt to authenticate - this automatically sets session in cookies
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return handleError(error, "login");
    }

    // Return success response with user info
    // Session is automatically stored in HTTP-only cookies (secure)
    return new Response(
      JSON.stringify({
        user: {
          id: data.user!.id,
          email: data.user!.email,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleError(error, "login");
  }
};
