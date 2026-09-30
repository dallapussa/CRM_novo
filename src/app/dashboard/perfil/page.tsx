import { createClient } from "@/lib/supabase/server";
import { ProfilePageClient } from "./profile-page-client";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) return null;
    return data as Profile;
  } catch {
    return null;
  }
}

export default async function PerfilPage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const email = user?.email || "seu@email.com";
  const profile = user ? await getProfile(user.id) : null;

  return <ProfilePageClient profile={profile} userEmail={email} />;
}
