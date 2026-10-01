import { ExtinguishersList } from "./extinguishers-list";

export default function ExtintoresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
          Extintores
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie os equipamentos dos clientes e controle as validades.
        </p>
      </div>
      <ExtinguishersList />
    </div>
  );
}
