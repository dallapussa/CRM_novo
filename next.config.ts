import type { NextConfig } from "next";

const env: Record<string, string> = {};
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl) env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
if (supabaseAnonKey) env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey;

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