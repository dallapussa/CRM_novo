import { createClient } from "@/lib/supabase/server";
import { ProductsList } from "./products-list";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getProducts(): Promise<Product[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data as Product[]) || [];
  } catch {
    return [];
  }
}

export default async function ProdutosPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
          Produtos & Serviços
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre os itens que serão utilizados nas Ordens de Serviço.
        </p>
      </div>
      <ProductsList initialProducts={products} />
    </div>
  );
}
