import { CustomersList } from "@/components/clients/customers-list";

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
          Clientes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre e gerencie todos os seus clientes: pessoa física e jurídica.
        </p>
      </div>
      <CustomersList />
    </div>
  );
}

