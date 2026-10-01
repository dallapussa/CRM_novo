import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { FileSpreadsheet } from "lucide-react";

export default function OrcamentosPage() {
  return (
    <PagePlaceholder
      icon={FileSpreadsheet}
      eyebrow="Módulo Comercial"
      title="Orçamentos"
      description="Em breve você poderá criar orçamentos profissionais com modelos customizáveis, itens do catálogo, aprovação por e-mail e conversão direta em Ordem de Serviço."
      status="Em construção"
      actionLabel="Ver Clientes"
      actionHref="/dashboard/clientes"
    />
  );
}
