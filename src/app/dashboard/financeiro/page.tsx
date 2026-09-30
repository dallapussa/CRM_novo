import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { Wallet } from "lucide-react";

export default function FinanceiroPage() {
  return (
    <PagePlaceholder
      icon={Wallet}
      eyebrow="Módulo"
      title="Financeiro"
      description="Controle completo de contas a receber e a pagar, emissão de boletos, faturas e relatórios."
      status="Em construção"
      actionLabel="Criar primeira fatura"
    />
  );
}
