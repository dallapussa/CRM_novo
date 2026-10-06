import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const defaultSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://hzmxwbxbidnvclkoozaw.supabase.co";

const defaultSupabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bXh3YnhiaWRudmNsa29vemF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NTQxODksImV4cCI6MjEwNjIzMDE4OX0.AHJjEaO2sV5KMKpzc_mv9gqsrTSjxhlw0CL2bZZMIcg";

export function createClient() {
  return createServerClient(defaultSupabaseUrl, defaultSupabaseAnonKey, {
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
  });
}
