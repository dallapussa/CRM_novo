import { OSFormLoader } from "@/components/dashboard/entity-loaders";

export default async function EditarOSPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OSFormLoader id={id} />;
}