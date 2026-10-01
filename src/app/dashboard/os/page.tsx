import { OSList } from "./os-list";

export default function OSPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
          Ordens de Serviço
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie todas as OS: crie, atribua, acompanhe e conclua atendimentos.
        </p>
      </div>
      <OSList />
    </div>
  );
}
