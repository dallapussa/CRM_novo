import { createClient } from "@/lib/supabase/server";
import { OSList } from "./os-list";
import type { ServiceOrder, Customer, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getOrders(): Promise<ServiceOrder[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("service_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as ServiceOrder[]) || [];
  } catch {
    return [];
  }
}

async function getCustomers(): Promise<Pick<Customer, "id" | "name">[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("id,name")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data as any) || [];
  } catch {
    return [];
  }
}

async function getTechnicians(): Promise<Pick<Profile, "id" | "full_name">[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("role", ["admin", "tecnico"])
      .eq("is_active", true)
      .order("full_name", { ascending: true });
    if (error) throw error;
    return (data as any) || [];
  } catch {
    return [];
  }
}

export default async function OSPage() {
  const [orders, customers, technicians] = await Promise.all([
    getOrders(),
    getCustomers(),
    getTechnicians(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
          Ordens de Serviço
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie todas as OS: crie, atribua, acompanhe e conclua atendimentos.
        </p>
      </div>
      <OSList initialOrders={orders} customers={customers} technicians={technicians} />
    </div>
  );
}
