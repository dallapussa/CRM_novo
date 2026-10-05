import { getTenantContext } from "@/services/tenant.service";
import type { AgendaEvent } from "@/types";

export interface AgendaEventInput {
  client_id?: string | null;
  service_order_id?: string | null;
  assigned_to?: string | null;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
}

function mapAgendaEvent(row: Record<string, any>): AgendaEvent {
  return {
    id: row.id,
    company_id: row.company_id,
    client_id: row.client_id,
    service_order_id: row.service_order_id,
    assigned_to: row.assigned_to,
    title: row.titulo || row.title,
    description: row.descricao || row.description,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    location: row.location,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listAgendaEvents(): Promise<AgendaEvent[]> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase
    .from("agenda_events")
    .select("*")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapAgendaEvent);
}

export async function saveAgendaEvent(input: AgendaEventInput, id?: string): Promise<string> {
  const { supabase, companyId, userId } = await getTenantContext();

  const row = {
    company_id: companyId,
    client_id: input.client_id || null,
    service_order_id: input.service_order_id || null,
    assigned_to: input.assigned_to || null,
    titulo: input.title,
    descricao: input.description || null,
    starts_at: input.starts_at,
    ends_at: input.ends_at || null,
    location: input.location || null,
  };

  if (id) {
    const { error } = await supabase
      .from("agenda_events")
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) throw error;
    return id;
  }

  const { data, error } = await supabase
    .from("agenda_events")
    .insert({ ...row, created_by: userId })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function deleteAgendaEvent(id: string): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  const { error } = await supabase
    .from("agenda_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", id);

  if (error) throw error;
}
