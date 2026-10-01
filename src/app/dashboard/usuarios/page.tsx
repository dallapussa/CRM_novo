import { UsersList } from "@/components/users/users-list";

export default function UsuariosPage() {
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
      <UsersList />
    </div>
  );
}
