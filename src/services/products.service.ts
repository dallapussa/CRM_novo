import { getTenantContext } from "@/services/tenant.service";
import type { Product } from "@/types";
import { saveExtinguisherModel } from "./extinguisher-catalog.service";

export type ProductInput = Partial<Omit<Product, "id" | "created_at" | "updated_at">>;

function mapCatalogItem(row: Record<string, any>): Product {
  // Se for extintor com JSON nos metadados, extrai agente e capacidade caso conveniente
  let cost = Number(row.custo_unitario ?? row.custo ?? 0);
  let sale = Number(row.preco_venda ?? row.preco ?? 0);
  let desc = row.descricao;

  if (row.categoria === "Extintor" && row.descricao) {
    try {
      const parsed = JSON.parse(row.descricao);
      if (parsed.custo_normal !== undefined) cost = Number(parsed.custo_normal);
      if (parsed.preco_padrao !== undefined) sale = Number(parsed.preco_padrao);
      desc = `Recarga / Manutenção - ${parsed.agente || ""} ${parsed.capacidade || ""}`.trim();
    } catch {
      // descricao não é JSON, mantém original
    }
  }

  return {
    id: row.id,
    type: (row.tipo || row.type || "servico") as "produto" | "servico",
    category: row.categoria ?? "Outros",
    sku: row.sku || "",
    name: row.nome,
    description: desc || "",
    unit: row.unidade ?? "un",
    cost_price: cost,
    sale_price: sale,
    is_active: row.ativo !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function catalogItemRow(input: ProductInput) {
  const row: Record<string, unknown> = {};
  if (input.type !== undefined) row.tipo = input.type;
  if (input.category !== undefined) row.categoria = input.category;
  if (input.sku !== undefined) row.sku = input.sku;
  if (input.name !== undefined) row.nome = input.name;
  if (input.description !== undefined) row.descricao = input.description;
  if (input.unit !== undefined) row.unidade = input.unit;
  if (input.sale_price !== undefined) row.preco_venda = input.sale_price;
  if (input.cost_price !== undefined) row.custo_unitario = input.cost_price;
  if (input.is_active !== undefined) row.ativo = input.is_active;
  return row;
}

export async function listProducts(includeCosts = true): Promise<Product[]> {
  try {
    const { supabase, companyId } = await getTenantContext();
    let query = supabase
      .from("catalog_items")
      .select("*")
      .is("deleted_at", null)
      .order("nome");

    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Aviso ao listar produtos do catálogo:", error);
      return [];
    }
    const rawProducts = (data || []).map((row) => mapCatalogItem(row));

    // Deduplicação defensiva por nome normalizado (evita duplicidade entre registros da empresa e padrões globais)
    const uniqueMap = new Map<string, Product>();
    for (const p of rawProducts) {
      const key = (p.name || "").trim().toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, p);
      }
    }
    return Array.from(uniqueMap.values());
  } catch (err) {
    console.warn("Aviso ao carregar catálogo:", err);
    return [];
  }
}

export async function saveProduct(input: ProductInput, id?: string): Promise<string> {
  const { supabase, userId, companyId } = await getTenantContext();
  const row = catalogItemRow(input);
  row.updated_at = new Date().toISOString();

  let targetId = id;

  if (targetId) {
    let updateQuery = supabase
      .from("catalog_items")
      .update(row)
      .eq("id", targetId);

    if (companyId) {
      updateQuery = updateQuery.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { error } = await updateQuery;
    if (error) throw error;
  } else {
    targetId = crypto.randomUUID();
    const { error } = await supabase.from("catalog_items").insert({
      id: targetId,
      ...row,
      company_id: companyId || null,
      created_by: userId || null,
    });
    if (error) throw error;
  }

  // Se for categoria 'Extintor', sincroniza com extinguisher-catalog.service
  if (input.category === "Extintor" || (input.name && input.name.toLowerCase().includes("extintor"))) {
    try {
      await saveExtinguisherModel({
        id: targetId,
        nome: input.name,
        preco_padrao: input.sale_price,
        custo_normal: input.cost_price,
        ativo: input.is_active !== false,
      });
    } catch (e) {
      console.warn("Sincronização com custos de extintor:", e);
    }
  }

  return targetId;
}

export async function deleteProduct(id: string): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  let query = supabase
    .from("catalog_items")
    .update({ deleted_at: new Date().toISOString(), ativo: false })
    .eq("id", id);

  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function getProduct(id: string, includeCosts = true): Promise<Product> {
  const { supabase, companyId } = await getTenantContext();
  let query = supabase
    .from("catalog_items")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null);

  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  }

  const { data, error } = await query.single();
  if (error) throw error;
  return mapCatalogItem(data);
}