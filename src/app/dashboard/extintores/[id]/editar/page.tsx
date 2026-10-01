import { ExtinguisherEditLoader } from "@/components/dashboard/entity-loaders";

export default async function EditarExtintorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExtinguisherEditLoader id={id} />;
}