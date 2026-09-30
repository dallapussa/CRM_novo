import { createClient } from "@/lib/supabase/server";
import { UsersList } from "./users-list";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getUsers(): Promise<Profile[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Profile[]) || [];
  } catch {
    return [];
  }
}

export default async function UsuariosPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
          Gestão de Usuários
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie os acessos de toda a equipe com perfis e permissões adequados.
        </p>
      </div>
      <UsersList initialUsers={users} />
    </div>
  );
}
