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
  const { supabase, companyId, userId } = await getTenantContext();

  // Reconciliação / Auto-cura: Verifica extintores marcados como 'em_bancada' que ainda não possuem registro na bench_records
  try {
    const { data: pendingExts } = await supabase
      .from("extintores")
      .select("id, client_id, identificacao, tipo_capacidade, localizacao, status, client:clients(razao_social, nome_fantasia)")
      .eq("status", "em_bancada");

    if (pendingExts && pendingExts.length > 0) {
      const { data: existingBench } = await supabase
        .from("bench_records")
        .select("extinguisher_id")
        .in("extinguisher_id", pendingExts.map((e) => e.id))
        .is("deleted_at", null);

      const existingSet = new Set((existingBench || []).map((b) => b.extinguisher_id));
      const toInsert = pendingExts.filter((e) => !existingSet.has(e.id));

      if (toInsert.length > 0) {
        const rows = toInsert.map((e) => ({
          company_id: companyId,
          client_id: e.client_id,
          extinguisher_id: e.id,
          stage: "entrada",
          priority: "media",
          arrived_at: new Date().toISOString(),
          equip_type: e.tipo_capacidade?.split("-")[0]?.trim() || "Extintor",
          equip_capacity: e.tipo_capacidade?.split("-")[1]?.trim() || e.tipo_capacidade || "4kg",
          equip_serial: e.identificacao || "S/N",
          customer_name: (e.client as any)?.razao_social || (e.client as any)?.nome_fantasia || "Cliente",
          notes: "Extintor recolhido e aguardando manutenção na bancada.",
          created_by: userId,
        }));
        await supabase.from("bench_records").insert(rows);
      }
    }
  } catch (reconcileErr) {
    console.warn("Auto-reconciliação de extintores para bancada:", reconcileErr);
  }

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

  const { data: record } = await supabase
    .from("bench_records")
    .select("extinguisher_id")
    .eq("id", id)
    .maybeSingle();

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

  // Atualiza status do extintor se vinculado
  if (record?.extinguisher_id) {
    let nextStatus = "em_bancada";
    if (stage === "inspecao_final" || stage === "pronto" || stage === "saida") {
      nextStatus = "pronto";
    } else if (stage === "teste_hidrostatico") {
      nextStatus = "testado";
    }
    await supabase.from("extintores").update({ status: nextStatus }).eq("id", record.extinguisher_id);
    await supabase.from("extinguishers").update({ status: nextStatus }).eq("id", record.extinguisher_id);
  }
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
