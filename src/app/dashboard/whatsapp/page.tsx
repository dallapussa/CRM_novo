import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { MessageCircle } from "lucide-react";

export default function WhatsappPage() {
  return (
    <PagePlaceholder
      icon={MessageCircle}
      eyebrow="Módulo Comercial"
      title="WhatsApp Oficial"
      description="Integração com WhatsApp API oficial: envio de senha temporária, confirmação de OS, lembretes de vencimento de extintor, recibos e cobranças automáticas."
      status="Em construção"
      actionLabel="Ver Leads"
      actionHref="/dashboard/leads"
    />
  );
}
