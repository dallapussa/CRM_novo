"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  FireExtinguisher,
  Sparkles,
  RefreshCw,
  Calendar,
  Check,
  Zap,
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
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { useSaveExtinguisher, useExtinguishers } from "@/hooks/useExtinguishers";
import { useClients } from "@/hooks/useClients";

const extinguisherSchema = z.object({
  customer_id: z.string().min(1, { message: "Selecione o cliente" }),
  type: z.string().min(1, { message: "Informe ou selecione o tipo de agente" }),
  capacity: z.string().min(1, { message: "Informe ou selecione a capacidade" }),
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

const COMMON_AGENTS = [
  "Pó Químico ABC",
  "Gás Carbônico (CO2)",
  "Água Pressurizada (AP)",
  "Pó Químico BC",
  "Espuma Mecânica",
  "Classe K (Cozinhas)",
  "Classe D (Metais)",
  "Halon / Agente Limpo FE-36",
];

const QUICK_AGENTS = [
  "Pó ABC",
  "CO2",
  "Água (AP)",
  "Pó BC",
  "Espuma",
  "Classe K",
];

const COMMON_CAPACITIES = [
  "1 kg",
  "2 kg",
  "4 kg",
  "6 kg",
  "8 kg",
  "10 kg",
  "12 kg",
  "20 kg",
  "25 kg",
  "50 kg",
  "10 L",
  "50 L",
  "75 L",
];

const QUICK_CAPACITIES = [
  "2 kg",
  "4 kg",
  "6 kg",
  "8 kg",
  "10 kg",
  "10 L",
  "50 L",
];

/**
 * Geração automática do número de série próprio no formato (CLI-ABC4-01)
 */
function buildAutoSerial(
  customerName: string | undefined,
  agentType: string,
  capacity: string,
  existingCount: number
): string {
  // 1. Prefixo do Cliente (3 letras em maiúsculo)
  let cli = "CLI";
  if (customerName) {
    const clean = customerName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    if (clean.length >= 3) {
      cli = clean.slice(0, 3);
    } else if (clean.length > 0) {
      cli = clean.padEnd(3, "X");
    }
  }

  // 2. Sigla do Agente
  const normAgent = (agentType || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  let agent = "ABC";
  if (normAgent.includes("ABC")) {
    agent = "ABC";
  } else if (normAgent.includes("BC")) {
    agent = "BC";
  } else if (normAgent.includes("CO2") || normAgent.includes("CARBON")) {
    agent = "CO2";
  } else if (normAgent.includes("AGUA") || normAgent.includes("AP")) {
    agent = "AGU";
  } else if (normAgent.includes("ESPUMA")) {
    agent = "ESP";
  } else if (normAgent.includes("CLASSE K") || normAgent.includes(" K")) {
    agent = "CLK";
  } else if (normAgent.includes("CLASSE D") || normAgent.includes(" D")) {
    agent = "CLD";
  } else if (normAgent.trim().length > 0) {
    const cleanLetters = normAgent.replace(/[^A-Z0-9]/g, "");
    agent = cleanLetters.slice(0, 3) || "EXT";
  }

  // 3. Peso / Capacidade (apenas dígitos, ex: 4, 6, 10)
  const digits = (capacity || "").replace(/\D/g, "");
  const weight = digits || "4";

  // 4. Sequencial com 2 dígitos (-01, -02...)
  const seq = String(existingCount + 1).padStart(2, "0");

  return `${cli}-${agent}${weight}-${seq}`;
}

export function ExtinguisherForm({ initialData, customers: providedCustomers, mode }: ExtinguisherFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const saveMutation = useSaveExtinguisher();
  const { data: clientRows = [] } = useClients();
  const { data: allExtinguishers = [] } = useExtinguishers();

  const customers = providedCustomers ?? clientRows.filter((client) => client.is_active).map(({ id, name }) => ({ id, name }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cálculo das datas padrões para nova criação (hoje e hoje + 1 ano)
  const defaultDates = useMemo(() => {
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const expDate = new Date(now);
    expDate.setFullYear(expDate.getFullYear() + 1);
    const expIso = expDate.toISOString().slice(0, 10);
    return { todayIso, expIso };
  }, []);

  const [values, setValues] = useState<FormValues>(() => {
    if (initialData) {
      return {
        customer_id: initialData.customer_id || "",
        type: initialData.type || "",
        capacity: initialData.capacity || "",
        serial_number: initialData.serial_number || "",
        manufacturer: initialData.manufacturer || "",
        manufacturing_date: initialData.manufacturing_date ? initialData.manufacturing_date.slice(0, 10) : "",
        last_recharge_date: initialData.last_recharge_date ? initialData.last_recharge_date.slice(0, 10) : "",
        expiration_date: initialData.expiration_date ? initialData.expiration_date.slice(0, 10) : "",
        next_inspection_date: initialData.next_inspection_date ? initialData.next_inspection_date.slice(0, 10) : "",
        location: initialData.location || "",
        notes: initialData.notes || "",
      };
    }
    // Criação nova: já inicia com Recarga no mês/ano atual e Vencimento em 1 ano
    return {
      customer_id: "",
      type: "Pó Químico ABC",
      capacity: "4 kg",
      serial_number: "",
      manufacturer: "",
      manufacturing_date: "",
      last_recharge_date: defaultDates.todayIso,
      expiration_date: defaultDates.expIso,
      next_inspection_date: "",
      location: "",
      notes: "",
    };
  });

  // Quantidade de extintores já cadastrados para o cliente selecionado
  const customerExtinguisherCount = useMemo(() => {
    if (!values.customer_id) return 0;
    return allExtinguishers.filter((e) => e.customer_id === values.customer_id && e.id !== initialData?.id).length;
  }, [allExtinguishers, values.customer_id, initialData]);

  // Nome do cliente selecionado
  const selectedCustomerName = useMemo(() => {
    const found = customers.find((c) => c.id === values.customer_id);
    return found?.name;
  }, [customers, values.customer_id]);

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

  // Quando altera a data da última recarga, calcula a renovação automaticamente para 1 ano depois
  function handleRechargeDateChange(newDate: string) {
    setField("last_recharge_date", newDate);
    if (newDate) {
      const d = new Date(newDate + "T12:00:00");
      if (!isNaN(d.getTime())) {
        d.setFullYear(d.getFullYear() + 1);
        const expIso = d.toISOString().slice(0, 10);
        setField("expiration_date", expIso);
      }
    }
  }

  // Função para definir a recarga no mês atual e renovação em +1 ano
  function handleSetCurrentMonthRecharge() {
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    handleRechargeDateChange(todayIso);
    toast({
      title: "Data atualizada",
      description: "Recarga definida para o mês atual e validade ajustada para 1 ano depois.",
    });
  }

  // Função para forçar o recalculo da validade para +1 ano
  function handleSyncExpirationOneYear() {
    if (!values.last_recharge_date) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "Informe a data da recarga primeiro.",
      });
      return;
    }
    const d = new Date(values.last_recharge_date + "T12:00:00");
    if (!isNaN(d.getTime())) {
      d.setFullYear(d.getFullYear() + 1);
      const expIso = d.toISOString().slice(0, 10);
      setField("expiration_date", expIso);
      toast({
        title: "Validade recalculada",
        description: "Validade ajustada para 1 ano após a última recarga.",
      });
    }
  }

  // Gera o número de série próprio automaticamente
  function handleGenerateSerial() {
    const generated = buildAutoSerial(
      selectedCustomerName,
      values.type,
      values.capacity,
      customerExtinguisherCount
    );
    setField("serial_number", generated);
    toast({
      title: "Série Própria Gerada",
      description: `Número de série sugerido: ${generated}`,
    });
  }

  // No modo criação, se o cliente é selecionado e a série estiver vazia, gera automaticamente
  useEffect(() => {
    if (mode === "create" && values.customer_id && !values.serial_number) {
      const auto = buildAutoSerial(
        selectedCustomerName,
        values.type,
        values.capacity,
        customerExtinguisherCount
      );
      setValues((prev) => (prev.serial_number ? prev : { ...prev, serial_number: auto }));
    }
  }, [mode, values.customer_id, values.serial_number, selectedCustomerName, values.type, values.capacity, customerExtinguisherCount]);

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
      type: values.type.trim(),
      capacity: values.capacity.trim(),
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

  // Formatação amigável do Mês/Ano da recarga atual
  const rechargeMonthYearDisplay = useMemo(() => {
    if (!values.last_recharge_date) return null;
    const parts = values.last_recharge_date.split("-");
    if (parts.length >= 2) {
      return `${parts[1]}/${parts[0]}`;
    }
    return null;
  }, [values.last_recharge_date]);

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
              ? "Cadastre um equipamento vinculado a um cliente com série própria inteligente."
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
            <CardDescription>Identificação, cliente e numeração própria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Cliente */}
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

              {/* Número de Série com Gerador Próprio */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Série Própria / Patrimônio *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateSerial}
                    className="h-6 px-2 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200"
                    title="Gera número de série próprio no formato (CLI-ABC4-01)"
                  >
                    <Sparkles className="mr-1 h-3 w-3 text-amber-600" />
                    Gerar Série (CLI-ABC4-01)
                  </Button>
                </div>
                <Input
                  value={values.serial_number}
                  onChange={(e) => setField("serial_number", e.target.value)}
                  placeholder="Ex: CLI-ABC4-01 ou número de fábrica"
                />
                <p className="text-[11px] text-muted-foreground">
                  Padrão inteligente: [CLIENTE]-[AGENTE][PESO]-[SEQUÊNCIA] (Ex: CLI-ABC4-01). Editável manualmente.
                </p>
                {errors.serial_number && (
                  <p className="text-xs text-red-600">{errors.serial_number}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Agente Extintor (Digitação livre + Datalist + Chips rápidos) */}
              <div className="space-y-1.5">
                <Label>Tipo de Agente *</Label>
                <Input
                  list="agent-datalist"
                  value={values.type}
                  onChange={(e) => setField("type", e.target.value)}
                  placeholder="Digite ou escolha da lista..."
                />
                <datalist id="agent-datalist">
                  {COMMON_AGENTS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                  {EXTINGUISHER_TYPES.map((t) => (
                    <option key={`ext-${t}`} value={t} />
                  ))}
                </datalist>

                {/* Sugestões rápidas de 1 clique */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {QUICK_AGENTS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setField("type", tag)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                        values.type.toLowerCase().includes(tag.toLowerCase())
                          ? "bg-red-50 text-red-700 border-red-200 font-medium"
                          : "bg-muted/50 hover:bg-muted text-muted-foreground border-transparent"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {errors.type && (
                  <p className="text-xs text-red-600">{errors.type}</p>
                )}
              </div>

              {/* Capacidade (Digitação livre + Datalist + Chips rápidos) */}
              <div className="space-y-1.5">
                <Label>Capacidade *</Label>
                <Input
                  list="capacity-datalist"
                  value={values.capacity}
                  onChange={(e) => setField("capacity", e.target.value)}
                  placeholder="Ex: 4 kg, 6 kg, 10 L..."
                />
                <datalist id="capacity-datalist">
                  {COMMON_CAPACITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>

                {/* Sugestões rápidas de 1 clique */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {QUICK_CAPACITIES.map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setField("capacity", cap)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                        values.capacity === cap
                          ? "bg-blue-50 text-blue-700 border-blue-200 font-medium"
                          : "bg-muted/50 hover:bg-muted text-muted-foreground border-transparent"
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
                {errors.capacity && (
                  <p className="text-xs text-red-600">{errors.capacity}</p>
                )}
              </div>

              {/* Fabricante */}
              <div className="space-y-1.5">
                <Label>Fabricante</Label>
                <Input
                  value={values.manufacturer || ""}
                  onChange={(e) => setField("manufacturer", e.target.value)}
                  placeholder="Ex: Kidde, Buckeye, Resil..."
                />
              </div>
            </div>

            {/* Local de Instalação */}
            <div className="space-y-1.5">
              <Label>Local de Instalação</Label>
              <Input
                value={values.location || ""}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="Ex: Corredor térreo, Prédio Administrativo, próximo à saída..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Datas, Recarga e Renovação Automática */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Datas, Recarga e Renovação
                </CardTitle>
                <CardDescription>
                  Preenchimento automático do mês/ano atual com renovação calculada para 1 ano
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {/* Data Fabricação */}
              <div className="space-y-1.5">
                <Label>Fabricação</Label>
                <Input
                  type="date"
                  value={values.manufacturing_date || ""}
                  onChange={(e) => setField("manufacturing_date", e.target.value)}
                />
              </div>

              {/* Última Recarga (Mês/Ano) com Preenchimento Automático */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Última Recarga (Mês/Ano)</Label>
                  <button
                    type="button"
                    onClick={handleSetCurrentMonthRecharge}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                    title="Definir para hoje / mês atual"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    Mês Atual
                  </button>
                </div>
                <Input
                  type="date"
                  value={values.last_recharge_date || ""}
                  onChange={(e) => handleRechargeDateChange(e.target.value)}
                />
                {rechargeMonthYearDisplay && (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px] font-mono font-medium py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                      Selo: {rechargeMonthYearDisplay}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">Preenchimento automático</span>
                  </div>
                )}
              </div>

              {/* Renovação / Validade (Ajuste automático para +1 ano) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Validade / Renovação *</Label>
                  <button
                    type="button"
                    onClick={handleSyncExpirationOneYear}
                    className="text-[11px] text-green-700 hover:underline flex items-center gap-0.5"
                    title="Sincronizar exatamente +1 ano após a recarga"
                  >
                    <Zap className="h-2.5 w-2.5" />
                    +1 Ano
                  </button>
                </div>
                <Input
                  type="date"
                  value={values.expiration_date}
                  onChange={(e) => setField("expiration_date", e.target.value)}
                  className="font-medium"
                />
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <Check className="h-3 w-3" />
                  <span>Ajuste automático (+1 ano)</span>
                </div>
                {errors.expiration_date && (
                  <p className="text-xs text-red-600">{errors.expiration_date}</p>
                )}
              </div>

              {/* Próxima Inspeção */}
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

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={3}
              value={values.notes || ""}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Observações técnicas, número do anel plástico, lote do pó, etc..."
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
