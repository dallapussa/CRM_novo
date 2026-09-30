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
