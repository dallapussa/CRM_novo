import { OSDetailLoader } from "@/components/dashboard/entity-loaders";

export default async function OSDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OSDetailLoader id={id} />;
}