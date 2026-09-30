import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { Profile, UserRole } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let profileData = null;
  try {
    const res = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profileData = res.data;
  } catch (_) {
    profileData = null;
  }

  let profile: Profile;

  if (!profileData) {
    profile = {
      id: user.id,
      role: ((user.user_metadata?.role as UserRole) || "cliente"),
      full_name:
        (user.user_metadata?.full_name as string) ||
        (user.email as string) ||
        "Usuário",
      is_active: true,
    };
  } else {
    profile = profileData as Profile;
  }

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
