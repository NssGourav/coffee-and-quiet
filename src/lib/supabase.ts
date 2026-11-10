import "server-only";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export function authConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
export async function authClient() {
  if (!authConfigured()) throw new Error("Sign-in service is not configured");
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            for (const { name, value, options } of values)
              jar.set(name, value, options);
          } catch {
            /* Server components cannot write; proxy refreshes cookies. */
          }
        },
      },
    },
  );
}
// Deduplicate identity verification within one server render, never across users
// or requests. API handlers still verify the user on each call.
export const currentUser = cache(async () => {
  if (!authConfigured()) return null;
  const client = await authClient();
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
});
