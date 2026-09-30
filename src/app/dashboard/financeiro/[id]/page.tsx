import { createClient } from "@/lib/supabase/server";
import { InvoiceDetail } from "./invoice-detail";
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

async function getCustomer(customerId: string): Promise<Customer | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();
    if (error) return null;
    return data as Customer;
  } catch {
    return null;
  }
}

async function getServiceOrder(osId: string | null): Promise<ServiceOrder | null> {
  if (!osId) return null;
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("service_orders")
      .select("*")
      .eq("id", osId)
      .single();
    if (error) return null;
    return data as ServiceOrder;
  } catch {
    return null;
  }
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const invoice = await getInvoice(params.id);
  if (!invoice) notFound();

  const [customer, serviceOrder] = await Promise.all([
    getCustomer(invoice.customer_id),
    getServiceOrder(invoice.service_order_id ?? null),
  ]);

  return (
    <InvoiceDetail
      invoice={invoice}
      customer={customer}
      serviceOrder={serviceOrder}
    />
  );
}
