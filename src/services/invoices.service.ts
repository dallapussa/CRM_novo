import { getTenantContext } from "@/services/tenant.service";
import type { Invoice } from "@/types";

export type InvoiceInput = Omit<Invoice, "id" | "number" | "created_at" | "updated_at" | "customer">;

function statusFromReceipt(status: string): Invoice["status"] {
  if (status === "Parcial") return "parcial";
  if (status === "Recebido") return "paga";
  if (status === "Atrasado") return "atrasada";
  if (status === "Cancelado") return "cancelada";
  return "aberta";
}

function statusToReceipt(status: Invoice["status"]) {
  return { aberta: "Pendente", parcial: "Parcial", paga: "Recebido", atrasada: "Atrasado", cancelada: "Cancelado" }[status];
}

function mapReceipt(row: Record<string, any>): Invoice {
  return {
    id: row.id,
    number: Number(row.numero),
    customer_id: row.client_id,
    service_order_id: row.service_order_id,
    type: row.invoice_type,
    status: statusFromReceipt(row.status),
    description: row.notes ?? "",
    amount: Number(row.amount ?? 0),
    amount_paid: Number(row.amount_paid ?? 0),
    due_date: row.due_at ?? "",
    issue_date: row.issued_at ?? row.created_at?.slice(0, 10) ?? "",
    payment_date: row.received_at,
    payment_method: row.payment_method,
    notes: row.notes,
    created_by: row.created_by ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer: row.client ? { id: row.client.id, name: row.client.razao_social } : null,
  };
}

function receiptRow(input: Partial<InvoiceInput>) {
  const row: Record<string, unknown> = {};
  if (input.customer_id !== undefined) row.client_id = input.customer_id;
  if (input.service_order_id !== undefined) row.service_order_id = input.service_order_id;
  if (input.type !== undefined) row.invoice_type = input.type;
  if (input.status !== undefined) row.status = statusToReceipt(input.status);
  if (input.amount !== undefined) row.amount = input.amount;
  if (input.amount_paid !== undefined) row.amount_paid = input.amount_paid;
  if (input.due_date !== undefined) row.due_at = input.due_date;
  if (input.issue_date !== undefined) row.issued_at = input.issue_date;
  if (input.payment_date !== undefined) row.received_at = input.payment_date;
  if (input.payment_method !== undefined) row.payment_method = input.payment_method;
  if (input.description !== undefined || input.notes !== undefined) row.notes = input.description ?? input.notes;
  return row;
}

export async function listInvoices(): Promise<Invoice[]> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("receipts")
    .select("*,client:clients!inner(id,razao_social,company_id)")
    .eq("company_id", companyId).eq("client.company_id", companyId).is("deleted_at", null)
    .order("due_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => mapReceipt(row));
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("receipts")
    .select("*,client:clients!inner(id,razao_social,company_id)")
    .eq("company_id", companyId).eq("client.company_id", companyId).eq("id", id).is("deleted_at", null).single();
  if (error) throw error;
  return mapReceipt(data);
}

export async function saveInvoice(input: Partial<InvoiceInput>, id?: string): Promise<string> {
  const { supabase, userId, companyId } = await getTenantContext();
  const row = receiptRow(input);
  if (id) {
    const { error } = await supabase.from("receipts").update(row).eq("company_id", companyId).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from("receipts").insert({ ...row, company_id: companyId, created_by: userId })
    .select("id").single();
  if (error) throw error;
  return data.id;
}

export async function deleteInvoice(id: string): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  const { error } = await supabase.from("receipts").delete().eq("company_id", companyId).eq("id", id);
  if (error) throw error;
}

export async function markInvoicePaid(invoice: Invoice): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  const { error } = await supabase.from("receipts").update({
    status: "Recebido",
    amount_paid: invoice.amount,
    received_at: new Date().toISOString(),
  }).eq("company_id", companyId).eq("id", invoice.id);
  if (error) throw error;
}

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  const { error } = await supabase.from("receipts").update(receiptRow(patch)).eq("company_id", companyId).eq("id", id);
  if (error) throw error;
}