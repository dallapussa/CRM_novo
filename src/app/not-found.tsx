import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
      <div className="p-3 bg-red-100 text-red-600 rounded-2xl mb-4">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground mb-2">
        Página não encontrada (404)
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        O endereço solicitado não existe, foi movido ou você não possui permissão para acessá-lo.
      </p>
      <Button asChild className="bg-red-600 hover:bg-red-700 text-white font-semibold">
        <Link href="/dashboard">Voltar para o Início</Link>
      </Button>
    </div>
  );
}
