import { InvoiceDetailLoader } from "@/components/dashboard/entity-loaders";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceDetailLoader id={id} />;
}