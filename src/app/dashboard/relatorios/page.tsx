import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { BarChart3 } from "lucide-react";

export default function RelatoriosPage() {
  return (
    <PagePlaceholder
      icon={BarChart3}
      eyebrow="Módulo Financeiro"
      title="Relatórios"
      description="Painel completo com DRE, fluxo de caixa, vendas por período, comissão da equipe, clientes inadimplentes, extintores a vencer e muito mais. Exporta PDF e Excel."
      status="Em construção"
      actionLabel="Ir ao Dashboard"
      actionHref="/dashboard"
    />
  );
}
