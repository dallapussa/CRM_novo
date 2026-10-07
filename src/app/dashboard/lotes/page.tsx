"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Plus,
  Search,
  Filter,
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
import { listLotesRecolhimento, deleteLoteRecolhimento } from "@/services/prevention.service";
import { LoteCreateDialog } from "@/components/lotes/lote-create-dialog";
import { LoteDetailView } from "@/components/lotes/lote-detail-view";
import { LoteMergeDialog } from "@/components/lotes/lote-merge-dialog";

export default function LotesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [loteToEdit, setLoteToEdit] = useState<LoteRecolhimento | null>(null);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);

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

  // Filtros
  const filteredLotes = lotes.filter((l) => {
    const matchesSearch =
      search === "" ||
      l.nome.toLowerCase().includes(search.toLowerCase()) ||
      l.codigo.toLowerCase().includes(search.toLowerCase()) ||
      (l.cidade && l.cidade.toLowerCase().includes(search.toLowerCase())) ||
      (l.regiao && l.regiao.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "ativos" && l.status !== "concluido") ||
      l.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Métricas
  const totalLotesAtivos = lotes.filter((l) => l.status !== "concluido").length;
  const totalExtintoresEmOficina = lotes
    .filter((l) => l.status !== "concluido")
    .reduce((sum, l) => sum + (l.total_extintores || 0), 0);
  const lotesConcluidos = lotes.filter((l) => l.status === "concluido").length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const devolucoesUrgentes = lotes.filter((l) => {
    if (l.status === "concluido") return false;
    const devDate = new Date(l.previsao_devolucao + "T00:00:00");
    const diff = Math.ceil((devDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 3; // vence em 3 dias ou já venceu
  }).length;

  const statusLabels: Record<LoteRecolhimentoStatus, { label: string; color: string }> = {
    recolhendo: { label: "Em Recolhimento", color: "bg-blue-100 text-blue-800 border-blue-200" },
    aguardando_descarga: { label: "Chegada / Descarga", color: "bg-sky-100 text-sky-800 border-sky-200" },
    em_oficina: { label: "Na Oficina / Bancada", color: "bg-amber-100 text-amber-800 border-amber-200" },
    saida: { label: "Saída (Revisado)", color: "bg-purple-100 text-purple-800 border-purple-200" },
    pronto_entrega: { label: "Pronto p/ Entrega", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    em_devolucao: { label: "Em Rota de Devolução", color: "bg-orange-100 text-orange-800 border-orange-200" },
    concluido: { label: "Concluído", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  };

  async function handleDeleteLote(lote: LoteRecolhimento) {
    const extCount = lote.total_extintores || 0;
    const msg =
      extCount > 0
        ? `Tem certeza que deseja excluir o lote "${lote.nome}"?\n\nOs ${extCount} extintores vinculados serão devolvidos ao status "No Cliente", permitindo novo recolhimento.`
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

  // Se o usuário selecionou um lote para abrir detalhes, exibe o LoteDetailView
  if (selectedLote) {
    return (
      <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
        <LoteDetailView
          lote={selectedLote}
          onBack={() => setSelectedLoteId(null)}
          onRefresh={() => refetch()}
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

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Lotes de Recolhimento & Rotas de Devolução
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestão integrada de macro lotes por região/cidade, contagem na chegada/saída e romaneio de devolução.
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
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setMergeDialogOpen(true)}
            className="gap-2 border-orange-200 text-orange-700 hover:border-orange-400 font-semibold"
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
            className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Novo Lote Geral
          </Button>
        </div>
      </div>

      {/* Cartões de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lotes Ativos
            </CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalLotesAtivos}</div>
            <p className="text-xs text-muted-foreground mt-1">Rotas em andamento ou oficina</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Extintores na Oficina
            </CardTitle>
            <Package className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totalExtintoresEmOficina}</div>
            <p className="text-xs text-muted-foreground mt-1">Cilindros agregados nos lotes ativos</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Devoluções Próximas
            </CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{devolucoesUrgentes}</div>
            <p className="text-xs text-muted-foreground mt-1">Prazos de 7 ou 14 dias vencendo</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lotes Concluídos
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{lotesConcluidos}</div>
            <p className="text-xs text-muted-foreground mt-1">Rotas entregues e finalizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por lote, cidade, região ou código..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="ativos">Apenas Ativos</SelectItem>
              <SelectItem value="em_oficina">Na Oficina</SelectItem>
              <SelectItem value="pronto_entrega">Pronto Entrega</SelectItem>
              <SelectItem value="concluido">Concluídos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Lotes */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-red-600" />
          Carregando lotes de recolhimento...
        </div>
      ) : filteredLotes.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-3">
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">Nenhum lote encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {search || statusFilter !== "all"
                ? "Nenhum lote corresponde aos filtros informados. Tente limpar os filtros."
                : "Crie seu primeiro Lote Geral para agrupar os recolhimentos de extintores por região ou data de devolução."}
            </p>
            <Button
              onClick={() => {
                setLoteToEdit(null);
                setCreateDialogOpen(true);
              }}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              Criar Primeiro Lote Geral
            </Button>
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

            return (
              <Card
                key={lote.id}
                className="hover:shadow-md transition-shadow border-2 flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                      {lote.codigo}
                    </span>
                    <Badge variant="outline" className={`font-semibold ${statusConf.color}`}>
                      {statusConf.label}
                    </Badge>
                  </div>

                  <CardTitle className="text-base font-bold line-clamp-1 mt-1 text-foreground">
                    {lote.nome}
                  </CardTitle>

                  {lote.cidade && (
                    <CardDescription className="text-xs flex items-center gap-1 font-medium text-foreground">
                      <MapPin className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      {lote.cidade} {lote.regiao ? `• ${lote.regiao}` : ""}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Informações de Prazo */}
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

                  {/* Totais de Clientes e Cilindros */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 rounded border bg-card">
                      <p className="text-muted-foreground flex items-center justify-center gap-1">
                        <Users className="h-3.5 w-3.5" /> Clientes
                      </p>
                      <p className="text-base font-bold text-foreground mt-0.5">
                        {lote.total_clientes || 0}
                      </p>
                    </div>

                    <div className="p-2 rounded border bg-card">
                      <p className="text-muted-foreground flex items-center justify-center gap-1">
                        <Package className="h-3.5 w-3.5" /> Extintores
                      </p>
                      <p className="text-base font-bold text-blue-600 mt-0.5">
                        {lote.total_extintores || 0} un
                      </p>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2 font-medium"
                      size="sm"
                      onClick={() => setSelectedLoteId(lote.id)}
                    >
                      <span>Abrir Lote & Romaneio</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 px-2.5"
                      title="Excluir Lote"
                      onClick={() => handleDeleteLote(lote)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
