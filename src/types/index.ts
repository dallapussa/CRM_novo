export type UserRole = "admin" | "comercial" | "tecnico" | "financeiro" | "cliente" | "terceiro";

export type RolePermission =
  | "dashboard"
  | "users"
  | "clients"
  | "leads"
  | "quotes"
  | "agenda"
  | "whatsapp"
  | "catalog"
  | "extinguishers"
  | "service_orders"
  | "bench"
  | "orders"
  | "receipts"
  | "reports"
  | "customer_portal"
  | "financial_costs";

const allPermissions: RolePermission[] = [
  "dashboard", "users", "clients", "leads", "quotes", "agenda", "whatsapp",
  "catalog", "extinguishers", "service_orders", "bench", "orders", "receipts",
  "reports", "customer_portal", "financial_costs",
];

// ============================================================================
// MATRIZ OFICIAL DE PERMISSÕES (definida pelo cliente)
// ----------------------------------------------------------------------------
// Admin    → Full access (tudo)
// Comercial→ clients, leads, quotes, agenda, whatsapp, catalog + dashboard
//            ✘ NÃO tem financial_costs
// Técnico  → clients, extinguishers, service_orders, bench + dashboard
//            ✘ NÃO tem receipts, orders, reports
// Financeiro → orders, receipts, reports + dashboard
//            ✘ NÃO tem financial_costs (só Admin vê custos)
// Cliente / Terceiro → customer_portal apenas
// ============================================================================
export const ROLE_PERMISSIONS: Record<UserRole, readonly RolePermission[]> = {
  admin: allPermissions,
  comercial: ["dashboard", "clients", "leads", "quotes", "agenda", "whatsapp", "catalog"],
  tecnico: ["dashboard", "clients", "extinguishers", "service_orders", "bench"],
  financeiro: ["dashboard", "orders", "receipts", "reports"],
  cliente: ["customer_portal"],
  terceiro: ["customer_portal"],
};

// Mapeia cada caminho (pathname) para a permissão obrigatória.
// Usado tanto no sidebar quanto no bloqueio de rota direto por URL.
export const PATH_PERMISSION: Record<string, RolePermission> = {
  "/dashboard": "dashboard",
  "/dashboard/usuarios": "users",
  "/dashboard/clientes": "clients",
  "/dashboard/leads": "leads",
  "/dashboard/orcamentos": "quotes",
  "/dashboard/agenda": "agenda",
  "/dashboard/whatsapp": "whatsapp",
  "/dashboard/produtos": "catalog",
  "/dashboard/extintores": "extinguishers",
  "/dashboard/os": "service_orders",
  "/dashboard/bancada": "bench",
  "/dashboard/pedidos": "orders",
  "/dashboard/financeiro": "receipts",
  "/dashboard/relatorios": "reports",
  "/dashboard/custos": "financial_costs",
};

/** Retorna a permissão exigida para um dado pathname (ex: /dashboard/usuarios/123) */
export function getPermissionForPath(pathname: string): RolePermission | null {
  if (pathname === "/dashboard/perfil") return null; // todo usuário logado pode editar seu perfil
  if (pathname === "/dashboard") {
    // Na raiz do dashboard, cada perfil vê sua permissão correspondente
    return null; // tratado separadamente no layout
  }
  // Tenta casar exato ou com prefixo (maior caminho primeiro)
  const keys = Object.keys(PATH_PERMISSION).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (pathname === k || pathname.startsWith(k + "/")) return PATH_PERMISSION[k];
  }
  return null;
}

