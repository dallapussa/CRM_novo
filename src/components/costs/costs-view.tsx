"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Package,
  Layers,
  Fuel,
  TrendingDown,
  Flame,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Percent,
  SlidersHorizontal,
  Info,
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

  // Form de Extintor
  const [agente, setAgente] = useState("Pó ABC");
  const [capacidade, setCapacidade] = useState("4kg");
  const [custoNormal, setCustoNormal] = useState("18.00");
  const [custoReaproveitamento, setCustoReaproveitamento] = useState("6.00");
  const [precoPadrao, setPrecoPadrao] = useState("45.00");

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

  // Abertura do Modal de Extintor
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

  // Salvar Extintor
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
      toast({ variant: "success", title: "Modelo removido!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: err.message });
    }
  }

  // Cálculos dinâmicos da prévia do modal
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
            Defina o custo de recarga normal, custo de reaproveitamento e preço padrão de venda ao cliente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "extintores" ? (
            <Button
              onClick={handleOpenCreateModel}
              className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Adicionar Extintor / Modelo
            </Button>
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
        <Card>
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

        <Card>
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

        <Card>
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

        <Card>
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
            TAB 1: MODELOS DE EXTINTORES (O principal pedido do usuário)
            ========================================================================= */}
        <TabsContent value="extintores" className="space-y-4">
          <Card className="border shadow-xs">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-600" />
                  Tabela Oficial de Extintores, Custos e Preços de Venda
                </CardTitle>
                <CardDescription className="text-xs">
                  Estes modelos aparecem automaticamente no cadastro de extintores do cliente e servem de base para o relatório de lucro por lote.
                </CardDescription>
              </div>

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
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
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
                  {models.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                        Nenhum extintor cadastrado ainda. Clique em &quot;Adicionar Extintor / Modelo&quot; acima.
                      </TableCell>
                    </TableRow>
                  ) : (
                    models.map((m) => {
                      const lNorm = Math.max(0, m.preco_padrao - m.custo_normal);
                      const mNorm = m.preco_padrao > 0 ? Math.round((lNorm / m.preco_padrao) * 100) : 0;

                      const lReap = Math.max(0, m.preco_padrao - m.custo_reaproveitamento);
                      const mReap = m.preco_padrao > 0 ? Math.round((lReap / m.preco_padrao) * 100) : 0;

                      return (
                        <TableRow key={m.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-bold text-foreground text-sm">
                            <span className="flex items-center gap-1.5">
                              <Flame className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              {m.nome}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{m.agente}</TableCell>
                          <TableCell className="text-xs font-semibold">{m.capacidade}</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                            {formatCurrency(m.custo_normal)}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-blue-700 bg-blue-50/50 dark:bg-blue-950/20">
                            {formatCurrency(m.custo_reaproveitamento)}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20">
                            {formatCurrency(m.preco_padrao)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            <span className="font-semibold text-foreground">{formatCurrency(lNorm)}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">({mNorm}%)</span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            <span className="font-bold text-emerald-600">{formatCurrency(lReap)}</span>
                            <span className="text-[10px] text-emerald-700 ml-1 font-bold">({mReap}%)</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-neutral-600 hover:text-foreground"
                                onClick={() => handleOpenEditModel(m)}
                                title="Editar modelo e preços"
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
          MODAL: CADASTRAR OU EDITAR MODELO DE EXTINTOR
          Atende exatamente ao pedido: Tipo de agente com lista + TEXTO LIVRE,
          Peso com lista + TEXTO LIVRE, Custo Normal, Custo Reaproveitamento, Preço Padrão
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
