import { UserEditLoader } from "@/components/dashboard/entity-loaders";

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UserEditLoader id={id} />;
}