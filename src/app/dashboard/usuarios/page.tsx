import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { Users } from "lucide-react";

export default function UsuariosPage() {
  return (
    <PagePlaceholder
      icon={Users}
      eyebrow="Módulo"
      title="Gestão de Usuários"
      description="Gerencie os acessos de toda a sua equipe. Crie, edite e inative usuários com os perfis corretos."
      status="Em construção"
      actionLabel="Criar primeiro usuário"
    />
  );
}
