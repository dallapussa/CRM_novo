import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { DollarSign } from "lucide-react";

export default function CustosPage() {
  return (
    <PagePlaceholder
      icon={DollarSign}
      eyebrow="Restrito — Apenas Administrador"
      title="Custos Financeiros"
      description="Visão completa da margem de lucro: custo de peças, mão de obra técnica, comissões, aluguel, despesas administrativas e markup ideal por serviço."
      status="Em construção"
      actionLabel="Ver Relatórios"
      actionHref="/dashboard/relatorios"
    />
  );
}
