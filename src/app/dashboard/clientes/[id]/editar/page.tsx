import { CustomerEditLoader } from "@/components/dashboard/entity-loaders";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerEditLoader id={id} />;
}
