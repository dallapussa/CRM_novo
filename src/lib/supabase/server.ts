import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  return createServerClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        async get(name: string) {
          return (await cookies()).get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            (await cookies()).set({ name, value, ...options });
          } catch (_error) {
            // Server component: ignore
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            (await cookies()).set({ name, value: "", ...options });
          } catch (_error) {
            // Server component: ignore
          }
        },
      },
    }
  );
}
