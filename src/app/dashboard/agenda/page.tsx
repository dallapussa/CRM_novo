import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { CalendarDays } from "lucide-react";

export default function AgendaPage() {
  return (
    <PagePlaceholder
      icon={CalendarDays}
      eyebrow="Módulo Comercial / Operações"
      title="Agenda"
      description="Calendário unificado de visitas técnicas, OS agendadas, follow-ups comerciais e compromissos. Arrasta e solta, visão por dia/semana/mês e lembretes por WhatsApp."
      status="Em construção"
      actionLabel="Ver OS"
      actionHref="/dashboard/os"
    />
  );
}
