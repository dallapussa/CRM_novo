import { createClient } from "@/lib/supabase/server";
import { ExtinguishersList } from "./extinguishers-list";
import type { Customer, Extinguisher } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getExtinguishers(): Promise<Extinguisher[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("extinguishers")
      .select("*, customer:customer_id(id,name)")
      .order("expiration_date", { ascending: true });
    if (error) throw error;
    return (data as any) || [];
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
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data as any) || [];
  } catch {
    return [];
  }
}

export default async function ExtintoresPage() {
  const [extinguishers, customers] = await Promise.all([
    getExtinguishers(),
    getCustomers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
          Extintores
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie os equipamentos dos clientes e controle as validades.
        </p>
      </div>
      <ExtinguishersList initialExtinguishers={extinguishers} customers={customers} />
    </div>
  );
}
