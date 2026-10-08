"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Edit3,
  Package,
  Layers,
  Fuel,
  TrendingDown,
  TrendingUp,
  Flame,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Percent,
  SlidersHorizontal,
  Info,
  Search,
  CheckSquare,
  Square,
  Save,
  X,
  Calculator,
  ArrowRight,
  Filter,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  listExtinguisherModels,
  saveExtinguisherModel,
  deleteExtinguisherModel,
  saveExtinguisherModelsBatch,
  deleteExtinguisherModelsBatch,
  type ExtinguisherModel,
  AGENTES_PRESET,
  CAPACIDADES_PRESET,
} from "@/services/extinguisher-catalog.service";

interface WorkshopCost {
  id: string;
  name: string;
  category: "Insumo de Recarga" | "Peças & Componentes" | "Gás & Nitrogênio" | "Geral";
  unitCost: number;
  unit: string;
  supplier: string;
  updatedAt: string;
}

const DEFAULT_INSUMOS: WorkshopCost[] = [
  {
    id: "1",
    name: "Pó Químico ABC 90% (Granel)",
    category: "Insumo de Recarga",
    unitCost: 14.5,
    unit: "kg",
    supplier: "Distribuidora Química Brasil",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Carga de Nitrogênio Industrial (Pressurização)",
    category: "Gás & Nitrogênio",
    unitCost: 180.0,
    unit: "cilindro 50L",
    supplier: "White Martins",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Anel Plástico Indicador Inmetro (Ano Vigente)",
    category: "Peças & Componentes",
    unitCost: 1.2,
    unit: "un",
    supplier: "SeloTech",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Manômetro Indicador de Pressão 1/8",
    category: "Peças & Componentes",
    unitCost: 9.8,
    unit: "un",
    supplier: "Manômetros Brasil",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "Válvula de Descarga Completa Latão",
    category: "Peças & Componentes",
    unitCost: 28.0,
    unit: "un",
    supplier: "Metalúrgica Fogo Forte",
    updatedAt: new Date().toISOString(),
  },
];

type BatchActionTab = "percent" | "fixed_diff" | "fixed_value" | "margin_target" | "change_agent";
type BatchTargetField = "preco_padrao" | "custo_normal" | "custo_reaproveitamento" | "todos";
type RoundOption = "none" | "cents_90" | "cents_50" | "integer";

function applyRounding(val: number, option: RoundOption): number {
  if (option === "integer") return Math.round(val);
  if (option === "cents_90") return Math.floor(val) + 0.9;
  if (option === "cents_50") return Math.floor(val) + 0.5;
  return Math.round(val * 100) / 100;
}

function calculateBatchTransformedModel(
  model: ExtinguisherModel,
  tab: BatchActionTab,
  targetField: BatchTargetField,
  percent: number,
  percentDir: "increase" | "decrease",
  roundOpt: RoundOption,
  fixedDiff: number,
  fixedDiffDir: "increase" | "decrease",
  fixedPreco: string,
  fixedCustoNormal: string,
  fixedCustoReap: string,
  targetMargin: number,
  targetMarginBase: "normal" | "reaproveitamento",
  newAgent: string
): ExtinguisherModel {
  let cNormal = model.custo_normal;
  let cReap = model.custo_reaproveitamento;
  let pPadrao = model.preco_padrao;
  let agente = model.agente;
  let nome = model.nome;

  if (tab === "percent") {
    const factor = percentDir === "increase" ? 1 + percent / 100 : Math.max(0, 1 - percent / 100);
    if (targetField === "custo_normal" || targetField === "todos") {
      cNormal = Math.max(0, applyRounding(model.custo_normal * factor, roundOpt));
    }
    if (targetField === "custo_reaproveitamento" || targetField === "todos") {
      cReap = Math.max(0, applyRounding(model.custo_reaproveitamento * factor, roundOpt));
    }
    if (targetField === "preco_padrao" || targetField === "todos") {
      pPadrao = Math.max(0, applyRounding(model.preco_padrao * factor, roundOpt));
    }
  } else if (tab === "fixed_diff") {
    const diff = fixedDiffDir === "increase" ? fixedDiff : -fixedDiff;
    if (targetField === "custo_normal" || targetField === "todos") {
      cNormal = Math.max(0, applyRounding(model.custo_normal + diff, roundOpt));
    }
    if (targetField === "custo_reaproveitamento" || targetField === "todos") {
      cReap = Math.max(0, applyRounding(model.custo_reaproveitamento + diff, roundOpt));
    }
    if (targetField === "preco_padrao" || targetField === "todos") {
      pPadrao = Math.max(0, applyRounding(model.preco_padrao + diff, roundOpt));
    }
  } else if (tab === "fixed_value") {
    if (fixedCustoNormal.trim() !== "") {
      const parsed = parseFloat(fixedCustoNormal.replace(",", "."));
      if (!isNaN(parsed) && parsed >= 0) cNormal = parsed;
    }
    if (fixedCustoReap.trim() !== "") {
      const parsed = parseFloat(fixedCustoReap.replace(",", "."));
      if (!isNaN(parsed) && parsed >= 0) cReap = parsed;
    }
    if (fixedPreco.trim() !== "") {
      const parsed = parseFloat(fixedPreco.replace(",", "."));
      if (!isNaN(parsed) && parsed >= 0) pPadrao = parsed;
    }
  } else if (tab === "margin_target") {
    const baseCost = targetMarginBase === "normal" ? model.custo_normal : model.custo_reaproveitamento;
    const marginSafe = Math.min(99, Math.max(1, targetMargin));
    const calculatedPrice = baseCost / (1 - marginSafe / 100);
    pPadrao = Math.max(0, applyRounding(calculatedPrice, roundOpt));
  } else if (tab === "change_agent") {
    if (newAgent.trim()) {
      agente = newAgent.trim();
      nome = `${agente} - ${model.capacidade}`;
    }
  }

  return {
    ...model,
    agente,
    nome,
    custo_normal: cNormal,
    custo_reaproveitamento: cReap,
    preco_padrao: pPadrao,
  };
}

