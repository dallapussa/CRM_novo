import { createClient } from "@/lib/supabase/client";
import { getClient } from "@/services/clients.service";
import { listClientExtintores, listClientDocuments } from "@/services/prevention.service";
import { getCompanySettings, DEFAULT_COMPANY_SETTINGS, type CompanySettings } from "@/services/company-settings.service";
import type { Customer, ExtintorInventario, DocumentoCliente, Quote, QuoteItem, ServiceOrder } from "@/types";

export interface CustomerPortalData {
  customer: Customer;
  company: CompanySettings;
  extinguishers: ExtintorInventario[];
  documents: DocumentoCliente[];
  serviceOrders: any[];
  quotes: (Quote & { items: QuoteItem[] })[];
  stats: {
    totalExtintores: number;
    extintoresEmDia: number;
    extintoresVencendo: number;
    extintoresVencidos: number;
    ppciDiasRestantes: number | null;
    ppciStatus: "em_dia" | "vencendo" | "vencido" | "isento" | "nao_informado";
    totalVistorias: number;
    orcamentosPendentes: number;
  };
}

/**
 * Identifica o cliente associado ao usuário logado no Auth
 */
export async function getLoggedCustomer(): Promise<{
  customer: Customer | null;
  company: CompanySettings;
}> {
  const supabase = createClient();
  const company = await getCompanySettings().catch(() => DEFAULT_COMPANY_SETTINGS);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { customer: null, company };
  }

  // 1. Tenta obter client_id diretamente dos metadados do Auth
  const metadataClientId = user.user_metadata?.client_id;
  if (metadataClientId) {
    const customer = await getClient(metadataClientId);
    if (customer) return { customer, company };
  }

  // 2. Busca pelo e-mail do cliente na tabela `clients`
  if (user.email) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("id")
      .eq("email", user.email.toLowerCase())
      .is("deleted_at", null)
      .maybeSingle();

    if (clientRow?.id) {
      const customer = await getClient(clientRow.id);
      if (customer) return { customer, company };
    }
  }

  // 3. Fallback: Se o usuário tiver um perfil, tenta encontrar clientes da mesma empresa
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.company_id && user.email) {
    const { data: fallbackClient } = await supabase
      .from("clients")
      .select("id")
      .eq("company_id", profile.company_id)
      .ilike("email", user.email)
      .is("deleted_at", null)
      .maybeSingle();

    if (fallbackClient?.id) {
      const customer = await getClient(fallbackClient.id);
      if (customer) return { customer, company };
    }
  }

  return { customer: null, company };
}

/**
 * Carrega todos os dados consolidados do Portal do Cliente
 */
