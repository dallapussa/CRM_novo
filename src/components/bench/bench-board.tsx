"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Settings2,
  Calendar,
  Clock,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Trash2,
  Edit2,
  Check,
  Printer,
  Truck,
  MapPin,
  PackageCheck,
  Loader2,
  Layers,
  Package,
  GitMerge,
  ChevronRight,
  Users,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listLotesForBench, advanceLoteBenchStage } from "@/services/prevention.service";
import type { LoteRecolhimento } from "@/types";
import { LabelPrinterDialog, type LabelTarget } from "@/components/labels/label-printer-dialog";
import { LoteMergeDialog } from "@/components/lotes/lote-merge-dialog";
import { LoteInspectDialog } from "./lote-inspect-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useBenchRecords,
  useSaveBenchRecord,
  useUpdateBenchStage,
  useDeleteBenchRecord,
} from "@/hooks/useBench";
import { useClients } from "@/hooks/useClients";
import { useUsers } from "@/hooks/useUsers";
import {
  type BenchRecord,
  type BenchStage,
  type BenchPriority,
  BENCH_PRIORITY_LABELS,
  BENCH_PRIORITY_COLORS,
} from "@/types";
import { formatDate } from "@/lib/utils";

// Definição completa de todas as etapas possíveis da oficina
export interface StageDef {
  id: BenchStage;
  title: string;
  shortLabel: string;
  description: string;
  color: string;
  badgeClass: string;
  headerBorder: string;
  headerBg: string;
  isCore: boolean; // Entrada, Oficina e Saída são essenciais
  defaultEnabled: boolean;
}

export const ALL_BENCH_STAGES: StageDef[] = [
  {
    id: "entrada",
    title: "Chegada / Descarga",
    shortLabel: "Chegada",
    description: "Equipamentos recebidos na oficina e aguardando triagem e descarga",
    color: "text-blue-600",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    headerBorder: "border-t-blue-500",
    headerBg: "bg-blue-50/50 dark:bg-blue-950/20",
    isCore: true,
    defaultEnabled: true,
  },
  {
    id: "despressurizacao",
    title: "Despressurização",
    shortLabel: "Despress.",
    description: "Alívio de pressão e esvaziamento seguro",
    color: "text-amber-600",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    headerBorder: "border-t-amber-500",
    headerBg: "bg-amber-50/50 dark:bg-amber-950/20",
    isCore: false,
    defaultEnabled: false,
  },
  {
    id: "teste_hidrostatico",
    title: "Teste Hidrostático",
    shortLabel: "Teste Hidro.",
    description: "Ensaio de pressão hidrostática a cada 5 anos",
    color: "text-purple-600",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    headerBorder: "border-t-purple-500",
    headerBg: "bg-purple-50/50 dark:bg-purple-950/20",
    isCore: false,
    defaultEnabled: false,
  },
  {
    id: "oficina",
    title: "Na Oficina",
    shortLabel: "Oficina",
    description: "Em manutenção, pintura, recarga e revisão geral",
    color: "text-orange-600",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    headerBorder: "border-t-orange-500",
    headerBg: "bg-orange-50/50 dark:bg-orange-950/20",
    isCore: true,
    defaultEnabled: true,
  },
  {
    id: "montagem",
    title: "Montagem & Válvulas",
    shortLabel: "Montagem",
    description: "Troca de componentes internos, gaxetas e manômetro",
    color: "text-indigo-600",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    headerBorder: "border-t-indigo-500",
    headerBg: "bg-indigo-50/50 dark:bg-indigo-950/20",
    isCore: false,
    defaultEnabled: false,
  },
  {
    id: "inspecao_final",
    title: "Inspeção & Lacre",
    shortLabel: "Inspeção",
    description: "Pesagem de precisão, anel do ano e selo Inmetro",
    color: "text-teal-600",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
    headerBorder: "border-t-teal-500",
    headerBg: "bg-teal-50/50 dark:bg-teal-950/20",
    isCore: false,
    defaultEnabled: false,
  },
  {
    id: "saida",
    title: "Saída",
    shortLabel: "Saída",
    description: "Pronto e aprovado para devolução ao cliente",
    color: "text-emerald-600",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    headerBorder: "border-t-emerald-500",
    headerBg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    isCore: true,
    defaultEnabled: true,
  },
];

const DEFAULT_ENABLED_STAGES: BenchStage[] = ["entrada", "oficina", "saida"];

const EQUIP_PRESETS = [
  "Extintor Pó Químico ABC 4kg",
  "Extintor Pó Químico ABC 6kg",
  "Extintor Pó Químico ABC 12kg",
  "Extintor Pó Químico BC 4kg",
  "Extintor Pó Químico BC 6kg",
  "Extintor CO2 4kg",
  "Extintor CO2 6kg",
  "Extintor Água Pressurizada 10L",
  "Extintor Espuma Mecânica 10L",
  "Mangueira de Incêndio Tipo 1 15m",
  "Mangueira de Incêndio Tipo 2 15m",
  "Mangueira de Incêndio Tipo 2 20m",
  "Mangueira de Incêndio Tipo 2 30m",
  "Outro Equipamento",
];

