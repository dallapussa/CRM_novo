import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { Package } from "lucide-react";

export default function ProdutosPage() {
  return (
    <PagePlaceholder
      icon={Package}
      eyebrow="Módulo"
      title="Produtos & Serviços"
      description="Monte seu catálogo de produtos (extintores, mangueiras...) e serviços (recarga, PPCI, inspeção)."
      status="Em construção"
      actionLabel="Adicionar primeiro item"
    />
  );
}
