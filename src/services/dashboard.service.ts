import { getTenantContext } from "@/services/tenant.service";
import type { UserRole } from "@/types";

export interface DashboardStats {
  osCount: number;
  customerCount: number;
  userCount: number;
  recentOs: { id: string; number: number; status: string; total: number; created_at: string }[];
  totalRevenue: number;
}

export async function getDashboardStats(role: UserRole): Promise<DashboardStats> {
  const { supabase, companyId } = await getTenantContext();
  const [orders, customers, users] = await Promise.all([
    supabase.from("service_orders").select("id,numero,status,total,created_at", { count: "exact" }).eq("company_id", companyId).is("deleted_at", null).limit(5).order("created_at", { ascending: false }),
    role !== "cliente" && role !== "terceiro" ? supabase.from("clients").select("id", { count: "exact", head: true }).eq("company_id", companyId).is("deleted_at", null) : Promise.resolve({ data: [], count: 0, error: null }),
    role === "admin" ? supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("company_id", companyId).is("deleted_at", null) : Promise.resolve({ data: [], count: 0, error: null }),
  ]);
  if (orders.error) throw orders.error;
  if (customers.error) throw customers.error;
  if (users.error) throw users.error;
  const recentOs = (orders.data || []).map((order) => ({
    id: order.id,
    number: Number(order.numero),
    status: ({
      Pendente: "pendente",
      "Em andamento": "andamento",
      Atrasada: "atrasada",
      "Concluída": "concluida",
      Cancelada: "cancelada",
    } as Record<string, string>)[order.status] ?? "pendente",
    total: Number(order.total ?? 0),
    created_at: order.created_at,
  }));
  return {
    osCount: orders.count ?? 0,
    customerCount: customers.count ?? 0,
    userCount: users.count ?? 0,
    recentOs,
    totalRevenue: recentOs.reduce((total, order) => total + Number(order.total || 0), 0),
  };
}