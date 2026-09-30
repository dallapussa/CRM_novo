import { createClient } from "@/lib/supabase/server";
import { InvoiceForm } from "../invoice-form";
import type { Customer, ServiceOrder } from "@/lib/types";

export const dynamic = "force-dynamic";

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

async function getServiceOrders(): Promise<
  Pick<ServiceOrder, "id" | "number" | "customer_id">[]
> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("service_orders")
      .select("id,number,customer_id")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as any) || [];
  } catch {
    return [];
  }
}

export default async function NovaFaturaPage() {
  const [customers, serviceOrders] = await Promise.all([
    getCustomers(),
    getServiceOrders(),
  ]);

  return (
    <InvoiceForm
      mode="create"
      customers={customers}
      serviceOrders={serviceOrders}
    />
  );
}
