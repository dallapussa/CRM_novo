import "server-only";
import { createClient } from "@supabase/supabase-js";

export const createAdminClient = () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "https://hzmxwbxbidnvclkoozaw.supabase.co";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bXh3YnhiaWRudmNsa29vemF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1NDE4OSwiZXhwIjoyMTA2MjMwMTg5fQ.BRN2LZ9B3r-UNFoiJsZ5jv62A4WH3t5yJPTOo_vvKi8";

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};