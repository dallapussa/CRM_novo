import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { ShoppingCart } from "lucide-react";

export default function PedidosPage() {
  return (
    <PagePlaceholder
      icon={ShoppingCart}
      eyebrow="Módulo Financeiro"
      title="Pedidos"
      description="Controle de pedidos de compra e venda. Vincule fornecedores, produtos do catálogo, gere notas fiscais e acompanhe entrega e recebimento."
      status="Em construção"
      actionLabel="Ver Financeiro"
      actionHref="/dashboard/financeiro"
    />
  );
}
