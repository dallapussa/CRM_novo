import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { FireExtinguisher } from "lucide-react";

export default function ExtintoresPage() {
  return (
    <PagePlaceholder
      icon={FireExtinguisher}
      eyebrow="Módulo"
      title="Extintores & Equipamentos"
      description="Controle o parque de extintores dos seus clientes: validades, recargas, inspeções, número de série e localização."
      status="Em construção"
      actionLabel="Cadastrar primeiro extintor"
    />
  );
}
