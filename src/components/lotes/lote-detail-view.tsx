"use client";

import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Truck,
  PackageCheck,
  ClipboardList,
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Building,
  Phone,
  FileCheck,
  Send,
  Loader2,
  Share2,
  DollarSign,
  Receipt,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { LoteRecolhimento, OrdemRecolhimento, LoteRecolhimentoStatus } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  confirmClientDevolucao,
  updateLoteStatus,
  groupOrdensByClient,
  type GroupedClientInLote,
} from "@/services/prevention.service";
import { DeliveryReceiptDialog } from "./delivery-receipt-dialog";
import { LoteProfitReportDialog } from "./lote-profit-report-dialog";
import {
  listExtinguisherModels,
  type ExtinguisherModel,
  calculateItemCostAndProfit,
} from "@/services/extinguisher-catalog.service";

interface LoteDetailViewProps {
  lote: LoteRecolhimento;
  onBack: () => void;
  onRefresh?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function LoteDetailView({
  lote,
  onBack,
  onRefresh,
  onEdit,
  onDelete,
}: LoteDetailViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"soma" | "romaneio">("soma");
  const [confirmingOrdemId, setConfirmingOrdemId] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedGroupForDelivery, setSelectedGroupForDelivery] = useState<GroupedClientInLote | null>(null);
  const [isProfitReportOpen, setIsProfitReportOpen] = useState(false);
  const [catalogModels, setCatalogModels] = useState<ExtinguisherModel[]>([]);

  React.useEffect(() => {
    listExtinguisherModels().then(setCatalogModels).catch(console.error);
  }, []);

  const ordens = useMemo(() => lote.ordens || [], [lote.ordens]);

  const clientesAgrupados = useMemo<GroupedClientInLote[]>(() => {
    return groupOrdensByClient(ordens);
  }, [ordens]);

  // Resumo Financeiro & Lucratividade do Lote
  const financialSummary = useMemo(() => {
    let totalReceita = 0;
    let totalCusto = 0;
    let totalCilindros = 0;
    let qtdNormal = 0;
    let qtdReaprov = 0;
    let custoNormal = 0;
    let custoReaprov = 0;

    ordens.forEach((ordem) => {
      (ordem.itens || []).forEach((item) => {
        totalCilindros += 1;
        const valor = Number(item.valor_registrado || item.extintor?.valor_servico || 0);
        totalReceita += valor;
        const tipoCap = item.extintor?.tipo_capacidade || "Pó ABC - 4kg";
        const mod = (item.modalidade_recarga || "reaproveitamento").toLowerCase().includes("reaproveit")
          ? "reaproveitamento"
          : "normal";

        const itemCost = calculateItemCostAndProfit(tipoCap, mod, valor, catalogModels);
        totalCusto += itemCost.custo;

        if (mod === "reaproveitamento") {
          qtdReaprov += 1;
          custoReaprov += itemCost.custo;
        } else {
          qtdNormal += 1;
          custoNormal += itemCost.custo;
        }
      });
    });

    const lucroLiquido = totalReceita - totalCusto;
    const margemPercentual = totalReceita > 0 ? (lucroLiquido / totalReceita) * 100 : 0;

    return {
      totalReceita,
      totalCusto,
      lucroLiquido,
      margemPercentual,
      totalCilindros,
      qtdNormal,
      qtdReaprov,
      custoNormal,
      custoReaprov,
    };
  }, [ordens, catalogModels]);

  // 1. Agrupamento de Chegada: por Tipo e Capacidade
  const contagemPorTipo: Record<string, { tipoCapacidade: string; quantidade: number; valorTotal: number }> = {};
  let totalExtintoresLote = 0;
  let valorTotalServicos = 0;

  ordens.forEach((ordem) => {
    (ordem.itens || []).forEach((item) => {
      totalExtintoresLote += 1;
      const tc = item.extintor?.tipo_capacidade || "Extintor Padrão";
      const valor = item.valor_registrado || item.extintor?.valor_servico || 0;
      valorTotalServicos += valor;

      if (!contagemPorTipo[tc]) {
        contagemPorTipo[tc] = { tipoCapacidade: tc, quantidade: 0, valorTotal: 0 };
      }
      contagemPorTipo[tc].quantidade += 1;
      contagemPorTipo[tc].valorTotal += valor;
    });
  });

  const tiposAgrupados = Object.values(contagemPorTipo).sort((a, b) => b.quantidade - a.quantidade);

