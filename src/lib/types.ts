export type UserRole =
  | "admin"
  | "comercial"
  | "tecnico"
  | "financeiro"
  | "cliente"
  | "terceiro";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone?: string | null;
  document?: string | null;
  company_name?: string | null;
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;
  avatar_url?: string | null;
  is_active: boolean;
  email?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  comercial: "Comercial",
  tecnico: "Técnico",
  financeiro: "Financeiro",
  cliente: "Cliente",
  terceiro: "Terceiro",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  comercial: "bg-blue-100 text-blue-700 border-blue-200",
  tecnico: "bg-orange-100 text-orange-700 border-orange-200",
  financeiro: "bg-green-100 text-green-700 border-green-200",
  cliente: "bg-purple-100 text-purple-700 border-purple-200",
  terceiro: "bg-gray-100 text-gray-700 border-gray-200",
};

export interface Customer {
  id: string;
  type: "pf" | "pj";
  name: string;
  document: string;
  ie_rg?: string | null;
  phone1: string;
  phone2?: string | null;
  email?: string | null;
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;
  notes?: string | null;
  is_active: boolean;
  created_by: string;
  owner_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type OSStatus =
  | "pendente"
  | "andamento"
  | "atrasada"
  | "concluida"
  | "cancelada";

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

export const OS_STATUS_LABELS: Record<OSStatus, string> = {
  pendente: "Pendente",
  andamento: "Em Andamento",
  atrasada: "Atrasada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const OS_STATUS_COLORS: Record<OSStatus, string> = {
  pendente: "bg-yellow-100 text-yellow-700 border-yellow-200",
  andamento: "bg-blue-100 text-blue-700 border-blue-200",
  atrasada: "bg-red-100 text-red-700 border-red-200",
  concluida: "bg-green-100 text-green-700 border-green-200",
  cancelada: "bg-gray-100 text-gray-600 border-gray-200",
};

export type OSPriority = "baixa" | "media" | "alta" | "urgente";

export const OS_PRIORITY_LABELS: Record<OSPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const OS_PRIORITY_COLORS: Record<OSPriority, string> = {
  baixa: "bg-gray-100 text-gray-700 border-gray-200",
  media: "bg-blue-100 text-blue-700 border-blue-200",
  alta: "bg-orange-100 text-orange-700 border-orange-200",
  urgente: "bg-red-100 text-red-700 border-red-200",
};

export const OS_PERIOD_LABELS: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  integral: "Dia inteiro",
};

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

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  produto: "Produto",
  servico: "Serviço",
};

export const PRODUCT_CATEGORIES = [
  "Recarga de Extintor",
  "Manutenção",
  "Inspeção",
  "PPCI",
  "Mangueiras",
  "Hidrantes",
  "Alarmes",
  "Sinalização",
  "Iluminação de Emergência",
  "Peças",
  "Outros",
];

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

export const EXTINGUISHER_TYPES = [
  "Pó Químico ABC",
  "Pó Químico BC",
  "CO2 (Dióxido de Carbono)",
  "Água Pressurizada",
  "Espuma Mecânica",
  "Halon",
  "Outro",
];

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

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  aberta: "Aberta",
  parcial: "Parcial",
  paga: "Paga",
  atrasada: "Atrasada",
  cancelada: "Cancelada",
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  aberta: "bg-yellow-100 text-yellow-700 border-yellow-200",
  parcial: "bg-blue-100 text-blue-700 border-blue-200",
  paga: "bg-green-100 text-green-700 border-green-200",
  atrasada: "bg-red-100 text-red-700 border-red-200",
  cancelada: "bg-gray-100 text-gray-600 border-gray-200",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  boleto: "Boleto",
  pix: "PIX",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
};
