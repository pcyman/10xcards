import { defineMiddleware } from "astro:middleware";

import { createClientWithToken } from "../db/supabase.client";

export const onRequest = defineMiddleware(async (context, next) => {
  // Extract JWT token from Authorization header
  const authHeader = context.request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (token) {
    // Create a Supabase client with the JWT token
    context.locals.supabase = createClientWithToken(token);

    // Validate the token and get the user
    const {
      data: { user },
      error,
    } = await context.locals.supabase.auth.getUser();

    if (!error && user) {
      // Create a session object for backwards compatibility
      context.locals.session = {
        access_token: token,
        user,
      } as any;
    } else {
      context.locals.session = null;
    }
  } else {
    // No token provided - set session to null
    context.locals.supabase = null as any;
    context.locals.session = null;
  }

  return next();
});
