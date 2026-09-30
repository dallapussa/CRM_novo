import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../../product-form";
import type { Product } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

async function getProduct(id: string): Promise<Product | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as Product;
  } catch {
    return null;
  }
}

export default async function EditarProdutoPage({ params }: PageProps) {
  const product = await getProduct(params.id);
  if (!product) notFound();
  return <ProductForm mode="edit" initialData={product} />;
}
