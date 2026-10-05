import { getTenantContext } from "@/services/tenant.service";
import type { Quote, QuoteItem, QuoteStatus } from "@/types";

export interface QuoteInput {
  client_id: string;
  template_id?: string | null;
  issued_at?: string;
  expires_at?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string | null;
  items: Omit<QuoteItem, "id" | "quote_id" | "created_at">[];
}

function mapQuote(row: Record<string, any>): Quote {
  return {
    id: row.id,
    company_id: row.company_id,
    client_id: row.client_id,
    template_id: row.template_id,
    number: Number(row.numero || 1),
    status: (row.status as QuoteStatus) || "Rascunho",
    issued_at: row.issued_at || row.created_at,
    expires_at: row.expires_at,
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    total: Number(row.total || 0),
    notes: row.notes,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer: row.client ? { id: row.client.id, name: row.client.razao_social } : null,
  };
}

export async function listQuotes(): Promise<Quote[]> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase
    .from("quotes")
    .select("*,client:client_id(id,razao_social)")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapQuote);
}

export async function getQuote(id: string): Promise<{ quote: Quote; items: QuoteItem[] }> {
  const { supabase, companyId } = await getTenantContext();
  const { data: quoteData, error: quoteError } = await supabase
    .from("quotes")
    .select("*,client:client_id(id,razao_social)")
    .eq("company_id", companyId)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (quoteError) throw quoteError;

  const { data: itemsData, error: itemsError } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (itemsError) throw itemsError;

  const items: QuoteItem[] = (itemsData || []).map((it) => ({
    id: it.id,
    quote_id: it.quote_id,
    catalog_item_id: it.catalog_item_id,
    description: it.descricao,
    quantity: Number(it.quantidade || 1),
    unit: it.unidade || "un",
    unit_price: Number(it.unit_price || 0),
    total: Number(it.total || 0),
    created_at: it.created_at,
  }));

  return { quote: mapQuote(quoteData), items };
}

export async function getNextQuoteNumber(): Promise<number> {
  const { supabase, companyId } = await getTenantContext();
  const { data } = await supabase
    .from("quotes")
    .select("numero")
    .eq("company_id", companyId)
    .order("numero", { ascending: false })
    .limit(1);

  if (!data || data.length === 0 || !data[0].numero) {
    return 1001;
  }
  return Number(data[0].numero) + 1;
}

export async function saveQuote(input: QuoteInput, id?: string): Promise<string> {
  const { supabase, companyId, userId } = await getTenantContext();

  let quoteId = id;

  if (id) {
    const { error } = await supabase
      .from("quotes")
      .update({
        client_id: input.client_id,
        template_id: input.template_id || null,
        expires_at: input.expires_at || null,
        subtotal: input.subtotal,
        discount: input.discount,
        total: input.total,
        notes: input.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) throw error;

    // Remove existing items and re-insert
    await supabase.from("quote_items").delete().eq("quote_id", id);
  } else {
    const nextNumber = await getNextQuoteNumber();
    const { data, error } = await supabase
      .from("quotes")
      .insert({
        company_id: companyId,
        client_id: input.client_id,
        template_id: input.template_id || null,
        numero: nextNumber,
        status: "Rascunho",
        issued_at: input.issued_at || new Date().toISOString().slice(0, 10),
        expires_at: input.expires_at || null,
        subtotal: input.subtotal,
        discount: input.discount,
        total: input.total,
        notes: input.notes || null,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) throw error;
    quoteId = data.id;
  }

  // Insert items
  if (input.items.length > 0 && quoteId) {
    const itemsToInsert = input.items.map((it) => ({
      quote_id: quoteId,
      catalog_item_id: it.catalog_item_id || null,
      descricao: it.description,
      quantidade: it.quantity,
      unidade: it.unit || "un",
      unit_price: it.unit_price,
      total: it.total,
      created_by: userId,
    }));

    const { error: itemsError } = await supabase.from("quote_items").insert(itemsToInsert);
    if (itemsError) throw itemsError;
  }

  return quoteId!;
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  const { error } = await supabase
    .from("quotes")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteQuote(id: string): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  const { error } = await supabase
    .from("quotes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", id);

  if (error) throw error;
}

/**
 * Converte um Orçamento Aprovado diretamente em uma Ordem de Serviço (OS)
 */
export async function convertQuoteToOS(quoteId: string): Promise<string> {
  const { supabase, companyId, userId } = await getTenantContext();
  const { quote, items } = await getQuote(quoteId);

  // Obtém próximo número de OS
  const { data: osRows } = await supabase
    .from("service_orders")
    .select("numero")
    .eq("company_id", companyId)
    .order("numero", { ascending: false })
    .limit(1);

  const nextOSNumber = osRows && osRows.length > 0 && osRows[0].numero ? Number(osRows[0].numero) + 1 : 1;

  // Cria a OS
  const { data: newOS, error: osError } = await supabase
    .from("service_orders")
    .insert({
      company_id: companyId,
      client_id: quote.client_id,
      numero: nextOSNumber,
      status: "Pendente",
      tipo: "Manutenção e Recarga",
      descricao: `OS originada do Orçamento #${quote.number}. ${quote.notes || ""}`,
      total: quote.total,
      subtotal: quote.subtotal,
      discount: quote.discount,
      created_by: userId,
    })
    .select("id")
    .single();

  if (osError) throw osError;

  // Insere itens na OS se houver
  if (items.length > 0) {
    const osItems = items.map((it) => ({
      service_order_id: newOS.id,
      catalog_item_id: it.catalog_item_id || null,
      descricao: it.description,
      quantidade: it.quantity,
      unit_price: it.unit_price,
      total: it.total,
      item_type: "servico",
      created_by: userId,
    }));
    await supabase.from("service_order_items").insert(osItems);
  }

  // Atualiza status do orçamento para "Convertido"
  await updateQuoteStatus(quoteId, "Convertido");

  return newOS.id;
}
