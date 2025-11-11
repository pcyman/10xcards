import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client";

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = supabaseClient;

  // Retrieve session and attach to locals
  const { data: { session } } = await supabaseClient.auth.getSession();
  context.locals.session = session;

  return next();
});
