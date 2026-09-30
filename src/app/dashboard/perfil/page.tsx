import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function PerfilPage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const email = data?.user?.email || "seu@email.com";

  return (
    <PagePlaceholder
      icon={Settings}
      eyebrow="Minha Conta"
      title="Perfil & Configurações"
      description={`Edite seus dados pessoais, foto, senha e preferências de notificação. E-mail atual: ${email}`}
      status="Em construção"
    />
  );
}
