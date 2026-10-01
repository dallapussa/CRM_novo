"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, ClipboardList, Plus, Trash2, Package } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import type {
  Customer,
  OSStatus,
  Product,
  Profile,
  ServiceOrder,
  ServiceOrderItem,
} from "@/types";
import {
  OS_PRIORITY_LABELS,
  OS_STATUS_LABELS,
  OS_PERIOD_LABELS,
} from "@/types";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSaveServiceOrder } from "@/hooks/useServiceOrders";
import { useClients } from "@/hooks/useClients";
import { useUsers } from "@/hooks/useUsers";
import { useProducts } from "@/hooks/useProducts";

const osSchema = z.object({
  customer_id: z.string().min(1, { message: "Selecione o cliente" }),
  technician_id: z.string().optional(),
  scheduled_date: z.string().min(1, { message: "Informe a data agendada" }),
  scheduled_period: z.union([z.enum(["manha", "tarde", "integral"]), z.literal("")]).optional(),
  priority: z.enum(["baixa", "media", "alta", "urgente"]),
  status: z.enum(["pendente", "andamento", "atrasada", "concluida", "cancelada"]),
  type: z.string().min(1, { message: "Selecione o tipo de serviço" }),
  description: z.string().min(5, { message: "Descreva o serviço (mín. 5 caracteres)" }),
  discount: z.string().optional(),
});

type FormValues = z.infer<typeof osSchema>;

interface ItemRow {
  product_id: string | null;
  description: string;
  quantity: string;
  unit_price: string;
  type: "produto" | "servico" | "mao_obra";
}

interface OSFormProps {
  initialData?: ServiceOrder;
  initialItems?: ServiceOrderItem[];
  customers?: Pick<Customer, "id" | "name">[];
  technicians?: Pick<Profile, "id" | "full_name">[];
  products?: Pick<Product, "id" | "name" | "sale_price" | "type" | "unit">[];
  mode: "create" | "edit";
}

const OS_TYPES = [
  "Recarga de Extintor",
  "Manutenção Preventiva",
  "Manutenção Corretiva",
  "Inspeção Técnica",
  "Elaboração de PPCI",
  "Troca de Mangueiras",
  "Teste Hidrostático",
  "Instalação",
  "Outro",
];

function parseMoney(v?: string): number {
  if (!v) return 0;
  const cleaned = v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseQty(v?: string): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(",", "."));
  return isNaN(n) ? 0 : n;
}

const emptyItem = (): ItemRow => ({
  product_id: null,
  description: "",
  quantity: "1",
  unit_price: "",
  type: "servico",
});

