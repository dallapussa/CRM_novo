import type { NextConfig } from "next";

const DEFAULT_SUPABASE_URL = "https://hzmxwbxbidnvclkoozaw.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bXh3YnhiaWRudmNsa29vemF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NTQxODksImV4cCI6MjEwNjIzMDE4OX0.AHJjEaO2sV5KMKpzc_mv9gqsrTSjxhlw0CL2bZZMIcg";

const env: Record<string, string> = {};
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? DEFAULT_SUPABASE_ANON_KEY;

env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey;

const nextConfig: NextConfig = {
  env,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;