export function CostsView() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"extintores" | "insumos">("extintores");

  // =========================================================================
  // ESTADO DE MODELOS DE EXTINTORES
  // =========================================================================
  const [models, setModels] = useState<ExtinguisherModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ExtinguisherModel | null>(null);

  // Form de Extintor Individual
  const [agente, setAgente] = useState("Pó ABC");
  const [capacidade, setCapacidade] = useState("4kg");
  const [custoNormal, setCustoNormal] = useState("18.00");
  const [custoReaproveitamento, setCustoReaproveitamento] = useState("6.00");
  const [precoPadrao, setPrecoPadrao] = useState("45.00");

  // =========================================================================
  // ESTADOS DE BUSCA, FILTRO E SELEÇÃO EM LOTE
  // =========================================================================
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState("todos");
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());

  // Modo de Edição Rápida (Planilha Inline)
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineEdits, setInlineEdits] = useState<
    Record<string, { custo_normal: string; custo_reaproveitamento: string; preco_padrao: string }>
  >({});
  const [isSavingInline, setIsSavingInline] = useState(false);

  // Modal de Alteração em Lote
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [batchTab, setBatchTab] = useState<BatchActionTab>("percent");
  const [batchTargetField, setBatchTargetField] = useState<BatchTargetField>("preco_padrao");
  const [batchPercent, setBatchPercent] = useState<string>("10");
  const [batchPercentDirection, setBatchPercentDirection] = useState<"increase" | "decrease">("increase");
  const [batchRoundOption, setBatchRoundOption] = useState<RoundOption>("none");

  const [batchFixedDiff, setBatchFixedDiff] = useState<string>("5.00");
  const [batchFixedDiffDirection, setBatchFixedDiffDirection] = useState<"increase" | "decrease">("increase");

  const [batchFixedPreco, setBatchFixedPreco] = useState<string>("");
  const [batchFixedCustoNormal, setBatchFixedCustoNormal] = useState<string>("");
  const [batchFixedCustoReap, setBatchFixedCustoReap] = useState<string>("");

  const [batchTargetMargin, setBatchTargetMargin] = useState<string>("50");
  const [batchTargetMarginBase, setBatchTargetMarginBase] = useState<"normal" | "reaproveitamento">("normal");

  const [batchNewAgent, setBatchNewAgent] = useState<string>("Pó ABC");

  // =========================================================================
  // ESTADO DE INSUMOS & PEÇAS
  // =========================================================================
  const [costs, setCosts] = useState<WorkshopCost[]>(DEFAULT_INSUMOS);
  const [isInsumoDialogOpen, setIsInsumoDialogOpen] = useState(false);
  const [insumoName, setInsumoName] = useState("");
  const [insumoCategory, setInsumoCategory] = useState<WorkshopCost["category"]>("Insumo de Recarga");
  const [insumoUnitCost, setInsumoUnitCost] = useState("");
  const [insumoUnit, setInsumoUnit] = useState("kg");
  const [insumoSupplier, setInsumoSupplier] = useState("");

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    setIsLoadingModels(true);
    try {
      const data = await listExtinguisherModels();
      setModels(data);
    } catch (err: any) {
      console.warn("Erro ao carregar modelos:", err);
    } finally {
      setIsLoadingModels(false);
    }
  }

  // Modelos Filtrados
  const filteredModels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return models.filter((m) => {
      const matchSearch =
        !q ||
        m.nome.toLowerCase().includes(q) ||
        m.agente.toLowerCase().includes(q) ||
        m.capacidade.toLowerCase().includes(q);
      const matchAgent = agentFilter === "todos" || m.agente.toLowerCase() === agentFilter.toLowerCase();
      return matchSearch && matchAgent;
    });
  }, [models, searchQuery, agentFilter]);

  // Lista de agentes distintos para chips de filtro
  const distinctAgents = useMemo(() => {
    const counts: Record<string, number> = {};
    models.forEach((m) => {
      counts[m.agente] = (counts[m.agente] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [models]);

  // Seleção em lote
  const allFilteredSelected =
    filteredModels.length > 0 && filteredModels.every((m) => selectedModelIds.has(m.id));
  const someFilteredSelected =
    filteredModels.some((m) => selectedModelIds.has(m.id)) && !allFilteredSelected;

  function handleSelectAllFiltered(checked: boolean) {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        filteredModels.forEach((m) => next.add(m.id));
      } else {
        filteredModels.forEach((m) => next.delete(m.id));
      }
      return next;
    });
  }

  function handleToggleModel(id: string) {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAllModels() {
    setSelectedModelIds(new Set(models.map((m) => m.id)));
  }

  function handleSelectByAgent(agentName: string) {
    setAgentFilter(agentName);
    const target = models.filter((m) => m.agente.toLowerCase() === agentName.toLowerCase());
    setSelectedModelIds(new Set(target.map((m) => m.id)));
  }

  // Abertura do Modal de Extintor Individual
  function handleOpenCreateModel() {
    setEditingModel(null);
    setAgente("Pó ABC");
    setCapacidade("8kg");
    setCustoNormal("30.00");
    setCustoReaproveitamento("9.00");
    setPrecoPadrao("68.00");
    setIsModelDialogOpen(true);
  }

  function handleOpenEditModel(m: ExtinguisherModel) {
    setEditingModel(m);
    setAgente(m.agente);
    setCapacidade(m.capacidade);
    setCustoNormal(String(m.custo_normal));
    setCustoReaproveitamento(String(m.custo_reaproveitamento));
    setPrecoPadrao(String(m.preco_padrao));
    setIsModelDialogOpen(true);
  }

  // Salvar Extintor Individual
  async function handleSaveModel(e: React.FormEvent) {
    e.preventDefault();
    if (!agente.trim() || !capacidade.trim()) {
      toast({ variant: "destructive", title: "Informe o tipo de agente e o peso/capacidade" });
      return;
    }

    const cNormal = parseFloat(custoNormal.replace(",", ".")) || 0;
    const cReaproveitamento = parseFloat(custoReaproveitamento.replace(",", ".")) || 0;
    const pPadrao = parseFloat(precoPadrao.replace(",", ".")) || 0;

    const nomeCompleto = `${agente.trim()} - ${capacidade.trim()}`;

    try {
      const saved = await saveExtinguisherModel({
        id: editingModel ? editingModel.id : undefined,
        nome: nomeCompleto,
        agente: agente.trim(),
        capacidade: capacidade.trim(),
        custo_normal: cNormal,
        custo_reaproveitamento: cReaproveitamento,
        preco_padrao: pPadrao,
        ativo: true,
      });

      setModels((prev) => {
        const filtered = prev.filter((m) => m.id !== saved.id && m.nome !== saved.nome);
        return [...filtered, saved].sort((a, b) => a.nome.localeCompare(b.nome));
      });

      toast({
        variant: "success",
        title: editingModel ? "Extintor atualizado!" : "Extintor cadastrado com sucesso!",
        description: `${nomeCompleto}: Custo Normal ${formatCurrency(cNormal)} | Reaproveitamento ${formatCurrency(cReaproveitamento)} | Venda ${formatCurrency(pPadrao)}`,
      });
      setIsModelDialogOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar extintor",
        description: err.message,
      });
    }
  }

  async function handleDeleteModel(id: string, nome: string) {
    if (!confirm(`Remover o modelo "${nome}" da tabela de custos e recargas?`)) return;
    try {
      await deleteExtinguisherModel(id);
      setModels((prev) => prev.filter((m) => m.id !== id));
      setSelectedModelIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast({ variant: "success", title: "Modelo removido!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: err.message });
    }
  }

  // =========================================================================
  // EDIÇÃO RÁPIDA NA TABELA (MODO PLANILHA)
  // =========================================================================
  function startInlineEditing() {
    const edits: Record<string, { custo_normal: string; custo_reaproveitamento: string; preco_padrao: string }> = {};
    models.forEach((m) => {
      edits[m.id] = {
        custo_normal: String(m.custo_normal),
        custo_reaproveitamento: String(m.custo_reaproveitamento),
        preco_padrao: String(m.preco_padrao),
      };
    });
    setInlineEdits(edits);
    setIsInlineEditing(true);
  }

  function cancelInlineEditing() {
    setIsInlineEditing(false);
    setInlineEdits({});
  }

  function handleInlineFieldChange(
    id: string,
    field: "custo_normal" | "custo_reaproveitamento" | "preco_padrao",
    val: string
  ) {
    setInlineEdits((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { custo_normal: "0", custo_reaproveitamento: "0", preco_padrao: "0" }),
        [field]: val,
      },
    }));
  }

  const changedInlineCount = useMemo(() => {
    let count = 0;
    models.forEach((m) => {
      const e = inlineEdits[m.id];
      if (!e) return;
      const cn = parseFloat(e.custo_normal.replace(",", ".")) || 0;
      const cr = parseFloat(e.custo_reaproveitamento.replace(",", ".")) || 0;
      const pp = parseFloat(e.preco_padrao.replace(",", ".")) || 0;
      if (cn !== m.custo_normal || cr !== m.custo_reaproveitamento || pp !== m.preco_padrao) {
        count++;
      }
    });
    return count;
  }, [models, inlineEdits]);

  async function handleSaveInlineEdits() {
    const toSave: ExtinguisherModel[] = [];
    models.forEach((m) => {
      const e = inlineEdits[m.id];
      if (!e) return;
      const cn = parseFloat(e.custo_normal.replace(",", ".")) || 0;
      const cr = parseFloat(e.custo_reaproveitamento.replace(",", ".")) || 0;
      const pp = parseFloat(e.preco_padrao.replace(",", ".")) || 0;
      if (cn !== m.custo_normal || cr !== m.custo_reaproveitamento || pp !== m.preco_padrao) {
        toSave.push({
          ...m,
          custo_normal: cn,
          custo_reaproveitamento: cr,
          preco_padrao: pp,
        });
      }
    });

    if (toSave.length === 0) {
      setIsInlineEditing(false);
      return;
    }

    setIsSavingInline(true);
    try {
      const saved = await saveExtinguisherModelsBatch(toSave);
      setModels((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        saved.forEach((s) => map.set(s.id, s));
        return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
      });
      toast({
        variant: "success",
        title: "Edições em lote salvas com sucesso!",
        description: `${toSave.length} modelo(s) atualizado(s) diretamente na tabela.`,
      });
      setIsInlineEditing(false);
      setInlineEdits({});
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar edições na tabela",
        description: err?.message,
      });
    } finally {
      setIsSavingInline(false);
    }
  }

  // =========================================================================
  // ALTERAÇÃO EM LOTE VIA MODAL
  // =========================================================================
  const selectedModels = useMemo(() => {
    return models.filter((m) => selectedModelIds.has(m.id));
  }, [models, selectedModelIds]);

  const batchPreviewModels = useMemo(() => {
    const pVal = parseFloat(batchPercent.replace(",", ".")) || 0;
    const fDiff = parseFloat(batchFixedDiff.replace(",", ".")) || 0;
    const tMargin = parseFloat(batchTargetMargin.replace(",", ".")) || 0;

    return selectedModels.map((m) => {
      return calculateBatchTransformedModel(
        m,
        batchTab,
        batchTargetField,
        pVal,
        batchPercentDirection,
        batchRoundOption,
        fDiff,
        batchFixedDiffDirection,
        batchFixedPreco,
        batchFixedCustoNormal,
        batchFixedCustoReap,
        tMargin,
        batchTargetMarginBase,
        batchNewAgent
      );
    });
  }, [
    selectedModels,
    batchTab,
    batchTargetField,
    batchPercent,
    batchPercentDirection,
    batchRoundOption,
    batchFixedDiff,
    batchFixedDiffDirection,
    batchFixedPreco,
    batchFixedCustoNormal,
    batchFixedCustoReap,
    batchTargetMargin,
    batchTargetMarginBase,
    batchNewAgent,
  ]);

  async function handleApplyBatchChanges() {
    if (batchPreviewModels.length === 0) return;
    setIsSavingBatch(true);
    try {
      const saved = await saveExtinguisherModelsBatch(batchPreviewModels);
      setModels((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        saved.forEach((s) => map.set(s.id, s));
        return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
      });

      toast({
        variant: "success",
        title: "Alteração em lote concluída!",
        description: `${saved.length} extintor(es) foram atualizados com sucesso.`,
      });

      setIsBatchDialogOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar lote de extintores",
        description: err?.message,
      });
    } finally {
      setIsSavingBatch(false);
    }
  }

  async function handleDeleteSelectedBatch() {
    const count = selectedModelIds.size;
    if (count === 0) return;
    if (
      !confirm(
        `Tem certeza que deseja excluir ${count} modelo(s) de extintor selecionado(s)? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    try {
      await deleteExtinguisherModelsBatch(Array.from(selectedModelIds));
      setModels((prev) => prev.filter((m) => !selectedModelIds.has(m.id)));
      setSelectedModelIds(new Set());
      toast({
        variant: "success",
        title: "Extintores excluídos!",
        description: `${count} modelo(s) foram removidos da tabela de custos.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir modelos em lote",
        description: err?.message,
      });
    }
  }

  // Cálculos dinâmicos da prévia do modal individual
  const previewNormalCost = parseFloat(custoNormal.replace(",", ".")) || 0;
  const previewReapCost = parseFloat(custoReaproveitamento.replace(",", ".")) || 0;
  const previewPrice = parseFloat(precoPadrao.replace(",", ".")) || 0;

  const lucroNormal = Math.max(0, previewPrice - previewNormalCost);
  const margemNormal = previewPrice > 0 ? Math.round((lucroNormal / previewPrice) * 100) : 0;

  const lucroReap = Math.max(0, previewPrice - previewReapCost);
  const margemReap = previewPrice > 0 ? Math.round((lucroReap / previewPrice) * 100) : 0;

  // Métricas do Topo
  const avgCustoNormal = useMemo(() => {
    if (models.length === 0) return 0;
    const sum = models.reduce((acc, m) => acc + m.custo_normal, 0);
    return sum / models.length;
  }, [models]);

  const avgCustoReap = useMemo(() => {
    if (models.length === 0) return 0;
    const sum = models.reduce((acc, m) => acc + m.custo_reaproveitamento, 0);
    return sum / models.length;
  }, [models]);

  const avgMargem = useMemo(() => {
    if (models.length === 0) return 0;
    const sum = models.reduce((acc, m) => {
      const l = m.preco_padrao - m.custo_reaproveitamento;
      return acc + (m.preco_padrao > 0 ? (l / m.preco_padrao) * 100 : 0);
    }, 0);
    return Math.round(sum / models.length);
  }, [models]);

  // Salvar Insumo Tradicional
  function handleSaveInsumo(e: React.FormEvent) {
    e.preventDefault();
    if (!insumoName.trim() || !insumoUnitCost) {
      toast({ variant: "destructive", title: "Preencha o nome e o custo unitário" });
      return;
    }

    const newCost: WorkshopCost = {
      id: String(Date.now()),
      name: insumoName.trim(),
      category: insumoCategory,
      unitCost: parseFloat(insumoUnitCost.replace(",", ".")) || 0,
      unit: insumoUnit.trim() || "un",
      supplier: insumoSupplier.trim() || "Não informado",
      updatedAt: new Date().toISOString(),
    };

    setCosts((prev) => [newCost, ...prev]);
    toast({ variant: "success", title: "Insumo cadastrado com sucesso!" });
    setIsInsumoDialogOpen(false);
  }

  function handleDeleteInsumo(id: string) {
    if (!confirm("Remover este item de custo?")) return;
    setCosts((prev) => prev.filter((c) => c.id !== id));
    toast({ variant: "success", title: "Item removido!" });
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" />
            Custos, Extintores & Tabela de Recargas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina o custo de recarga normal, custo de reaproveitamento e preço padrão de venda individual ou em lote.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "extintores" ? (
            <>
              <Button
                variant={isInlineEditing ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (isInlineEditing) cancelInlineEditing();
                  else startInlineEditing();
                }}
                className={`gap-1.5 text-xs h-9 ${
                  isInlineEditing
                    ? "bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                    : "border-neutral-300 dark:border-neutral-700 font-medium"
                }`}
                title="Editar valores de custos e preços diretamente na tabela"
              >
                <Edit3 className="h-3.5 w-3.5" />
                {isInlineEditing ? "Sair da Edição Rápida" : "Edição Rápida (Planilha)"}
              </Button>

              <Button
                onClick={handleOpenCreateModel}
                className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2 shadow-sm h-9"
              >
                <Plus className="h-4 w-4" />
                Adicionar Extintor
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                setInsumoName("");
                setInsumoUnitCost("");
                setInsumoSupplier("");
                setIsInsumoDialogOpen(true);
              }}
              className="h-10"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Insumo / Peça
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Modelos de Extintores
            </CardTitle>
            <Flame className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{models.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Disponíveis no cadastro do cliente</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Custo Médio (Normal)
            </CardTitle>
            <Fuel className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{formatCurrency(avgCustoNormal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Troca completa de pó e componentes</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Custo Médio (Reaproveitamento)
            </CardTitle>
            <Sparkles className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(avgCustoReap)}</div>
            <p className="text-xs text-muted-foreground mt-1">Pó reaproveitado (selo/anel/nitrogênio)</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Margem Média Estimada
            </CardTitle>
            <Percent className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">~ {avgMargem}%</div>
            <p className="text-xs text-muted-foreground mt-1">Calculada sobre o preço de venda</p>
          </CardContent>
        </Card>
      </div>

      {/* Navegação por Abas */}
      <Tabs
        value={activeTab}
        onValueChange={(v: string) => setActiveTab(v as any)}
        className="w-full space-y-4"
      >
        <TabsList className="grid grid-cols-2 max-w-md h-11 bg-muted/70 p-1">
          <TabsTrigger value="extintores" className="gap-2 text-xs font-bold">
            <Flame className="h-4 w-4 text-red-600" />
            Modelos de Extintores & Recargas
          </TabsTrigger>
          <TabsTrigger value="insumos" className="gap-2 text-xs font-medium">
            <Layers className="h-4 w-4 text-blue-600" />
            Insumos & Peças da Oficina
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            TAB 1: MODELOS DE EXTINTORES (COM ALTERAÇÃO EM LOTE COMPLETA)
            ========================================================================= */}
        <TabsContent value="extintores" className="space-y-4">
          {/* BARRA DE AÇÕES EM LOTE (QUANDO HOUVER SELECIONADOS) */}
          {selectedModelIds.size > 0 && (
            <div className="p-3.5 bg-gradient-to-r from-red-600/10 via-orange-500/10 to-amber-500/10 border-2 border-red-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center h-7 px-2.5 rounded-full bg-red-600 text-white font-bold text-xs shadow-xs">
                  {selectedModelIds.size}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-red-600" />
                    {selectedModelIds.size === 1
                      ? "1 extintor selecionado"
                      : `${selectedModelIds.size} extintores selecionados`}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Aplique reajuste percentual, ajuste em reais, novo valor fixo ou margem em massa.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <Button
                  size="sm"
                  onClick={() => setIsBatchDialogOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 text-xs h-8 shadow-xs flex-1 sm:flex-initial"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Alterar em Lote ({selectedModelIds.size})
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeleteSelectedBatch}
                  className="border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs h-8 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir ({selectedModelIds.size})
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedModelIds(new Set())}
                  className="text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  Desmarcar
                </Button>
              </div>
            </div>
          )}

          {/* BARRA DO MODO EDIÇÃO RÁPIDA (PLANILHA INLINE) */}
          {isInlineEditing && (
            <div className="p-3 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <Edit3 className="h-4 w-4 text-amber-600 animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    Modo Edição Rápida (Planilha) Ativo
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Digite os novos custos e preços nas células abaixo. {changedInlineCount > 0 ? (
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        ({changedInlineCount} modelo(s) modificado(s))
                      </span>
                    ) : (
                      "Nenhum valor modificado ainda."
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelInlineEditing}
                  disabled={isSavingInline}
                  className="text-xs h-8"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveInlineEdits}
                  disabled={isSavingInline || changedInlineCount === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 gap-1.5 shadow-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSavingInline ? "Salvando..." : `Salvar Alterações (${changedInlineCount})`}
                </Button>
              </div>
            </div>
          )}

          <Card className="border shadow-xs">
            <CardHeader className="pb-3 border-b space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Flame className="h-4 w-4 text-red-600" />
                    Tabela Oficial de Extintores, Custos e Preços de Venda
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Selecione extintores pelos checkboxes para alterar em lote ou clique em &quot;Edição Rápida&quot; para digitar diretamente.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  {selectedModelIds.size === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllModels}
                      className="text-xs h-8 gap-1"
                    >
                      <CheckSquare className="h-3.5 w-3.5 text-red-600" />
                      Selecionar Todos ({models.length})
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadModels}
                    disabled={isLoadingModels}
                    className="gap-1.5 text-xs h-8"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingModels ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                </div>
              </div>

              {/* FILTROS E BUSCA */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
                {/* Campo de Busca */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por extintor, agente ou peso..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Filtro por Chips de Agentes */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1 shrink-0">
                    <Filter className="h-3 w-3" />
                    Agente:
                  </span>

                  <button
                    type="button"
                    onClick={() => setAgentFilter("todos")}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium shrink-0 transition-colors ${
                      agentFilter === "todos"
                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 font-bold"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Todos ({models.length})
                  </button>

                  {distinctAgents.map(([ag, count]) => (
                    <button
                      key={ag}
                      type="button"
                      onClick={() => setAgentFilter(ag)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium shrink-0 transition-colors flex items-center gap-1.5 ${
                        agentFilter.toLowerCase() === ag.toLowerCase()
                          ? "bg-red-600 text-white border-red-600 font-bold shadow-xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <span>{ag}</span>
                      <span className="text-[10px] opacity-80">({count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    {/* Checkbox Master */}
                    <TableHead className="w-[44px] text-center px-2">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someFilteredSelected;
                        }}
                        onChange={(e) => handleSelectAllFiltered(e.target.checked)}
                        className="h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        title="Selecionar todos os visíveis"
                      />
                    </TableHead>
                    <TableHead className="font-bold">Extintor / Modelo</TableHead>
                    <TableHead className="font-bold">Agente</TableHead>
                    <TableHead className="font-bold">Capacidade</TableHead>
                    <TableHead className="font-bold text-amber-700">Custo Normal</TableHead>
                    <TableHead className="font-bold text-blue-700">Custo Reaproveitamento</TableHead>
                    <TableHead className="font-bold text-emerald-700">Preço Padrão Cliente</TableHead>
                    <TableHead className="font-bold text-right">Margem Normal</TableHead>
                    <TableHead className="font-bold text-right">Margem Reaproveit.</TableHead>
                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10 text-muted-foreground text-xs">
                        {models.length === 0
                          ? 'Nenhum extintor cadastrado ainda. Clique em "Adicionar Extintor" acima.'
                          : "Nenhum extintor corresponde ao filtro ou busca selecionados."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredModels.map((m) => {
                      const isSelected = selectedModelIds.has(m.id);

                      // Se em modo planilha inline, calcula com base no buffer
                      const inlineVal = inlineEdits[m.id];
                      const currentCNormal = isInlineEditing && inlineVal
                        ? parseFloat(inlineVal.custo_normal.replace(",", ".")) || 0
                        : m.custo_normal;
                      const currentCReap = isInlineEditing && inlineVal
                        ? parseFloat(inlineVal.custo_reaproveitamento.replace(",", ".")) || 0
                        : m.custo_reaproveitamento;
                      const currentPrice = isInlineEditing && inlineVal
                        ? parseFloat(inlineVal.preco_padrao.replace(",", ".")) || 0
                        : m.preco_padrao;

                      const lNorm = Math.max(0, currentPrice - currentCNormal);
                      const mNorm = currentPrice > 0 ? Math.round((lNorm / currentPrice) * 100) : 0;

                      const lReap = Math.max(0, currentPrice - currentCReap);
                      const mReap = currentPrice > 0 ? Math.round((lReap / currentPrice) * 100) : 0;

                      const isChanged =
                        isInlineEditing &&
                        inlineVal &&
                        (currentCNormal !== m.custo_normal ||
                          currentCReap !== m.custo_reaproveitamento ||
                          currentPrice !== m.preco_padrao);

                      return (
                        <TableRow
                          key={m.id}
                          className={`transition-colors ${
                            isSelected
                              ? "bg-red-50/60 dark:bg-red-950/20 border-l-4 border-l-red-600"
                              : isChanged
                              ? "bg-amber-50/60 dark:bg-amber-950/20"
                              : "hover:bg-muted/20"
                          }`}
                        >
                          {/* Checkbox da linha */}
                          <TableCell className="w-[44px] text-center px-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleModel(m.id)}
                              className="h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                          </TableCell>

                          <TableCell className="font-bold text-foreground text-sm">
                            <span className="flex items-center gap-1.5">
                              <Flame className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              {m.nome}
                              {isChanged && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
                                  Modificado
                                </Badge>
                              )}
                            </span>
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">{m.agente}</TableCell>
                          <TableCell className="text-xs font-semibold">{m.capacidade}</TableCell>

                          {/* Custo Normal */}
                          <TableCell className="bg-amber-50/40 dark:bg-amber-950/10">
                            {isInlineEditing ? (
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                                  R$
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={inlineVal?.custo_normal ?? m.custo_normal}
                                  onChange={(e) =>
                                    handleInlineFieldChange(m.id, "custo_normal", e.target.value)
                                  }
                                  className="h-7 w-24 pl-6 text-xs font-mono font-bold bg-white dark:bg-neutral-900 border-amber-300 focus:ring-amber-500"
                                />
                              </div>
                            ) : (
                              <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                                {formatCurrency(m.custo_normal)}
                              </span>
                            )}
                          </TableCell>

                          {/* Custo Reaproveitamento */}
                          <TableCell className="bg-blue-50/40 dark:bg-blue-950/10">
                            {isInlineEditing ? (
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                                  R$
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={inlineVal?.custo_reaproveitamento ?? m.custo_reaproveitamento}
                                  onChange={(e) =>
                                    handleInlineFieldChange(m.id, "custo_reaproveitamento", e.target.value)
                                  }
                                  className="h-7 w-24 pl-6 text-xs font-mono font-bold bg-white dark:bg-neutral-900 border-blue-300 focus:ring-blue-500"
                                />
                              </div>
                            ) : (
                              <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
                                {formatCurrency(m.custo_reaproveitamento)}
                              </span>
                            )}
                          </TableCell>

                          {/* Preço Padrão Cliente */}
                          <TableCell className="bg-emerald-50/40 dark:bg-emerald-950/10">
                            {isInlineEditing ? (
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                                  R$
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={inlineVal?.preco_padrao ?? m.preco_padrao}
                                  onChange={(e) =>
                                    handleInlineFieldChange(m.id, "preco_padrao", e.target.value)
                                  }
                                  className="h-7 w-24 pl-6 text-xs font-mono font-bold bg-white dark:bg-neutral-900 border-emerald-300 text-emerald-700 focus:ring-emerald-500"
                                />
                              </div>
                            ) : (
                              <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                {formatCurrency(m.preco_padrao)}
                              </span>
                            )}
                          </TableCell>

                          {/* Margem Normal */}
                          <TableCell className="text-right font-mono text-xs">
                            <span className="font-semibold text-foreground">{formatCurrency(lNorm)}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">({mNorm}%)</span>
                          </TableCell>

                          {/* Margem Reaproveitamento */}
                          <TableCell className="text-right font-mono text-xs">
                            <span className="font-bold text-emerald-600">{formatCurrency(lReap)}</span>
                            <span className="text-[10px] text-emerald-700 ml-1 font-bold">({mReap}%)</span>
                          </TableCell>

                          {/* Ações */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-neutral-600 hover:text-foreground"
                                onClick={() => handleOpenEditModel(m)}
                                title="Editar modelo individual"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:bg-red-50"
                                onClick={() => handleDeleteModel(m.id, m.nome)}
                                title="Excluir modelo"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 2: INSUMOS DE OFICINA & PEÇAS
            ========================================================================= */}
        <TabsContent value="insumos" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Insumos e Preços de Custo da Oficina</CardTitle>
              <CardDescription className="text-xs">
                Controle de pós químicos comprados a granel, nitrogênio, válvulas, anéis e insumos de bancada.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insumo / Peça</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Custo Unitário</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Atualizado em</TableHead>
                    <TableHead className="text-right w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold text-sm">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {c.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-sm text-foreground">
                        {formatCurrency(c.unitCost)} / {c.unit}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.supplier}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(c.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-50"
                          onClick={() => handleDeleteInsumo(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* =========================================================================
          MODAL: ALTERAÇÃO EM LOTE DE EXTINTORES
          Permite reajuste percentual, ajuste em reais, valor fixo, cálculo por margem
          ou troca de agente em massa com simulação/prévia em tempo real!
          ========================================================================= */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <SlidersHorizontal className="h-5 w-5 text-red-600" />
              Alteração em Lote de Extintores ({selectedModels.length})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure as alterações desejadas e visualize a simulação antes de aplicar aos modelos selecionados.
            </DialogDescription>
          </DialogHeader>

          {/* Chips dos modelos selecionados */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">
                Modelos Selecionados ({selectedModels.length} de {models.length}):
              </span>
              {selectedModels.length < models.length && (
                <button
                  type="button"
                  onClick={handleSelectAllModels}
                  className="text-[11px] font-semibold text-red-600 hover:underline"
                >
                  Selecionar todos os {models.length} modelos
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {selectedModels.map((m) => (
                <Badge
                  key={m.id}
                  variant="outline"
                  className="text-[11px] bg-white dark:bg-neutral-900 py-0.5 px-2 flex items-center gap-1 border-neutral-300 dark:border-neutral-700"
                >
                  <Flame className="h-3 w-3 text-red-500" />
                  {m.nome}
                </Badge>
              ))}
            </div>
          </div>

          {/* Seletor de Tipo de Ação em Lote */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-muted/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setBatchTab("percent")}
                className={`text-xs py-2 px-2 rounded-lg font-bold transition-all text-center ${
                  batchTab === "percent"
                    ? "bg-white dark:bg-neutral-900 text-red-600 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                % Reajuste
              </button>
              <button
                type="button"
                onClick={() => setBatchTab("fixed_diff")}
                className={`text-xs py-2 px-2 rounded-lg font-bold transition-all text-center ${
                  batchTab === "fixed_diff"
                    ? "bg-white dark:bg-neutral-900 text-red-600 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                +/- em R$
              </button>
              <button
                type="button"
                onClick={() => setBatchTab("fixed_value")}
                className={`text-xs py-2 px-2 rounded-lg font-bold transition-all text-center ${
                  batchTab === "fixed_value"
                    ? "bg-white dark:bg-neutral-900 text-red-600 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Valor Fixo
              </button>
              <button
                type="button"
                onClick={() => setBatchTab("margin_target")}
                className={`text-xs py-2 px-2 rounded-lg font-bold transition-all text-center ${
                  batchTab === "margin_target"
                    ? "bg-white dark:bg-neutral-900 text-red-600 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Margem Alvo
              </button>
              <button
                type="button"
                onClick={() => setBatchTab("change_agent")}
                className={`text-xs py-2 px-2 rounded-lg font-bold transition-all text-center col-span-2 sm:col-span-1 ${
                  batchTab === "change_agent"
                    ? "bg-white dark:bg-neutral-900 text-red-600 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Trocar Agente
              </button>
            </div>

            {/* TAB 1: REAJUSTE PERCENTUAL (%) */}
            {batchTab === "percent" && (
              <div className="space-y-3 p-4 bg-muted/20 border rounded-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Campo a Reajustar</Label>
                    <select
                      value={batchTargetField}
                      onChange={(e) => setBatchTargetField(e.target.value as any)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="preco_padrao">Preço Padrão de Venda ao Cliente</option>
                      <option value="custo_normal">Custo Normal (Recarga Virgem)</option>
                      <option value="custo_reaproveitamento">Custo Reaproveitamento</option>
                      <option value="todos">Todos os Custos & Preços</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Direção do Reajuste</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBatchPercentDirection("increase")}
                        className={`h-9 text-xs rounded-lg border font-bold flex items-center justify-center gap-1 transition-all ${
                          batchPercentDirection === "increase"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-background border-neutral-300 dark:border-neutral-700 text-muted-foreground"
                        }`}
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        Aumento (+%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchPercentDirection("decrease")}
                        className={`h-9 text-xs rounded-lg border font-bold flex items-center justify-center gap-1 transition-all ${
                          batchPercentDirection === "decrease"
                            ? "bg-red-600 text-white border-red-600 shadow-xs"
                            : "bg-background border-neutral-300 dark:border-neutral-700 text-muted-foreground"
                        }`}
                      >
                        <TrendingDown className="h-3.5 w-3.5" />
                        Desconto (-%)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Percentual (%)</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={batchPercent}
                        onChange={(e) => setBatchPercent(e.target.value)}
                        placeholder="Ex: 10"
                        className="h-9 pr-8 text-xs font-mono font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        %
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {["5", "10", "15", "20", "25"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setBatchPercent(p)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all ${
                            batchPercent === p
                              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 font-bold"
                              : "bg-background hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-bold">Arredondamento Inteligente</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: "none", label: "Centavos reais" },
                      { key: "integer", label: "Inteiro (R$ X,00)" },
                      { key: "cents_90", label: "Terminar em ,90" },
                      { key: "cents_50", label: "Terminar em ,50" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setBatchRoundOption(opt.key as any)}
                        className={`text-[11px] p-2 rounded-lg border font-medium transition-all text-center ${
                          batchRoundOption === opt.key
                            ? "bg-red-600 text-white border-red-600 font-bold shadow-xs"
                            : "bg-background hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AJUSTE EM REAIS (+/- R$) */}
            {batchTab === "fixed_diff" && (
              <div className="space-y-3 p-4 bg-muted/20 border rounded-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Campo a Modificar</Label>
                    <select
                      value={batchTargetField}
                      onChange={(e) => setBatchTargetField(e.target.value as any)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="preco_padrao">Preço Padrão de Venda ao Cliente</option>
                      <option value="custo_normal">Custo Normal (Recarga Virgem)</option>
                      <option value="custo_reaproveitamento">Custo Reaproveitamento</option>
                      <option value="todos">Todos os Custos & Preços</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Operação</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBatchFixedDiffDirection("increase")}
                        className={`h-9 text-xs rounded-lg border font-bold flex items-center justify-center gap-1 transition-all ${
                          batchFixedDiffDirection === "increase"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-background border-neutral-300 dark:border-neutral-700 text-muted-foreground"
                        }`}
                      >
                        + Adicionar R$
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchFixedDiffDirection("decrease")}
                        className={`h-9 text-xs rounded-lg border font-bold flex items-center justify-center gap-1 transition-all ${
                          batchFixedDiffDirection === "decrease"
                            ? "bg-red-600 text-white border-red-600 shadow-xs"
                            : "bg-background border-neutral-300 dark:border-neutral-700 text-muted-foreground"
                        }`}
                      >
                        - Subtrair R$
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Valor em Reais (R$)</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={batchFixedDiff}
                        onChange={(e) => setBatchFixedDiff(e.target.value)}
                        placeholder="Ex: 5,00"
                        className="h-9 pl-9 text-xs font-mono font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      {["2.00", "5.00", "10.00", "15.00"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setBatchFixedDiff(v)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all ${
                            batchFixedDiff === v
                              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 font-bold"
                              : "bg-background hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          +{v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DEFINIR VALORES FIXOS */}
            {batchTab === "fixed_value" && (
              <div className="space-y-3 p-4 bg-muted/20 border rounded-2xl">
                <p className="text-[11px] text-muted-foreground">
                  Preencha apenas os valores que deseja alterar nos extintores selecionados. Deixe em branco os que não devem ser modificados.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      Novo Custo Normal (R$)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={batchFixedCustoNormal}
                        onChange={(e) => setBatchFixedCustoNormal(e.target.value)}
                        placeholder="Manter atual"
                        className="h-9 pl-8 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-blue-800 dark:text-blue-300">
                      Novo Custo Reaprov. (R$)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={batchFixedCustoReap}
                        onChange={(e) => setBatchFixedCustoReap(e.target.value)}
                        placeholder="Manter atual"
                        className="h-9 pl-8 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Novo Preço Venda (R$)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={batchFixedPreco}
                        onChange={(e) => setBatchFixedPreco(e.target.value)}
                        placeholder="Manter atual"
                        className="h-9 pl-8 text-xs font-mono font-bold text-emerald-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MARGEM DE LUCRO ALVO (%) */}
            {batchTab === "margin_target" && (
              <div className="space-y-3 p-4 bg-muted/20 border rounded-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Margem Alvo Desejada (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        max="99"
                        value={batchTargetMargin}
                        onChange={(e) => setBatchTargetMargin(e.target.value)}
                        placeholder="Ex: 50"
                        className="h-9 pr-8 text-xs font-mono font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        %
                      </span>
                    </div>
                    <div className="flex items-center gap-1 pt-1">
                      {["40", "50", "60", "70"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setBatchTargetMargin(m)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                            batchTargetMargin === m
                              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-bold"
                              : "bg-background text-muted-foreground"
                          }`}
                        >
                          {m}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Base de Cálculo da Margem</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBatchTargetMarginBase("normal")}
                        className={`h-9 text-xs rounded-lg border font-bold text-center transition-all ${
                          batchTargetMarginBase === "normal"
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                            : "bg-background border-neutral-300 dark:border-neutral-700 text-muted-foreground"
                        }`}
                      >
                        Sobre Custo Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchTargetMarginBase("reaproveitamento")}
                        className={`h-9 text-xs rounded-lg border font-bold text-center transition-all ${
                          batchTargetMarginBase === "reaproveitamento"
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-background border-neutral-300 dark:border-neutral-700 text-muted-foreground"
                        }`}
                      >
                        Sobre Reaproveit.
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-1">
                      Fórmula: Preço = Custo / (1 - Margem/100)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: TROCAR AGENTE EM LOTE */}
            {batchTab === "change_agent" && (
              <div className="space-y-3 p-4 bg-muted/20 border rounded-2xl">
                <Label className="text-xs font-bold">Novo Tipo de Agente Extintor</Label>
                <div className="flex flex-wrap gap-1.5">
                  {AGENTES_PRESET.map((pAg) => (
                    <button
                      key={pAg}
                      type="button"
                      onClick={() => setBatchNewAgent(pAg)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                        batchNewAgent === pAg
                          ? "bg-red-600 text-white border-red-600 font-bold shadow-xs"
                          : "bg-background hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {pAg}
                    </button>
                  ))}
                </div>
                <Input
                  value={batchNewAgent}
                  onChange={(e) => setBatchNewAgent(e.target.value)}
                  placeholder="Ou digite o nome do agente..."
                  className="h-9 text-xs font-medium"
                />
              </div>
            )}

            {/* TABELA DE PRÉVIA DINÂMICA (AO VIVO) */}
            <div className="space-y-2 border rounded-2xl p-3 bg-neutral-50 dark:bg-neutral-900/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calculator className="h-4 w-4 text-primary" />
                  Simulação em Tempo Real (Antes &rarr; Depois):
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {batchPreviewModels.length} modelo(s) simulado(s)
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto border rounded-xl bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-[11px]">
                      <TableHead className="py-1.5 font-bold">Extintor</TableHead>
                      <TableHead className="py-1.5 font-bold text-amber-700">Custo Normal</TableHead>
                      <TableHead className="py-1.5 font-bold text-blue-700">Custo Reaprov.</TableHead>
                      <TableHead className="py-1.5 font-bold text-emerald-700">Preço Venda</TableHead>
                      <TableHead className="py-1.5 font-bold text-right">Nova Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchPreviewModels.map((preview, idx) => {
                      const original = selectedModels[idx] || preview;
                      const cNormalChanged = preview.custo_normal !== original.custo_normal;
                      const cReapChanged = preview.custo_reaproveitamento !== original.custo_reaproveitamento;
                      const pPadraoChanged = preview.preco_padrao !== original.preco_padrao;

                      const lucro = Math.max(0, preview.preco_padrao - preview.custo_normal);
                      const margem =
                        preview.preco_padrao > 0 ? Math.round((lucro / preview.preco_padrao) * 100) : 0;

                      return (
                        <TableRow key={preview.id} className="text-xs hover:bg-muted/20">
                          <TableCell className="font-semibold py-2">
                            <span className="block truncate max-w-[140px]" title={preview.nome}>
                              {preview.nome}
                            </span>
                          </TableCell>

                          {/* Custo Normal */}
                          <TableCell className="font-mono py-2">
                            {cNormalChanged ? (
                              <span className="flex items-center gap-1 text-amber-700 font-bold">
                                <span className="line-through text-muted-foreground text-[10px]">
                                  {formatCurrency(original.custo_normal)}
                                </span>
                                &rarr; {formatCurrency(preview.custo_normal)}
                              </span>
                            ) : (
                              formatCurrency(preview.custo_normal)
                            )}
                          </TableCell>

                          {/* Custo Reap */}
                          <TableCell className="font-mono py-2">
                            {cReapChanged ? (
                              <span className="flex items-center gap-1 text-blue-700 font-bold">
                                <span className="line-through text-muted-foreground text-[10px]">
                                  {formatCurrency(original.custo_reaproveitamento)}
                                </span>
                                &rarr; {formatCurrency(preview.custo_reaproveitamento)}
                              </span>
                            ) : (
                              formatCurrency(preview.custo_reaproveitamento)
                            )}
                          </TableCell>

                          {/* Preço Padrão */}
                          <TableCell className="font-mono py-2">
                            {pPadraoChanged ? (
                              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                                <span className="line-through text-muted-foreground text-[10px]">
                                  {formatCurrency(original.preco_padrao)}
                                </span>
                                &rarr; {formatCurrency(preview.preco_padrao)}
                              </span>
                            ) : (
                              formatCurrency(preview.preco_padrao)
                            )}
                          </TableCell>

                          {/* Margem */}
                          <TableCell className="font-mono text-right py-2 font-bold text-emerald-600">
                            {margem}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t flex flex-row items-center justify-between sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBatchDialogOpen(false)}
              disabled={isSavingBatch}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleApplyBatchChanges}
              disabled={isSavingBatch || batchPreviewModels.length === 0}
              className="bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 px-4 shadow-sm"
            >
              {isSavingBatch ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Salvando em Lote...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Aplicar e Salvar ({batchPreviewModels.length} Extintores)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: CADASTRAR OU EDITAR MODELO INDIVIDUAL DE EXTINTOR
          ========================================================================= */}
      <Dialog open={isModelDialogOpen} onOpenChange={setIsModelDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <form onSubmit={handleSaveModel} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Flame className="h-5 w-5 text-red-600" />
                {editingModel ? "Editar Extintor & Custos" : "Novo Extintor / Modelo de Recarga"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure o agente extintor, peso/capacidade, custos de recarga e o preço de venda padrão.
              </DialogDescription>
            </DialogHeader>

            {/* Agente Extintor com Seleção Rápida + Texto Livre */}
            <div className="space-y-1.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Tipo de Agente Extintor *
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Lista ou digitação livre
                </span>
              </div>

              {/* Botões rápidos de Agentes comuns */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {AGENTES_PRESET.map((pAgente) => (
                  <button
                    key={pAgente}
                    type="button"
                    onClick={() => setAgente(pAgente)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      agente === pAgente
                        ? "bg-red-600 text-white border-red-600 font-bold shadow-xs"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:border-red-300"
                    }`}
                  >
                    {pAgente}
                  </button>
                ))}
              </div>

              {/* CAMPO EDITÁVEL LIVRE DO AGENTE */}
              <div className="pt-2">
                <Input
                  value={agente}
                  onChange={(e) => setAgente(e.target.value)}
                  placeholder="Ex: Pó Químico ABC, CO2, Água..."
                  className="h-9 text-xs font-medium"
                  required
                />
              </div>
            </div>

            {/* Peso / Capacidade com Seleção Rápida + Texto Livre */}
            <div className="space-y-1.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Peso / Capacidade *
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Lista ou digitação livre
                </span>
              </div>

              {/* Botões rápidos de Pesos comuns */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CAPACIDADES_PRESET.map((pCap) => (
                  <button
                    key={pCap}
                    type="button"
                    onClick={() => setCapacidade(pCap)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      capacidade === pCap
                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 font-bold shadow-xs"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"
                    }`}
                  >
                    {pCap}
                  </button>
                ))}
              </div>

              {/* CAMPO EDITÁVEL LIVRE DO PESO */}
              <div className="pt-2">
                <Input
                  value={capacidade}
                  onChange={(e) => setCapacidade(e.target.value)}
                  placeholder="Ex: 8kg, 12kg, 20kg, 10L..."
                  className="h-9 text-xs font-medium"
                  required
                />
              </div>
            </div>

            {/* Nome Completo Combinado (Preview) */}
            <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 text-xs flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Nome final do extintor:</span>
              <strong className="text-orange-900 dark:text-orange-200 font-bold text-sm">
                {agente.trim() || "Extintor"} - {capacidade.trim() || "Carga"}
              </strong>
            </div>

            {/* Grid dos 3 Preços Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Custo Normal */}
              <div className="space-y-1.5 p-3 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
                <Label htmlFor="c-normal" className="text-[11px] font-bold text-amber-900 dark:text-amber-200 block">
                  Custo Preço Normal (R$) *
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input
                    id="c-normal"
                    type="number"
                    step="0.01"
                    value={custoNormal}
                    onChange={(e) => setCustoNormal(e.target.value)}
                    placeholder="0,00"
                    className="h-9 pl-8 text-xs font-mono font-bold"
                    required
                  />
                </div>
                <p className="text-[10px] text-amber-700">Pó virgem e carga nova</p>
              </div>

              {/* Custo Reaproveitamento */}
              <div className="space-y-1.5 p-3 rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
                <Label htmlFor="c-reap" className="text-[11px] font-bold text-blue-900 dark:text-blue-200 block">
                  Custo Reaproveitamento (R$) *
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input
                    id="c-reap"
                    type="number"
                    step="0.01"
                    value={custoReaproveitamento}
                    onChange={(e) => setCustoReaproveitamento(e.target.value)}
                    placeholder="0,00"
                    className="h-9 pl-8 text-xs font-mono font-bold"
                    required
                  />
                </div>
                <p className="text-[10px] text-blue-700">Pó aprovado (insumos mínimos)</p>
              </div>

              {/* Preço Padrão Cliente */}
              <div className="space-y-1.5 p-3 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200">
                <Label htmlFor="p-padrao" className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 block">
                  Preço Padrão Venda (R$) *
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input
                    id="p-padrao"
                    type="number"
                    step="0.01"
                    value={precoPadrao}
                    onChange={(e) => setPrecoPadrao(e.target.value)}
                    placeholder="0,00"
                    className="h-9 pl-8 text-xs font-mono font-bold text-emerald-700"
                    required
                  />
                </div>
                <p className="text-[10px] text-emerald-700">Cobrado do cliente (sugestão)</p>
              </div>
            </div>

            {/* Simulação em Tempo Real do Lucro */}
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl space-y-1.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Simulação de Rentabilidade Unitária:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white dark:bg-neutral-900 rounded-lg border">
                  <span className="text-muted-foreground block text-[10px]">Na Recarga Normal:</span>
                  <strong className="text-foreground font-mono">
                    Lucro {formatCurrency(lucroNormal)} ({margemNormal}%)
                  </strong>
                </div>
                <div className="p-2 bg-white dark:bg-neutral-900 rounded-lg border">
                  <span className="text-muted-foreground block text-[10px]">No Reaproveitamento:</span>
                  <strong className="text-emerald-600 font-mono">
                    Lucro {formatCurrency(lucroReap)} ({margemReap}%)
                  </strong>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModelDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 px-4"
              >
                <CheckCircle2 className="h-4 w-4" />
                Salvar Extintor na Tabela
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: NOVO INSUMO TRADICIONAL */}
      <Dialog open={isInsumoDialogOpen} onOpenChange={setIsInsumoDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveInsumo} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Novo Insumo / Matéria-Prima
              </DialogTitle>
              <DialogDescription>
                Cadastre o custo unitário de um insumo de recarga ou peça.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label>Nome do Insumo / Peça *</Label>
              <Input
                value={insumoName}
                onChange={(e) => setInsumoName(e.target.value)}
                placeholder="Ex: Pó Químico BC 40%, Manômetro..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Custo Unitário (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={insumoUnitCost}
                  onChange={(e) => setInsumoUnitCost(e.target.value)}
                  placeholder="0,00"
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Unidade de Medida</Label>
                <Input
                  value={insumoUnit}
                  onChange={(e) => setInsumoUnit(e.target.value)}
                  placeholder="kg, un, litro..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Fornecedor</Label>
              <Input
                value={insumoSupplier}
                onChange={(e) => setInsumoSupplier(e.target.value)}
                placeholder="Ex: White Martins, SeloTech..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsInsumoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Insumo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
