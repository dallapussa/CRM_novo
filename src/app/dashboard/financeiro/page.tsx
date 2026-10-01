import { InvoicesList } from "./invoices-list";

export default function FinanceiroPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
          Financeiro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Controle de contas a receber e a pagar, acompanhe vencimentos e recebimentos.
        </p>
      </div>
      <InvoicesList />
    </div>
  );
}
