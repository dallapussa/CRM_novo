import { getTenantContext } from "@/services/tenant.service";
import type { Customer } from "@/types";

export type ClientInput = Omit<Customer, "id" | "created_at" | "updated_at">;

interface ClientMeta {
  whatsapp?: string | null;
  gov_password?: string | null;
  ppci_isento?: boolean;
  metragem?: number | null;
  cpf_responsavel?: string | null;
  contato_responsavel?: string | null;
  senha_gov?: string | null;
  ppci_expires_at?: string | null;
  ppci_enquadramento?: string | null;
  ppci_number?: string | null;
}

function parseClientMeta(observacoes?: string | null): { cleanNotes: string | null; meta: ClientMeta } {
  if (!observacoes) return { cleanNotes: null, meta: {} };
  const regex = /\[EXTIN_META\]([\s\S]*?)\[\/EXTIN_META\]/;
  const match = observacoes.match(regex);
  if (!match) return { cleanNotes: observacoes, meta: {} };
  let meta: ClientMeta = {};
  try {
    meta = JSON.parse(match[1]);
  } catch {
    meta = {};
  }
  const cleanNotes = observacoes.replace(regex, "").trim();
  return { cleanNotes: cleanNotes || null, meta };
}

function packClientObservacoes(
  notes?: string | null,
  whatsapp?: string | null,
  govPassword?: string | null,
  ppciData?: Partial<ClientMeta>
): string | null {
  const baseNotes = notes?.trim() || "";
  const metaObj: Record<string, any> = {};
  if (whatsapp) metaObj.whatsapp = whatsapp;
  if (govPassword) metaObj.gov_password = govPassword;
  if (ppciData?.ppci_isento !== undefined) metaObj.ppci_isento = ppciData.ppci_isento;
  if (ppciData?.metragem !== undefined) metaObj.metragem = ppciData.metragem;
  if (ppciData?.cpf_responsavel !== undefined) metaObj.cpf_responsavel = ppciData.cpf_responsavel;
  if (ppciData?.contato_responsavel !== undefined) metaObj.contato_responsavel = ppciData.contato_responsavel;
  if (ppciData?.senha_gov !== undefined) metaObj.senha_gov = ppciData.senha_gov;
  if (ppciData?.ppci_expires_at !== undefined) metaObj.ppci_expires_at = ppciData.ppci_expires_at;
  if (ppciData?.ppci_enquadramento !== undefined) metaObj.ppci_enquadramento = ppciData.ppci_enquadramento;
  if (ppciData?.ppci_number !== undefined) metaObj.ppci_number = ppciData.ppci_number;

  if (Object.keys(metaObj).length === 0) {
    return baseNotes || null;
  }
  const metaBlock = `\n\n[EXTIN_META]\n${JSON.stringify(metaObj)}\n[/EXTIN_META]`;
  return (baseNotes + metaBlock).trim();
}

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
  const { cleanNotes, meta } = parseClientMeta(row.observacoes);
  const whatsapp = row.whatsapp || meta.whatsapp || row.telefone2 || null;
  const gov_password = row.gov_password || meta.gov_password || row.senha_gov || meta.senha_gov || null;
  const ppci_isento = row.ppci_isento ?? meta.ppci_isento ?? false;
  const metragem = row.metragem !== undefined && row.metragem !== null ? Number(row.metragem) : (meta.metragem ?? null);
  const cpf_responsavel = row.cpf_responsavel || meta.cpf_responsavel || null;
  const contato_responsavel = row.contato_responsavel || meta.contato_responsavel || null;
  const senha_gov = row.senha_gov || meta.senha_gov || gov_password;
  const ppci_expires_at = row.ppci_expires_at || meta.ppci_expires_at || null;
  const ppci_enquadramento = row.ppci_enquadramento || meta.ppci_enquadramento || (ppci_isento ? "Isento de PPCI" : "PSPCI (Plano Simplificado)");
  const ppci_number = row.ppci_number || meta.ppci_number || null;

  return {
    id: row.id,
    type: row.type ?? (row.nome_fantasia ? "pj" : "pf"),
    name: row.razao_social,
    document: row.document ?? row.cnpj ?? "",
    ie_rg: row.ie_rg,
    phone1: row.telefone ?? "",
    phone2: row.telefone2,
    whatsapp,
    gov_password: senha_gov,
    email: row.email,
    address: Object.values(address).some(Boolean) ? address : null,
    notes: cleanNotes,
    is_active: row.status === "Ativo",
    ppci_isento,
    metragem,
    cpf_responsavel,
    contato_responsavel,
    senha_gov,
    ppci_expires_at,
    ppci_enquadramento,
    ppci_number,
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
  if (input.phone2 !== undefined) {
    row.telefone2 = input.phone2;
  } else if (input.whatsapp) {
    row.telefone2 = input.whatsapp;
  }
  if (input.email !== undefined) row.email = input.email;

  // PPCI direto na linha se a coluna existir
  if (input.ppci_isento !== undefined) row.ppci_isento = input.ppci_isento;
  if (input.metragem !== undefined) row.metragem = input.metragem;
  if (input.cpf_responsavel !== undefined) row.cpf_responsavel = input.cpf_responsavel;
  if (input.contato_responsavel !== undefined) row.contato_responsavel = input.contato_responsavel;
  if (input.senha_gov !== undefined || input.gov_password !== undefined) {
    row.senha_gov = input.senha_gov || input.gov_password;
    row.gov_password = input.senha_gov || input.gov_password;
  }
  if (input.ppci_expires_at !== undefined) row.ppci_expires_at = input.ppci_expires_at;
  if (input.ppci_enquadramento !== undefined) row.ppci_enquadramento = input.ppci_enquadramento;
  if (input.ppci_number !== undefined) row.ppci_number = input.ppci_number;

  // Notas com metadados estruturados (PPCI, WhatsApp e Senha GOV.BR)
  const ppciMeta: Partial<ClientMeta> = {
    ppci_isento: input.ppci_isento,
    metragem: input.metragem,
    cpf_responsavel: input.cpf_responsavel,
    contato_responsavel: input.contato_responsavel,
    senha_gov: input.senha_gov || input.gov_password,
    ppci_expires_at: input.ppci_expires_at,
    ppci_enquadramento: input.ppci_enquadramento,
    ppci_number: input.ppci_number,
  };
  row.observacoes = packClientObservacoes(
    input.notes,
    input.whatsapp,
    input.senha_gov || input.gov_password,
    ppciMeta
  );

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

  if (id && (input.notes !== undefined || input.whatsapp !== undefined || input.gov_password !== undefined)) {
    if (input.notes === undefined || input.whatsapp === undefined || input.gov_password === undefined) {
      const { data: existing } = await supabase.from("clients").select("observacoes,telefone2").eq("company_id", companyId).eq("id", id).maybeSingle();
      if (existing) {
        const { cleanNotes, meta } = parseClientMeta(existing.observacoes);
        input.notes = input.notes !== undefined ? input.notes : cleanNotes;
        input.whatsapp = input.whatsapp !== undefined ? input.whatsapp : (meta.whatsapp || existing.telefone2 || null);
        input.gov_password = input.gov_password !== undefined ? input.gov_password : (meta.gov_password || null);
      }
    }
  }

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
  const { error } = await supabase
    .from("clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", id);
  if (error) throw error;
}