export async function loadCustomerPortalData(clientId: string): Promise<CustomerPortalData | null> {
  const supabase = createClient();
  const customer = await getClient(clientId);
  if (!customer) return null;

  const company = await getCompanySettings().catch(() => DEFAULT_COMPANY_SETTINGS);

  // Carrega em paralelo: extintores, documentos, OS e orçamentos
  const [extinguishers, documents, soRes, quotesRes] = await Promise.all([
    listClientExtintores(clientId).catch(() => []),
    listClientDocuments(clientId).catch(() => []),
    supabase
      .from("service_orders")
      .select("*, technician:assigned_to(nome)")
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("quotes")
      .select("*, items:quote_items(*)")
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const rawOrders = soRes.data || [];
  const mappedOrders = rawOrders.map((row: any) => ({
    id: row.id,
    number: Number(row.numero || 1),
    customer_id: row.client_id,
    technician_id: row.assigned_to,
    technician_name: row.technician?.nome || "Técnico Especialista",
    type: row.tipo || "Vistoria Técnica",
    status: row.status || "Concluída",
    scheduled_date: row.scheduled_at?.slice(0, 10) || row.created_at?.slice(0, 10),
    completed_at: row.completed_at || row.updated_at,
    description: row.descricao || "Vistoria e manutenção de equipamentos de segurança",
    technical_report: row.technical_report || null,
    signature_url: row.signature_url || null,
    signature_name: row.signature_name || null,
    total: Number(row.total || 0),
  }));

  const rawQuotes = quotesRes.data || [];
  const mappedQuotes = rawQuotes.map((q: any) => ({
    id: q.id,
    company_id: q.company_id,
    client_id: q.client_id,
    template_id: q.template_id,
    number: Number(q.numero || 1),
    status: q.status || "Pendente",
    issued_at: q.issued_at || q.created_at,
    expires_at: q.expires_at,
    subtotal: Number(q.subtotal || 0),
    discount: Number(q.discount || 0),
    total: Number(q.total || 0),
    notes: q.notes,
    created_by: q.created_by,
    created_at: q.created_at,
    updated_at: q.updated_at,
    customer: { id: customer.id, name: customer.name },
    items: (q.items || []).map((it: any) => ({
      id: it.id,
      quote_id: it.quote_id,
      catalog_item_id: it.catalog_item_id,
      description: it.descricao || "",
      quantity: Number(it.quantidade || 1),
      unit: it.unidade || "un",
      unit_price: Number(it.unit_price || 0),
      total: Number(it.total || 0),
    })),
  }));

  // Cálculos de estatísticas e conformidade
  const now = new Date();
  const in30Days = new Date(Date.now() + 30 * 86400000);

  let extEmDia = 0;
  let extVencendo = 0;
  let extVencidos = 0;

  extinguishers.forEach((ext) => {
    if (!ext.data_vencimento) {
      extEmDia++;
      return;
    }
    const expDate = new Date(ext.data_vencimento);
    if (isNaN(expDate.getTime())) {
      extEmDia++;
    } else if (expDate < now) {
      extVencidos++;
    } else if (expDate <= in30Days) {
      extVencendo++;
    } else {
      extEmDia++;
    }
  });

  // Cálculo de dias do PPCI
  let ppciDiasRestantes: number | null = null;
  let ppciStatus: CustomerPortalData["stats"]["ppciStatus"] = "nao_informado";

  if (customer.ppci_isento) {
    ppciStatus = "isento";
  } else if (customer.ppci_expires_at) {
    const exp = new Date(customer.ppci_expires_at);
    if (!isNaN(exp.getTime())) {
      const diffTime = exp.getTime() - now.getTime();
      ppciDiasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (ppciDiasRestantes < 0) {
        ppciStatus = "vencido";
      } else if (ppciDiasRestantes <= 30) {
        ppciStatus = "vencendo";
      } else {
        ppciStatus = "em_dia";
      }
    }
  }

  const orcamentosPendentes = mappedQuotes.filter(
    (q: any) => q.status === "Pendente" || q.status === "Rascunho" || q.status === "Enviado"
  ).length;

  return {
    customer,
    company,
    extinguishers,
    documents,
    serviceOrders: mappedOrders,
    quotes: mappedQuotes,
    stats: {
      totalExtintores: extinguishers.length,
      extintoresEmDia: extEmDia,
      extintoresVencendo: extVencendo,
      extintoresVencidos: extVencidos,
      ppciDiasRestantes,
      ppciStatus,
      totalVistorias: mappedOrders.length,
      orcamentosPendentes,
    },
  };
}

/**
 * Cliente aprova um orçamento online diretamente no portal
 */
export async function customerApproveQuote(
  quoteId: string,
  customerName: string,
  approvalNote?: string
): Promise<void> {
  const supabase = createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("notes, status")
    .eq("id", quoteId)
    .single();

  const currentNotes = quote?.notes ? `${quote.notes}\n` : "";
  const approvalRecord = `[APROVADO PELO CLIENTE em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} por "${customerName}"${
    approvalNote ? ` | Obs: ${approvalNote.trim()}` : ""
  }]`;

  const { error } = await supabase
    .from("quotes")
    .update({
      status: "Aprovado",
      notes: `${currentNotes}${approvalRecord}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  if (error) throw error;
}

/**
 * Cliente recusa um orçamento online com motivo
 */
export async function customerRejectQuote(
  quoteId: string,
  customerName: string,
  reason: string
): Promise<void> {
  const supabase = createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("notes, status")
    .eq("id", quoteId)
    .single();

  const currentNotes = quote?.notes ? `${quote.notes}\n` : "";
  const rejectionRecord = `[RECUSADO PELO CLIENTE em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} por "${customerName}" | Motivo: ${reason.trim()}]`;

  const { error } = await supabase
    .from("quotes")
    .update({
      status: "Recusado",
      notes: `${currentNotes}${rejectionRecord}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  if (error) throw error;
}
