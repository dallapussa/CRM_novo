import { CustomerDetailLoader } from "@/components/dashboard/entity-loaders";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetailLoader id={id} />;
}