  // Status badge config
  const statusLabels: Record<LoteRecolhimentoStatus, { label: string; color: string }> = {
    recolhendo: { label: "Em Recolhimento", color: "bg-blue-100 text-blue-800 border-blue-200" },
    aguardando_descarga: { label: "Chegada / Descarga", color: "bg-sky-100 text-sky-800 border-sky-200" },
    em_oficina: { label: "Na Oficina / Bancada", color: "bg-amber-100 text-amber-800 border-amber-200" },
    saida: { label: "Saída (Revisado)", color: "bg-purple-100 text-purple-800 border-purple-200" },
    pronto_entrega: { label: "Pronto para Entrega", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    em_devolucao: { label: "Em Rota de Devolução", color: "bg-orange-100 text-orange-800 border-orange-200" },
    concluido: { label: "Concluído / Entregue", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  };

  const statusConfig = statusLabels[lote.status] || {
    label: lote.status,
    color: "bg-gray-100 text-gray-800 border-gray-200",
  };

  // Cálculo de dias restantes para a devolução
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const devDate = new Date(lote.previsao_devolucao + "T00:00:00");
  const diffTime = devDate.getTime() - todayDate.getTime();
  const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  async function handleConfirmClient(ordemId: string, clientName: string) {
    if (!confirm(`Confirmar devolução dos extintores para "${clientName}"?\nOs extintores retornarão ao status "no_cliente" e a validade será renovada.`)) {
      return;
    }

    setConfirmingOrdemId(ordemId);
    try {
      await confirmClientDevolucao(ordemId);
      toast({
        title: "Devolução confirmada!",
        description: `Extintores de ${clientName} devolvidos com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["lotes_recolhimento"] });
      queryClient.invalidateQueries({ queryKey: ["ordens_recolhimento"] });
      queryClient.invalidateQueries({ queryKey: ["extintores"] });
      onRefresh?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao confirmar devolução",
        description: err.message || "Tente novamente.",
      });
    } finally {
      setConfirmingOrdemId(null);
    }
  }

  async function handleChangeStatus(nextStatus: LoteRecolhimentoStatus) {
    setIsUpdatingStatus(true);
    try {
      await updateLoteStatus(lote.id, nextStatus);
      toast({
        title: "Status do Lote atualizado!",
        description: `Lote marcado como "${statusLabels[nextStatus]?.label || nextStatus}".`,
      });
      queryClient.invalidateQueries({ queryKey: ["lotes_recolhimento"] });
      onRefresh?.();
      if (nextStatus === "concluido") {
        setIsProfitReportOpen(true);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: err.message,
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function handlePrintRomaneio() {
    window.print();
  }

  const ordensConcluidas = ordens.filter((o) => o.status === "concluido").length;
  const ordensPendentes = ordens.filter((o) => o.status !== "concluido").length;
  const clientesConcluidos = clientesAgrupados.filter((g) =>
    g.ordens.every((o) => o.status === "concluido")
  ).length;
  const clientesPendentes = clientesAgrupados.length - clientesConcluidos;

  return (
    <div className="space-y-6">
      {/* Botão Voltar e Ações Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 w-fit">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Lista de Lotes
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsProfitReportOpen(true)}
            className="gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold"
          >
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Relatório de Lucro
          </Button>

          <Button variant="outline" size="sm" onClick={handlePrintRomaneio} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir Romaneio
          </Button>

          {lote.status !== "pronto_entrega" && lote.status !== "concluido" && (
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdatingStatus}
              onClick={() => handleChangeStatus("pronto_entrega")}
              className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Truck className="h-4 w-4" />
              Liberar p/ Caminhão (Pronto Entrega)
            </Button>
          )}

          {lote.status !== "concluido" && (
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdatingStatus}
              onClick={() => handleChangeStatus("concluido")}
              className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Concluir Todo o Lote
            </Button>
          )}

          {onEdit && (
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Editar Lote
            </Button>
          )}

          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              title="Excluir Lote e Devolver Extintores ao Cliente"
            >
              <Trash2 className="h-4 w-4" />
              Excluir Lote
            </Button>
          )}
        </div>
      </div>

      {/* Header do Lote */}
      <Card className="border-2 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600" />
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted">
                  {lote.codigo}
                </span>
                <Badge variant="outline" className={`font-semibold ${statusConfig.color}`}>
                  {statusConfig.label}
                </Badge>
                {lote.prazo_dias && (
                  <Badge variant="secondary" className="text-xs">
                    Ciclo de {lote.prazo_dias} dias
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{lote.nome}</h1>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                {lote.cidade && (
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-red-600" />
                    {lote.cidade} {lote.regiao ? `• ${lote.regiao}` : ""}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Recolhido em:{" "}
                  <strong className="text-foreground">
                    {new Date(lote.data_recolhimento + "T12:00:00").toLocaleDateString("pt-BR")}
                  </strong>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-red-600" />
                  Devolução prevista:{" "}
                  <strong className="text-foreground">
                    {new Date(lote.previsao_devolucao + "T12:00:00").toLocaleDateString("pt-BR")}
                  </strong>
                </span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-xs ${
                    diasRestantes < 0
                      ? "bg-red-100 text-red-700"
                      : diasRestantes <= 2
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {diasRestantes < 0
                    ? `Atrasado há ${Math.abs(diasRestantes)} dia(s)`
                    : diasRestantes === 0
                    ? "Devolução é HOJE!"
                    : `Faltam ${diasRestantes} dia(s) para devolução`}
                </span>
              </div>
            </div>

            {/* Resumo Numérico Rápido & Valores */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-muted/40 p-3 rounded-lg border text-center">
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase">Cilindros</p>
                <p className="text-lg font-extrabold text-foreground">{totalExtintoresLote}</p>
              </div>
              <div className="border-x px-1">
                <p className="text-[10px] text-muted-foreground font-medium uppercase">Clientes</p>
                <p className="text-lg font-extrabold text-foreground">{clientesAgrupados.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase">Total do Lote</p>
                <p className="text-lg font-extrabold text-foreground">
                  {formatCurrency(valorTotalServicos)}
                </p>
              </div>
              <div className="border-x px-1">
                <p className="text-[10px] text-muted-foreground font-medium uppercase text-emerald-600">Recebido</p>
                <p className="text-lg font-extrabold text-emerald-600">
                  {formatCurrency(lote.valor_recebido || 0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase text-amber-600">Pendente</p>
                <p className="text-lg font-extrabold text-amber-600">
                  {formatCurrency(Math.max(0, valorTotalServicos - (lote.valor_recebido || 0)))}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs com as 3 Visões Centrais */}
      <Tabs
        value={activeTab}
        onValueChange={(v: string) => setActiveTab(v as any)}
        className="w-full space-y-4"
      >
        <TabsList className="grid grid-cols-2 h-12 bg-muted/60 p-1 print:hidden rounded-xl">
          <TabsTrigger value="soma" className="gap-2 font-bold text-sm">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <span>1. SOMA (Cilindros por Tipo e Peso)</span>
            <Badge variant="secondary" className="text-xs px-2 py-0.5 font-bold">
              {totalExtintoresLote} un
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="romaneio" className="gap-2 font-bold text-sm">
            <PackageCheck className="h-4 w-4 text-emerald-600" />
            <span>2. Romaneio de Devolução</span>
            <Badge variant="secondary" className="text-xs px-2 py-0.5 font-bold">
              {clientesConcluidos}/{clientesAgrupados.length} clientes
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            TAB 1: SOMA (Total de Cilindros por Tipo e Peso)
            ========================================================================= */}
        <TabsContent value="soma" className="space-y-6">
          {/* Cartões de Agrupamento por Modelo/Capacidade */}
          <Card className="border-2 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                    SOMA: Total de Cilindros por Tipo e Peso
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Soma global de cilindros recolhidos neste lote, agrupados por agente extintor e capacidade/peso.
                  </CardDescription>
                </div>
                <Badge className="text-sm px-3 py-1 bg-blue-600 text-white font-bold w-fit">
                  Soma Total: {totalExtintoresLote} extintores
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {tiposAgrupados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum extintor registrado neste lote ainda.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {tiposAgrupados.map((item) => (
                    <div
                      key={item.tipoCapacidade}
                      className="p-3.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm text-foreground line-clamp-1">
                          {item.tipoCapacidade}
                        </span>
                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-2">
                          {item.quantidade} un
                        </Badge>
                      </div>
                      <div className="mt-3 pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                        <span>Valor total:</span>
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(item.valorTotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabela de Ordens por Cliente na Chegada */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building className="h-5 w-5 text-muted-foreground" />
                Clientes e Lotes Individuais Recolhidos
              </CardTitle>
              <CardDescription className="text-xs">
                Relação detalhada de cada OS de recolhimento que compõe este lote geral.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y text-sm">
                {clientesAgrupados.map((grp) => {
                  const clientName = grp.client?.name || grp.client?.razao_social || "Cliente";
                  const qtdItens = grp.totalExtintores;
                  const totalCliente = grp.valorTotal;
                  const allConcluido = grp.ordens.every((o) => o.status === "concluido");

                  return (
                    <div
                      key={grp.clientId}
                      className="p-4 hover:bg-muted/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-foreground">
                            {clientName}
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {grp.ordens.map((o) => (
                              <span key={o.id} className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                                OS #{o.numero_ordem}
                              </span>
                            ))}
                          </div>
                          {grp.reservas.length > 0 && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[11px] gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Deixou Reserva
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={
                              allConcluido
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }
                          >
                            {allConcluido ? "Devolvido ao cliente" : "Na oficina"}
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                          {grp.client?.address?.city && (
                            <span>
                              📍 {grp.client.address.city}
                              {grp.client.address.neighborhood ? ` (${grp.client.address.neighborhood})` : ""}
                            </span>
                          )}
                          {grp.client?.telefone && (
                            <span>📞 {grp.client.telefone}</span>
                          )}
                        </div>

                        {/* Pílulas dos extintores do cliente */}
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          {grp.itens.map((it, idx) => (
                            <span
                              key={it.id || idx}
                              className="inline-flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded border text-foreground"
                            >
                              <strong>{it.extintor?.identificacao || "Ext"}</strong>
                              <span className="text-muted-foreground">({it.extintor?.tipo_capacidade})</span>
                              <span className="text-[10px] text-blue-600 uppercase font-semibold">
                                [{it.modalidade_recarga || "Reaproveitamento"}]
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right min-w-[140px] space-y-1">
                        <p className="text-xs text-muted-foreground">Volume do cliente:</p>
                        <p className="text-lg font-bold text-foreground">{qtdItens} extintor(es)</p>
                        <p className="text-xs font-semibold text-emerald-600">
                          {formatCurrency(totalCliente)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 2: ROMANEIO DE DEVOLUÇÃO (Visitas aos Clientes na Rota)
            ========================================================================= */}
        <TabsContent value="romaneio" className="space-y-6">
          <div className="flex items-center justify-between print:hidden">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-emerald-600" />
                Romaneio de Entrega aos Clientes
              </h2>
              <p className="text-xs text-muted-foreground">
                Indica exatamente quais extintores deixar em cada cliente e a localização no prédio.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProfitReportOpen(true)}
                className="gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold"
              >
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Relatório de Lucro
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintRomaneio} className="gap-2">
                <Printer className="h-4 w-4" />
                Versão p/ Impressão
              </Button>
            </div>
          </div>

          {/* BANNER DE LUCRO & CUSTOS DO LOTE */}
          <Card className="print:hidden bg-gradient-to-br from-slate-900 via-neutral-900 to-slate-950 border-emerald-500/30 text-white overflow-hidden shadow-lg rounded-2xl">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500 text-neutral-950 font-bold text-xs uppercase tracking-wider">
                      Rentabilidade Operacional
                    </Badge>
                    <span className="text-xs text-neutral-400">
                      Calculado com base nas recargas e recolhimentos deste lote
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                    Balanço Financeiro: {lote.codigo}
                  </h3>
                </div>

                <Button
                  size="sm"
                  onClick={() => setIsProfitReportOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold gap-2 whitespace-nowrap shadow-sm text-xs"
                >
                  <DollarSign className="h-4 w-4" />
                  Abrir Relatório Completo
                </Button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-800">
                <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Receita Cobrada</span>
                  <strong className="text-base sm:text-lg text-emerald-400 font-bold font-mono">
                    {formatCurrency(financialSummary.totalReceita)}
                  </strong>
                </div>

                <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Custo Operacional</span>
                  <strong className="text-base sm:text-lg text-red-400 font-bold font-mono">
                    {formatCurrency(financialSummary.totalCusto)}
                  </strong>
                  <span className="text-[10px] text-neutral-500 block truncate">
                    Normal: {financialSummary.qtdNormal} | Reaprov: {financialSummary.qtdReaprov}
                  </span>
                </div>

                <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Lucro Líquido</span>
                  <strong className="text-base sm:text-lg text-white font-extrabold font-mono">
                    {formatCurrency(financialSummary.lucroLiquido)}
                  </strong>
                </div>

                <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Margem do Lote</span>
                  <strong className="text-base sm:text-lg text-emerald-300 font-bold font-mono">
                    {financialSummary.margemPercentual.toFixed(1)}%
                  </strong>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Devoluções por Cliente (Agrupada por Cliente, consolidando todas as OSs) */}
          <div className="space-y-4">
            {clientesAgrupados.map((grp, idx) => {
              const clientName =
                grp.client?.razao_social ||
                grp.client?.nome_fantasia ||
                grp.client?.name ||
                "Cliente";
              const isConcluido = grp.ordens.every((o) => o.status === "concluido");
              const isParcial = !isConcluido && grp.ordens.some((o) => o.status === "concluido");
              const enderecoCompleto = [
                grp.client?.address?.street || grp.client?.address_street,
                grp.client?.address?.number || grp.client?.address_number,
                grp.client?.address?.neighborhood || grp.client?.address_neighborhood,
                grp.client?.address?.city || grp.client?.address_city,
              ]
                .filter(Boolean)
                .join(", ");
              const telefone =
                grp.client?.telefone ||
                grp.client?.phone ||
                grp.client?.telefone2;

              return (
                <Card
                  key={grp.clientId}
                  className={`border-2 transition-all ${
                    isConcluido
                      ? "border-emerald-200 bg-emerald-50/20 opacity-80"
                      : "border-border shadow-sm"
                  }`}
                >
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="h-6 w-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
                            {idx + 1}
                          </span>
                          <h3 className="font-bold text-base text-foreground">{clientName}</h3>
                          <div className="flex items-center gap-1 flex-wrap">
                            {grp.ordens.map((o) => (
                              <Badge
                                key={o.id}
                                variant="outline"
                                className="font-mono text-xs bg-muted text-muted-foreground"
                              >
                                OS #{o.numero_ordem}
                              </Badge>
                            ))}
                          </div>
                          {isConcluido ? (
                            <Badge className="bg-emerald-600 text-white text-xs gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Devolvido com Sucesso
                            </Badge>
                          ) : isParcial ? (
                            <Badge className="bg-amber-600 text-white text-xs gap-1">
                              <Clock className="h-3 w-3" />
                              Parcialmente Devolvido
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300">
                              Pendente Devolução
                            </Badge>
                          )}
                        </div>

                        {/* Endereço Clicável para Google Maps (Grande para Celular) */}
                        {enderecoCompleto ? (
                          <div className="pt-2">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2.5 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl text-sm font-semibold transition-all shadow-xs active:scale-95 group w-full sm:w-auto"
                              title="Clique para abrir rota no Google Maps (fácil no celular)"
                            >
                              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs group-hover:scale-110 transition-transform">
                                <MapPin className="h-4 w-4" />
                              </div>
                              <div className="text-left min-w-0">
                                <span className="block text-sm font-bold text-blue-950 dark:text-blue-100 leading-tight">
                                  {enderecoCompleto}
                                </span>
                                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 mt-0.5">
                                  🗺️ Abrir rota no Google Maps ➔
                                </span>
                              </div>
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic flex items-center gap-1 pt-1">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Endereço não cadastrado
                          </span>
                        )}

                        {/* Telefone e Volume */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
                          {telefone && (
                            <a
                              href={`tel:${telefone.replace(/\D/g, "")}`}
                              className="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-foreground font-medium"
                            >
                              <Phone className="h-3.5 w-3.5 text-emerald-600" />
                              {telefone}
                            </a>
                          )}
                          <span className="font-semibold text-emerald-600">
                            Volume: {grp.itens.length} extintor(es) • Total: {formatCurrency(grp.valorTotal)}
                          </span>
                        </div>
                      </div>

                      {/* Botão de Ação: Entregar, Cobrar & Recibo Consolidado */}
                      <div className="print:hidden flex items-center gap-2">
                        {isConcluido ? (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Entregue & Cobrado
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedGroupForDelivery(grp)}
                              className="h-8 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 gap-1.5"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              Ver Recibo
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setSelectedGroupForDelivery(grp)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 whitespace-nowrap shadow-sm font-bold text-xs"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            Entregar & Cobrar Cliente ({grp.itens.length} un)
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* ALERTA DE CILINDRO RESERVA DO CLIENTE */}
                    {grp.reservas.length > 0 && (
                      <div className="mt-2 p-2.5 bg-amber-100 border border-amber-300 rounded-md text-amber-900 text-xs font-medium space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                          <span>⚠️ RECOLHER CILINDRO(S) RESERVA DA NOSSA OFICINA COM ESTE CLIENTE:</span>
                        </div>
                        {grp.reservas.map((res, rIdx) => (
                          <p key={rIdx} className="pl-5 text-amber-950 font-semibold">
                            • (OS #{res.numero_ordem}): {res.detalhes}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardHeader>

                  {/* Tabela dos Extintores a deixar no Cliente */}
                  <CardContent className="pt-0">
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/70 text-muted-foreground font-semibold border-b">
                          <tr>
                            <th className="py-2 px-3 text-left">Extintor / Patrimônio</th>
                            <th className="py-2 px-3 text-left">Tipo & Capacidade</th>
                            <th className="py-2 px-3 text-left font-bold text-foreground">
                              📍 Onde Deixar (Local no Prédio)
                            </th>
                            {grp.ordens.length > 1 && (
                              <th className="py-2 px-3 text-left">OS de Origem</th>
                            )}
                            <th className="py-2 px-3 text-left">Modalidade</th>
                            <th className="py-2 px-3 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {grp.itens.map((item, itIdx) => (
                            <tr key={item.id || itIdx} className="hover:bg-muted/20">
                              <td className="py-2 px-3 font-bold text-foreground">
                                {item.extintor?.identificacao || "Extintor"}
                              </td>
                              <td className="py-2 px-3 text-muted-foreground">
                                {item.extintor?.tipo_capacidade || "Padrão"}
                              </td>
                              <td className="py-2 px-3 font-semibold text-blue-700">
                                {item.extintor?.localizacao ? (
                                  <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    📌 {item.extintor.localizacao}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground italic">
                                    Local não informado
                                  </span>
                                )}
                              </td>
                              {grp.ordens.length > 1 && (
                                <td className="py-2 px-3">
                                  <Badge variant="outline" className="text-[10px] font-mono">
                                    OS #{grp.ordens.find((o) => o.id === item.ordem_id)?.numero_ordem}
                                  </Badge>
                                </td>
                              )}
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="text-[10px]">
                                  {item.modalidade_recarga || "Recarga"}
                                </Badge>
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-emerald-600">
                                {formatCurrency(item.valor_registrado || item.extintor?.valor_servico || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/50 font-bold border-t">
                          <tr>
                            <td colSpan={grp.ordens.length > 1 ? 4 : 3} className="py-2 px-3 text-foreground">
                              Total do Cliente ({grp.itens.length} cilindros)
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">Total</td>
                            <td className="py-2 px-3 text-right text-emerald-700 font-mono text-sm">
                              {formatCurrency(grp.valorTotal)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Espaço de Assinatura exclusivo para Impressão */}
                    <div className="hidden print:block mt-6 pt-4 border-t border-dashed">
                      <div className="flex justify-between items-end text-xs text-muted-foreground">
                        <div>
                          <p>Data de entrega: _____/_____/_________</p>
                          <p className="mt-1">Técnico responsável: ________________________</p>
                        </div>
                        <div className="text-center">
                          <div className="w-56 border-b border-black mb-1" />
                          <p>Assinatura do Recebedor ({clientName})</p>
                          <p className="text-[10px]">
                            {grp.ordens.map((o) => `OS #${o.numero_ordem}`).join(" • ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Diálogo de Cobrança, Entrega, Renovação e Recibo Timbrado */}
      {selectedGroupForDelivery && (
        <DeliveryReceiptDialog
          open={!!selectedGroupForDelivery}
          onOpenChange={(o) => !o && setSelectedGroupForDelivery(null)}
          clientGroup={selectedGroupForDelivery}
          loteId={lote.id}
          loteCodigo={lote.codigo}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["lotes_recolhimento"] });
            queryClient.invalidateQueries({ queryKey: ["ordens_recolhimento"] });
            queryClient.invalidateQueries({ queryKey: ["client_extintores"] });
            queryClient.invalidateQueries({ queryKey: ["receipts"] });
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["extinguishers"] });
            queryClient.invalidateQueries({ queryKey: ["extintores"] });
            queryClient.invalidateQueries({ queryKey: ["service_orders"] });
            queryClient.invalidateQueries({ queryKey: ["bench"] });
            queryClient.invalidateQueries({ queryKey: ["bench_lotes"] });
            onRefresh?.();
          }}
        />
      )}

      {/* DIÁLOGO DO RELATÓRIO DE LUCRO E CUSTOS DO LOTE */}
      <LoteProfitReportDialog
        open={isProfitReportOpen}
        onOpenChange={setIsProfitReportOpen}
        lote={lote}
        catalogModels={catalogModels}
      />
    </div>
  );
}
