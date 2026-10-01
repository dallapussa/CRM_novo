import { createClient } from "@/lib/supabase";
import type { Profile, UserRole } from "@/types";

export interface AdminCreateUserInput {
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
}

export interface AdminCreateUserResult {
  profile: Profile;
  temporaryPassword: string;
}

const appRoleByDatabaseRole: Record<string, UserRole> = {
  Admin: "admin",
  Comercial: "comercial",
  "Técnico": "tecnico",
  Financeiro: "financeiro",
  Cliente: "cliente",
  Terceiro: "terceiro",
};

const databaseRoleByAppRole: Record<UserRole, string> = {
  admin: "Admin",
  comercial: "Comercial",
  tecnico: "Técnico",
  financeiro: "Financeiro",
  cliente: "Cliente",
  terceiro: "Terceiro",
};

function mapUserProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    email: typeof row.email === "string" ? row.email : null,
    full_name: String(row.nome ?? ""),
    role: appRoleByDatabaseRole[String(row.role)] ?? "cliente",
    phone: typeof row.telefone === "string" ? row.telefone : null,
    is_active: row.ativo !== false,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

export async function listUsers(): Promise<Profile[]> {
  const { data, error } = await createClient().from("user_profiles").select("*").order("nome", { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => mapUserProfile(row));
}

export async function createUser(input: AdminCreateUserInput): Promise<AdminCreateUserResult> {
  const { data, error } = await createClient().functions.invoke("admin-create-user", {
    body: {
      email: input.email,
      nome: input.full_name,
      role: databaseRoleByAppRole[input.role],
      telefone: input.phone ?? null,
    },
  });
  if (error) throw error;
  return {
    profile: mapUserProfile(data.profile as Record<string, unknown>),
    temporaryPassword: data.temporaryPassword as string,
  };
}

export async function updateUser(id: string, patch: Partial<Profile>): Promise<void> {
  const databasePatch: Record<string, unknown> = {};
  if (patch.full_name !== undefined) databasePatch.nome = patch.full_name;
  if (patch.role !== undefined) databasePatch.role = databaseRoleByAppRole[patch.role];
  if (patch.phone !== undefined) databasePatch.telefone = patch.phone;
  if (patch.is_active !== undefined) databasePatch.ativo = patch.is_active;
  if (Object.keys(databasePatch).length === 0) return;
  const { error } = await createClient().from("user_profiles").update(databasePatch).eq("id", id);
  if (error) throw error;
}

export async function setUserActive(id: string, is_active: boolean): Promise<void> {
  await updateUser(id, { is_active });
}

export async function getUserProfile(id: string): Promise<Profile | null> {
  const { data, error } = await createClient().from("user_profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapUserProfile(data) : null;
}

export async function saveOwnProfile(profile: Profile): Promise<void> {
  const { error } = await createClient().from("user_profiles").update({
    nome: profile.full_name,
    telefone: profile.phone ?? null,
  }).eq("id", profile.id);
  if (error) throw error;
}