import { getTenantContext } from "@/services/tenant.service";
import type { Hose } from "@/types";

export type HoseInput = Omit<Hose, "id" | "company_id" | "created_at" | "updated_at">;

function mapHose(row: Record<string, any>): Hose {
  return {
    id: row.id,
    company_id: row.company_id,
    client_id: row.client_id,
    tipo: row.tipo || "Tipo 2",
    comprimento: Number(row.comprimento || row.comprimento_m || 15),
    comprimento_m: row.comprimento_m ? Number(row.comprimento_m) : null,
    diametro_polegadas: row.diametro_polegadas || "1 1/2\"",
    numero_serie: row.numero_serie,
    patrimonio: row.patrimonio,
    localizacao: row.localizacao,
    fabricante: row.fabricante,
    data_fabricacao: row.data_fabricacao,
    last_test_at: row.last_test_at,
    next_test_at: row.next_test_at,
    teste_estanque_validade: row.teste_estanque_validade,
    status: row.status || "Ativo",
    observacoes: row.observacoes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    client: row.client ? { name: row.client.razao_social, document: row.client.cnpj } : null,
  };
}

export async function listHoses(): Promise<Hose[]> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase
    .from("hoses")
    .select("*, client:clients(razao_social, cnpj)")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapHose);
}

export async function getHose(id: string): Promise<Hose> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase
    .from("hoses")
    .select("*, client:clients(razao_social, cnpj)")
    .eq("company_id", companyId)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  return mapHose(data);
}

export async function saveHose(input: Partial<HoseInput>, id?: string): Promise<string> {
  const { supabase, userId, companyId } = await getTenantContext();

  const payload: Record<string, any> = {
    company_id: companyId,
    client_id: input.client_id,
    tipo: input.tipo || "Tipo 2",
    comprimento: input.comprimento || 15,
    comprimento_m: input.comprimento || 15,
    diametro_polegadas: input.diametro_polegadas || "1 1/2\"",
    numero_serie: input.numero_serie || null,
    patrimonio: input.patrimonio || null,
    localizacao: input.localizacao || null,
    fabricante: input.fabricante || null,
    data_fabricacao: input.data_fabricacao || null,
    last_test_at: input.last_test_at || null,
    next_test_at: input.next_test_at || null,
    status: input.status || "Ativo",
    observacoes: input.observacoes || null,
  };

  if (id) {
    const { error } = await supabase
      .from("hoses")
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
    .from("hoses")
    .insert({
      ...payload,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function deleteHose(id: string): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  const { error } = await supabase
    .from("hoses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", id);

  if (error) throw error;
}
