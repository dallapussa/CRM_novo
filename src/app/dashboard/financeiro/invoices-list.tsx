"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Wallet,
  Edit2,
  Eye,
  Trash2,
  Filter,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Ban,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Invoice, Customer } from "@/lib/types";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface InvoicesListProps {
  initialInvoices: Invoice[];
  customers: Pick<Customer, "id" | "name">[];
}

type InvoiceStatusKey = keyof typeof INVOICE_STATUS_LABELS;

const STATUS_ICONS: Record<InvoiceStatusKey, typeof Clock> = {
  aberta: Clock,
  parcial: TrendingDown,
  paga: CheckCircle2,
  atrasada: AlertTriangle,
  cancelada: Ban,
};

export function InvoicesList({ initialInvoices, customers }: InvoicesListProps) {
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [deleteItem, setDeleteItem] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      if (customerFilter !== "all" && i.customer_id !== customerFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const customerName = customers.find((c) => c.id === i.customer_id)?.name || "";
        const haystack = [
          String(i.number),
          i.description,
          customerName,
          i.payment_method,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [invoices, search, customerFilter, statusFilter, typeFilter, customers]);

  async function handleDelete() {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", deleteItem.id);
      if (error) throw error;
      setInvoices((prev) => prev.filter((i) => i.id !== deleteItem.id));
      toast({
        variant: "success",
        title: "Fatura excluída",
        description: `Fatura #${deleteItem.number} removida com sucesso.`,
      });
      setDeleteItem(null);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: err?.message || "Não foi possível excluir a fatura.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleMarkPaid(invoice: Invoice) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paga",
          amount_paid: invoice.amount,
          payment_date: today,
        })
        .eq("id", invoice.id);
      if (error) throw error;
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === invoice.id
            ? { ...i, status: "paga", amount_paid: i.amount, payment_date: today }
            : i
        )
      );
      toast({
        variant: "success",
        title: "Fatura marcada como paga",
        description: `Fatura #${invoice.number} atualizada.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: err?.message || "Não foi possível atualizar o status.",
      });
    }
  }

  function clearFilters() {
    setSearch("");
    setCustomerFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
  }

  const hasActiveFilters =
    search || customerFilter !== "all" || statusFilter !== "all" || typeFilter !== "all";

  const receber = invoices.filter((i) => i.type === "receber");
  const pagar = invoices.filter((i) => i.type === "pagar");
  const totalReceber = receber.reduce((acc, i) => acc + (Number(i.amount) - Number(i.amount_paid || 0)), 0);
  const totalPagar = pagar.reduce((acc, i) => acc + (Number(i.amount) - Number(i.amount_paid || 0)), 0);
  const atrasadas = invoices.filter((i) => i.status === "atrasada").length;
  const totalRecebido = receber
    .filter((i) => i.status === "paga")
    .reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              A Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-green-700">
              {formatCurrency(totalReceber)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {receber.length} fatura(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-red-600" />
              A Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-red-700">
              {formatCurrency(totalPagar)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pagar.length} fatura(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-indigo-600" />
              Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-indigo-700">
              {formatCurrency(totalRecebido)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">faturas pagas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-red-600">{atrasadas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              necessitam atenção
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
              <X className="mr-1.5 h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="receber">A Receber</SelectItem>
                <SelectItem value="pagar">A Pagar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {Object.entries(INVOICE_STATUS_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[170px] h-10">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos clientes</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button asChild className="h-10">
            <Link href="/dashboard/financeiro/nova">
              <Plus className="mr-1.5 h-4 w-4" />
              Nova Fatura
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-primary">
                <Wallet className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-lg">
                  {invoices.length === 0
                    ? "Nenhuma fatura criada ainda"
                    : "Nenhuma fatura encontrada"}
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {invoices.length === 0
                    ? "Comece a controlar seu financeiro criando a primeira fatura."
                    : "Tente ajustar os filtros de busca."}
                </p>
              </div>
              {invoices.length === 0 && (
                <Button asChild className="mt-2">
                  <Link href="/dashboard/financeiro/nova">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Criar primeira fatura
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Cliente / Fornecedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[200px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((i) => {
                    const customer = customers.find((c) => c.id === i.customer_id);
                    const statusKey = i.status as InvoiceStatusKey;
                    const StatusIcon = STATUS_ICONS[statusKey] || Clock;
                    const isPagar = i.type === "pagar";
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-semibold">#{i.number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{customer?.name || "—"}</p>
                            {i.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {i.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              isPagar
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-green-50 text-green-700 border-green-200"
                            }
                          >
                            {isPagar ? "A Pagar" : "A Receber"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(i.due_date)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(i.amount)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatCurrency(i.amount_paid || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={INVOICE_STATUS_COLORS[statusKey]}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {INVOICE_STATUS_LABELS[statusKey]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            {(i.status === "aberta" || i.status === "atrasada" || i.status === "parcial") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Marcar como paga"
                                onClick={() => handleMarkPaid(i)}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Ver detalhes"
                            >
                              <Link href={`/dashboard/financeiro/${i.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Editar"
                            >
                              <Link href={`/dashboard/financeiro/${i.id}/editar`}>
                                <Edit2 className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Excluir"
                              onClick={() => setDeleteItem(i)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir fatura?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a fatura{" "}
              <span className="font-semibold">#{deleteItem?.number}</span>? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteItem(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
