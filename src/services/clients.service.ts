import { getTenantContext } from "@/services/tenant.service";
import type { Customer } from "@/types";

export type ClientInput = Omit<Customer, "id" | "created_at" | "updated_at">;

function mapClient(row: Record<string, any>): Customer {
  const address = {
    cep: row.address_zip_code ?? undefined,
    street: row.address_street ?? undefined,
    number: row.address_number ?? undefined,
    complement: row.address_complement ?? undefined,
    neighborhood: row.address_neighborhood ?? undefined,
    city: row.address_city ?? undefined,
    state: row.address_state ?? undefined,
  };
  return {
    id: row.id,
    type: row.type ?? (row.nome_fantasia ? "pj" : "pf"),
    name: row.razao_social,
    document: row.document ?? row.cnpj ?? "",
    ie_rg: row.ie_rg,
    phone1: row.telefone ?? "",
    phone2: row.telefone2,
    email: row.email,
    address: Object.values(address).some(Boolean) ? address : null,
    notes: row.observacoes,
    is_active: row.status === "Ativo",
    created_by: row.created_by ?? "",
    owner_id: row.owner_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function clientRow(input: Partial<ClientInput>) {
  const address = input.address;
  const row: Record<string, unknown> = {};
  if (input.type !== undefined) row.type = input.type;
  if (input.name !== undefined) row.razao_social = input.name;
  if (input.name !== undefined && input.type === "pj") row.nome_fantasia = input.name;
  if (input.document !== undefined) {
    row.document = input.document;
    if (input.type === "pj") row.cnpj = input.document;
  }
  if (input.ie_rg !== undefined) row.ie_rg = input.ie_rg;
  if (input.phone1 !== undefined) row.telefone = input.phone1;
  if (input.phone2 !== undefined) row.telefone2 = input.phone2;
  if (input.email !== undefined) row.email = input.email;
  if (input.notes !== undefined) row.observacoes = input.notes;
  if (input.is_active !== undefined) row.status = input.is_active ? "Ativo" : "Inativo";
  if (input.owner_id !== undefined) row.owner_id = input.owner_id;
  if (address !== undefined) {
    row.address_street = address?.street ?? null;
    row.address_number = address?.number ?? null;
    row.address_complement = address?.complement ?? null;
    row.address_neighborhood = address?.neighborhood ?? null;
    row.address_city = address?.city ?? null;
    row.address_state = address?.state ?? null;
    row.address_zip_code = address?.cep ?? null;
  }
  return row;
}

export async function listClients(): Promise<Customer[]> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("clients").select("*").eq("company_id", companyId).is("deleted_at", null).order("razao_social", { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => mapClient(row));
}

export async function getClient(id: string): Promise<Customer> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("clients").select("*").eq("company_id", companyId).eq("id", id).is("deleted_at", null).single();
  if (error) throw error;
  return mapClient(data);
}

export async function saveClient(input: Partial<ClientInput>, id?: string): Promise<string> {
  const { supabase, userId, companyId } = await getTenantContext();
  const row = clientRow(input);
  if (id) {
    const { error } = await supabase.from("clients").update(row).eq("company_id", companyId).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from("clients").insert({
    ...row,
    company_id: companyId,
    created_by: userId,
    owner_id: input.owner_id ?? userId,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function deleteClient(id: string): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  const { error } = await supabase.from("clients").delete().eq("company_id", companyId).eq("id", id);
  if (error) throw error;
}

export async function getClientDashboardData(id: string) {
  const { supabase, companyId } = await getTenantContext();
  const [customerResult, orderResult, extinguisherResult, invoiceResult] = await Promise.all([
    supabase.from("clients").select("*").eq("company_id", companyId).eq("id", id).is("deleted_at", null).single(),
    supabase.from("service_orders").select("*,technician:assigned_to(nome)").eq("company_id", companyId).eq("client_id", id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("extinguishers").select("id", { count: "exact", head: true }).eq("client_id", id).is("deleted_at", null),
    supabase.from("receipts").select("id,status,amount").eq("company_id", companyId).eq("client_id", id).eq("invoice_type", "receber").is("deleted_at", null),
  ]);
  if (customerResult.error) throw customerResult.error;
  if (orderResult.error) throw orderResult.error;
  if (extinguisherResult.error) throw extinguisherResult.error;
  if (invoiceResult.error) throw invoiceResult.error;

  const invoices = invoiceResult.data || [];
  const serviceOrders = (orderResult.data || []).map((row: Record<string, any>) => ({
    id: row.id,
    number: Number(row.numero),
    customer_id: row.client_id,
    technician_id: row.assigned_to,
    scheduled_date: row.scheduled_at?.slice(0, 10) ?? "",
    scheduled_period: null,
    priority: "media" as const,
    status: row.status === "Concluída" ? "concluida" as const : row.status === "Em andamento" ? "andamento" as const : row.status === "Atrasada" ? "atrasada" as const : row.status === "Cancelada" ? "cancelada" as const : "pendente" as const,
    type: row.tipo,
    description: row.descricao ?? "",
    technical_report: row.technical_report,
    arrival_time: row.started_at,
    departure_time: row.completed_at,
    subtotal: Number(row.total ?? 0),
    discount: 0,
    total: Number(row.total ?? 0),
    cancellation_reason: null,
    created_by: row.created_by ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
    customer: { name: customerResult.data.razao_social },
    technician: row.technician ? { full_name: row.technician.nome } : null,
  }));
  return {
    customer: mapClient(customerResult.data),
    serviceOrders,
    extinguishersCount: extinguisherResult.count ?? 0,
    openInvoicesCount: invoices.filter((invoice) => ["Pendente", "Parcial", "Atrasado"].includes(invoice.status)).length,
    totalRevenue: (orderResult.data || []).reduce((total, order) => total + Number(order.total || 0), 0),
  };
}