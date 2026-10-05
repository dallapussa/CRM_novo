import { getTenantContext } from "@/services/tenant.service";
import type { BenchRecord } from "@/types";

export type BenchRecordInput = Omit<BenchRecord, "id" | "company_id" | "created_at" | "updated_at">;

function mapBenchRecord(row: Record<string, any>): BenchRecord {
  return {
    id: row.id,
    company_id: row.company_id,
    client_id: row.client_id,
    extinguisher_id: row.extinguisher_id,
    hose_id: row.hose_id,
    service_order_id: row.service_order_id,
    stage: row.stage || "entrada",
    technician_id: row.technician_id,
    arrived_at: row.arrived_at,
    moved_at: row.moved_at,
    due_at: row.due_at,
    priority: (row.priority || "media") as BenchRecord["priority"],
    notes: row.notes,
    equip_type: row.equip_type || "Extintor",
    equip_capacity: row.equip_capacity,
    equip_serial: row.equip_serial,
    customer_name: row.customer_name || (row.client ? row.client.razao_social : "Cliente não informado"),
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    technician: row.technician ? { full_name: row.technician.nome } : null,
    client: row.client ? { name: row.client.razao_social } : null,
  };
}

export async function listBenchRecords(): Promise<BenchRecord[]> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase
    .from("bench_records")
    .select("*, client:clients(razao_social), technician:user_profiles(nome)")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapBenchRecord);
}

export async function saveBenchRecord(input: Partial<BenchRecordInput>, id?: string): Promise<string> {
  const { supabase, userId, companyId } = await getTenantContext();

  const payload: Record<string, any> = {
    company_id: companyId,
    client_id: input.client_id || null,
    extinguisher_id: input.extinguisher_id || null,
    hose_id: input.hose_id || null,
    service_order_id: input.service_order_id || null,
    stage: input.stage || "entrada",
    technician_id: input.technician_id || null,
    arrived_at: input.arrived_at || new Date().toISOString(),
    due_at: input.due_at || null,
    priority: input.priority || "media",
    notes: input.notes || null,
    equip_type: input.equip_type || "Extintor",
    equip_capacity: input.equip_capacity || null,
    equip_serial: input.equip_serial || null,
    customer_name: input.customer_name || null,
  };

  if (id) {
    const { error } = await supabase
      .from("bench_records")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) throw error;
    return id;
  }

  const { data, error } = await supabase
    .from("bench_records")
    .insert({
      ...payload,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateBenchStage(id: string, stage: string): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  const { error } = await supabase
    .from("bench_records")
    .update({
      stage,
      moved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteBenchRecord(id: string): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  const { error } = await supabase
    .from("bench_records")
    .update({ deleted_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", id);

  if (error) throw error;
}
