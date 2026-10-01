import { ProductEditLoader } from "@/components/dashboard/entity-loaders";

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductEditLoader id={id} />;
}