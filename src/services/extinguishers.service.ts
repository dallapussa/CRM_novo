import { getTenantContext } from "@/services/tenant.service";
import type { Extinguisher } from "@/types";

export type ExtinguisherInput = Omit<Extinguisher, "id" | "created_at" | "updated_at" | "customer">;

function mapExtinguisher(row: Record<string, any>): Extinguisher {
  const tipoCapacidade = row.tipo_capacidade || "";
  const parts = tipoCapacidade.split("-").map((s: string) => s.trim());
  const fallbackTipo = parts[0] || row.tipo || "Pó Químico ABC";
  const fallbackCap = parts[1] || row.capacidade || "4kg";

  return {
    id: row.id,
    customer_id: row.client_id,
    type: row.tipo || fallbackTipo,
    capacity: row.capacidade || fallbackCap,
    serial_number: row.identificacao || row.numero_serie || row.patrimonio || "",
    manufacturer: row.fabricante || "Nacional",
    manufacturing_date: row.data_fabricacao || row.manufactured_at,
    last_recharge_date: row.data_ultima_recarga || row.ultima_recarga || row.last_recharge_at,
    expiration_date: row.data_vencimento || row.validade || row.carga_validade || row.expires_at || "",
    next_inspection_date: row.proxima_inspecao || row.next_inspection_at,
    location: row.localizacao,
    notes: row.observacoes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer: row.client ? { id: row.client.id, name: row.client.razao_social || row.client.name } : null,
  };
}

function extinguisherRow(input: Partial<ExtinguisherInput>) {
  const row: Record<string, unknown> = {};
  if (input.customer_id !== undefined) row.client_id = input.customer_id;
  
  const tipoCap = [input.type, input.capacity].filter(Boolean).join(" - ");
  if (tipoCap) row.tipo_capacidade = tipoCap;
  if (input.type !== undefined) row.tipo = input.type;
  if (input.capacity !== undefined) row.capacidade = input.capacity;
  
  if (input.serial_number !== undefined) {
    row.identificacao = input.serial_number;
  }
  if (input.location !== undefined) row.localizacao = input.location;
  if (input.last_recharge_date !== undefined) {
    row.data_ultima_recarga = input.last_recharge_date || null;
  }
  if (input.expiration_date !== undefined) {
    row.data_vencimento = input.expiration_date || null;
  }
  if (input.notes !== undefined) row.observacoes = input.notes;
  return row;
}

export async function listExtinguishers(): Promise<Extinguisher[]> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("extintores")
    .select("*,client:client_id!inner(id,razao_social,company_id)")
    .eq("client.company_id", companyId)
    .order("created_at", { ascending: false });
    
  if (error) {
    const { data: raw, error: rawErr } = await supabase.from("extintores").select("*").order("created_at", { ascending: false });
    if (rawErr) throw rawErr;
    return (raw || []).map((row) => mapExtinguisher(row));
  }
  return (data || []).map((row) => mapExtinguisher(row));
}

export async function saveExtinguisher(input: ExtinguisherInput, id?: string): Promise<string> {
  const { supabase, companyId } = await getTenantContext();
  const row = extinguisherRow(input);
  const { data: client, error: clientError } = await supabase.from("clients").select("id").eq("id", input.customer_id).eq("company_id", companyId).is("deleted_at", null).single();
  if (clientError || !client) throw new Error("Cliente não encontrado nesta empresa.");
  
  if (id) {
    const { error } = await supabase.from("extintores").update(row).eq("id", id).eq("client_id", input.customer_id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from("extintores").insert({
    ...row,
    valor_servico: 45.0,
    status: "no_cliente",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function deleteExtinguisher(id: string): Promise<void> {
  const { supabase } = await getTenantContext();
  const { error } = await supabase
    .from("extintores")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getExtinguisher(id: string): Promise<Extinguisher> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("extintores").select("*,client:client_id!inner(id,razao_social,company_id)")
    .eq("id", id).eq("client.company_id", companyId).single();
  if (error) {
    const { data: fallback, error: fbErr } = await supabase.from("extintores").select("*").eq("id", id).single();
    if (fbErr) throw fbErr;
    return mapExtinguisher(fallback);
  }
  return mapExtinguisher(data);
}