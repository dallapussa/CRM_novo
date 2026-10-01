import { ProductsList } from "./products-list";

export default function ProdutosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
          Produtos & Serviços
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre os itens que serão utilizados nas Ordens de Serviço.
        </p>
      </div>
      <ProductsList />
    </div>
  );
}
