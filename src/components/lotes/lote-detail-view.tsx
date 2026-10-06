"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { LoteRecolhimento, OrdemRecolhimento, LoteRecolhimentoStatus } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  confirmClientDevolucao,
  updateLoteStatus,
} from "@/services/prevention.service";
import { DeliveryReceiptDialog } from "./delivery-receipt-dialog";

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
  const [activeTab, setActiveTab] = useState<"chegada" | "saida" | "romaneio">("chegada");
  const [confirmingOrdemId, setConfirmingOrdemId] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<OrdemRecolhimento | null>(null);

  const ordens = lote.ordens || [];

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

  return (
    <div className="space-y-6">
      {/* Botão Voltar e Ações Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 w-fit">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Lista de Lotes
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
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
                <p className="text-lg font-extrabold text-foreground">{ordens.length}</p>
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
        <TabsList className="grid grid-cols-3 h-12 bg-muted/60 p-1 print:hidden">
          <TabsTrigger value="chegada" className="gap-2 font-medium">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <span>1. Soma de Chegada</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
              {totalExtintoresLote} un
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="saida" className="gap-2 font-medium">
            <Truck className="h-4 w-4 text-purple-600" />
            <span>2. Soma de Saída (Caminhão)</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
              {ordensPendentes} pend
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="romaneio" className="gap-2 font-medium">
            <PackageCheck className="h-4 w-4 text-emerald-600" />
            <span>3. Romaneio de Devolução</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
              {ordensConcluidas}/{ordens.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            TAB 1: SOMA DE CHEGADA (Conferência de Entrada no Galpão)
            ========================================================================= */}
        <TabsContent value="chegada" className="space-y-6">
          {/* Cartões de Agrupamento por Modelo/Capacidade */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                    Totais de Extintores Recolhidos por Modelo / Carga
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Soma global de cilindros recolhidos na chegada ao galpão para planejar as recargas e testes.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-sm px-3 py-1 bg-blue-50 text-blue-700 border-blue-200">
                  Total Chegada: <strong>{totalExtintoresLote} extintores</strong>
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
                {ordens.map((ordem) => {
                  const clientName = ordem.client?.name || "Cliente";
                  const qtdItens = ordem.itens?.length || 0;
                  const totalOrdem = (ordem.itens || []).reduce(
                    (acc, i) => acc + (i.valor_registrado || i.extintor?.valor_servico || 0),
                    0
                  );

                  return (
                    <div
                      key={ordem.id}
                      className="p-4 hover:bg-muted/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-foreground">
                            {clientName}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            OS #{ordem.numero_ordem}
                          </span>
                          {ordem.deixou_reserva && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[11px] gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Deixou Reserva ({ordem.detalhes_reserva || "Sim"})
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={
                              ordem.status === "concluido"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }
                          >
                            {ordem.status === "concluido" ? "Devolvido ao cliente" : "Na oficina"}
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                          {ordem.client?.address?.city && (
                            <span>
                              📍 {ordem.client.address.city}
                              {ordem.client.address.neighborhood ? ` (${ordem.client.address.neighborhood})` : ""}
                            </span>
                          )}
                          {ordem.client?.telefone && (
                            <span>📞 {ordem.client.telefone}</span>
                          )}
                          <span>Técnico: {ordem.tecnico_responsavel || "Oficina"}</span>
                        </div>

                        {/* Pílulas dos extintores do cliente */}
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          {(ordem.itens || []).map((it) => (
                            <span
                              key={it.id}
                              className="inline-flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded border text-foreground"
                            >
                              <strong>{it.extintor?.identificacao || "Ext"}</strong>
                              <span className="text-muted-foreground">({it.extintor?.tipo_capacidade})</span>
                              <span className="text-[10px] text-blue-600 uppercase font-semibold">
                                [{it.modalidade_recarga}]
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right min-w-[140px] space-y-1">
                        <p className="text-xs text-muted-foreground">Volume recolhido:</p>
                        <p className="text-lg font-bold text-foreground">{qtdItens} extintor(es)</p>
                        <p className="text-xs font-semibold text-emerald-600">
                          {formatCurrency(totalOrdem)}
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
            TAB 2: SOMA DE SAÍDA (Carregamento do Caminhão)
            ========================================================================= */}
        <TabsContent value="saida" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Truck className="h-5 w-5 text-purple-600" />
                    Conferência de Carga do Veículo (Soma de Saída)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Confira a quantidade total de cilindros que devem ser colocados no caminhão para a rota de entrega.
                  </CardDescription>
                </div>
                <Badge className="bg-purple-600 text-white font-bold text-sm px-3 py-1">
                  Carga Total: {totalExtintoresLote} cilindros
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Checklist de Carregamento por Modelo */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                  <span>Modelo / Capacidade</span>
                  <span>Qtd a Embarcar no Caminhão</span>
                </div>
                <div className="divide-y text-sm">
                  {tiposAgrupados.map((item) => (
                    <div
                      key={item.tipoCapacidade}
                      className="px-4 py-3 flex items-center justify-between hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                          ✓
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{item.tipoCapacidade}</p>
                          <p className="text-xs text-muted-foreground">
                            Cilindros revisados e testados pela oficina
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-extrabold text-foreground">
                          {item.quantidade}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">unidades</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status do Veículo e Rota */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-purple-900 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Status da Rota de Entrega
                  </h4>
                  <p className="text-xs text-purple-700">
                    Ao finalizar o embarque de todos os cilindros no veículo, altere o status do lote para &quot;Pronto para Entrega&quot;.
                  </p>
                </div>

                <Button
                  onClick={() => handleChangeStatus("pronto_entrega")}
                  disabled={isUpdatingStatus || lote.status === "pronto_entrega"}
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-2 whitespace-nowrap"
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {lote.status === "pronto_entrega" ? "Caminhão em Rota" : "Confirmar Carga Embarcada"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 3: ROMANEIO DE DEVOLUÇÃO (Visitas aos Clientes na Rota)
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
            <Button variant="outline" size="sm" onClick={handlePrintRomaneio} className="gap-2">
              <Printer className="h-4 w-4" />
              Versão p/ Impressão
            </Button>
          </div>

          {/* Lista de Devoluções por Cliente */}
          <div className="space-y-4">
            {ordens.map((ordem, idx) => {
              const clientName = ordem.client?.name || "Cliente";
              const isConcluido = ordem.status === "concluido";
              const enderecoCompleto = [
                ordem.client?.address?.street,
                ordem.client?.address?.number,
                ordem.client?.address?.neighborhood,
                ordem.client?.address?.city,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <Card
                  key={ordem.id}
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
                          <span className="text-xs text-muted-foreground font-mono">
                            (OS #{ordem.numero_ordem})
                          </span>
                          {isConcluido ? (
                            <Badge className="bg-emerald-600 text-white text-xs gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Devolvido com Sucesso
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300">
                              Pendente Devolução
                            </Badge>
                          )}
                        </div>

                        {/* Endereço e Contato */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-0.5">
                          {enderecoCompleto && (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <MapPin className="h-3.5 w-3.5 text-red-600" />
                              {enderecoCompleto}
                            </span>
                          )}
                          {ordem.client?.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {ordem.client.telefone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botão de Ação: Entregar, Cobrar & Recibo */}
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
                              onClick={() => setSelectedOrderForDelivery(ordem)}
                              className="h-8 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 gap-1.5"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              Ver Recibo
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            disabled={confirmingOrdemId === ordem.id}
                            onClick={() => setSelectedOrderForDelivery(ordem)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 whitespace-nowrap shadow-sm font-bold text-xs"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            Entregar & Cobrar Cliente
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* ALERTA DE CILINDRO RESERVA */}
                    {ordem.deixou_reserva && (
                      <div className="mt-2 p-2.5 bg-amber-100 border border-amber-300 rounded-md text-amber-900 text-xs font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                        <div>
                          <strong>⚠️ RECOLHER CILINDRO RESERVA DA NOSSA OFICINA:</strong>{" "}
                          {ordem.detalhes_reserva
                            ? ordem.detalhes_reserva
                            : "Cliente ficou com cilindro reserva no recolhimento. Não esquecer de pegar de volta!"}
                        </div>
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
                            <th className="py-2 px-3 text-left">Modalidade</th>
                            <th className="py-2 px-3 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(ordem.itens || []).map((item) => (
                            <tr key={item.id} className="hover:bg-muted/20">
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
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="text-[10px]">
                                  {item.modalidade_recarga}
                                </Badge>
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-emerald-600">
                                {formatCurrency(item.valor_registrado || item.extintor?.valor_servico || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
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
      {selectedOrderForDelivery && (
        <DeliveryReceiptDialog
          open={!!selectedOrderForDelivery}
          onOpenChange={(o) => !o && setSelectedOrderForDelivery(null)}
          ordem={selectedOrderForDelivery}
          loteId={lote.id}
          loteCodigo={lote.codigo}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["lotes_recolhimento"] });
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
    </div>
  );
}
