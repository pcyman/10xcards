import { createClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";

import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

/**
 * Creates a per-request Supabase client with cookie-based session storage.
 * This ensures each user's session is isolated and stored in their browser cookies.
 *
 * @param cookies - Astro cookies object from the request context
 * @returns A Supabase client instance for this specific request
 */
export function createServerClient(cookies: AstroCookies) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: {
        getItem: (key: string) => {
          return cookies.get(key)?.value ?? null;
        },
        setItem: (key: string, value: string) => {
          cookies.set(key, value, {
            path: "/",
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 7 days
          });
        },
        removeItem: (key: string) => {
          cookies.delete(key, { path: "/" });
        },
      },
    },
  });
}

/**
 * @deprecated DO NOT USE - This shared client causes security issues.
 * Use createServerClient() with request cookies instead.
 */
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
