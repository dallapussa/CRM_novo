import { createClient } from "@/lib/supabase/server";
import { UserForm } from "../../user-form";
import type { Profile } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

async function getUser(id: string): Promise<Profile | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as Profile;
  } catch {
    return null;
  }
}

export default async function EditarUsuarioPage({ params }: PageProps) {
  const user = await getUser(params.id);
  if (!user) notFound();

  return <UserForm mode="edit" initialData={user} />;
}
