import { createClient } from "@/lib/supabase";
import type { Profile, UserRole } from "@/types";

export interface AdminCreateUserInput {
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  client_id?: string | null;
  company_id?: string | null;
}

export interface AdminCreateUserResult {
  profile: Profile;
  temporaryPassword: string;
}

const appRoleByDatabaseRole: Record<string, UserRole> = {
  Admin: "admin",
  Comercial: "comercial",
  "Técnico": "tecnico",
  Tecnico: "tecnico",
  Financeiro: "financeiro",
  Cliente: "cliente",
  Terceiro: "terceiro",
};

const databaseRoleByAppRole: Record<UserRole, string> = {
  admin: "Admin",
  comercial: "Comercial",
  tecnico: "Tecnico",
  financeiro: "Financeiro",
  cliente: "Cliente",
  terceiro: "Terceiro",
};

function mapUserProfile(row: Record<string, unknown>): Profile {
  const clientObj = row.clients as Record<string, unknown> | null | undefined;
  const clientName = clientObj
    ? String(clientObj.razao_social || clientObj.nome_fantasia || "")
    : undefined;
  const companyObj = row.companies as Record<string, unknown> | null | undefined;
  const companyName = companyObj
    ? String(companyObj.nome || "")
    : undefined;

  return {
    id: String(row.id),
    email: typeof row.email === "string" ? row.email : null,
    full_name: String(row.nome ?? ""),
    role: appRoleByDatabaseRole[String(row.role)] ?? "cliente",
    phone: typeof row.telefone === "string" ? row.telefone : null,
    is_active: row.ativo !== false,
    client_id: typeof row.client_id === "string" ? row.client_id : null,
    company_id: typeof row.company_id === "string" ? row.company_id : null,
    client_name: clientName || undefined,
    company_name: companyName || undefined,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

export async function listUsers(): Promise<Profile[]> {
  try {
    const { data, error } = await createClient()
      .from("user_profiles")
      .select("*, clients:clients!user_profiles_client_id_fkey(id, razao_social, nome_fantasia), companies(id, nome)")
      .is("deleted_at", null)
      .order("nome", { ascending: true });
    if (!error && data) {
      return data.map((row) => mapUserProfile(row));
    }
  } catch (err) {
    console.warn("Aviso ao buscar usuários com join, usando fallback:", err);
  }

  // Fallback se o join falhar
  const { data: fallbackData, error: fbErr } = await createClient()
    .from("user_profiles")
    .select("*")
    .is("deleted_at", null)
    .order("nome", { ascending: true });
  if (fbErr) throw fbErr;
  return (fallbackData || []).map((row) => mapUserProfile(row));
}

export async function createUser(input: AdminCreateUserInput): Promise<AdminCreateUserResult> {
  const dbRole = databaseRoleByAppRole[input.role] || input.role;

  // 1. Cria via API do servidor (Service Role segura no Next.js)
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: input.email,
        nome: input.full_name,
        role: dbRole,
        telefone: input.phone ?? null,
        client_id: input.client_id ?? null,
        company_id: input.company_id ?? null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        profile: mapUserProfile(data.profile as Record<string, unknown>),
        temporaryPassword: data.temporaryPassword as string,
      };
    }

    const errorPayload = await res.json().catch(() => ({}));
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new Error(errorPayload.error || "Erro ao criar usuário.");
    }
  } catch (err: any) {
    if (err.message && !err.message.includes("fetch")) {
      throw err;
    }
  }

  // 2. Fallback para Supabase Edge Function se necessário
  const { data, error } = await createClient().functions.invoke("admin-create-user", {
    body: {
      email: input.email,
      nome: input.full_name,
      role: dbRole,
      telefone: input.phone ?? null,
      client_id: input.client_id ?? null,
      company_id: input.company_id ?? null,
    },
  });
  if (error) throw error;
  return {
    profile: mapUserProfile(data.profile as Record<string, unknown>),
    temporaryPassword: data.temporaryPassword as string,
  };
}

export async function updateUser(id: string, patch: Partial<Profile>): Promise<void> {
  // 1. Tenta atualizar pela API segura de administração
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const res = await fetch("/api/admin/update-user", {
      method: "POST",
      headers,
      body: JSON.stringify({
        id,
        nome: patch.full_name,
        role: patch.role ? (databaseRoleByAppRole[patch.role] || patch.role) : undefined,
        telefone: patch.phone,
        ativo: patch.is_active,
        client_id: patch.client_id !== undefined ? (patch.client_id || null) : undefined,
        company_id: patch.company_id !== undefined ? (patch.company_id || null) : undefined,
      }),
    });

    if (res.ok) {
      return;
    }
  } catch (err) {
    // Continua para fallback direto no Supabase
  }

  // 2. Fallback direto no Supabase
  const databasePatch: Record<string, unknown> = {};
  if (patch.full_name !== undefined) databasePatch.nome = patch.full_name;
  if (patch.role !== undefined) databasePatch.role = databaseRoleByAppRole[patch.role];
  if (patch.phone !== undefined) databasePatch.telefone = patch.phone;
  if (patch.is_active !== undefined) databasePatch.ativo = patch.is_active;
  if (patch.client_id !== undefined) databasePatch.client_id = patch.client_id || null;
  if (patch.company_id !== undefined) databasePatch.company_id = patch.company_id || null;
  if (Object.keys(databasePatch).length === 0) return;
  const { error } = await createClient().from("user_profiles").update(databasePatch).eq("id", id);
  if (error) throw error;
}

export async function setUserActive(id: string, is_active: boolean): Promise<void> {
  await updateUser(id, { is_active });
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await createClient()
    .from("user_profiles")
    .update({
      ativo: false,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function getUserProfile(id: string): Promise<Profile | null> {
  try {
    const { data, error } = await createClient()
      .from("user_profiles")
      .select("*, clients:clients!user_profiles_client_id_fkey(id, razao_social, nome_fantasia), companies(id, nome)")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!error && data) {
      return mapUserProfile(data);
    }
  } catch (err) {
    console.warn("Aviso ao buscar perfil com join, usando fallback:", err);
  }

  const { data: fallback, error: fbErr } = await createClient()
    .from("user_profiles")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (fbErr) throw fbErr;
  return fallback ? mapUserProfile(fallback) : null;
}

export async function saveOwnProfile(profile: Profile): Promise<void> {
  const { error } = await createClient().from("user_profiles").update({
    nome: profile.full_name,
    telefone: profile.phone ?? null,
  }).eq("id", profile.id);
  if (error) throw error;
}