export async function getClientDashboardData(id: string) {
  const { supabase, companyId } = await getTenantContext();
  const [customerResult, orderResult, extinguisherResult, invoiceResult] = await Promise.all([
    supabase.from("clients").select("*").eq("company_id", companyId).eq("id", id).is("deleted_at", null).single(),
    supabase.from("service_orders").select("*").eq("company_id", companyId).eq("client_id", id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("extintores").select("id", { count: "exact", head: true }).eq("client_id", id),
    supabase.from("receipts").select("id,status,amount").eq("company_id", companyId).eq("client_id", id).eq("invoice_type", "receber").is("deleted_at", null),
  ]);
  if (customerResult.error) throw customerResult.error;
  if (orderResult.error) throw orderResult.error;
  if (extinguisherResult.error) throw extinguisherResult.error;
  if (invoiceResult.error) throw invoiceResult.error;

  const rawOrders = orderResult.data || [];
  const techIds = Array.from(new Set(rawOrders.map((r: any) => r.assigned_to).filter(Boolean)));
  const techMap = new Map<string, string>();
  if (techIds.length > 0) {
    const { data: techData } = await supabase.from("user_profiles").select("id,nome").in("id", techIds);
    (techData || []).forEach((u: any) => techMap.set(u.id, u.nome));
  }

  const invoices = invoiceResult.data || [];
  const serviceOrders = rawOrders.map((row: Record<string, any>) => ({
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
    technician: row.assigned_to && techMap.has(row.assigned_to) ? { full_name: techMap.get(row.assigned_to)! } : null,
  }));
  return {
    customer: mapClient(customerResult.data),
    serviceOrders,
    extinguishersCount: extinguisherResult.count ?? 0,
    openInvoicesCount: invoices.filter((invoice) => ["Pendente", "Parcial", "Atrasado"].includes(invoice.status)).length,
    totalRevenue: (orderResult.data || []).reduce((total, order) => total + Number(order.total || 0), 0),
  };
}

export async function saveClientPpci(
  clientId: string,
  data: {
    ppci_isento?: boolean;
    ppci_expires_at?: string | null;
    ppci_enquadramento?: string | null;
    ppci_number?: string | null;
    metragem?: number | null;
    cpf_responsavel?: string | null;
    contato_responsavel?: string | null;
    senha_gov?: string | null;
  }
): Promise<Customer> {
  await saveClient(
    {
      ppci_isento: data.ppci_isento,
      ppci_expires_at: data.ppci_expires_at,
      ppci_enquadramento: data.ppci_enquadramento,
      ppci_number: data.ppci_number,
      metragem: data.metragem,
      cpf_responsavel: data.cpf_responsavel,
      contato_responsavel: data.contato_responsavel,
      senha_gov: data.senha_gov,
    },
    clientId
  );

  return getClient(clientId);
}