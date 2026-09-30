import { createClient } from "@/lib/supabase/server";
import { CustomerDetail } from "./customer-detail";
import type { Customer, ServiceOrder } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

async function getCustomer(id: string): Promise<Customer | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as Customer;
  } catch {
    return null;
  }
}

async function getServiceOrders(customerId: string) {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("service_orders")
      .select(
        `
        *,
        technician:technician_id(full_name)
      `
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as any) || [];
  } catch {
    return [];
  }
}

async function getExtinguishersCount(customerId: string): Promise<number> {
  const supabase = createClient();
  try {
    const { count, error } = await supabase
      .from("extinguishers")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", customerId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function getInvoicesStats(customerId: string): Promise<{
  open: number;
  total: number;
}> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("id,status,amount")
      .eq("customer_id", customerId)
      .eq("type", "receber");
    if (error) return { open: 0, total: 0 };
    const arr: any[] = data || [];
    const open = arr.filter(
      (i) => i.status === "aberta" || i.status === "parcial" || i.status === "atrasada"
    ).length;
    const total = arr.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
    return { open, total };
  } catch {
    return { open: 0, total: 0 };
  }
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const [customer, orders, extCount, invStats] = await Promise.all([
    getCustomer(params.id),
    getServiceOrders(params.id),
    getExtinguishersCount(params.id),
    getInvoicesStats(params.id),
  ]);

  if (!customer) notFound();

  const totalRevenue = (orders || []).reduce(
    (acc: number, o: any) => acc + (Number(o.total) || 0),
    0
  );

  return (
    <CustomerDetail
      customer={customer}
      serviceOrders={orders as any}
      extinguishersCount={extCount}
      openInvoicesCount={invStats.open}
      totalRevenue={totalRevenue}
    />
  );
}
