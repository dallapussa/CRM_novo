"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  RotateCcw,
  CheckCircle2,
  Calendar,
  User,
  AlertTriangle,
  Flame,
  ShieldCheck,
  FileText,
  Loader2,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Customer,
  ExtintorInventario,
  ModalidadeRecarga,
  OrdemRecolhimentoMotivo,
  LoteRecolhimento,
} from "@/types";
import {
  createOrdemRecolhimento,
  processarTrocaExtintores,
  listLotesRecolhimento,
  saveLoteRecolhimento,
  findActiveAutoDescargaLote,
} from "@/services/prevention.service";
import { LoteCreateDialog } from "@/components/lotes/lote-create-dialog";
import { formatCurrency, formatMonthYear, getLocalDateISO, addDaysLocalISO } from "@/lib/utils";

interface OrderPickupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  selectedExtintores: ExtintorInventario[];
  onSuccess?: () => void;
}

export function OrderPickupModal({
  open,
  onOpenChange,
  customer,
  selectedExtintores,
  onSuccess,
}: OrderPickupModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Anti-duplicidade: Separa extintores elegíveis dos que já estão na oficina
  const extintoresElegiveis = React.useMemo(() => {
    return selectedExtintores.filter((e) => e.status !== "em_bancada");
  }, [selectedExtintores]);

  const extintoresJaEmBancada = React.useMemo(() => {
    return selectedExtintores.filter((e) => e.status === "em_bancada");
  }, [selectedExtintores]);

  // Modalidades individuais por extintor (Padrão: "Reaproveitamento")
  const [modalidades, setModalidades] = useState<Record<string, ModalidadeRecarga>>({});

  // Inicializa com "Reaproveitamento" como padrão
  React.useEffect(() => {
    if (open && extintoresElegiveis.length > 0) {
      const initial: Record<string, ModalidadeRecarga> = {};
      extintoresElegiveis.forEach((e) => {
        initial[e.id] = "Reaproveitamento";
      });
      setModalidades(initial);
    }
  }, [open, extintoresElegiveis]);

  // Motivo da OS
  const [motivo, setMotivo] = useState<OrdemRecolhimentoMotivo>("Recarga Anual");

  // Dados exclusivos do fluxo de Troca Imediata
  const [formaPagamentoTroca, setFormaPagamentoTroca] = useState<string>("PIX");
  const [statusPagamentoTroca, setStatusPagamentoTroca] = useState<"pago" | "pendente">("pago");

  const valorTotalTroca = React.useMemo(() => {
    return extintoresElegiveis.reduce((sum, e) => sum + (Number(e.valor_servico) || 45.0), 0);
  }, [extintoresElegiveis]);

  // Reserva
  const [deixouReserva, setDeixouReserva] = useState<boolean>(false);
  const [detalhesReserva, setDetalhesReserva] = useState<string>("");

  // Dados operacionais
  const today = getLocalDateISO();
  const nextWeek = addDaysLocalISO(5);

  const [tecnicoResponsavel, setTecnicoResponsavel] = useState<string>("Técnico de Campo");
  const [dataRecolhimento, setDataRecolhimento] = useState<string>(today);
  const [previsaoDevolucao, setPrevisaoDevolucao] = useState<string>(nextWeek);
  const [observacoes, setObservacoes] = useState<string>("");

  // Macro Lotes (Obrigatório: vinculado a lote existente ou gerado automaticamente)
  const [lotes, setLotes] = useState<LoteRecolhimento[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<string>("auto");
  const [createLoteModalOpen, setCreateLoteModalOpen] = useState(false);

  React.useEffect(() => {
    if (open) {
      listLotesRecolhimento().then((data) => {
        const abertos = data.filter((l) => l.status !== "concluido");
        setLotes(abertos);

        // Puxa o lote que está na descarga e que foi criado automaticamente, independente de data
        const loteDescargaAuto = findActiveAutoDescargaLote(abertos);

        if (loteDescargaAuto) {
          setSelectedLoteId(loteDescargaAuto.id);
          if (loteDescargaAuto.previsao_devolucao) {
            setPrevisaoDevolucao(loteDescargaAuto.previsao_devolucao);
          }
        } else {
          // Nenhum lote automático na descarga (ex: anterior já avançou para a oficina)
          // Será gerado um novo lote automaticamente na Descarga ao confirmar o recolhimento.
          setSelectedLoteId("auto");
        }
      });
    }
  }, [open]);

  function handleSelectLote(loteId: string) {
    setSelectedLoteId(loteId);
    if (loteId !== "auto") {
      const found = lotes.find((l) => l.id === loteId);
      if (found?.previsao_devolucao) {
        setPrevisaoDevolucao(found.previsao_devolucao);
      }
    }
  }

  function getModalidade(extId: string): ModalidadeRecarga {
    return modalidades[extId] || "Reaproveitamento";
  }

  function setAllModalidade(mode: ModalidadeRecarga) {
    const next: Record<string, ModalidadeRecarga> = {};
    extintoresElegiveis.forEach((e) => {
      next[e.id] = mode;
    });
    setModalidades(next);
  }

  function toggleIndividualModalidade(extId: string, current: ModalidadeRecarga) {
    setModalidades((prev) => ({
      ...prev,
      [extId]: current === "Reaproveitamento" ? "Normal" : "Reaproveitamento",
    }));
  }

  async function handleConfirm() {
    if (extintoresElegiveis.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum extintor disponível para recolher",
        description:
          extintoresJaEmBancada.length > 0
            ? "Todos os extintores selecionados já estão na oficina/bancada."
            : "Selecione pelo menos um extintor para recolher.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // FLUXO DE TROCA IMEDIATA: RENOVA NO ATO E LANÇA NO FATURAMENTO DO DIA (SEM BANCADA/OFICINA/ROMANEIO)
      if (motivo === "Troca") {
        const valoresIndividuais: Record<string, number> = {};
        extintoresElegiveis.forEach((e) => {
          valoresIndividuais[e.id] = Number(e.valor_servico) || 45.0;
        });

        const res = await processarTrocaExtintores({
          clientId: customer.id,
          extintorIds: extintoresElegiveis.map((e) => e.id),
          dataTroca: dataRecolhimento,
          formaPagamento: formaPagamentoTroca,
          statusPagamento: statusPagamentoTroca,
          tecnicoResponsavel,
          observacoes,
          valoresIndividuais,
        });

        toast({
          variant: "success",
          title: `Troca Imediata Realizada (OS nº ${res.numero_ordem})!`,
          description: `${res.total_renovados} extintor(es) renovados por +1 ano e adicionados ao ${res.lote_nome}.`,
        });

        queryClient.invalidateQueries({ queryKey: ["extintores"] });
        queryClient.invalidateQueries({ queryKey: ["expiring-items"] });
        queryClient.invalidateQueries({ queryKey: ["lotes_recolhimento"] });
        queryClient.invalidateQueries({ queryKey: ["bench_lotes"] });
        queryClient.invalidateQueries({ queryKey: ["bench_records"] });
        queryClient.invalidateQueries({ queryKey: ["ordens_recolhimento"] });
        queryClient.invalidateQueries({ queryKey: ["ordens_recolhimento_todas"] });
        queryClient.invalidateQueries({ queryKey: ["receipts"] });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
        queryClient.invalidateQueries({ queryKey: ["client_tech_sheet"] });
        onOpenChange(false);
        onSuccess?.();
        return;
      }

      let finalLoteId = selectedLoteId;

      // Se for "auto" ou não informado, busca lote automático na Descarga ou gera novo
      if (!finalLoteId || finalLoteId === "auto" || finalLoteId === "none") {
        const existingLotes = await listLotesRecolhimento();
        const loteDescargaAuto = findActiveAutoDescargaLote(existingLotes);

        if (loteDescargaAuto) {
          finalLoteId = loteDescargaAuto.id;
        } else {
          const cidade = customer.address?.city || "Geral";
          const dataFmt = new Date(dataRecolhimento + "T12:00:00").toLocaleDateString("pt-BR");
          const novoLote = await saveLoteRecolhimento({
            company_id: (customer as any)?.company_id || undefined,
            nome: `Lote ${cidade} - ${dataFmt}`,
            cidade,
            regiao: customer.address?.neighborhood || null,
            data_recolhimento: dataRecolhimento,
            prazo_dias: 14,
            previsao_devolucao: previsaoDevolucao,
            status: "aguardando_descarga",
            observacoes: `[ORIGEM:AUTO] Lote criado automaticamente no recolhimento do cliente ${customer.name}.`,
          });
          finalLoteId = novoLote.id;
        }
      } else if (finalLoteId === "novo_separado") {
        const cidade = customer.address?.city || "Geral";
        const dataFmt = new Date(dataRecolhimento + "T12:00:00").toLocaleDateString("pt-BR");
        const novoLote = await saveLoteRecolhimento({
          company_id: (customer as any)?.company_id || undefined,
          nome: `Lote ${cidade} - ${dataFmt}`,
          cidade,
          regiao: customer.address?.neighborhood || null,
          data_recolhimento: dataRecolhimento,
          prazo_dias: 14,
          previsao_devolucao: previsaoDevolucao,
          status: "aguardando_descarga",
          observacoes: `[ORIGEM:AUTO] Lote criado no recolhimento do cliente ${customer.name} (separado manualmente).`,
        });
        finalLoteId = novoLote.id;
      }

      const result = await createOrdemRecolhimento({
        clientId: customer.id,
        loteId: finalLoteId,
        motivo,
        deixouReserva,
        detalhesReserva,
        tecnicoResponsavel,
        dataRecolhimento,
        previsaoDevolucao,
        observacoes,
        itens: extintoresElegiveis.map((e) => ({
          extintorId: e.id,
          modalidade: getModalidade(e.id),
          valorRegistrado: e.valor_servico || 45.0,
        })),
      });

      toast({
        variant: "success",
        title: `OS de Recolhimento nº ${result.numero_ordem} Gerada!`,
        description: `${extintoresElegiveis.length} extintor(es) vinculados ao Lote e encaminhados para Chegada / Descarga na oficina.`,
      });

      queryClient.invalidateQueries({ queryKey: ["bench_records"] });
      queryClient.invalidateQueries({ queryKey: ["bench_lotes"] });
      queryClient.invalidateQueries({ queryKey: ["lotes_recolhimento"] });
      queryClient.invalidateQueries({ queryKey: ["ordens_recolhimento"] });
      queryClient.invalidateQueries({ queryKey: ["ordens_recolhimento_todas"] });
      queryClient.invalidateQueries({ queryKey: ["extintores"] });
      queryClient.invalidateQueries({ queryKey: ["expiring-items"] });
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["client_tech_sheet"] });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar Ordem de Recolhimento",
        description: err?.message || "Ocorreu uma falha ao registrar a ordem.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-orange-200">
        {/* Cabeçalho Reativo (Laranja para Recolhimento / Verde Esmeralda para Troca Imediata) */}
        <div
          className={`p-6 rounded-t-2xl text-white transition-colors ${
            motivo === "Troca"
              ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500"
              : "bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              {motivo === "Troca" ? (
                <RotateCcw className="h-6 w-6 text-white" />
              ) : (
                <Truck className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                {motivo === "Troca"
                  ? `Troca Imediata de ${extintoresElegiveis.length} Extintor(es)`
                  : `Recolher ${extintoresElegiveis.length} Extintor(es)`}
              </DialogTitle>
              <p className="text-xs text-white/90 mt-0.5">
                {motivo === "Troca"
                  ? "Substituição direta no cliente com renovação imediata e faturamento do dia"
                  : "Abertura de Ordem de Serviço para manutenção e recarga na oficina"}
              </p>
            </div>
          </div>

          {/* Card Resumo do Cliente */}
          <div className="mt-4 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-100">Cliente / Destinatário</p>
              <p className="text-sm font-bold text-white">{customer.name}</p>
            </div>
            {customer.document && (
              <Badge variant="outline" className="border-white/30 text-white text-xs">
                {customer.document}
              </Badge>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Alerta de extintores já recolhidos (Anti-duplicidade) */}
          {extintoresJaEmBancada.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong>Atenção:</strong> {extintoresJaEmBancada.length} extintor(es) deste cliente já está(ão) na oficina/bancada e foi(ram) ignorado(s) para evitar duplicidade.
              </span>
            </div>
          )}

          {/* SEÇÃO 1: Cilindros e Classificação */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Label className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-600" />
                1. Cilindros e Modalidade de Recarga
              </Label>
              <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                <span className="text-[11px] text-muted-foreground px-1 font-medium">Todos:</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAllModalidade("Reaproveitamento")}
                  className="h-6 text-xs px-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  ✓ Reaproveitamento (Padrão)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setAllModalidade("Normal")}
                  className="h-6 text-xs px-2 hover:bg-white dark:hover:bg-neutral-700 text-muted-foreground"
                >
                  Normal
                </Button>
              </div>
            </div>

            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl divide-y divide-neutral-100 dark:divide-neutral-800 max-h-56 overflow-y-auto">
              {extintoresElegiveis.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Nenhum extintor disponível para recolher (todos já estão na oficina).
                </div>
              ) : (
                extintoresElegiveis.map((ext) => {
                  const mode = getModalidade(ext.id);
                  return (
                    <div
                      key={ext.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {ext.identificacao}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ext.tipo_capacidade} • {ext.localizacao || "Local não informado"} •{" "}
                          {ext.data_vencimento && (
                            <span className="font-semibold text-foreground">
                              Venc: {formatMonthYear(ext.data_vencimento)} •{" "}
                            </span>
                          )}
                          <span className="text-emerald-600 font-medium">
                            {formatCurrency(ext.valor_servico)}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant={mode === "Reaproveitamento" ? "default" : "outline"}
                          onClick={() => toggleIndividualModalidade(ext.id, mode)}
                          className={`h-7 text-xs px-2.5 font-bold ${
                            mode === "Reaproveitamento"
                              ? "bg-orange-600 text-white hover:bg-orange-700 shadow-sm"
                              : "text-orange-600 border-orange-200 hover:bg-orange-50"
                          }`}
                        >
                          Reaproveitamento
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={mode === "Normal" ? "default" : "outline"}
                          onClick={() => toggleIndividualModalidade(ext.id, mode)}
                          className={`h-7 text-xs px-2.5 font-medium ${
                            mode === "Normal"
                              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                              : "text-muted-foreground"
                          }`}
                        >
                          Normal
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SEÇÃO 2: Motivo */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-orange-600" />
              2. Motivo do Recolhimento
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {(["Recarga Anual", "Troca", "Garantia"] as OrdemRecolhimentoMotivo[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivo(m)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    motivo === m
                      ? m === "Troca"
                        ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 font-bold"
                        : "border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200 ring-2 ring-orange-500/20 font-bold"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-700"
                  }`}
                >
                  <p className="text-xs">{m}</p>
                  {m === "Troca" && (
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium mt-0.5">
                      Faturamento Direto
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* FLUXO EXCLUSIVO: SE SELECIONOU "TROCA", NÃO VAI PARA A BANCADA/LOTE DA OFICINA */}
          {motivo === "Troca" ? (
            <div className="space-y-4 p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl animate-in fade-in">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  3. Condições de Pagamento & Faturamento do Dia
                </Label>
                <Badge className="bg-emerald-600 text-white font-bold text-xs">
                  Caixa Diário
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="dt_troca" className="text-xs font-semibold">
                    Data da Troca / Entrega
                  </Label>
                  <Input
                    id="dt_troca"
                    type="date"
                    value={dataRecolhimento}
                    onChange={(e) => setDataRecolhimento(e.target.value)}
                    className="h-9 text-xs bg-white dark:bg-neutral-900"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tec_troca" className="text-xs font-semibold">
                    Técnico / Responsável
                  </Label>
                  <Input
                    id="tec_troca"
                    value={tecnicoResponsavel}
                    onChange={(e) => setTecnicoResponsavel(e.target.value)}
                    placeholder="Nome do técnico"
                    className="h-9 text-xs bg-white dark:bg-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                    Forma de Pagamento
                  </Label>
                  <Select value={formaPagamentoTroca} onValueChange={setFormaPagamentoTroca}>
                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-neutral-900">
                      <SelectValue placeholder="Selecione a forma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIX">⚡ PIX</SelectItem>
                      <SelectItem value="Dinheiro">💵 Dinheiro</SelectItem>
                      <SelectItem value="Cartão de Débito">💳 Cartão de Débito</SelectItem>
                      <SelectItem value="Cartão de Crédito">💳 Cartão de Crédito</SelectItem>
                      <SelectItem value="Boleto">📄 Boleto Bancário</SelectItem>
                      <SelectItem value="A Prazo (30 dias)">📅 A Prazo (30 dias / Faturado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Status do Recebimento</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStatusPagamentoTroca("pago")}
                      className={`h-9 rounded-md border text-xs font-semibold flex items-center justify-center transition-colors ${
                        statusPagamentoTroca === "pago"
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                          : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600"
                      }`}
                    >
                      ✓ Recebido no Ato
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusPagamentoTroca("pendente")}
                      className={`h-9 rounded-md border text-xs font-semibold flex items-center justify-center transition-colors ${
                        statusPagamentoTroca === "pendente"
                          ? "bg-amber-600 border-amber-600 text-white shadow-xs"
                          : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600"
                      }`}
                    >
                      A Receber
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="obs_troca" className="text-xs font-semibold">
                  Observações da Troca
                </Label>
                <Textarea
                  id="obs_troca"
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informações adicionais da troca ou pagamento..."
                  className="text-xs bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="p-3 bg-emerald-100/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Total a Faturar: {formatCurrency(valorTotalTroca)}
                </p>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  Os {extintoresElegiveis.length} extintor(es) serão <strong>renovados por +1 ano imediatamente</strong> no inventário do cliente e o lançamento será enviado direto para o <strong>Faturamento do Dia</strong>. Não irão para a bancada da oficina nem para romaneio.
                </p>
              </div>
            </div>
          ) : (
            /* FLUXO TRADICIONAL DE OFICINA: RESERVA, LOTE GERAL E DADOS OPERACIONAIS */
            <>
              {/* SEÇÃO 3: Reserva */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-orange-600" />
                  3. Deixou Cilindro Reserva no Local?
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeixouReserva(false)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      !deixouReserva
                        ? "border-neutral-900 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold"
                        : "border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <p className="text-xs">NÃO deixou reserva</p>
                    <p className="text-[11px] opacity-75 mt-0.5">Cliente ciente de ausência provisória</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeixouReserva(true)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      deixouReserva
                        ? "border-amber-500 bg-amber-500 text-white font-semibold"
                        : "border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <p className="text-xs">SIM, deixou reserva</p>
                    <p className="text-[11px] opacity-75 mt-0.5">Equipamentos provisórios instalados</p>
                  </button>
                </div>

                {deixouReserva && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    <Textarea
                      rows={2}
                      value={detalhesReserva}
                      onChange={(e) => setDetalhesReserva(e.target.value)}
                      placeholder="Informe os extintores deixados de reserva (ex: 2 Pó ABC 4kg da oficina)..."
                      className="text-xs border-amber-300"
                    />
                  </div>
                )}
              </div>

              {/* SEÇÃO 4: Lote Geral / Rota de Devolução */}
              <div className="space-y-2 p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-orange-600" />
                    Vincular a um Lote Geral (Chegada / Descarga)
                  </Label>
                  <button
                    type="button"
                    onClick={() => setCreateLoteModalOpen(true)}
                    className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    + Criar Novo Lote Geral
                  </button>
                </div>

                {(() => {
                  const currentAutoDescarga = findActiveAutoDescargaLote(lotes);
                  return (
                    <div className="space-y-2">
                      <Select value={selectedLoteId} onValueChange={handleSelectLote}>
                        <SelectTrigger className="h-9 text-xs bg-white dark:bg-neutral-800">
                          <SelectValue placeholder="Selecione um lote ou crie automaticamente" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentAutoDescarga && (
                            <SelectItem key={currentAutoDescarga.id} value={currentAutoDescarga.id}>
                              📥 [Lote Atual na Descarga] [{currentAutoDescarga.codigo}] {currentAutoDescarga.nome} ({currentAutoDescarga.total_extintores || 0} cil.)
                            </SelectItem>
                          )}

                          {lotes
                            .filter((l) => !currentAutoDescarga || l.id !== currentAutoDescarga.id)
                            .map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                [{l.codigo}] {l.nome} ({l.total_extintores || 0} cil.) — Retorno:{" "}
                                {new Date(l.previsao_devolucao + "T12:00:00").toLocaleDateString("pt-BR")}
                              </SelectItem>
                            ))}

                          {!currentAutoDescarga && (
                            <SelectItem value="auto">
                              ✨ Criar Novo Lote Automático na Chegada / Descarga
                            </SelectItem>
                          )}

                          <SelectItem value="novo_separado">
                            ➕ Criar um Novo Lote Separado ({customer.address?.city || "Geral"} - {new Date(dataRecolhimento + "T12:00:00").toLocaleDateString("pt-BR")})
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <p className="text-[11px] text-muted-foreground">
                        {currentAutoDescarga && selectedLoteId === currentAutoDescarga.id ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            ✓ Os extintores serão vinculados diretamente ao Lote que está na Descarga. Um novo lote só será gerado após o avanço deste lote para a Oficina.
                          </span>
                        ) : (
                          <span>
                            Obrigatório: todos os extintores recolhidos entram na oficina vinculados a um Lote (em <strong>Chegada / Descarga</strong>), podendo ser mesclados no Kanban a qualquer momento.
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* SEÇÃO 5: Dados Operacionais */}
              <div className="space-y-3">
                <Label className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  5. Dados Operacionais
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="tec" className="text-xs">
                      Técnico Responsável
                    </Label>
                    <Input
                      id="tec"
                      value={tecnicoResponsavel}
                      onChange={(e) => setTecnicoResponsavel(e.target.value)}
                      placeholder="Nome do técnico"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="dt_rec" className="text-xs">
                      Data Recolhimento
                    </Label>
                    <Input
                      id="dt_rec"
                      type="date"
                      value={dataRecolhimento}
                      onChange={(e) => setDataRecolhimento(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="dt_dev" className="text-xs">
                      Previsão Devolução
                    </Label>
                    <Input
                      id="dt_dev"
                      type="date"
                      value={previsaoDevolucao}
                      onChange={(e) => setPrevisaoDevolucao(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="obs" className="text-xs">
                    Observações para a Bancada
                  </Label>
                  <Textarea
                    id="obs"
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Instruções de manômetro, pintura, anel de garantia ou ensaio hidrostático..."
                    className="text-xs"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rodapé com Botão de Confirmação */}
        <DialogFooter className="p-4 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`${
              motivo === "Troca"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-orange-600 hover:bg-orange-700 text-white"
            } font-bold gap-2 shadow-sm`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {motivo === "Troca" ? "Processando Troca..." : "Registrando na Oficina..."}
              </>
            ) : motivo === "Troca" ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirmar Troca e Faturar ({formatCurrency(valorTotalTroca)})
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirmar Recolhimento ({extintoresElegiveis.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <LoteCreateDialog
        open={createLoteModalOpen}
        onOpenChange={setCreateLoteModalOpen}
        initialCity={customer.address?.city || ""}
        onSuccess={(newLote) => {
          setLotes((prev) => [newLote, ...prev]);
          handleSelectLote(newLote.id);
        }}
      />
    </Dialog>
  );
}
