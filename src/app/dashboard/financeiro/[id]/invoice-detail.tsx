"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit2,
  Printer,
  Wallet,
  User,
  FileText,
  Calendar,
  CreditCard,
  ClipboardList,
  CheckCircle2,
  Save,
  DollarSign,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type {
  Invoice,
  Customer,
  ServiceOrder,
  InvoiceStatus,
} from "@/types";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
} from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useUpdateInvoice } from "@/hooks/useInvoices";

type InvoiceStatusKey = keyof typeof INVOICE_STATUS_LABELS;

interface InvoiceDetailProps {
  invoice: Invoice;
  customer: Customer | null;
  serviceOrder: ServiceOrder | null;
}

function parseMoney(v?: string): number {
  if (!v) return 0;
  const cleaned = v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export function InvoiceDetail({ invoice, customer, serviceOrder }: InvoiceDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const updateMutation = useUpdateInvoice();
  const isUpdating = updateMutation.isPending;
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status);
  const [amountPaid, setAmountPaid] = useState(
    invoice.amount_paid != null ? String(invoice.amount_paid).replace(".", ",") : "0"
  );
  const [paymentDate, setPaymentDate] = useState(invoice.payment_date || "");
  const [paymentMethod, setPaymentMethod] = useState(invoice.payment_method || "");

  const remaining = Math.max(0, (Number(invoice.amount) || 0) - parseMoney(amountPaid));
  const statusKey = status as InvoiceStatusKey;
  const isPagar = invoice.type === "pagar";

  async function handleUpdate() {
    try {
      const paid = parseMoney(amountPaid);
      let computedStatus: InvoiceStatus = status;
      if (paid >= (Number(invoice.amount) || 0) && Number(invoice.amount) > 0) {
        computedStatus = "paga";
      } else if (paid > 0) {
        computedStatus = "parcial";
      }

      await updateMutation.mutateAsync({ id: invoice.id, patch: {
          status: computedStatus,
          amount_paid: paid,
          payment_date: paymentDate || null,
          payment_method: paymentMethod || null,
        } });

      toast({
        variant: "success",
        title: "Fatura atualizada!",
        description: "Pagamento e status atualizados com sucesso.",
      });
      router.refresh();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: err?.message || "Não foi possível atualizar a fatura.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9">
            <Link href="/dashboard/financeiro">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
                Fatura #{invoice.number}
              </h1>
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
              <Badge variant="outline" className={INVOICE_STATUS_COLORS[statusKey]}>
                {INVOICE_STATUS_LABELS[statusKey]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Emitida em {formatDate(invoice.issue_date)} · Vencimento:{" "}
              {formatDate(invoice.due_date)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/financeiro/${invoice.id}/editar`}>
              <Edit2 className="mr-1.5 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="mr-1.5 h-4 w-4" />
            Imprimir / Boleto
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base">Cliente / Fornecedor</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-lg">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.type === "pj" ? "PJ" : "PF"}
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/clientes/${customer.id}`}>
                      Ver cadastro completo
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>
            )}
          </CardContent>
        </Card>

        <Card className={isPagar ? "border-t-4 border-t-red-500" : "border-t-4 border-t-green-500"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              Total {isPagar ? "a Pagar" : "a Receber"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className={`text-3xl font-bold font-display ${isPagar ? "text-red-700" : "text-green-700"}`}>
              {formatCurrency(invoice.amount)}
            </p>
            <div className="space-y-1 text-sm pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pago:</span>
                <span className="font-medium text-green-700">
                  {formatCurrency(invoice.amount_paid || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {remaining > 0 ? "Restante:" : "Situação:"}
                </span>
                <span className={`font-bold ${remaining === 0 ? "text-green-700" : isPagar ? "text-red-700" : "text-orange-700"}`}>
                  {remaining === 0 ? "Liquidado ✔" : formatCurrency(remaining)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Detalhes da Fatura</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground">Data de emissão:</span>
                <p className="font-medium">{formatDate(invoice.issue_date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Data de vencimento:</span>
                <p className="font-medium">{formatDate(invoice.due_date)}</p>
              </div>
              {invoice.payment_date && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Data de pagamento:</span>
                  <p className="font-medium text-green-700">
                    {formatDate(invoice.payment_date)}
                  </p>
                </div>
              )}
              {invoice.payment_method && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Método de pagamento:</span>
                  <p className="font-medium flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    {PAYMENT_METHOD_LABELS[invoice.payment_method] || invoice.payment_method}
                  </p>
                </div>
              )}
              {serviceOrder && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Vinculada à OS:</span>
                  <p className="font-medium flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5" />
                    <Link
                      href={`/dashboard/os/${serviceOrder.id}`}
                      className="text-primary hover:underline"
                    >
                      OS #{serviceOrder.number} →
                    </Link>
                  </p>
                </div>
              )}
            </div>
            <Separator />
            <div>
              <span className="text-muted-foreground">Descrição:</span>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{invoice.description}</p>
            </div>
            {invoice.notes && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground">Observações internas:</span>
                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap leading-relaxed text-xs">
                    {invoice.notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Atualizar Pagamento</CardTitle>
            </div>
            <CardDescription>
              Marque pagamentos parciais ou a quitação total.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as InvoiceStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INVOICE_STATUS_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Método de Pagamento</Label>
                <Select
                  value={paymentMethod || ""}
                  onValueChange={(v) => setPaymentMethod(v || "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={paymentDate || ""}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor Pago (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleUpdate} disabled={isUpdating}>
                <Save className="mr-2 h-4 w-4" />
                {isUpdating ? "Salvando..." : "Salvar Atualizações"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
