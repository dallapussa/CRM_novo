import { InvoiceEditLoader } from "@/components/dashboard/entity-loaders";

export default async function EditarFaturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceEditLoader id={id} />;
}