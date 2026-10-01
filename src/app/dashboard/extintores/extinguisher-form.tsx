"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, FireExtinguisher } from "lucide-react";
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
import type { Customer, Extinguisher } from "@/types";
import { EXTINGUISHER_TYPES } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSaveExtinguisher } from "@/hooks/useExtinguishers";
import { useClients } from "@/hooks/useClients";

const extinguisherSchema = z.object({
  customer_id: z.string().min(1, { message: "Selecione o cliente" }),
  type: z.string().min(1, { message: "Selecione o tipo" }),
  capacity: z.string().min(1, { message: "Informe a capacidade" }),
  serial_number: z.string().min(1, { message: "Informe o número de série" }),
  manufacturer: z.string().optional(),
  manufacturing_date: z.string().optional(),
  last_recharge_date: z.string().optional(),
  expiration_date: z.string().min(1, { message: "Informe a data de validade" }),
  next_inspection_date: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof extinguisherSchema>;

interface ExtinguisherFormProps {
  initialData?: Extinguisher;
  customers?: Pick<Customer, "id" | "name">[];
  mode: "create" | "edit";
}

const CAPACITIES = ["1 kg", "2 kg", "4 kg", "6 kg", "8 kg", "10 kg", "20 kg", "25 kg", "50 kg", "10 L", "50 L"];

export function ExtinguisherForm({ initialData, customers: providedCustomers, mode }: ExtinguisherFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const saveMutation = useSaveExtinguisher();
  const { data: clientRows = [] } = useClients();
  const customers = providedCustomers ?? clientRows.filter((client) => client.is_active).map(({ id, name }) => ({ id, name }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [values, setValues] = useState<FormValues>({
    customer_id: initialData?.customer_id || "",
    type: initialData?.type || "",
    capacity: initialData?.capacity || "",
    serial_number: initialData?.serial_number || "",
    manufacturer: initialData?.manufacturer || "",
    manufacturing_date: initialData?.manufacturing_date || "",
    last_recharge_date: initialData?.last_recharge_date || "",
    expiration_date: initialData?.expiration_date || "",
    next_inspection_date: initialData?.next_inspection_date || "",
    location: initialData?.location || "",
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

    const parsed = extinguisherSchema.safeParse(values);
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

    const payload = {
      customer_id: values.customer_id,
      type: values.type,
      capacity: values.capacity,
      serial_number: values.serial_number.trim(),
      manufacturer: values.manufacturer?.trim() || null,
      manufacturing_date: values.manufacturing_date || null,
      last_recharge_date: values.last_recharge_date || null,
      expiration_date: values.expiration_date,
      next_inspection_date: values.next_inspection_date || null,
      location: values.location?.trim() || null,
      notes: values.notes?.trim() || null,
    };

    try {
      if (mode === "create") {
        await saveMutation.mutateAsync({ input: payload });
        toast({
          variant: "success",
          title: "Extintor cadastrado!",
          description: "Equipamento adicionado com sucesso.",
        });
      } else if (initialData) {
        await saveMutation.mutateAsync({ input: payload, id: initialData.id });
        toast({
          variant: "success",
          title: "Extintor atualizado!",
          description: "Alterações salvas com sucesso.",
        });
      }
      router.push("/dashboard/extintores");
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
          <Link href="/dashboard/extintores">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
            {mode === "create" ? "Novo Extintor" : "Editar Extintor"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "create"
              ? "Cadastre um equipamento vinculado a um cliente."
              : "Atualize as informações do equipamento."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FireExtinguisher className="h-5 w-5 text-red-600" />
              <CardTitle className="text-base">Dados do Equipamento</CardTitle>
            </div>
            <CardDescription>Identificação e vínculo com o cliente</CardDescription>
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
                <Label>Número de Série *</Label>
                <Input
                  value={values.serial_number}
                  onChange={(e) => setField("serial_number", e.target.value)}
                  placeholder="Ex: BR-123456789"
                />
                {errors.serial_number && (
                  <p className="text-xs text-red-600">{errors.serial_number}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Tipo de Agente *</Label>
                <Select value={values.type} onValueChange={(v) => setField("type", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXTINGUISHER_TYPES.map((t) => (
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
              <div className="space-y-1.5">
                <Label>Capacidade *</Label>
                <Select
                  value={values.capacity}
                  onValueChange={(v) => setField("capacity", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPACITIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.capacity && (
                  <p className="text-xs text-red-600">{errors.capacity}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Fabricante</Label>
                <Input
                  value={values.manufacturer || ""}
                  onChange={(e) => setField("manufacturer", e.target.value)}
                  placeholder="Ex: Kidde, Buckeye..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Local de Instalação</Label>
              <Input
                value={values.location || ""}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="Ex: Corredor térreo, próximo à saída de emergência"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datas e Validade</CardTitle>
            <CardDescription>Controle de recarga e vencimento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Fabricação</Label>
                <Input
                  type="date"
                  value={values.manufacturing_date || ""}
                  onChange={(e) => setField("manufacturing_date", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Última Recarga</Label>
                <Input
                  type="date"
                  value={values.last_recharge_date || ""}
                  onChange={(e) => setField("last_recharge_date", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Validade *</Label>
                <Input
                  type="date"
                  value={values.expiration_date}
                  onChange={(e) => setField("expiration_date", e.target.value)}
                />
                {errors.expiration_date && (
                  <p className="text-xs text-red-600">{errors.expiration_date}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Próxima Inspeção</Label>
                <Input
                  type="date"
                  value={values.next_inspection_date || ""}
                  onChange={(e) => setField("next_inspection_date", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={3}
              value={values.notes || ""}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Observações sobre o equipamento..."
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
              ? "Cadastrar Extintor"
              : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
