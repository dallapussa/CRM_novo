import { createClient } from "@/lib/supabase/server";
import { InvoicesList } from "./invoices-list";
import type { Invoice, Customer } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getInvoices(): Promise<Invoice[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("due_date", { ascending: false });
    if (error) throw error;
    return (data as Invoice[]) || [];
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

export default async function FinanceiroPage() {
  const [invoices, customers] = await Promise.all([
    getInvoices(),
    getCustomers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
          Financeiro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Controle de contas a receber e a pagar, acompanhe vencimentos e recebimentos.
        </p>
      </div>
      <InvoicesList initialInvoices={invoices} customers={customers} />
    </div>
  );
}
