import { createClient } from "@/lib/supabase/server";
import { CustomersList } from "./customers-list";
import type { Customer } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getCustomers(): Promise<Customer[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Customer[]) || [];
  } catch {
    return [];
  }
}

export default async function ClientesPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
          Clientes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre e gerencie todos os seus clientes: pessoa física e jurídica.
        </p>
      </div>
      <CustomersList initialCustomers={customers} />
    </div>
  );
}

