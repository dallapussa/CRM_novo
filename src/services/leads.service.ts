import { getTenantContext } from "@/services/tenant.service";
import type { Lead } from "@/types";

export type LeadInput = Omit<Lead, "id" | "created_at" | "updated_at" | "converted_customer_id">;

const statusFromDb: Record<string, Lead["status"]> = {
  Novo: "novo",
  Contatado: "contatado",
  Qualificado: "qualificado",
  Proposta: "proposta",
  Convertido: "convertido",
  Perdido: "perdido",
};

const statusToDb: Record<Lead["status"], string> = {
  novo: "Novo",
  contatado: "Contatado",
  qualificado: "Qualificado",
  proposta: "Proposta",
  convertido: "Convertido",
  perdido: "Perdido",
};

function mapLead(row: Record<string, any>): Lead {
  return {
    id: row.id,
    name: row.nome,
    company_name: row.empresa,
    document: row.document,
    email: row.email,
    phone: row.telefone,
    source: row.origem,
    status: statusFromDb[row.status] ?? "novo",
    notes: row.observacoes,
    owner_id: row.owner_id,
    converted_customer_id: row.client_id,
    created_by: row.created_by ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function leadRow(input: Partial<LeadInput>) {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.nome = input.name;
  if (input.company_name !== undefined) row.empresa = input.company_name;
  if (input.document !== undefined) row.document = input.document;
  if (input.email !== undefined) row.email = input.email;
  if (input.phone !== undefined) row.telefone = input.phone;
  if (input.source !== undefined) row.origem = input.source;
  if (input.status !== undefined) row.status = statusToDb[input.status];
  if (input.notes !== undefined) row.observacoes = input.notes;
  if (input.owner_id !== undefined) row.owner_id = input.owner_id;
  return row;
}

export async function listLeads(): Promise<Lead[]> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("leads").select("*").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => mapLead(row));
}

export async function saveLead(input: Partial<LeadInput>, id?: string): Promise<string> {
  const { supabase, companyId, userId } = await getTenantContext();
  const row = leadRow(input);
  if (id) {
    const { error } = await supabase.from("leads").update(row).eq("company_id", companyId).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from("leads").insert({
    ...row,
    company_id: companyId,
    created_by: userId,
    owner_id: input.owner_id ?? userId,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function convertLeadToClient(id: string): Promise<string> {
  const { supabase } = await getTenantContext();
  const { data, error } = await supabase.rpc("convert_lead_to_client", { lead_id: id });
  if (error) throw error;
  return data as string;
}