export function hasPermission(role: UserRole | null | undefined, permission: RolePermission): boolean {
  return Boolean(role && ROLE_PERMISSIONS[role].includes(permission));
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone?: string | null;
  document?: string | null;
  company_name?: string | null;
  address?: { cep?: string; street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string } | null;
  avatar_url?: string | null;
  is_active: boolean;
  email?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = { admin: "Administrador", comercial: "Comercial", tecnico: "Técnico", financeiro: "Financeiro", cliente: "Cliente", terceiro: "Terceiro" };
export const ROLE_COLORS: Record<UserRole, string> = { admin: "bg-red-100 text-red-700 border-red-200", comercial: "bg-blue-100 text-blue-700 border-blue-200", tecnico: "bg-orange-100 text-orange-700 border-orange-200", financeiro: "bg-green-100 text-green-700 border-green-200", cliente: "bg-purple-100 text-purple-700 border-purple-200", terceiro: "bg-gray-100 text-gray-700 border-gray-200" };

export interface Customer {
  id: string;
  type: "pf" | "pj";
  name: string;
  document: string;
  ie_rg?: string | null;
  phone1: string;
  phone2?: string | null;
  email?: string | null;
  address?: { cep?: string; street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string } | null;
  notes?: string | null;
  is_active: boolean;
  created_by: string;
  owner_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type OSStatus = "pendente" | "andamento" | "atrasada" | "concluida" | "cancelada";
export interface ServiceOrder {
  id: string;
  number: number;
  customer_id: string;
  technician_id?: string | null;
  scheduled_date: string;
  scheduled_period?: "manha" | "tarde" | "integral" | null;
  priority: "baixa" | "media" | "alta" | "urgente";
  status: OSStatus;
  type: string;
  description: string;
  technical_report?: string | null;
  arrival_time?: string | null;
  departure_time?: string | null;
  signature_url?: string | null;
  signature_name?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  cancellation_reason?: string | null;
  notes?: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  customer?: { name: string } | null;
  technician?: { full_name: string } | null;
}

export const OS_STATUS_LABELS: Record<OSStatus, string> = { pendente: "Pendente", andamento: "Em Andamento", atrasada: "Atrasada", concluida: "Concluída", cancelada: "Cancelada" };
export const OS_STATUS_COLORS: Record<OSStatus, string> = { pendente: "bg-yellow-100 text-yellow-700 border-yellow-200", andamento: "bg-blue-100 text-blue-700 border-blue-200", atrasada: "bg-red-100 text-red-700 border-red-200", concluida: "bg-green-100 text-green-700 border-green-200", cancelada: "bg-gray-100 text-gray-600 border-gray-200" };
export type OSPriority = "baixa" | "media" | "alta" | "urgente";
export const OS_PRIORITY_LABELS: Record<OSPriority, string> = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };
export const OS_PRIORITY_COLORS: Record<OSPriority, string> = { baixa: "bg-gray-100 text-gray-700 border-gray-200", media: "bg-blue-100 text-blue-700 border-blue-200", alta: "bg-orange-100 text-orange-700 border-orange-200", urgente: "bg-red-100 text-red-700 border-red-200" };
export const OS_PERIOD_LABELS: Record<string, string> = { manha: "Manhã", tarde: "Tarde", integral: "Dia inteiro" };

export interface ServiceOrderItem {
  id: string;
  service_order_id: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  type: "produto" | "servico" | "mao_obra";
  created_at?: string;
}

export interface Product {
  id: string;
  type: "produto" | "servico";
  category: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  unit: string;
  cost_price: number;
  sale_price: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
export const PRODUCT_TYPE_LABELS: Record<string, string> = { produto: "Produto", servico: "Serviço" };
export const PRODUCT_CATEGORIES = ["Recarga de Extintor", "Manutenção", "Inspeção", "PPCI", "Mangueiras", "Hidrantes", "Alarmes", "Sinalização", "Iluminação de Emergência", "Peças", "Outros"];

export interface Extinguisher {
  id: string;
  customer_id: string;
  type: string;
  capacity: string;
  serial_number: string;
  manufacturer?: string | null;
  manufacturing_date?: string | null;
  last_recharge_date?: string | null;
  expiration_date: string;
  next_inspection_date?: string | null;
  location?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  customer?: { id: string; name: string } | null;
}
export const EXTINGUISHER_TYPES = ["Pó Químico ABC", "Pó Químico BC", "CO2 (Dióxido de Carbono)", "Água Pressurizada", "Espuma Mecânica", "Halon", "Outro"];

export type InvoiceStatus = "aberta" | "parcial" | "paga" | "atrasada" | "cancelada";
export type InvoiceType = "receber" | "pagar";
export interface Invoice {
  id: string;
  number: number;
  customer_id: string;
  service_order_id?: string | null;
  type: InvoiceType;
  status: InvoiceStatus;
  description: string;
  amount: number;
  amount_paid: number;
  due_date: string;
  issue_date: string;
  payment_date?: string | null;
  payment_method?: string | null;
  bank_slip_url?: string | null;
  notes?: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  customer?: { id: string; name: string } | null;
}
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = { aberta: "Aberta", parcial: "Parcial", paga: "Paga", atrasada: "Atrasada", cancelada: "Cancelada" };
export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = { aberta: "bg-yellow-100 text-yellow-700 border-yellow-200", parcial: "bg-blue-100 text-blue-700 border-blue-200", paga: "bg-green-100 text-green-700 border-green-200", atrasada: "bg-red-100 text-red-700 border-red-200", cancelada: "bg-gray-100 text-gray-600 border-gray-200" };
export const PAYMENT_METHOD_LABELS: Record<string, string> = { boleto: "Boleto", pix: "PIX", cartao: "Cartão", dinheiro: "Dinheiro", transferencia: "Transferência" };

export type LeadStatus = "novo" | "contatado" | "qualificado" | "proposta" | "convertido" | "perdido";
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  qualificado: "Qualificado",
  proposta: "Proposta",
  convertido: "Convertido",
  perdido: "Perdido",
};

export interface Lead {
  id: string;
  name: string;
  company_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: LeadStatus;
  notes: string | null;
  owner_id: string | null;
  converted_customer_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// =========================================================================
// FASE 2 — OPERATIONS (Operações)
// =========================================================================

export interface Hose {
  id: string;
  customer_id: string;
  type: string;
  length_meters: number;
  serial_number?: string | null;
  asset_number?: string | null;
  location?: string | null;
  last_test_date?: string | null;
  next_test_date: string;
  status: "Ativo" | "Inativo" | string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  customer?: { id: string; name: string } | null;
}
export const HOSE_TYPES = ["Tipo 1 — Incêndio", "Tipo 2 — Incêndio", "Tipo 3 — Incêndio", "Mangueira de Hidrante", "Outra"];
export const HOSE_TEST_STATUS_LABELS: Record<string, string> = { vencido: "Vencido", vence_em_breve: "Vence em breve", ok: "Em dia" };

// ------- BANCADA / KANBAN (recargas em andamento) -------
export type BenchStage = "recebido" | "inspecao" | "desmontagem" | "recarga" | "hidrostatico" | "secagem" | "montagem" | "pintura" | "qualidade" | "liberado" | "entregue";
export const BENCH_STAGES: readonly { key: BenchStage; label: string; color: string }[] = [
  { key: "recebido",    label: "Recebido",         color: "bg-slate-100 text-slate-700 border-slate-200" },
  { key: "inspecao",    label: "Inspeção Inicial", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "desmontagem", label: "Desmontagem",      color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { key: "recarga",     label: "Recarga",          color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "hidrostatico",label: "Teste Hidrostático",color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { key: "secagem",     label: "Secagem",          color: "bg-orange-100 text-orange-700 border-orange-200" },
  { key: "montagem",    label: "Montagem",         color: "bg-teal-100 text-teal-700 border-teal-200" },
  { key: "pintura",     label: "Pintura",          color: "bg-pink-100 text-pink-700 border-pink-200" },
  { key: "qualidade",   label: "Qualidade",        color: "bg-violet-100 text-violet-700 border-violet-200" },
  { key: "liberado",    label: "Liberado",         color: "bg-green-100 text-green-700 border-green-200" },
  { key: "entregue",    label: "Entregue",         color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
];

export interface BenchRecord {
  id: string;
  company_id: string;
  extinguisher_id?: string | null;
  hose_id?: string | null;
  service_order_id?: string | null;
  client_id?: string | null;
  stage: BenchStage;
  technician_id?: string | null;
  arrived_at: string;
  moved_at?: string | null;
  due_at?: string | null;
  notes?: string | null;
  priority?: "baixa" | "media" | "alta" | "urgente";
  // Dados de equipamento (denormalizado para aparecer no card sem join)
  equip_type?: string | null;
  equip_capacity?: string | null;
  equip_serial?: string | null;
  customer_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ------- PEDIDOS (Orders) -------
export type OrderStatus = "Aberto" | "Aprovado" | "Parcial" | "Enviado" | "Entregue" | "Faturado" | "Cancelado" | string;
export interface Order {
  id: string;
  company_id: string;
  number: number;
  client_id: string;
  service_order_id?: string | null;
  quote_id?: string | null;
  status: OrderStatus;
  total: number;
  ordered_at: string;
  notes?: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  customer?: { id: string; name: string } | null;
}
export const ORDER_STATUS_LABELS: Record<string, string> = { Aberto: "Aberto", Aprovado: "Aprovado", Parcial: "Parcial", Enviado: "Enviado", Entregue: "Entregue", Faturado: "Faturado", Cancelado: "Cancelado" };

// ------- RECIBOS (Receipts) — contas a receber / pagar -------
export type ReceiptStatus = "Pendente" | "Parcial" | "Recebido" | "Atrasado" | "Cancelado" | string;
export interface Receipt {
  id: string;
  company_id: string;
  client_id: string;
  order_id?: string | null;
  service_order_id?: string | null;
  invoice_type: "receber" | "pagar";
  number: number;
  status: ReceiptStatus;
  amount: number;
  amount_paid: number;
  due_at?: string | null;
  issued_at?: string | null;
  received_at?: string | null;
  payment_method?: string | null;
  description?: string | null;
  notes?: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  customer?: { id: string; name: string } | null;
}
export const RECEIPT_STATUS_LABELS: Record<string, string> = { Pendente: "Pendente", Parcial: "Parcial", Recebido: "Recebido", Atrasado: "Atrasado", Cancelado: "Cancelado" };
export const RECEIPT_STATUS_COLORS: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Parcial:  "bg-blue-100 text-blue-700 border-blue-200",
  Recebido: "bg-green-100 text-green-700 border-green-200",
  Atrasado: "bg-red-100 text-red-700 border-red-200",
  Cancelado:"bg-gray-100 text-gray-600 border-gray-200",
};

// =========================================================================
// FASE 3 — COMMERCIAL (Comercial)
// =========================================================================

// ------- ORÇAMENTOS (Quotes) -------
export type QuoteStatus = "Rascunho" | "Enviado" | "Aprovado" | "Rejeitado" | "Convertido" | "Cancelado" | string;
export const QUOTE_STATUS_LABELS: Record<string, string> = { Rascunho: "Rascunho", Enviado: "Enviado", Aprovado: "Aprovado", Rejeitado: "Rejeitado", Convertido: "Convertido em OS", Cancelado: "Cancelado" };
export const QUOTE_STATUS_COLORS: Record<string, string> = {
  Rascunho:   "bg-slate-100 text-slate-700 border-slate-200",
  Enviado:    "bg-blue-100 text-blue-700 border-blue-200",
  Aprovado:   "bg-green-100 text-green-700 border-green-200",
  Rejeitado:  "bg-red-100 text-red-700 border-red-200",
  Convertido: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Cancelado:  "bg-gray-100 text-gray-600 border-gray-200",
};

export interface Quote {
  id: string;
  company_id: string;
  client_id: string;
  template_id?: string | null;
  number: number;
  status: QuoteStatus;
  issued_at: string;
  expires_at?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  customer?: { id: string; name: string } | null;
  owner?: { id: string; full_name: string } | null;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  catalog_item_id?: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  created_at?: string;
}

// ------- DOCUMENTOS (Upload Storage) -------
export interface Document {
  id: string;
  client_id: string;
  name: string;
  category: "PPCI" | "Recibo" | "Nota Fiscal" | "Laudo Técnico" | "ART" | "Contrato" | "Outro" | string;
  storage_path: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  url?: string | null;
  created_at?: string;
  updated_at?: string;
  uploaded_by?: string | null;
}
export const DOCUMENT_CATEGORIES = ["PPCI", "Recibo", "Nota Fiscal", "Laudo Técnico", "ART", "Contrato", "Outro"];

// ------- TAREFAS (Tasks) -------
export type TaskStatus = "Pendente" | "Em andamento" | "Concluída" | "Cancelada" | string;
export interface Task {
  id: string;
  company_id: string;
  client_id?: string | null;
  service_order_id?: string | null;
  assigned_to?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  due_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  assigned?: { full_name: string } | null;
}
export const TASK_STATUS_COLORS: Record<string, string> = {
  "Pendente":      "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Em andamento":  "bg-blue-100 text-blue-700 border-blue-200",
  "Concluída":     "bg-green-100 text-green-700 border-green-200",
  "Cancelada":     "bg-gray-100 text-gray-600 border-gray-200",
};

// ------- AGENDA (Eventos) -------
export interface AgendaEvent {
  id: string;
  company_id: string;
  client_id?: string | null;
  service_order_id?: string | null;
  assigned_to?: string | null;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ------- WHATSAPP: Templates (configuração do sistema, não dado do cliente) -------
export interface WhatsappTemplate {
  id: string;
  slug: "welcome" | "first_access" | "new_os" | "os_completed" | "receipt_created" | "receipt_overdue" | "extinguisher_expiring" | "appointment_confirmed" | string;
  name: string;
  body: string;
  description?: string | null;
  placeholders: string[];
  enabled: boolean;
  updated_by?: string | null;
  updated_at?: string;
}
export const WHATSAPP_TEMPLATE_PRESETS: WhatsappTemplate[] = [
  {
    id: "welcome", slug: "welcome", name: "Boas-vindas ao colaborador",
    description: "Enviada ao criar usuário novo com senha temporária",
    placeholders: ["{NOME}", "{EMAIL}", "{SENHA_TEMPORARIA}", "{EMPRESA}"],
    enabled: true,
    body: "Olá {NOME}! 👋\n\nSua conta no ExtinControl CRM da {EMPRESA} foi criada.\n\n📧 Login: {EMAIL}\n🔑 Senha temporária: {SENHA_TEMPORARIA}\n\nAcesse e redefina sua senha no primeiro acesso. Qualquer dúvida, fale com seu administrador.\n\n— Equipe {EMPRESA}",
  },
  {
    id: "new_os", slug: "new_os", name: "Nova OS criada",
    description: "Cliente avisa OS criada e agendada",
    placeholders: ["{NOME}", "{NUMERO_OS}", "{DATA}", "{PERIODO}", "{TECNICO}", "{EMPRESA}"],
    enabled: true,
    body: "Olá {NOME}! 😊\n\nCriamos a Ordem de Serviço nº {NUMERO_OS} para você.\n\n📅 Data: {DATA}\n⏰ Período: {PERIODO}\n👨‍🔧 Técnico: {TECNICO}\n\nFavor manter endereço acessível.\n\n— {EMPRESA}",
  },
  {
    id: "os_completed", slug: "os_completed", name: "OS concluída",
    description: "Aviso após finalização e assinatura",
    placeholders: ["{NOME}", "{NUMERO_OS}", "{VALOR_TOTAL}"],
    enabled: true,
    body: "✅ OS nº {NUMERO_OS} concluída com sucesso!\n\nOlá {NOME}, obrigado pela confiança.\n\n💳 Total do serviço: {VALOR_TOTAL}\n\nQualquer coisa, estamos à disposição. — ExtinControl",
  },
  {
    id: "extinguisher_expiring", slug: "extinguisher_expiring", name: "Extintor vencendo em 30 dias",
    description: "Aviso preventivo de validade",
    placeholders: ["{NOME}", "{QUANTIDADE}", "{DIAS_VENCIMENTO}"],
    enabled: true,
    body: "🔥 Alerta de segurança!\n\nOlá {NOME}, temos {QUANTIDADE} extintor(es) vencendo em até {DIAS_VENCIMENTO} dias.\n\nEvite multas e riscos. Responda esta mensagem para agendar a recarga com nossa equipe — é rapidinho! 😊",
  },
  {
    id: "receipt_overdue", slug: "receipt_overdue", name: "Boleto atrasado",
    description: "Cobrança amigável",
    placeholders: ["{NOME}", "{NUMERO_DOC}", "{DATA_VENCIMENTO}", "{VALOR}"],
    enabled: true,
    body: "Bom dia, {NOME}! ☀️\n\nPassando para lembrar do documento {NUMERO_DOC} (vencimento {DATA_VENCIMENTO}) no valor de {VALOR} que está em atraso.\n\nPodemos ajudar com alguma negociação? Basta responder.",
  },
];