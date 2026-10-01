"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Package } from "lucide-react";
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
import type { Product } from "@/types";
import { hasPermission, PRODUCT_CATEGORIES } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useSaveProduct } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";

const productSchema = z.object({
  type: z.enum(["produto", "servico"], { message: "Selecione o tipo" }),
  category: z.string().min(1, { message: "Selecione a categoria" }),
  sku: z.string().optional(),
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  description: z.string().optional(),
  unit: z.string().min(1, { message: "Informe a unidade" }),
  cost_price: z.string().optional(),
  sale_price: z.string().min(1, { message: "Informe o preço de venda" }),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Product;
  mode: "create" | "edit";
}

function parseMoney(v?: string): number {
  if (!v) return 0;
  const cleaned = v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

const UNITS = ["un", "kg", "L", "m", "m²", "h", "visita", "serviço"];

export function ProductForm({ initialData, mode }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const saveMutation = useSaveProduct();
  const { role } = useAuth();
  const canViewCosts = hasPermission(role, "financial_costs");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [values, setValues] = useState<FormValues>({
    type: initialData?.type || "servico",
    category: initialData?.category || "",
    sku: initialData?.sku || "",
    name: initialData?.name || "",
    description: initialData?.description || "",
    unit: initialData?.unit || "un",
    cost_price:
      initialData?.cost_price != null
        ? String(initialData.cost_price).replace(".", ",")
        : "",
    sale_price:
      initialData?.sale_price != null
        ? String(initialData.sale_price).replace(".", ",")
        : "",
    is_active: initialData?.is_active ?? true,
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

    const parsed = productSchema.safeParse(values);
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

    const salePrice = parseMoney(values.sale_price);
    if (salePrice <= 0) {
      setErrors({ sale_price: "Preço de venda deve ser maior que zero" });
      setIsSubmitting(false);
      return;
    }

    const payload = {
      type: values.type,
      category: values.category,
      sku: values.sku?.trim() || null,
      name: values.name.trim(),
      description: values.description?.trim() || null,
      unit: values.unit,
      sale_price: salePrice,
      is_active: values.is_active,
      ...(canViewCosts ? { cost_price: parseMoney(values.cost_price) } : {}),
    };

    try {
      if (mode === "create") {
        await saveMutation.mutateAsync({ input: payload });
        toast({
          variant: "success",
          title: "Item cadastrado!",
          description: `${values.name} foi adicionado com sucesso.`,
        });
      } else if (initialData) {
        await saveMutation.mutateAsync({ input: payload, id: initialData.id });
        toast({
          variant: "success",
          title: "Item atualizado!",
          description: "Alterações salvas com sucesso.",
        });
      }
      router.push("/dashboard/produtos");
      router.refresh();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: err?.message || "Não foi possível salvar as informações.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <Link href="/dashboard/produtos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
            {mode === "create" ? "Novo Produto/Serviço" : "Editar Produto/Serviço"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "create"
              ? "Cadastre um produto ou serviço para usar nas OS."
              : "Atualize as informações do item."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-base">Informações do Item</CardTitle>
            </div>
            <CardDescription>Dados básicos e valores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select
                  value={values.type}
                  onValueChange={(v) => setField("type", v as "produto" | "servico")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servico">Serviço</SelectItem>
                    <SelectItem value="produto">Produto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <Select
                  value={values.category}
                  onValueChange={(v) => setField("category", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-xs text-red-600">{errors.category}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>SKU / Código</Label>
                <Input
                  value={values.sku || ""}
                  onChange={(e) => setField("sku", e.target.value)}
                  placeholder="Ex: REC-ABC-6KG"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={values.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Ex: Recarga Extintor Pó ABC 6kg"
              />
              {errors.name && (
                <p className="text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                value={values.description || ""}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Detalhes do produto ou serviço..."
              />
            </div>

            <div className={`grid gap-4 ${canViewCosts ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
              <div className="space-y-1.5">
                <Label>Unidade *</Label>
                <Select
                  value={values.unit}
                  onValueChange={(v) => setField("unit", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canViewCosts && <div className="space-y-1.5">
                <Label>Preço de Custo (R$)</Label>
                <Input
                  value={values.cost_price || ""}
                  onChange={(e) => setField("cost_price", e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>}
              <div className="space-y-1.5">
                <Label>Preço de Venda (R$) *</Label>
                <Input
                  value={values.sale_price}
                  onChange={(e) => setField("sale_price", e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                />
                {errors.sale_price && (
                  <p className="text-xs text-red-600">{errors.sale_price}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={values.is_active ? "active" : "inactive"}
                  onValueChange={(v) => setField("is_active", v === "active")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Ativo
                      </Badge>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
                        Inativo
                      </Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
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
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting
              ? "Salvando..."
              : mode === "create"
              ? "Cadastrar Item"
              : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
