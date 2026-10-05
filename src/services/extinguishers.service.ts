import { getTenantContext } from "@/services/tenant.service";
import type { Extinguisher } from "@/types";

export type ExtinguisherInput = Omit<Extinguisher, "id" | "created_at" | "updated_at" | "customer">;

function mapExtinguisher(row: Record<string, any>): Extinguisher {
  return {
    id: row.id,
    customer_id: row.client_id,
    type: row.tipo,
    capacity: row.capacidade,
    serial_number: row.numero_serie || row.patrimonio || "",
    manufacturer: row.fabricante,
    manufacturing_date: row.data_fabricacao || row.manufactured_at,
    last_recharge_date: row.ultima_recarga || row.last_recharge_at,
    expiration_date: row.validade || row.carga_validade || row.expires_at || "",
    next_inspection_date: row.proxima_inspecao || row.next_inspection_at,
    location: row.localizacao,
    notes: row.observacoes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer: row.client ? { id: row.client.id, name: row.client.razao_social } : null,
  };
}

function extinguisherRow(input: Partial<ExtinguisherInput>) {
  const row: Record<string, unknown> = {};
  if (input.customer_id !== undefined) row.client_id = input.customer_id;
  if (input.type !== undefined) row.tipo = input.type;
  if (input.capacity !== undefined) row.capacidade = input.capacity;
  if (input.serial_number !== undefined) {
    row.numero_serie = input.serial_number;
    row.patrimonio = input.serial_number;
  }
  if (input.manufacturer !== undefined) row.fabricante = input.manufacturer;
  if (input.manufacturing_date !== undefined) row.data_fabricacao = input.manufacturing_date || null;
  if (input.last_recharge_date !== undefined) row.ultima_recarga = input.last_recharge_date || null;
  if (input.expiration_date !== undefined) {
    row.validade = input.expiration_date;
    row.carga_validade = input.expiration_date;
  }
  if (input.next_inspection_date !== undefined) row.proxima_inspecao = input.next_inspection_date || null;
  if (input.location !== undefined) row.localizacao = input.location;
  if (input.notes !== undefined) row.observacoes = input.notes;
  return row;
}

export async function listExtinguishers(): Promise<Extinguisher[]> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("extinguishers")
    .select("*,client:client_id!inner(id,razao_social,company_id)")
    .eq("client.company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => mapExtinguisher(row));
}

export async function saveExtinguisher(input: ExtinguisherInput, id?: string): Promise<string> {
  const { supabase, companyId, userId } = await getTenantContext();
  const row = extinguisherRow(input);
  const { data: client, error: clientError } = await supabase.from("clients").select("id").eq("id", input.customer_id).eq("company_id", companyId).is("deleted_at", null).single();
  if (clientError || !client) throw new Error("Cliente não encontrado nesta empresa.");
  if (id) {
    const { error } = await supabase.from("extinguishers").update(row).eq("id", id).eq("client_id", input.customer_id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from("extinguishers").insert({
    ...row,
    company_id: companyId,
    created_by: userId,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function deleteExtinguisher(id: string): Promise<void> {
  const { supabase } = await getTenantContext();
  const { error } = await supabase
    .from("extinguishers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getExtinguisher(id: string): Promise<Extinguisher> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("extinguishers").select("*,client:client_id!inner(id,razao_social,company_id)")
    .eq("id", id).eq("client.company_id", companyId).is("deleted_at", null).single();
  if (error) throw error;
  return mapExtinguisher(data);
}