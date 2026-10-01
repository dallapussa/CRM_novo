import { getTenantContext } from "@/services/tenant.service";
import type { Product } from "@/types";

export type ProductInput = Partial<Omit<Product, "id" | "created_at" | "updated_at">>;

function productColumns(includeCosts: boolean) {
  return includeCosts
    ? "*"
    : "id,type,categoria,sku,nome,descricao,unidade,preco,ativo,is_system,company_id,created_at,updated_at";
}

function mapCatalogItem(row: Record<string, any>): Product {
  return {
    id: row.id,
    type: row.type,
    category: row.categoria ?? "Outros",
    sku: row.sku,
    name: row.nome,
    description: row.descricao,
    unit: row.unidade ?? "un",
    cost_price: Number(row.custo ?? 0),
    sale_price: Number(row.preco ?? 0),
    is_active: row.ativo !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function catalogItemRow(input: ProductInput) {
  const row: Record<string, unknown> = {};
  if (input.type !== undefined) row.type = input.type;
  if (input.category !== undefined) row.categoria = input.category;
  if (input.sku !== undefined) row.sku = input.sku;
  if (input.name !== undefined) row.nome = input.name;
  if (input.description !== undefined) row.descricao = input.description;
  if (input.unit !== undefined) row.unidade = input.unit;
  if (input.sale_price !== undefined) row.preco = input.sale_price;
  if (input.cost_price !== undefined) row.custo = input.cost_price;
  if (input.is_active !== undefined) row.ativo = input.is_active;
  return row;
}

export async function listProducts(includeCosts = true): Promise<Product[]> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("catalog_items").select(productColumns(includeCosts))
    .or(`company_id.eq.${companyId},is_system.eq.true`).is("deleted_at", null).order("nome");
  if (error) throw error;
  return (data || []).map((row) => mapCatalogItem(row));
}

export async function saveProduct(input: ProductInput, id?: string): Promise<string> {
  const { supabase, userId, companyId } = await getTenantContext();
  const row = catalogItemRow(input);
  if (id) {
    const { error } = await supabase.from("catalog_items").update(row).eq("company_id", companyId).eq("id", id).eq("is_system", false);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from("catalog_items").insert({
    ...row,
    company_id: companyId,
    created_by: userId,
    is_system: false,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function deleteProduct(id: string): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  const { error } = await supabase.from("catalog_items").delete().eq("company_id", companyId).eq("id", id).eq("is_system", false);
  if (error) throw error;
}

export async function getProduct(id: string, includeCosts = true): Promise<Product> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("catalog_items").select(productColumns(includeCosts))
    .eq("id", id).or(`company_id.eq.${companyId},is_system.eq.true`).is("deleted_at", null).single();
  if (error) throw error;
  return mapCatalogItem(data);
}