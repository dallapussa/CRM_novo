import { getTenantContext } from "@/services/tenant.service";
import type { Order } from "@/types";

export type OrderInput = Omit<Order, "id" | "company_id" | "created_at" | "updated_at">;

function mapOrder(row: Record<string, any>): Order {
  return {
    id: row.id,
    company_id: row.company_id,
    client_id: row.client_id,
    service_order_id: row.service_order_id,
    status: (row.status || "pendente").toLowerCase() as Order["status"],
    subtotal: Number(row.total || 0),
    discount: 0,
    total: Number(row.total || 0),
    notes: row.notes,
    created_by: row.created_by,
    created_at: row.ordered_at || row.created_at,
    updated_at: row.updated_at,
    client: row.client ? { name: row.client.razao_social, document: row.client.cnpj } : null,
  };
}

export async function listOrders(): Promise<Order[]> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase
    .from("orders")
    .select("*, client:clients(razao_social, cnpj)")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapOrder);
}

export async function saveOrder(input: Partial<OrderInput>, id?: string): Promise<string> {
  const { supabase, userId, companyId } = await getTenantContext();

  const payload: Record<string, any> = {
    company_id: companyId,
    client_id: input.client_id,
    service_order_id: input.service_order_id || null,
    status: input.status ? input.status.charAt(0).toUpperCase() + input.status.slice(1) : "Pendente",
    total: input.total || 0,
    notes: input.notes || null,
  };

  if (id) {
    const { error } = await supabase
      .from("orders")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) throw error;
    return id;
  }

  // Obter próximo número sequencial
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  const nextNum = (count || 0) + 1;

  const { data, error } = await supabase
    .from("orders")
    .insert({
      ...payload,
      numero: nextNum,
      ordered_at: new Date().toISOString(),
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function deleteOrder(id: string): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  const { error } = await supabase
    .from("orders")
    .update({ deleted_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", id);

  if (error) throw error;
}
