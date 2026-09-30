import { createClient } from "@/lib/supabase/server";
import { InvoiceForm } from "../../invoice-form";
import type { Invoice, Customer, ServiceOrder } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as Invoice;
  } catch {
    return null;
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

export default async function EditarFaturaPage({ params }: PageProps) {
  const [invoice, customers, serviceOrders] = await Promise.all([
    getInvoice(params.id),
    getCustomers(),
    getServiceOrders(),
  ]);

  if (!invoice) notFound();

  return (
    <InvoiceForm
      mode="edit"
      initialData={invoice}
      customers={customers}
      serviceOrders={serviceOrders}
    />
  );
}