export function BenchBoard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: records = [], isLoading } = useBenchRecords();
  const { data: clients = [] } = useClients();
  const { data: users = [] } = useUsers();

  const [viewMode, setViewMode] = useState<"lotes" | "extintores">("lotes");
  const [advancingLoteId, setAdvancingLoteId] = useState<string | null>(null);

  const {
    data: benchLotes = [],
    isLoading: isLoadingLotes,
    refetch: refetchLotes,
  } = useQuery({
    queryKey: ["bench_lotes"],
    queryFn: listLotesForBench,
  });

  const saveMutation = useSaveBenchRecord();
  const updateStageMutation = useUpdateBenchStage();
  const deleteMutation = useDeleteBenchRecord();

  // Configuração das etapas ativas (Padrão: Entrada > Na oficina > Saída)
  const [enabledStages, setEnabledStages] = useState<BenchStage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("extincontrol_bench_stages");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
        }
      } catch {}
    }
    return DEFAULT_ENABLED_STAGES;
  });

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [inspectingLote, setInspectingLote] = useState<LoteRecolhimento | null>(null);
  const [selectedLoteIdsForMerge, setSelectedLoteIdsForMerge] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BenchRecord | null>(null);
  const [printTarget, setPrintTarget] = useState<LabelTarget | null>(null);

  function toggleLoteSelectionForMerge(loteId: string) {
    setSelectedLoteIdsForMerge((prev) =>
      prev.includes(loteId) ? prev.filter((id) => id !== loteId) : [...prev, loteId]
    );
  }

  // Formulário de novo item / edição
  const [formValues, setFormValues] = useState({
    client_id: "",
    customer_name: "",
    equip_type: EQUIP_PRESETS[1],
    equip_capacity: "6kg",
    equip_serial: "",
    priority: "media" as BenchPriority,
    stage: "entrada" as BenchStage,
    technician_id: "",
    due_at: "",
    notes: "",
  });

  // Salva configuração de etapas
  function handleToggleStage(stageId: BenchStage) {
    setEnabledStages((prev) => {
      let next: BenchStage[];
      if (prev.includes(stageId)) {
        // Não permite desativar se restar menos de 2 etapas
        if (prev.length <= 2) {
          toast({
            variant: "destructive",
            title: "Ação não permitida",
            description: "Você deve manter ao menos 2 etapas ativas na bancada.",
          });
          return prev;
        }
        next = prev.filter((id) => id !== stageId);
      } else {
        // Reinsere mantendo a ordem oficial da oficina
        next = ALL_BENCH_STAGES.filter((s) => s.id === stageId || prev.includes(s.id)).map((s) => s.id);
      }
      try {
        localStorage.setItem("extincontrol_bench_stages", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function handleSetSimplifiedMode() {
    setEnabledStages(DEFAULT_ENABLED_STAGES);
    try {
      localStorage.setItem("extincontrol_bench_stages", JSON.stringify(DEFAULT_ENABLED_STAGES));
    } catch {}
    toast({
      variant: "success",
      title: "Modo Simplificado Ativado",
      description: "A bancada está configurada com: Entrada > Na oficina > Saída.",
    });
    setIsConfigOpen(false);
  }

  function handleSetFullMode() {
    const all = ALL_BENCH_STAGES.map((s) => s.id);
    setEnabledStages(all);
    try {
      localStorage.setItem("extincontrol_bench_stages", JSON.stringify(all));
    } catch {}
    toast({
      variant: "success",
      title: "Modo Completo Ativado",
      description: "Todas as 7 etapas técnicas da oficina foram ativadas.",
    });
    setIsConfigOpen(false);
  }

  // Lista de etapas ativas ordenadas
  const activeStagesList = useMemo(() => {
    return ALL_BENCH_STAGES.filter((s) => enabledStages.includes(s.id));
  }, [enabledStages]);

  const isSimplifiedMode = useMemo(() => {
    if (enabledStages.length !== 3) return false;
    return (
      enabledStages.includes("entrada") &&
      enabledStages.includes("oficina") &&
      enabledStages.includes("saida")
    );
  }, [enabledStages]);

  // Agrupamento dos itens por etapa
  // Se um item estiver numa etapa que foi desativada, agrupa-o na etapa mais próxima ativa (ou "oficina")
  const recordsByStage = useMemo(() => {
    const map = new Map<BenchStage, BenchRecord[]>();
    activeStagesList.forEach((s) => map.set(s.id, []));

    records.forEach((record) => {
      // Filtros de busca
      if (search.trim()) {
        const q = search.toLowerCase();
        const text = [
          record.equip_type,
          record.equip_serial,
          record.customer_name,
          record.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return;
      }
      if (priorityFilter !== "all" && record.priority !== priorityFilter) {
        return;
      }

      const rawStage = (record.stage as BenchStage) || "entrada";
      let targetStage = rawStage;

      // Se a etapa não está ativa, direciona para oficina ou primeira etapa ativa
      if (!enabledStages.includes(targetStage)) {
        if (enabledStages.includes("oficina")) {
          targetStage = "oficina";
        } else {
          targetStage = enabledStages[0] || "entrada";
        }
      }

      const list = map.get(targetStage) || [];
      list.push(record);
      map.set(targetStage, list);
    });

    return map;
  }, [activeStagesList, records, search, priorityFilter, enabledStages]);

  // Lotes filtrados por etapa da oficina
  const chegadaLotes = useMemo(() => {
    return benchLotes.filter(
      (l) => l.status === "recolhendo" || l.status === "aguardando_descarga"
    );
  }, [benchLotes]);

  const oficinaLotes = useMemo(() => {
    return benchLotes.filter((l) => l.status === "em_oficina");
  }, [benchLotes]);

  const saidaLotes = useMemo(() => {
    return benchLotes.filter((l) => l.status === "saida");
  }, [benchLotes]);

  async function handleAdvanceLote(
    loteId: string,
    targetStage: "aguardando_descarga" | "em_oficina" | "saida" | "liberar_rota"
  ) {
    setAdvancingLoteId(loteId);
    try {
      await advanceLoteBenchStage(loteId, targetStage);
      if (targetStage === "liberar_rota") {
        toast({
          variant: "success",
          title: "Lote Liberado da Oficina!",
          description:
            "O lote saiu do Kanban da bancada e já está disponível em 'Lotes & Rotas' para entrega aos clientes.",
        });
      } else {
        toast({
          variant: "success",
          title: "Etapa do Lote atualizada!",
          description: "O lote avançou no fluxo da bancada.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["bench_lotes"] });
      queryClient.invalidateQueries({ queryKey: ["lotes_recolhimento"] });
      refetchLotes();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao avançar lote",
        description: err?.message || "Tente novamente.",
      });
    } finally {
      setAdvancingLoteId(null);
    }
  }

  // Abrir modal de criação
  function handleOpenCreate(stage: BenchStage = "entrada") {
    setEditingRecord(null);
    setFormValues({
      client_id: "",
      customer_name: "",
      equip_type: EQUIP_PRESETS[1],
      equip_capacity: "6kg",
      equip_serial: "",
      priority: "media",
      stage,
      technician_id: "",
      due_at: "",
      notes: "",
    });
    setIsFormOpen(true);
  }

  // Abrir modal de edição
  function handleOpenEdit(record: BenchRecord) {
    setEditingRecord(record);
    setFormValues({
      client_id: record.client_id || "",
      customer_name: record.customer_name || "",
      equip_type: record.equip_type || "",
      equip_capacity: record.equip_capacity || "",
      equip_serial: record.equip_serial || "",
      priority: (record.priority as BenchPriority) || "media",
      stage: (record.stage as BenchStage) || "entrada",
      technician_id: record.technician_id || "",
      due_at: record.due_at ? record.due_at.slice(0, 10) : "",
      notes: record.notes || "",
    });
    setIsFormOpen(true);
  }

  // Salvar registro
  async function handleSaveRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!formValues.equip_type.trim()) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "Informe o tipo do equipamento.",
      });
      return;
    }

    // Identifica o nome do cliente caso selecionado da lista
    let clientName = formValues.customer_name.trim();
    if (formValues.client_id) {
      const c = clients.find((item) => item.id === formValues.client_id);
      if (c) clientName = c.name;
    }

    try {
      await saveMutation.mutateAsync({
        input: {
          client_id: formValues.client_id || null,
          customer_name: clientName || "Cliente Avulso",
          equip_type: formValues.equip_type.trim(),
          equip_capacity: formValues.equip_capacity.trim() || null,
          equip_serial: formValues.equip_serial.trim() || null,
          priority: formValues.priority,
          stage: formValues.stage,
          technician_id: formValues.technician_id || null,
          due_at: formValues.due_at ? new Date(formValues.due_at).toISOString() : null,
          notes: formValues.notes.trim() || null,
        },
        id: editingRecord ? editingRecord.id : undefined,
      });

      toast({
        variant: "success",
        title: editingRecord ? "Equipamento atualizado" : "Equipamento adicionado à bancada",
        description: `${formValues.equip_type} está na etapa "${ALL_BENCH_STAGES.find((s) => s.id === formValues.stage)?.title}".`,
      });

      setIsFormOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: err?.message || "Não foi possível registrar o equipamento.",
      });
    }
  }

  // Avançar / retroceder etapa
  async function handleMoveStage(record: BenchRecord, direction: "next" | "prev") {
    const currentIndex = activeStagesList.findIndex((s) => s.id === record.stage);
    let newIndex = currentIndex;

    if (direction === "next") {
      newIndex = Math.min(activeStagesList.length - 1, currentIndex + 1);
    } else {
      newIndex = Math.max(0, currentIndex - 1);
    }

    if (newIndex === currentIndex) return;
    const targetStage = activeStagesList[newIndex].id;

    try {
      await updateStageMutation.mutateAsync({ id: record.id, stage: targetStage });
      toast({
        variant: "success",
        title: `Movido para ${activeStagesList[newIndex].title}`,
        description: `${record.equip_type} avançou no fluxo da oficina.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao mover",
        description: err?.message || "Não foi possível alterar a etapa.",
      });
    }
  }

  // Excluir registro
  async function handleDelete(record: BenchRecord) {
    if (!confirm(`Remover "${record.equip_type}" da bancada?`)) return;
    try {
      await deleteMutation.mutateAsync(record.id);
      toast({
        variant: "success",
        title: "Removido",
        description: "Equipamento removido da bancada com sucesso.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: err?.message || "Não foi possível remover o registro.",
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
              Controle de Bancada
            </h1>
            <Badge
              variant="outline"
              className={
                isSimplifiedMode
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-purple-50 text-purple-700 border-purple-200"
              }
            >
              {isSimplifiedMode ? "Fluxo: Entrada > Na oficina > Saída" : `${enabledStages.length} Etapas Ativas`}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão visual da manutenção e recarga de extintores e mangueiras na oficina.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setIsMergeModalOpen(true)}
            className="h-10 gap-2 border-orange-200 hover:border-orange-400 text-orange-700 dark:text-orange-300 font-semibold"
            title="Juntar ou mesclar múltiplos lotes em um só"
          >
            <GitMerge className="h-4 w-4 text-orange-600" />
            Mesclar Lotes
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsConfigOpen(true)}
            className="h-10 gap-2 border-dashed"
            title="Ativar ou desativar etapas do fluxo"
          >
            <Settings2 className="h-4 w-4 text-primary" />
            Configurar Etapas
          </Button>

          <Button onClick={() => handleOpenCreate()} className="h-10 gap-2">
            <Plus className="h-4 w-4" />
            Nova Entrada na Oficina
          </Button>
        </div>
      </div>

      {/* Banner Informativo do Modo Atual */}
      {isSimplifiedMode && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-blue-200/80 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              <strong>Modo Simplificado Ativo:</strong> O fluxo está operando em 3 etapas essenciais (
              <strong>Chegada ➔ Na Oficina ➔ Saída</strong>). As etapas técnicas intermediárias estão desativadas conforme sua preferência.
            </span>
          </div>
          <button
            onClick={() => setIsConfigOpen(true)}
            className="text-blue-700 dark:text-blue-300 font-semibold hover:underline shrink-0"
          >
            Alterar
          </button>
        </div>
      )}

      {/* SELETOR DE VISÃO: LOTES DA OFICINA (PADRÃO) vs EXTINTORES INDIVIDUAIS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-100 dark:bg-neutral-800/60 rounded-2xl border">
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border">
          <button
            type="button"
            onClick={() => setViewMode("lotes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "lotes"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            Lotes da Oficina (Kanban Principal)
            {benchLotes.length > 0 && (
              <Badge className="bg-white text-orange-600 font-bold text-[10px] h-4 px-1.5 ml-1">
                {benchLotes.length}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setViewMode("extintores")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "extintores"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-4 w-4" />
            Extintores Detalhados
            <Badge variant="outline" className="text-[10px] h-4 px-1 ml-1">
              {records.length}
            </Badge>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Truck className="h-4 w-4 text-orange-600" />
          <span>
            {viewMode === "lotes"
              ? "Ao avançar da Saída, o lote vai para 'Lotes & Rotas' para devolução."
              : "Visão analítica de cilindros individuais na bancada."}
          </span>
        </div>
      </div>

      {/* KANBAN POR LOTES (FLUXO PRINCIPAL) */}
      {viewMode === "lotes" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {/* COLUNA 1: Chegada / Descarga */}
          <div className="flex flex-col rounded-2xl border bg-card shadow-sm border-t-4 border-t-blue-500 min-h-[500px]">
            <div className="p-4 border-b flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-sm tracking-tight">1. Chegada / Descarga</h3>
              </div>
              <Badge className="bg-blue-600 text-white font-mono text-xs">
                {chegadaLotes.length}
              </Badge>
            </div>

            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[720px]">
              {isLoadingLotes ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando lotes...
                </div>
              ) : chegadaLotes.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground text-xs">
                  Nenhum lote aguardando descarregamento na oficina.
                </div>
              ) : (
                chegadaLotes.map((lote) => (
                  <Card
                    key={lote.id}
                    className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all space-y-3 bg-white dark:bg-neutral-900 ${
                      selectedLoteIdsForMerge.includes(lote.id)
                        ? "border-orange-500 ring-2 ring-orange-400/20"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedLoteIdsForMerge.includes(lote.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleLoteSelectionForMerge(lote.id);
                            }}
                            className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0"
                            title="Selecionar lote para mesclar"
                          />
                          <Badge
                            variant="outline"
                            className="font-mono text-xs font-bold bg-neutral-100 dark:bg-neutral-800"
                          >
                            {lote.codigo}
                          </Badge>
                        </div>
                        <h4
                          onClick={() => setInspectingLote(lote)}
                          className="font-bold text-sm text-foreground mt-1.5 hover:text-orange-600 cursor-pointer transition-colors"
                          title="Clique para ver os clientes e extintores deste lote"
                        >
                          {lote.nome}
                        </h4>
                        {lote.cidade && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-red-500" /> {lote.cidade}{" "}
                            {lote.regiao ? `• ${lote.regiao}` : ""}
                          </p>
                        )}
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] shrink-0">
                        Aguardando Descarga
                      </Badge>
                    </div>

                    {/* Alerta Visual de Mescla se houver */}
                    {lote.observacoes && lote.observacoes.includes("[Mesclado") && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-md text-[10px] text-purple-700 dark:text-purple-300 font-medium">
                        <GitMerge className="h-3 w-3 shrink-0 text-purple-600" />
                        <span className="truncate">
                          {lote.observacoes.match(/\[Mesclado[^\]]+\]/)?.[0]?.replace(/[\[\]]/g, "") || "Lote Unificado"}
                        </span>
                      </div>
                    )}

                    {/* Resumo Clicável de Clientes do Lote */}
                    <div
                      onClick={() => setInspectingLote(lote)}
                      className="p-2.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg text-xs cursor-pointer hover:bg-orange-50/70 dark:hover:bg-neutral-800 hover:border-orange-300 transition-all border border-neutral-200 dark:border-neutral-700/80 space-y-1"
                      title="Clique para ver a lista de clientes e extintores deste lote"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-neutral-500 flex items-center gap-1">
                          <Users className="h-3 w-3 text-blue-600" /> Clientes Recolhidos:
                        </span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline">
                          Ver extintores ➔
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground truncate">
                        {lote.ordens && lote.ordens.length > 0
                          ? lote.ordens.map((o) => o.client?.name || "Cliente").join(", ")
                          : "Sem clientes vinculados"}
                      </p>
                    </div>

                    {/* Resumo de Cilindros & Clientes */}
                    <div className="grid grid-cols-2 gap-2 bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-lg text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                          Cilindros
                        </span>
                        <strong className="text-sm font-extrabold text-foreground">
                          {lote.total_extintores || 0} un
                        </strong>
                      </div>
                      <div className="border-l pl-2">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                          Clientes
                        </span>
                        <strong className="text-sm font-extrabold text-foreground">
                          {lote.total_clientes || 0}
                        </strong>
                      </div>
                    </div>

                    {/* Resumo de Modelos */}
                    {lote.modelos_agrupados && lote.modelos_agrupados.length > 0 && (
                      <div className="text-[11px] text-muted-foreground space-y-1 border-t pt-2">
                        <span className="font-semibold text-[10px] uppercase text-neutral-500 block">
                          Composição do Lote:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {lote.modelos_agrupados.map((m, idx) => (
                            <span
                              key={idx}
                              className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-[10px] text-foreground font-medium"
                            >
                              {m.count}x {m.modelo}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Botão de Avanço */}
                    <Button
                      size="sm"
                      onClick={() => handleAdvanceLote(lote.id, "em_oficina")}
                      disabled={advancingLoteId === lote.id}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                    >
                      {advancingLoteId === lote.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PackageCheck className="h-3.5 w-3.5" />
                      )}
                      Descarregar Lote ➔ Na Oficina
                    </Button>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* COLUNA 2: Na Oficina */}
          <div className="flex flex-col rounded-2xl border bg-card shadow-sm border-t-4 border-t-amber-500 min-h-[500px]">
            <div className="p-4 border-b flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-600" />
                <h3 className="font-bold text-sm tracking-tight">2. Na Oficina (Bancada)</h3>
              </div>
              <Badge className="bg-amber-600 text-white font-mono text-xs">
                {oficinaLotes.length}
              </Badge>
            </div>

            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[720px]">
              {isLoadingLotes ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando lotes...
                </div>
              ) : oficinaLotes.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground text-xs">
                  Nenhum lote em manutenção na bancada no momento.
                </div>
              ) : (
                oficinaLotes.map((lote) => (
                  <Card
                    key={lote.id}
                    className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all space-y-3 bg-white dark:bg-neutral-900 ${
                      selectedLoteIdsForMerge.includes(lote.id)
                        ? "border-orange-500 ring-2 ring-orange-400/20"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedLoteIdsForMerge.includes(lote.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleLoteSelectionForMerge(lote.id);
                            }}
                            className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0"
                            title="Selecionar lote para mesclar"
                          />
                          <Badge
                            variant="outline"
                            className="font-mono text-xs font-bold bg-neutral-100 dark:bg-neutral-800"
                          >
                            {lote.codigo}
                          </Badge>
                        </div>
                        <h4
                          onClick={() => setInspectingLote(lote)}
                          className="font-bold text-sm text-foreground mt-1.5 hover:text-orange-600 cursor-pointer transition-colors"
                          title="Clique para ver os clientes e extintores deste lote"
                        >
                          {lote.nome}
                        </h4>
                        {lote.cidade && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-red-500" /> {lote.cidade}{" "}
                            {lote.regiao ? `• ${lote.regiao}` : ""}
                          </p>
                        )}
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] shrink-0">
                        Em Manutenção
                      </Badge>
                    </div>

                    {/* Alerta Visual de Mescla se houver */}
                    {lote.observacoes && lote.observacoes.includes("[Mesclado") && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-md text-[10px] text-purple-700 dark:text-purple-300 font-medium">
                        <GitMerge className="h-3 w-3 shrink-0 text-purple-600" />
                        <span className="truncate">
                          {lote.observacoes.match(/\[Mesclado[^\]]+\]/)?.[0]?.replace(/[\[\]]/g, "") || "Lote Unificado"}
                        </span>
                      </div>
                    )}

                    {/* Resumo Clicável de Clientes do Lote */}
                    <div
                      onClick={() => setInspectingLote(lote)}
                      className="p-2.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg text-xs cursor-pointer hover:bg-orange-50/70 dark:hover:bg-neutral-800 hover:border-orange-300 transition-all border border-neutral-200 dark:border-neutral-700/80 space-y-1"
                      title="Clique para ver a lista de clientes e extintores deste lote"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-neutral-500 flex items-center gap-1">
                          <Users className="h-3 w-3 text-blue-600" /> Clientes Recolhidos:
                        </span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline">
                          Ver extintores ➔
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground truncate">
                        {lote.ordens && lote.ordens.length > 0
                          ? lote.ordens.map((o) => o.client?.name || "Cliente").join(", ")
                          : "Sem clientes vinculados"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-lg text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                          Cilindros
                        </span>
                        <strong className="text-sm font-extrabold text-foreground">
                          {lote.total_extintores || 0} un
                        </strong>
                      </div>
                      <div className="border-l pl-2">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                          Clientes
                        </span>
                        <strong className="text-sm font-extrabold text-foreground">
                          {lote.total_clientes || 0}
                        </strong>
                      </div>
                    </div>

                    {lote.modelos_agrupados && lote.modelos_agrupados.length > 0 && (
                      <div className="text-[11px] text-muted-foreground space-y-1 border-t pt-2">
                        <span className="font-semibold text-[10px] uppercase text-neutral-500 block">
                          Em Recarga / Bancada:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {lote.modelos_agrupados.map((m, idx) => (
                            <span
                              key={idx}
                              className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-[10px] text-foreground font-medium"
                            >
                              {m.count}x {m.modelo}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdvanceLote(lote.id, "aguardando_descarga")}
                        disabled={advancingLoteId === lote.id}
                        className="text-xs h-8 px-2"
                        title="Voltar para Chegada/Descarga"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleAdvanceLote(lote.id, "saida")}
                        disabled={advancingLoteId === lote.id}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                      >
                        {advancingLoteId === lote.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Wrench className="h-3.5 w-3.5" />
                        )}
                        Concluir Oficina ➔ Enviar p/ Saída
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* COLUNA 3: Saída */}
          <div className="flex flex-col rounded-2xl border bg-card shadow-sm border-t-4 border-t-purple-500 min-h-[500px]">
            <div className="p-4 border-b flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-purple-600" />
                <h3 className="font-bold text-sm tracking-tight">3. Saída (Pronto p/ Rota)</h3>
              </div>
              <Badge className="bg-purple-600 text-white font-mono text-xs">
                {saidaLotes.length}
              </Badge>
            </div>

            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[720px]">
              {isLoadingLotes ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando lotes...
                </div>
              ) : saidaLotes.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground text-xs">
                  Nenhum lote pronto para saída.
                </div>
              ) : (
                saidaLotes.map((lote) => (
                  <Card
                    key={lote.id}
                    className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all space-y-3 bg-white dark:bg-neutral-900 border-purple-200 ${
                      selectedLoteIdsForMerge.includes(lote.id)
                        ? "border-orange-500 ring-2 ring-orange-400/20"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedLoteIdsForMerge.includes(lote.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleLoteSelectionForMerge(lote.id);
                            }}
                            className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0"
                            title="Selecionar lote para mesclar"
                          />
                          <Badge
                            variant="outline"
                            className="font-mono text-xs font-bold bg-neutral-100 dark:bg-neutral-800"
                          >
                            {lote.codigo}
                          </Badge>
                        </div>
                        <h4
                          onClick={() => setInspectingLote(lote)}
                          className="font-bold text-sm text-foreground mt-1.5 hover:text-orange-600 cursor-pointer transition-colors"
                          title="Clique para ver os clientes e extintores deste lote"
                        >
                          {lote.nome}
                        </h4>
                        {lote.cidade && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-red-500" /> {lote.cidade}{" "}
                            {lote.regiao ? `• ${lote.regiao}` : ""}
                          </p>
                        )}
                      </div>
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] shrink-0">
                        Revisado & Aprovado
                      </Badge>
                    </div>

                    {/* Alerta Visual de Mescla se houver */}
                    {lote.observacoes && lote.observacoes.includes("[Mesclado") && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-md text-[10px] text-purple-700 dark:text-purple-300 font-medium">
                        <GitMerge className="h-3 w-3 shrink-0 text-purple-600" />
                        <span className="truncate">
                          {lote.observacoes.match(/\[Mesclado[^\]]+\]/)?.[0]?.replace(/[\[\]]/g, "") || "Lote Unificado"}
                        </span>
                      </div>
                    )}

                    {/* Resumo Clicável de Clientes do Lote */}
                    <div
                      onClick={() => setInspectingLote(lote)}
                      className="p-2.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg text-xs cursor-pointer hover:bg-orange-50/70 dark:hover:bg-neutral-800 hover:border-orange-300 transition-all border border-neutral-200 dark:border-neutral-700/80 space-y-1"
                      title="Clique para ver a lista de clientes e extintores deste lote"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-neutral-500 flex items-center gap-1">
                          <Users className="h-3 w-3 text-blue-600" /> Clientes Recolhidos:
                        </span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline">
                          Ver extintores ➔
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground truncate">
                        {lote.ordens && lote.ordens.length > 0
                          ? lote.ordens.map((o) => o.client?.name || "Cliente").join(", ")
                          : "Sem clientes vinculados"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-lg text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                          Cilindros
                        </span>
                        <strong className="text-sm font-extrabold text-foreground">
                          {lote.total_extintores || 0} un
                        </strong>
                      </div>
                      <div className="border-l pl-2">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                          Clientes
                        </span>
                        <strong className="text-sm font-extrabold text-foreground">
                          {lote.total_clientes || 0}
                        </strong>
                      </div>
                    </div>

                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 text-[11px] text-emerald-800 dark:text-emerald-300">
                      Cilindros prontos para carregar no veículo e entregar nos clientes.
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleAdvanceLote(lote.id, "liberar_rota")}
                      disabled={advancingLoteId === lote.id}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                    >
                      {advancingLoteId === lote.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Truck className="h-3.5 w-3.5" />
                      )}
                      Liberar para Rota de Entrega (Sai da Oficina)
                    </Button>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VISÃO SECUNDÁRIA: EXTINTORES INDIVIDUAIS NA BANCADA */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por equipamento, cliente, selo ou patrimônio..."
                className="pl-9 h-10"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[160px] h-10">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Prioridades</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 items-start">
            {activeStagesList.map((stage) => {
              const items = recordsByStage.get(stage.id) || [];
              return (
                <div
                  key={stage.id}
                  className={`flex flex-col rounded-xl border bg-card shadow-sm border-t-4 ${stage.headerBorder} min-h-[500px]`}
                >
                  {/* Header da Coluna */}
                  <div className={`p-3.5 border-b flex items-center justify-between ${stage.headerBg}`}>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm tracking-tight">{stage.title}</h3>
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs font-mono">
                        {items.length}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenCreate(stage.id)}
                      title={`Adicionar item diretamente em ${stage.title}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Corpo da Coluna */}
                  <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[700px]">
                    {items.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground border-2 border-dashed rounded-lg p-4">
                        Nenhum equipamento nesta etapa
                      </div>
                    ) : (
                      items.map((item) => {
                        const currentIndex = activeStagesList.findIndex((s) => s.id === stage.id);
                        const canGoPrev = currentIndex > 0;
                        const canGoNext = currentIndex < activeStagesList.length - 1;

                        return (
                          <Card
                            key={item.id}
                            className="p-3.5 hover:shadow-md transition-shadow border-muted relative group space-y-2.5 bg-background"
                          >
                            {/* Topo do Card: Tipo do Equipamento e Prioridade */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-sm leading-tight text-foreground">
                                  {item.equip_type}
                                </p>
                                {item.equip_capacity && (
                                  <span className="text-[11px] text-muted-foreground">
                                    Capacidade: {item.equip_capacity}
                                  </span>
                                )}
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 uppercase tracking-wide shrink-0 ${
                                  BENCH_PRIORITY_COLORS[item.priority]
                                }`}
                              >
                                {BENCH_PRIORITY_LABELS[item.priority]}
                              </Badge>
                            </div>

                            {/* Cliente e Patrimônio */}
                            <div className="space-y-1 text-xs text-muted-foreground">
                              {item.customer_name && (
                                <div className="flex items-center gap-1.5 truncate">
                                  <Building2 className="h-3 w-3 shrink-0 text-primary" />
                                  <span className="font-medium text-foreground truncate">
                                    {item.customer_name}
                                  </span>
                                </div>
                              )}
                              {item.equip_serial && (
                                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                  <Package className="h-3 w-3 shrink-0" />
                                  <span>Selo/Patrimônio: {item.equip_serial}</span>
                                </div>
                              )}
                            </div>

                            {/* Observações / Defeito */}
                            {item.notes && (
                              <p className="text-xs bg-muted/50 p-2 rounded text-muted-foreground line-clamp-2">
                                {item.notes}
                              </p>
                            )}

                            {/* Data / Prazo */}
                            {item.due_at && (
                              <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>Entrega: {formatDate(item.due_at)}</span>
                              </div>
                            )}

                            {/* Ações Rápidas: Mover Etapas */}
                            <div className="pt-2 border-t flex items-center justify-between gap-1 text-xs">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                                  onClick={() => {
                                    setPrintTarget({
                                      kind: "custom",
                                      title: item.equip_type || "Equipamento",
                                      serialNumber: item.equip_serial || `BC-${item.id.substring(0, 6).toUpperCase()}`,
                                      customerName: item.customer_name || "Cliente",
                                      type: item.equip_type || "Extintor / Mangueira",
                                      capacityOrLength: item.equip_capacity || "—",
                                    });
                                  }}
                                  title="Imprimir Etiqueta"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleOpenEdit(item)}
                                  title="Editar detalhes"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDelete(item)}
                                  title="Remover da bancada"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>

                              <div className="flex items-center gap-1">
                                {canGoPrev && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs gap-1"
                                    onClick={() => handleMoveStage(item, "prev")}
                                    title={`Voltar para ${activeStagesList[currentIndex - 1]?.title}`}
                                  >
                                    <ArrowLeft className="h-3 w-3" />
                                    Voltar
                                  </Button>
                                )}
                                {canGoNext && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="h-7 px-2 text-xs gap-1"
                                    onClick={() => handleMoveStage(item, "next")}
                                    title={`Avançar para ${activeStagesList[currentIndex + 1]?.title}`}
                                  >
                                    Avançar
                                    <ArrowRight className="h-3 w-3" />
                                  </Button>
                                )}
                                {!canGoNext && (
                                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Pronto
                                  </span>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Configuração de Etapas */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <DialogTitle>Personalizar Etapas da Oficina</DialogTitle>
            </div>
            <DialogDescription>
              Ative ou desative as etapas conforme o fluxo de trabalho da sua empresa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-semibold text-sm">Atalhos de Fluxo</p>
                <p className="text-xs text-muted-foreground">Alterne rapidamente entre modos predefinidos</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={isSimplifiedMode ? "default" : "outline"}
                  onClick={handleSetSimplifiedMode}
                  className="h-8 text-xs"
                >
                  Simplificado (3 Etapas)
                </Button>
                <Button
                  size="sm"
                  variant={!isSimplifiedMode ? "default" : "outline"}
                  onClick={handleSetFullMode}
                  className="h-8 text-xs"
                >
                  Completo (7 Etapas)
                </Button>
              </div>
            </div>

            <div className="divide-y rounded-lg border">
              {ALL_BENCH_STAGES.map((stage) => {
                const isEnabled = enabledStages.includes(stage.id);
                return (
                  <div key={stage.id} className="flex items-center justify-between p-3 gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{stage.title}</span>
                        {stage.isCore && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1 font-normal">
                            Essencial
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{stage.description}</p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggleStage(stage.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsConfigOpen(false)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação / Edição de Equipamento na Bancada */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveRecord}>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <DialogTitle>
                  {editingRecord ? "Editar Equipamento na Bancada" : "Nova Entrada na Oficina"}
                </DialogTitle>
              </div>
              <DialogDescription>
                Informe os dados do equipamento para acompanhamento na bancada.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Cliente */}
              <div className="space-y-1.5">
                <Label>Cliente Vinculado</Label>
                <Select
                  value={formValues.client_id}
                  onValueChange={(val) => {
                    const c = clients.find((item) => item.id === val);
                    setFormValues((prev) => ({
                      ...prev,
                      client_id: val,
                      customer_name: c ? c.name : prev.customer_name,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente (ou digite abaixo)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Cliente Avulso (Não cadastrado) --</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(!formValues.client_id || formValues.client_id === "none") && (
                <div className="space-y-1.5">
                  <Label>Nome do Cliente / Empresa</Label>
                  <Input
                    value={formValues.customer_name}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, customer_name: e.target.value }))
                    }
                    placeholder="Ex: Condomínio Solar das Flores"
                  />
                </div>
              )}

              {/* Tipo e Capacidade */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo de Equipamento *</Label>
                  <Select
                    value={formValues.equip_type}
                    onValueChange={(val) =>
                      setFormValues((prev) => ({ ...prev, equip_type: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIP_PRESETS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Capacidade / Tamanho</Label>
                  <Input
                    value={formValues.equip_capacity}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, equip_capacity: e.target.value }))
                    }
                    placeholder="Ex: 6kg, 10L, 15m"
                  />
                </div>
              </div>

              {/* Patrimônio / Selo e Prioridade */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nº Selo Inmetro / Patrimônio</Label>
                  <Input
                    value={formValues.equip_serial}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, equip_serial: e.target.value }))
                    }
                    placeholder="Ex: 0098421"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Prioridade</Label>
                  <Select
                    value={formValues.priority}
                    onValueChange={(val) =>
                      setFormValues((prev) => ({ ...prev, priority: val as BenchPriority }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Etapa Inicial e Previsão */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Etapa Inicial</Label>
                  <Select
                    value={formValues.stage}
                    onValueChange={(val) =>
                      setFormValues((prev) => ({ ...prev, stage: val as BenchStage }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeStagesList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Previsão de Saída</Label>
                  <Input
                    type="date"
                    value={formValues.due_at}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, due_at: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <Label>Observações / Serviços a Executar</Label>
                <Textarea
                  rows={3}
                  value={formValues.notes}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Ex: Recarga anual + teste hidrostático + troca de mangotinho..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? "Salvando..."
                  : editingRecord
                  ? "Salvar Alterações"
                  : "Adicionar à Bancada"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Barra Flutuante de Seleção de Lotes para Mesclagem */}
      {selectedLoteIdsForMerge.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-neutral-700 flex items-center gap-4 animate-in slide-in-from-bottom">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold">
              {selectedLoteIdsForMerge.length}
            </span>
            <span className="text-xs font-bold">Lote(s) selecionado(s) para mesclagem</span>
          </div>

          <Button
            size="sm"
            onClick={() => setIsMergeModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            <GitMerge className="h-3.5 w-3.5" />
            Mesclar Lotes Selecionados
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedLoteIdsForMerge([])}
            className="text-neutral-400 hover:text-white text-xs h-8"
          >
            Limpar
          </Button>
        </div>
      )}

      <LabelPrinterDialog
        open={!!printTarget}
        onOpenChange={(o) => !o && setPrintTarget(null)}
        target={printTarget}
      />

      <LoteMergeDialog
        open={isMergeModalOpen}
        onOpenChange={(o) => {
          setIsMergeModalOpen(o);
          if (!o) setSelectedLoteIdsForMerge([]);
        }}
        initialTargetLoteId={selectedLoteIdsForMerge[0]}
        initialSourceLoteIds={selectedLoteIdsForMerge.slice(1)}
        onSuccess={() => {
          setSelectedLoteIdsForMerge([]);
          refetchLotes();
        }}
      />

      <LoteInspectDialog
        open={!!inspectingLote}
        onOpenChange={(o) => !o && setInspectingLote(null)}
        lote={inspectingLote}
        onAdvanceStage={handleAdvanceLote}
      />
    </div>
  );
}
