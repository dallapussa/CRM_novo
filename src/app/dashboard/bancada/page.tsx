import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { Wrench } from "lucide-react";

export default function BancadaPage() {
  return (
    <PagePlaceholder
      icon={Wrench}
      eyebrow="Módulo Técnico"
      title="Controle de Bancada"
      description="Acompanhe em tempo real cada equipamento em manutenção: entrada, testes, peças trocadas, recarga, inspeção final e saída. Etiquetas e ordem de serviço automáticas."
      status="Em construção"
      actionLabel="Ver Extintores"
      actionHref="/dashboard/extintores"
    />
  );
}
