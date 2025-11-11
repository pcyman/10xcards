import { defineMiddleware } from "astro:middleware";

import { createServerClient } from "../db/supabase.client";

export const onRequest = defineMiddleware(async (context, next) => {
  // Create a per-request Supabase client using cookies
  // This ensures each user has their own isolated session
  context.locals.supabase = createServerClient(context.cookies);

  // Retrieve session from this user's cookies
  const {
    data: { session },
  } = await context.locals.supabase.auth.getSession();
  context.locals.session = session;

  return next();
});
