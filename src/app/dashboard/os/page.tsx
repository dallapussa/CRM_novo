import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OSPage() {
  return (
    <PagePlaceholder
      icon={ClipboardList}
      eyebrow="Módulo Principal"
      title="Ordens de Serviço"
      description="Este é o coração do sistema. Crie, atribua, acompanhe e conclua OS com fotos, relatórios técnicos e assinatura digital."
      status="Em construção"
      actionLabel="Criar primeira OS"
      extra={
        <div className="text-xs text-muted-foreground">
          Ou{" "}
          <Button asChild variant="link" className="h-auto p-0 text-xs">
            <Link href="/dashboard">voltar para o Dashboard</Link>
          </Button>
        </div>
      }
    />
  );
}
