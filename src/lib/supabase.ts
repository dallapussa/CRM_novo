import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  process.env.VITE_SUPABASE_URL?.trim() ||
  "https://hzmxwbxbidnvclkoozaw.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bXh3YnhiaWRudmNsa29vemF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NTQxODksImV4cCI6MjEwNjIzMDE4OX0.AHJjEaO2sV5KMKpzc_mv9gqsrTSjxhlw0CL2bZZMIcg";

export const createClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};