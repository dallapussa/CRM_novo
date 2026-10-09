import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const defaultSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  process.env.VITE_SUPABASE_URL?.trim() ||
  "https://hzmxwbxbidnvclkoozaw.supabase.co";

const defaultSupabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bXh3YnhiaWRudmNsa29vemF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NTQxODksImV4cCI6MjEwNjIzMDE4OX0.AHJjEaO2sV5KMKpzc_mv9gqsrTSjxhlw0CL2bZZMIcg";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(defaultSupabaseUrl, defaultSupabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (_error) {
          // Server component: ignore
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch (_error) {
          // Server component: ignore
        }
      },
    },
  });
}
