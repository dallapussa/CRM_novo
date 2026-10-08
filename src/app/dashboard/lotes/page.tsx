"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Package,
  Users,
  RefreshCw,
  Trash2,
  GitMerge,
  Wrench,
  PackageCheck,
  Edit2,
  Info,
  X,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { LoteRecolhimento, LoteRecolhimentoStatus } from "@/types";
import {
  listLotesRecolhimento,
  deleteLoteRecolhimento,
  updateLoteStatus,
} from "@/services/prevention.service";
import { LoteCreateDialog } from "@/components/lotes/lote-create-dialog";
import { LoteDetailView } from "@/components/lotes/lote-detail-view";
import { LoteMergeDialog } from "@/components/lotes/lote-merge-dialog";

type LoteTabKey = "em_coleta" | "na_oficina" | "em_entrega" | "concluidos";

const MONTHS_LIST = [
  { value: "all", label: "Todos os Meses" },
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const YEARS_LIST = ["all", "2027", "2026", "2025", "2024"];

export default function LotesPage() {
  const { toast } = useToast();

  // ABA ATIVA: padrão "em_entrega" conforme solicitado
  const [activeTab, setActiveTab] = useState<LoteTabKey>("em_entrega");

  // Filtros de pesquisa por cliente, cidade e texto livre
  const [search, setSearch] = useState("");

  // Filtros de Mês e Ano
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [loteToEdit, setLoteToEdit] = useState<LoteRecolhimento | null>(null);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(null);

  const {
    data: lotes = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["lotes_recolhimento"],
    queryFn: listLotesRecolhimento,
  });

  const selectedLote = selectedLoteId
    ? lotes.find((l) => l.id === selectedLoteId) || null
    : null;

  // Funções de classificação de status por aba
  const isEmColeta = (status: LoteRecolhimentoStatus) =>
    status === "recolhendo" || status === "aguardando_descarga";

  const isNaOficina = (status: LoteRecolhimentoStatus) =>
    status === "em_oficina";

  const isEmEntrega = (status: LoteRecolhimentoStatus) =>
    status === "saida" || status === "pronto_entrega" || status === "em_devolucao";

  const isConcluido = (status: LoteRecolhimentoStatus) =>
    status === "concluido";

  // Lotes de faturamento diário (troca) não devem fazer parte dos lotes operacionais de oficina/romaneio
  const isFaturamentoDiario = (l: LoteRecolhimento) =>
    (l.observacoes || "").includes("[FATURAMENTO_DIARIO]") ||
    (l.codigo || "").startsWith("FAT-");

  const lotesOficina = useMemo(() => lotes.filter((l) => !isFaturamentoDiario(l)), [lotes]);

  // Contagens para os badges de cada aba
  const countEmColeta = useMemo(() => lotesOficina.filter((l) => isEmColeta(l.status)).length, [lotesOficina]);
  const countNaOficina = useMemo(() => lotesOficina.filter((l) => isNaOficina(l.status)).length, [lotesOficina]);
  const countEmEntrega = useMemo(() => lotesOficina.filter((l) => isEmEntrega(l.status)).length, [lotesOficina]);
  const countConcluidos = useMemo(() => lotesOficina.filter((l) => isConcluido(l.status)).length, [lotesOficina]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filtragem dos lotes conforme a aba selecionada, busca e datas
  const filteredLotes = useMemo(() => {
    return lotesOficina.filter((l) => {
      // 1. Filtro pela Aba ativa
      if (activeTab === "em_coleta" && !isEmColeta(l.status)) return false;
      if (activeTab === "na_oficina" && !isNaOficina(l.status)) return false;
      if (activeTab === "em_entrega" && !isEmEntrega(l.status)) return false;
      if (activeTab === "concluidos" && !isConcluido(l.status)) return false;

      // 2. Filtro de texto: Cliente, Cidade, Nome do Lote ou Código
      const q = search.trim().toLowerCase();
      if (q) {
        const matchLoteInfo =
          (l.nome && l.nome.toLowerCase().includes(q)) ||
          (l.codigo && l.codigo.toLowerCase().includes(q)) ||
          (l.cidade && l.cidade.toLowerCase().includes(q)) ||
          (l.regiao && l.regiao.toLowerCase().includes(q));

        const matchClient = l.ordens?.some((o) => {
          const cName = o.client?.name || (o.client as any)?.razao_social || (o.client as any)?.nome_fantasia || "";
          return cName.toLowerCase().includes(q);
        });

        if (!matchLoteInfo && !matchClient) return false;
      }

      // 3. Filtro por Mês e Ano
      if (selectedMonth !== "all" || selectedYear !== "all") {
        const rawDate = l.data_recolhimento || l.previsao_devolucao || l.created_at || "";
        if (rawDate) {
          const [y, m] = rawDate.split("-");
          if (selectedYear !== "all" && y !== selectedYear) return false;
          if (selectedMonth !== "all" && m !== selectedMonth) return false;
        } else {
          return false;
        }
      }

      // 4. Regra dos Concluídos: apenas últimos 3 meses caso não haja pesquisa ativa
      if (activeTab === "concluidos") {
        const hasCustomFilter = q !== "" || selectedMonth !== "all" || selectedYear !== "all";
        if (!hasCustomFilter) {
          const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
          const rawDate = l.previsao_devolucao || l.data_recolhimento || l.created_at || "";
          if (rawDate) {
            const lDate = new Date(rawDate + "T12:00:00");
            if (!isNaN(lDate.getTime()) && lDate < ninetyDaysAgo) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }, [lotes, activeTab, search, selectedMonth, selectedYear]);

  // Status labels & cores
  const statusLabels: Record<LoteRecolhimentoStatus, { label: string; color: string }> = {
    recolhendo: { label: "Em Recolhimento", color: "bg-blue-100 text-blue-800 border-blue-200" },
    aguardando_descarga: { label: "Chegada / Descarga", color: "bg-sky-100 text-sky-800 border-sky-200" },
    em_oficina: { label: "Na Oficina / Bancada", color: "bg-amber-100 text-amber-800 border-amber-200" },
    saida: { label: "Saída (Revisado)", color: "bg-purple-100 text-purple-800 border-purple-200" },
    pronto_entrega: { label: "Pronto p/ Entrega", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    em_devolucao: { label: "Em Rota de Devolução", color: "bg-orange-100 text-orange-800 border-orange-200" },
    concluido: { label: "Concluído", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  };

  // Alteração de Status com feedback visual
  async function handleUpdateStatus(loteId: string, nextStatus: LoteRecolhimentoStatus) {
    setIsUpdatingStatusId(loteId);
    try {
      await updateLoteStatus(loteId, nextStatus);
      toast({
        variant: "success",
        title: "Status do lote atualizado!",
        description: nextStatus === "concluido"
          ? "Lote finalizado com sucesso e movido para Lotes Concluídos!"
          : `Lote movido para "${statusLabels[nextStatus]?.label || nextStatus}".`,
      });
      await refetch();
      if (nextStatus === "concluido") {
        setActiveTab("concluidos");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: err?.message || "Tente novamente.",
      });
    } finally {
      setIsUpdatingStatusId(null);
    }
  }

  // Exclusão de lote
  async function handleDeleteLote(lote: LoteRecolhimento) {
    const extCount = lote.total_extintores || 0;
    const msg =
      extCount > 0
        ? `Tem certeza que deseja excluir o lote "${lote.nome}"?\n\nOs ${extCount} extintores vinculados retornarão ao status "No Cliente", permitindo novo recolhimento.`
        : `Tem certeza que deseja excluir o lote "${lote.nome}"?`;

    if (!confirm(msg)) return;

    try {
      await deleteLoteRecolhimento(lote.id);
      toast({
        variant: "success",
        title: "Lote excluído com sucesso",
        description: `O lote "${lote.nome}" foi removido do sistema.`,
      });
      if (selectedLoteId === lote.id) {
        setSelectedLoteId(null);
      }
      refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir lote",
        description: err?.message || "Tente novamente.",
      });
    }
  }

  // Visualização detalhada (Lote & Romaneio com abas SOMA e ROMANEIO)
  if (selectedLote) {
    return (
      <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
        <LoteDetailView
          lote={selectedLote}
          onBack={() => setSelectedLoteId(null)}
          onRefresh={() => refetch()}
          onConcluded={() => {
            setSelectedLoteId(null);
            setActiveTab("concluidos");
            refetch();
          }}
          onEdit={() => {
            setLoteToEdit(selectedLote);
            setCreateDialogOpen(true);
          }}
          onDelete={() => handleDeleteLote(selectedLote)}
        />

        <LoteCreateDialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) setLoteToEdit(null);
          }}
          loteToEdit={loteToEdit}
          onSuccess={() => refetch()}
        />
      </div>
    );
  }

  const hasActiveFilters = search.trim() !== "" || selectedMonth !== "all" || selectedYear !== "all";

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-xl shadow-xs">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Gestão de Lotes & Rotas
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Controle de lotes nas etapas de coleta, recarga na oficina, entrega aos clientes e histórico.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-2 h-9"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setMergeDialogOpen(true)}
            className="gap-2 border-orange-200 text-orange-700 hover:border-orange-400 font-semibold h-9"
            title="Juntar ou mesclar múltiplos lotes em um só"
          >
            <GitMerge className="h-4 w-4 text-orange-600" />
            Mesclar Lotes
          </Button>

          <Button
            onClick={() => {
              setLoteToEdit(null);
              setCreateDialogOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-sm h-9 font-bold"
          >
            <Plus className="h-4 w-4" />
            Novo Lote
          </Button>
        </div>
      </div>

      {/* ABAS PRINCIPAIS DO MENU DE LOTES (Configuração solicitada) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
        {/* ABA 1: Em Coleta */}
        <button
          type="button"
          onClick={() => setActiveTab("em_coleta")}
          className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
            activeTab === "em_coleta"
              ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 shadow-sm ring-2 ring-blue-600/20"
              : "border-border bg-card hover:bg-muted/40 opacity-80 hover:opacity-100"
          }`}
        >
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Truck className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${activeTab === "em_coleta" ? "text-blue-600" : "text-muted-foreground"}`} />
              <span className="font-bold text-xs sm:text-sm text-foreground truncate">Em Coleta</span>
            </div>
            <Badge className={`${activeTab === "em_coleta" ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"} font-bold text-[10px] sm:text-xs px-1.5 py-0.2 sm:px-2 shrink-0`}>
              {countEmColeta}
            </Badge>
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1.5 sm:mt-2 line-clamp-1 leading-tight">
            Lote na rota de coleta
          </p>
        </button>

        {/* ABA 2: Extintores na Oficina */}
        <button
          type="button"
          onClick={() => setActiveTab("na_oficina")}
          className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
            activeTab === "na_oficina"
              ? "border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 shadow-sm ring-2 ring-amber-600/20"
              : "border-border bg-card hover:bg-muted/40 opacity-80 hover:opacity-100"
          }`}
        >
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Wrench className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${activeTab === "na_oficina" ? "text-amber-600" : "text-muted-foreground"}`} />
              <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                <span className="hidden sm:inline">Extintores </span>Na Oficina
              </span>
            </div>
            <Badge className={`${activeTab === "na_oficina" ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"} font-bold text-[10px] sm:text-xs px-1.5 py-0.2 sm:px-2 shrink-0`}>
              {countNaOficina}
            </Badge>
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1.5 sm:mt-2 line-clamp-1 leading-tight">
            Cilindros em recarga
          </p>
        </button>

        {/* ABA 3: Em Entrega (PADRÃO) */}
        <button
          type="button"
          onClick={() => setActiveTab("em_entrega")}
          className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
            activeTab === "em_entrega"
              ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 shadow-sm ring-2 ring-purple-600/20"
              : "border-border bg-card hover:bg-muted/40 opacity-80 hover:opacity-100"
          }`}
        >
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <PackageCheck className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${activeTab === "em_entrega" ? "text-purple-600" : "text-muted-foreground"}`} />
              <span className="font-bold text-xs sm:text-sm text-foreground truncate">Em Entrega</span>
            </div>
            <Badge className={`${activeTab === "em_entrega" ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"} font-bold text-[10px] sm:text-xs px-1.5 py-0.2 sm:px-2 shrink-0`}>
              {countEmEntrega}
            </Badge>
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1.5 sm:mt-2 line-clamp-1 leading-tight">
            Lotes em entrega
          </p>
        </button>

        {/* ABA 4: Lotes Concluídos */}
        <button
          type="button"
          onClick={() => setActiveTab("concluidos")}
          className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
            activeTab === "concluidos"
              ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm ring-2 ring-emerald-600/20"
              : "border-border bg-card hover:bg-muted/40 opacity-80 hover:opacity-100"
          }`}
        >
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <CheckCircle2 className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${activeTab === "concluidos" ? "text-emerald-600" : "text-muted-foreground"}`} />
              <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                <span className="hidden sm:inline">Lotes </span>Concluídos
              </span>
            </div>
            <Badge className={`${activeTab === "concluidos" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"} font-bold text-[10px] sm:text-xs px-1.5 py-0.2 sm:px-2 shrink-0`}>
              {countConcluidos}
            </Badge>
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1.5 sm:mt-2 line-clamp-1 leading-tight">
            Rotas finalizadas
          </p>
        </button>
      </div>

      {/* BARRA DE PESQUISA & FILTROS POR CLIENTE, CIDADE, MÊS E ANO */}
      <Card className="border shadow-xs">
        <CardContent className="p-3 sm:p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
          {/* Busca por texto livre (Lote, Cliente, Cidade) */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por cliente, cidade, lote ou código..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtros de Mês e Ano */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            {/* Seletor de Mês */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs">
                <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS_LIST.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Seletor de Ano */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full sm:w-[110px] h-9 text-xs">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos Anos</SelectItem>
                {YEARS_LIST.filter((y) => y !== "all").map((y) => (
                  <SelectItem key={y} value={y} className="text-xs">
                    Ano {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Botão Limpar Filtros se Ativos */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedMonth("all");
                  setSelectedYear("all");
                }}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground col-span-2 sm:col-auto"
                title="Limpar todos os filtros"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* NOTIFICAÇÃO DE REGRA DOS 3 MESES PARA CONCLUÍDOS */}
      {activeTab === "concluidos" && !hasActiveFilters && (
        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 shadow-xs">
          <Info className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Otimização de Desempenho:</strong> Exibindo os lotes concluídos nos <strong>últimos 3 meses</strong>. Para localizar rotas anteriores, digite o cliente/cidade na busca ou selecione o mês e ano acima.
          </span>
        </div>
      )}

      {/* LISTA DE LOTES FILTRADOS */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-red-600" />
          Carregando lotes...
        </div>
      ) : filteredLotes.length === 0 ? (
        <Card className="text-center py-12 border-2 border-dashed">
          <CardContent className="space-y-3">
            <div className="mx-auto w-12 h-12 bg-muted text-muted-foreground rounded-full flex items-center justify-center">
              {activeTab === "em_coleta" && <Truck className="h-6 w-6 text-blue-600" />}
              {activeTab === "na_oficina" && <Wrench className="h-6 w-6 text-amber-600" />}
              {activeTab === "em_entrega" && <PackageCheck className="h-6 w-6 text-purple-600" />}
              {activeTab === "concluidos" && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
            </div>
            <h3 className="text-base font-bold text-foreground">
              Nenhum lote nesta aba ({activeTab.replace("_", " ")})
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {hasActiveFilters
                ? "Nenhum lote corresponde aos termos de busca e filtros selecionados. Tente limpar os filtros."
                : `Não há lotes com este status no momento.`}
            </p>
            {hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedMonth("all");
                  setSelectedYear("all");
                }}
                className="gap-2 text-xs"
              >
                Limpar Filtros de Busca
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setLoteToEdit(null);
                  setCreateDialogOpen(true);
                }}
                className="bg-red-600 hover:bg-red-700 text-white gap-2 text-xs font-bold"
              >
                <Plus className="h-4 w-4" />
                Criar Novo Lote
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLotes.map((lote) => {
            const statusConf = statusLabels[lote.status] || {
              label: lote.status,
              color: "bg-gray-100 text-gray-800 border-gray-200",
            };

            const devDate = new Date(lote.previsao_devolucao + "T00:00:00");
            const diffDays = Math.ceil((devDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const isUpdating = isUpdatingStatusId === lote.id;

            // Clientes vinculados no lote
            const clientNames = Array.from(
              new Set(
                (lote.ordens || [])
                  .map((o) => o.client?.name || (o.client as any)?.razao_social)
                  .filter(Boolean)
              )
            );

            return (
              <Card
                key={lote.id}
                className="hover:shadow-md transition-all border-2 flex flex-col justify-between rounded-2xl overflow-hidden group"
              >
                <CardHeader className="p-3.5 sm:p-5 pb-2.5 sm:pb-3 cursor-pointer" onClick={() => setSelectedLoteId(lote.id)}>
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground shrink-0">
                      {lote.codigo}
                    </span>
                    <Badge variant="outline" className={`font-semibold text-[10px] sm:text-xs shrink-0 ${statusConf.color}`}>
                      {statusConf.label}
                    </Badge>
                  </div>

                  <CardTitle className="text-base font-bold line-clamp-1 mt-1.5 text-foreground group-hover:text-red-600 transition-colors">
                    {lote.nome}
                  </CardTitle>

                  {lote.cidade && (
                    <CardDescription className="text-xs flex items-center gap-1 font-medium text-foreground">
                      <MapPin className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span className="truncate">{lote.cidade} {lote.regiao ? `• ${lote.regiao}` : ""}</span>
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-3.5 pt-0">
                  {/* Relação de Clientes */}
                  <div className="p-2 bg-muted/30 rounded-lg text-xs space-y-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Users className="h-3 w-3 text-blue-600" />
                      Clientes Recolhidos ({lote.total_clientes || clientNames.length}):
                    </span>
                    <p className="font-semibold text-foreground truncate text-xs">
                      {clientNames.length > 0 ? clientNames.join(", ") : "Sem clientes vinculados"}
                    </p>
                  </div>

                  {/* Informações de Prazo e Datas */}
                  <div className="p-2.5 bg-muted/40 rounded-lg border space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Recolhido em:
                      </span>
                      <strong className="text-foreground">
                        {new Date(lote.data_recolhimento + "T12:00:00").toLocaleDateString("pt-BR")}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-red-600" />
                        Devolução:
                      </span>
                      <strong className="text-foreground">
                        {new Date(lote.previsao_devolucao + "T12:00:00").toLocaleDateString("pt-BR")} (
                        {lote.prazo_dias}d)
                      </strong>
                    </div>

                    {lote.status !== "concluido" && (
                      <div className="pt-1 border-t flex justify-end">
                        <span
                          className={`font-semibold text-[11px] ${
                            diffDays < 0
                              ? "text-red-600"
                              : diffDays <= 2
                              ? "text-amber-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {diffDays < 0
                            ? `⚠️ Atrasado (${Math.abs(diffDays)}d)`
                            : diffDays === 0
                            ? "🚨 Devolução é hoje!"
                            : `Retorno em ${diffDays} dia(s)`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Totais de Clientes e Extintores */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg border bg-card">
                      <p className="text-muted-foreground flex items-center justify-center gap-1 text-[11px]">
                        <Users className="h-3 w-3" /> Clientes
                      </p>
                      <p className="text-base font-extrabold text-foreground mt-0.5">
                        {lote.total_clientes || 0}
                      </p>
                    </div>

                    <div className="p-2 rounded-lg border bg-card">
                      <p className="text-muted-foreground flex items-center justify-center gap-1 text-[11px]">
                        <Package className="h-3 w-3 text-blue-600" /> Extintores
                      </p>
                      <p className="text-base font-extrabold text-blue-600 mt-0.5">
                        {lote.total_extintores || 0} un
                      </p>
                    </div>
                  </div>

                  {/* BOTÕES DE AÇÃO DO LOTE (Totalmente Clicáveis e Funcionais) */}
                  <div className="pt-1 space-y-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {/* Botão Principal: Abrir Lote & Romaneio */}
                      <Button
                        className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 gap-1 sm:gap-1.5 font-bold text-xs h-9 shadow-xs min-w-0"
                        size="sm"
                        onClick={() => setSelectedLoteId(lote.id)}
                      >
                        <span className="truncate">Abrir Lote & Romaneio</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      </Button>

                      {/* Botão de Edição */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                        title="Editar Lote"
                        onClick={() => {
                          setLoteToEdit(lote);
                          setCreateDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>

                      {/* Botão de Exclusão */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        title="Excluir Lote"
                        onClick={() => handleDeleteLote(lote)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Botões de Ação por Etapa / Fluxo */}
                    {activeTab === "em_coleta" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(lote.id, "em_oficina")}
                        className="w-full text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50 gap-1.5 h-8"
                      >
                        <Wrench className="h-3.5 w-3.5 text-amber-600" />
                        Avançar: Enviar p/ Oficina ➔
                      </Button>
                    )}

                    {activeTab === "na_oficina" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(lote.id, "pronto_entrega")}
                        className="w-full text-xs font-bold border-purple-300 text-purple-800 hover:bg-purple-50 gap-1.5 h-8"
                      >
                        <PackageCheck className="h-3.5 w-3.5 text-purple-600" />
                        Avançar: Liberar p/ Entrega ➔
                      </Button>
                    )}

                    {activeTab === "em_entrega" && (
                      <Button
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(lote.id, "concluido")}
                        className="w-full text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 shadow-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Concluir Lote (Finalizar Entrega)
                      </Button>
                    )}

                    {activeTab === "concluidos" && (
                      <div className="flex items-center justify-between px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Lote Entregue & Finalizado
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(lote.id, "pronto_entrega")}
                          className="text-[10px] text-muted-foreground hover:text-foreground underline"
                        >
                          Reabrir
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog para Criar ou Editar Lote */}
      <LoteCreateDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setLoteToEdit(null);
        }}
        loteToEdit={loteToEdit}
        onSuccess={() => refetch()}
      />

      {/* Dialog para Mesclar / Juntar Lotes */}
      <LoteMergeDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
