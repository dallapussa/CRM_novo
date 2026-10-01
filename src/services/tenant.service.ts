import { createClient } from "@/lib/supabase";

export async function getTenantContext() {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Usuário não autenticado.");

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .is("deleted_at", null)
    .single();
  if (profileError) throw profileError;
  if (!profile.company_id) {
    throw new Error("Sua conta ainda não está vinculada a uma empresa. Peça ao administrador para concluir a configuração.");
  }

  return { supabase, userId: authData.user.id, companyId: profile.company_id as string };
}