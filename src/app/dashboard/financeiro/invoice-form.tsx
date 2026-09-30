"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Wallet,
  User,
  FileText,
  Calendar,
  DollarSign,
  CreditCard,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Invoice, Customer, ServiceOrder, InvoiceStatus, InvoiceType } from "@/lib/types";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

const invoiceSchema = z.object({
  customer_id: z.string().min(1, { message: "Selecione o cliente/fornecedor" }),
  service_order_id: z.string().optional(),
  type: z.enum(["receber", "pagar"]),
  status: z.enum(["aberta", "parcial", "paga", "atrasada", "cancelada"]),
  description: z.string().min(3, { message: "Descreva a fatura (mín. 3 caracteres)" }),
  amount: z.string().min(1, { message: "Informe o valor total" }),
  amount_paid: z.string().optional(),
  due_date: z.string().min(1, { message: "Informe a data de vencimento" }),
  issue_date: z.string().min(1, { message: "Informe a data de emissão" }),
  payment_date: z.string().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  initialData?: Invoice;
  customers: Pick<Customer, "id" | "name">[];
  serviceOrders: Pick<ServiceOrder, "id" | "number" | "customer_id">[];
  mode: "create" | "edit";
}

function parseMoney(v?: string): number {
  if (!v) return 0;
  const cleaned = v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export function InvoiceForm({
  initialData,
  customers,
  serviceOrders,
  mode,
}: InvoiceFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const today = new Date().toISOString().slice(0, 10);

  const [values, setValues] = useState<FormValues>({
    customer_id: initialData?.customer_id || "",
    service_order_id: initialData?.service_order_id || "",
    type: initialData?.type || "receber",
    status: initialData?.status || "aberta",
    description: initialData?.description || "",
    amount:
      initialData?.amount != null
        ? String(initialData.amount).replace(".", ",")
        : "",
    amount_paid:
      initialData?.amount_paid != null
        ? String(initialData.amount_paid).replace(".", ",")
        : "0",
    due_date: initialData?.due_date || today,
    issue_date: initialData?.issue_date || today,
    payment_date: initialData?.payment_date || "",
    payment_method: initialData?.payment_method || "",
    notes: initialData?.notes || "",
  });

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[key as string];
        return n;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const parsed = invoiceSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as string;
        if (!errs[k]) errs[k] = i.message;
      });
      setErrors(errs);
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        title: "Verifique o formulário",
        description: "Alguns campos precisam ser corrigidos.",
      });
      return;
    }

    const amount = parseMoney(values.amount);
    const amountPaid = parseMoney(values.amount_paid);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let computedStatus: InvoiceStatus = values.status;
      if (amountPaid >= amount && amount > 0) {
        computedStatus = "paga";
      } else if (amountPaid > 0) {
        computedStatus = "parcial";
      }

      const payload = {
        customer_id: values.customer_id,
        service_order_id: values.service_order_id || null,
        type: values.type as InvoiceType,
        status: computedStatus,
        description: values.description.trim(),
        amount,
        amount_paid: amountPaid,
        due_date: values.due_date,
        issue_date: values.issue_date,
        payment_date: values.payment_date || null,
        payment_method: values.payment_method || null,
        notes: values.notes?.trim() || null,
      };

      if (mode === "create") {
        const { error } = await supabase.from("invoices").insert({
          ...payload,
          created_by: user.id,
        });
        if (error) throw error;
        toast({
          variant: "success",
          title: "Fatura criada!",
          description: "Registro financeiro salvo com sucesso.",
        });
        router.push("/dashboard/financeiro");
      } else if (initialData) {
        const { error } = await supabase
          .from("invoices")
          .update(payload)
          .eq("id", initialData.id);
        if (error) throw error;
        toast({
          variant: "success",
          title: "Fatura atualizada!",
          description: "Alterações salvas com sucesso.",
        });
        router.push(`/dashboard/financeiro/${initialData.id}`);
      }
      router.refresh();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: err?.message || "Não foi possível salvar a fatura.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const amount = parseMoney(values.amount);
  const amountPaid = parseMoney(values.amount_paid);
  const remaining = Math.max(0, amount - amountPaid);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <Link href="/dashboard/financeiro">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
            {mode === "create" ? "Nova Fatura" : "Editar Fatura"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "create"
              ? "Registre uma nova conta a receber ou a pagar."
              : "Atualize as informações da fatura."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Dados da Fatura</CardTitle>
            </div>
            <CardDescription>Tipo, cliente e vínculo com OS</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Tipo de Fatura *</Label>
                <Select
                  value={values.type}
                  onValueChange={(v) => setField("type", v as InvoiceType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receber">
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        A Receber
                      </Badge>
                    </SelectItem>
                    <SelectItem value="pagar">
                      <Badge
                        variant="outline"
                        className="bg-red-50 text-red-700 border-red-200"
                      >
                        A Pagar
                      </Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={values.status}
                  onValueChange={(v) => setField("status", v as InvoiceStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INVOICE_STATUS_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={INVOICE_STATUS_COLORS[k as InvoiceStatus]}
                          >
                            {l}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  <User className="inline h-3.5 w-3.5 mr-1" />
                  Cliente / Fornecedor *
                </Label>
                <Select
                  value={values.customer_id}
                  onValueChange={(v) => setField("customer_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customer_id && (
                  <p className="text-xs text-red-600">{errors.customer_id}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Ordem de Serviço (opcional)</Label>
                <Select
                  value={values.service_order_id || ""}
                  onValueChange={(v) =>
                    setField("service_order_id", v || undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vincular a uma OS" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceOrders.map((os) => {
                      const c = customers.find((cu) => cu.id === os.customer_id);
                      return (
                        <SelectItem key={os.id} value={os.id}>
                          OS #{os.number} {c ? `· ${c.name}` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Método de Pagamento</Label>
                <Select
                  value={values.payment_method || ""}
                  onValueChange={(v) =>
                    setField("payment_method", v || undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" /> {l}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                <FileText className="inline h-3.5 w-3.5 mr-1" />
                Descrição *
              </Label>
              <Textarea
                rows={3}
                value={values.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Ex: Recarga de extintores - Cliente XYZ"
              />
              {errors.description && (
                <p className="text-xs text-red-600">{errors.description}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Valores & Datas</CardTitle>
            </div>
            <CardDescription>Valores e cronograma de pagamento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>
                  <Calendar className="inline h-3.5 w-3.5 mr-1" />
                  Emissão *
                </Label>
                <Input
                  type="date"
                  value={values.issue_date}
                  onChange={(e) => setField("issue_date", e.target.value)}
                />
                {errors.issue_date && (
                  <p className="text-xs text-red-600">{errors.issue_date}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>
                  <Calendar className="inline h-3.5 w-3.5 mr-1" />
                  Vencimento *
                </Label>
                <Input
                  type="date"
                  value={values.due_date}
                  onChange={(e) => setField("due_date", e.target.value)}
                />
                {errors.due_date && (
                  <p className="text-xs text-red-600">{errors.due_date}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Pagamento (opcional)</Label>
                <Input
                  type="date"
                  value={values.payment_date || ""}
                  onChange={(e) => setField("payment_date", e.target.value || "")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor Total (R$) *</Label>
                <Input
                  inputMode="decimal"
                  value={values.amount}
                  onChange={(e) => setField("amount", e.target.value)}
                  placeholder="0,00"
                />
                {errors.amount && (
                  <p className="text-xs text-red-600">{errors.amount}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Valor Pago (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={values.amount_paid}
                  onChange={(e) => setField("amount_paid", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <Card className="md:col-span-2 bg-muted/30">
                <CardContent className="py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                    <div>
                      <p className="text-xs text-muted-foreground">Total da fatura</p>
                      <p className="text-xl font-bold font-display">{formatCurrency(amount)}</p>
                    </div>
                    <Separator orientation="vertical" className="hidden sm:block h-10" />
                    <div>
                      <p className="text-xs text-muted-foreground">Valor pago</p>
                      <p className="text-lg font-semibold text-green-700">
                        {formatCurrency(amountPaid)}
                      </p>
                    </div>
                    <Separator orientation="vertical" className="hidden sm:block h-10" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {remaining > 0 ? "Restante" : "Situação"}
                      </p>
                      <p
                        className={`text-lg font-bold ${
                          remaining === 0 ? "text-green-700" : "text-orange-700"
                        }`}
                      >
                        {remaining === 0 ? "Pago ✔" : formatCurrency(remaining)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
            <CardDescription>Campo interno, opcional</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={3}
              value={values.notes || ""}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Observações adicionais sobre esta fatura..."
            />
          </CardContent>
        </Card>

        <Separator />

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || customers.length === 0}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting
              ? "Salvando..."
              : mode === "create"
              ? "Criar Fatura"
              : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