export function OSForm({
  initialData,
  initialItems,
  customers: providedCustomers,
  technicians: providedTechnicians,
  products: providedProducts,
  mode,
}: OSFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const saveMutation = useSaveServiceOrder();
  const { data: clientRows = [] } = useClients();
  const { data: userRows = [] } = useUsers();
  const { data: productRows = [] } = useProducts();
  const customers = providedCustomers ?? clientRows.filter((client) => client.is_active).map(({ id, name }) => ({ id, name }));
  const technicians = providedTechnicians ?? userRows.filter((profile) => profile.is_active && ["admin", "tecnico"].includes(profile.role));
  const products = providedProducts ?? productRows.filter((product) => product.is_active).map(({ id, name, sale_price, type, unit }) => ({ id, name, sale_price, type, unit }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [values, setValues] = useState<FormValues>({
    customer_id: initialData?.customer_id || "",
    technician_id: initialData?.technician_id || "",
    scheduled_date: initialData?.scheduled_date || "",
    scheduled_period: initialData?.scheduled_period || "",
    priority: initialData?.priority || "media",
    status: initialData?.status || "pendente",
    type: initialData?.type || "",
    description: initialData?.description || "",
    discount:
      initialData?.discount != null
        ? String(initialData.discount).replace(".", ",")
        : "",
  });

  const [items, setItems] = useState<ItemRow[]>(
    initialItems && initialItems.length > 0
      ? initialItems.map((i) => ({
          product_id: i.product_id || null,
          description: i.description,
          quantity: String(i.quantity),
          unit_price: String(i.unit_price).replace(".", ","),
          type: i.type,
        }))
      : []
  );

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

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function selectProduct(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    updateItem(index, {
      product_id: product.id,
      description: product.name,
      unit_price: String(product.sale_price).replace(".", ","),
      type: product.type === "produto" ? "produto" : "servico",
    });
  }

  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + parseQty(it.quantity) * parseMoney(it.unit_price), 0),
    [items]
  );
  const discount = parseMoney(values.discount);
  const total = Math.max(0, subtotal - discount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const parsed = osSchema.safeParse(values);
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

    const validItems = items.filter((it) => it.description.trim());
    for (const it of validItems) {
      if (parseQty(it.quantity) <= 0) {
        toast({
          variant: "destructive",
          title: "Quantidade inválida",
          description: `Verifique a quantidade do item "${it.description}".`,
        });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const payload = {
        customer_id: values.customer_id,
        technician_id: values.technician_id || null,
        scheduled_date: values.scheduled_date,
        scheduled_period: values.scheduled_period || null,
        priority: values.priority,
        status: values.status as OSStatus,
        type: values.type,
        description: values.description.trim(),
        subtotal,
        discount,
        total,
        completed_at: values.status === "concluida" ? new Date().toISOString() : null,
      };

      if (mode === "edit" && !initialData) throw new Error("Modo inválido");
      const osId = await saveMutation.mutateAsync({
        id: initialData?.id,
        input: { ...payload, ...(mode === "create" ? { created_by: user.id } : {}) },
        items: validItems.map((it) => ({
          product_id: it.product_id,
          description: it.description.trim(),
          quantity: parseQty(it.quantity),
          unit_price: parseMoney(it.unit_price),
          total_price: parseQty(it.quantity) * parseMoney(it.unit_price),
          type: it.type,
        })),
      });

      toast({
        variant: "success",
        title: mode === "create" ? "OS criada!" : "OS atualizada!",
        description:
          mode === "create"
            ? "Ordem de serviço registrada com sucesso."
            : "Alterações salvas com sucesso.",
      });
      router.push(mode === "create" ? `/dashboard/os/${osId}` : `/dashboard/os/${osId}`);
      router.refresh();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: err?.message || "Não foi possível salvar a OS.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <Link href="/dashboard/os">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
            {mode === "create" ? "Nova Ordem de Serviço" : "Editar Ordem de Serviço"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "create"
              ? "Preencha os dados para abrir uma nova OS."
              : "Atualize as informações da OS."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-red-600" />
              <CardTitle className="text-base">Dados da OS</CardTitle>
            </div>
            <CardDescription>Cliente, agendamento e prioridade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Select
                  value={values.customer_id}
                  onValueChange={(v) => setField("customer_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
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
                {customers.length === 0 && (
                  <p className="text-xs text-orange-600">
                    Nenhum cliente cadastrado.{" "}
                    <Link href="/dashboard/clientes/novo" className="underline">
                      Cadastre um cliente primeiro
                    </Link>
                    .
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Técnico Responsável</Label>
                <Select
                  value={values.technician_id || ""}
                  onValueChange={(v) => setField("technician_id", v || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Data Agendada *</Label>
                <Input
                  type="date"
                  value={values.scheduled_date}
                  onChange={(e) => setField("scheduled_date", e.target.value)}
                />
                {errors.scheduled_date && (
                  <p className="text-xs text-red-600">{errors.scheduled_date}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Período</Label>
                <Select
                  value={values.scheduled_period || ""}
                  onValueChange={(v) => setField("scheduled_period", v as FormValues["scheduled_period"])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OS_PERIOD_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select
                  value={values.priority}
                  onValueChange={(v) => setField("priority", v as FormValues["priority"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OS_PRIORITY_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={values.status}
                  onValueChange={(v) => setField("status", v as FormValues["status"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OS_STATUS_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo de Serviço *</Label>
                <Select value={values.type} onValueChange={(v) => setField("type", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {OS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-xs text-red-600">{errors.type}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição do Serviço *</Label>
              <Textarea
                rows={3}
                value={values.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Descreva o que será feito nesta OS..."
              />
              {errors.description && (
                <p className="text-xs text-red-600">{errors.description}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base">Itens da OS</CardTitle>
              </div>
              <CardDescription>Produtos e serviços incluídos</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                Nenhum item adicionado. Clique em &quot;Adicionar item&quot; para incluir
                produtos ou serviços.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">Item do catálogo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[90px]">Qtd</TableHead>
                    <TableHead className="w-[130px]">Preço unit.</TableHead>
                    <TableHead className="w-[110px] text-right">Total</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select
                          value={it.product_id || ""}
                          onValueChange={(v) => selectProduct(idx, v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-9"
                          value={it.description}
                          onChange={(e) =>
                            updateItem(idx, { description: e.target.value })
                          }
                          placeholder="Descrição do item"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-9"
                          inputMode="decimal"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-9"
                          inputMode="decimal"
                          value={it.unit_price}
                          onChange={(e) =>
                            updateItem(idx, { unit_price: e.target.value })
                          }
                          placeholder="0,00"
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(parseQty(it.quantity) * parseMoney(it.unit_price))}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() =>
                            setItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex flex-col items-end gap-2 pt-2">
              <div className="flex items-center gap-6 text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-semibold w-28 text-right">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-muted-foreground">Desconto (R$):</span>
                <Input
                  className="h-9 w-28 text-right"
                  inputMode="decimal"
                  value={values.discount || ""}
                  onChange={(e) => setField("discount", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="flex items-center gap-6 pt-1 border-t">
                <span className="font-semibold">Total:</span>
                <span className="text-xl font-bold font-display w-28 text-right text-green-700">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
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
              ? "Criar OS"
              : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
