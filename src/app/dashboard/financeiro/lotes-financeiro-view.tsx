"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Package,
  Calendar,
  MapPin,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Printer,
  Download,
  CreditCard,
  QrCode,
  Banknote,
  RefreshCw,
  Eye,
  Building2,
  History,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { LoteRecolhimento, PaymentMethod } from "@/types";
import {
  listLotesRecolhimento,
  listOrdensRecolhimento,
  groupOrdensByClient,
  type GroupedClientInLote,
} from "@/services/prevention.service";
import { ReceiptEditorModal } from "@/components/financeiro/receipt-editor-modal";
import { MultiLoteReportDialog } from "@/components/financeiro/multi-lote-report-dialog";
import { ThermalReceipt58mmDialog } from "@/components/financeiro/thermal-receipt-58mm-dialog";
import type { EditableReceiptData, ReceiptItem } from "@/services/receipt-pdf.service";
import { createClient } from "@/lib/supabase/client";
import { getCompanySettings } from "@/services/company-settings.service";
import { getLocalDateISO } from "@/lib/utils";

function formatMoeda(val: number): string {
  return Number(val || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseISODateToBR(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function getFormattedFullDate(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  const str = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTodayISO(): string {
  return getLocalDateISO();
}

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

const YEARS_LIST = ["all", "2024", "2025", "2026", "2027"];

const PAYMENT_OPTIONS = [
  "PIX",
  "Dinheiro",
  "Cartão de Débito",
  "Cartão de Crédito",
  "Boleto",
  "A Prazo (30 dias)",
  "Não Recebido",
];

export function LotesFinanceiroView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const todayStr = useMemo(() => getTodayISO(), []);

  // Visualização: "dia" (padrão: mostra apenas o dia) ou "historico" (solicitado sob demanda)
  const [viewMode, setViewMode] = useState<"dia" | "historico">("dia");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Filtros para o modo histórico
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "quitado" | "pendente">("all");

  // Multi-seleção de lotes/dias para relatório consolidado
  const [selectedLoteIds, setSelectedLoteIds] = useState<Set<string>>(new Set());
  const [isMultiReportOpen, setIsMultiReportOpen] = useState(false);

  // Lote selecionado caso queira ver detalhe técnico isolado
  const [activeLoteId, setActiveLoteId] = useState<string | null>(null);

  // Recibo editável
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptModalTab, setReceiptModalTab] = useState<"recibo" | "emitente">("recibo");
  const [editingReceiptData, setEditingReceiptData] = useState<EditableReceiptData | null>(null);

  // Cupom Térmico 58mm
  const [thermalReceiptOpen, setThermalReceiptOpen] = useState(false);
  const [thermalReceiptData, setThermalReceiptData] = useState<EditableReceiptData | null>(null);

  // Busca lotes do sistema
  const { data: lotes = [], isLoading: isLoadingLotes, refetch: refetchLotes, isRefetching } = useQuery({
    queryKey: ["lotes_recolhimento"],
    queryFn: listLotesRecolhimento,
  });

  // Busca ordens gerais para garantir que trocas ou ordens avulsas sejam computadas no caixa
  const { data: allOrdens = [], refetch: refetchOrdens } = useQuery({
    queryKey: ["ordens_recolhimento_todas"],
    queryFn: () => listOrdensRecolhimento(),
  });

  // Busca dados oficiais da empresa emitente
  const { data: companySettings } = useQuery({
    queryKey: ["company_settings"],
    queryFn: getCompanySettings,
  });

  // Navegação de dias (+1 ou -1 dia)
  const changeDateByOffset = (offset: number) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const curr = new Date(y, m - 1, d);
    curr.setDate(curr.getDate() + offset);
    const nextY = curr.getFullYear();
    const nextM = String(curr.getMonth() + 1).padStart(2, "0");
    const nextD = String(curr.getDate()).padStart(2, "0");
    setSelectedDate(`${nextY}-${nextM}-${nextD}`);
    setActiveLoteId(null);
  };

  // Recarrega todos os dados
  const handleRefresh = async () => {
    await Promise.all([refetchLotes(), refetchOrdens()]);
  };

  // ============================================================================
  // AGRUPAMENTO DO CAIXA DO DIA SELECIONADO
  // ============================================================================
  const caixaDoDia = useMemo(() => {
    // 1. Localiza lotes daquela data
    const lotesDoDia = lotes.filter((l) => {
      const dataRef = l.data_recolhimento || (l.created_at ? getLocalDateISO(new Date(l.created_at)) : "");
      return dataRef === selectedDate;
    });

    // 2. Localiza ordens daquela data (seja vinculada a lote ou direta)
    const loteIdsDoDia = new Set(lotesDoDia.map((l) => l.id));
    const ordensDoDia = allOrdens.filter((o) => {
      if (o.lote_id && loteIdsDoDia.has(o.lote_id)) return true;
      const dataRef = o.data_recolhimento || (o.created_at ? getLocalDateISO(new Date(o.created_at)) : "");
      return dataRef === selectedDate;
    });

    // 3. Agrupa as ordens do dia por cliente
    const clientesAgrupados: GroupedClientInLote[] = groupOrdensByClient(ordensDoDia);

    // 4. Totais financeiros do dia
    let faturamentoTotal = 0;
    let recebidoTotal = 0;
    let totalExtintores = 0;
    const pagamentosMap = new Map<string, number>();

    ordensDoDia.forEach((ordem) => {
      const valorOrdem = (ordem.itens || []).reduce(
        (sum, it) => sum + Number(it.valor_registrado || it.extintor?.valor_servico || 45.0),
        0
      );
      faturamentoTotal += valorOrdem;
      totalExtintores += (ordem.itens || []).length;

      if (ordem.status === "concluido") {
        recebidoTotal += valorOrdem;
      }

      // Detecta tag de forma de pagamento
      const pmMatch = ordem.observacoes?.match(/\[PAGTO:([^\]]+)\]/);
      const forma = pmMatch ? pmMatch[1] : (ordem.status === "concluido" ? "PIX" : "A Prazo");
      pagamentosMap.set(forma, (pagamentosMap.get(forma) || 0) + valorOrdem);
    });

    const pendenteTotal = Math.max(0, faturamentoTotal - recebidoTotal);

    return {
      selectedDate,
      lotes: lotesDoDia,
      ordens: ordensDoDia,
      clientes: clientesAgrupados,
      faturamentoTotal,
      recebidoTotal,
      pendenteTotal,
      totalExtintores,
      totalClientes: clientesAgrupados.length,
      pagamentosBreakdown: Array.from(pagamentosMap.entries()).map(([metodo, valor]) => ({
        metodo,
        valor,
      })),
      isQuitado: pendenteTotal <= 0 && faturamentoTotal > 0,
    };
  }, [selectedDate, lotes, allOrdens]);

  // Lista ordenada de todas as datas com movimento no sistema (para navegação rápida)
  const datasComMovimento = useMemo(() => {
    const set = new Set<string>();
    lotes.forEach((l) => {
      const d = l.data_recolhimento || (l.created_at ? getLocalDateISO(new Date(l.created_at)) : "");
      if (d) set.add(d);
    });
    allOrdens.forEach((o) => {
      const d = o.data_recolhimento || (o.created_at ? getLocalDateISO(new Date(o.created_at)) : "");
      if (d) set.add(d);
    });
    return Array.from(set).sort().reverse();
  }, [lotes, allOrdens]);

  // Encontra a data anterior mais próxima com movimento (caso hoje esteja vazio)
  const ultimaDataComMovimento = useMemo(() => {
    return datasComMovimento.find((d) => d !== selectedDate) || null;
  }, [datasComMovimento, selectedDate]);

  // ============================================================================
  // AGRUPAMENTO DO HISTÓRICO DE DIAS ANTERIORES
  // ============================================================================
  const historicoPorDia = useMemo(() => {
    const mapa = new Map<
      string,
      {
        data: string;
        faturamentoTotal: number;
        recebidoTotal: number;
        pendenteTotal: number;
        totalExtintores: number;
        totalClientes: number;
        lotes: LoteRecolhimento[];
        ordensCount: number;
        nomesClientes: string[];
      }
    >();

    // Agrupa todos os lotes e ordens por data
    lotes.forEach((lote) => {
      const dataRef = lote.data_recolhimento || (lote.created_at ? lote.created_at.split("T")[0] : "");
      if (!dataRef) return;

      const existing = mapa.get(dataRef) || {
        data: dataRef,
        faturamentoTotal: 0,
        recebidoTotal: 0,
        pendenteTotal: 0,
        totalExtintores: 0,
        totalClientes: 0,
        lotes: [],
        ordensCount: 0,
        nomesClientes: [],
      };

      existing.faturamentoTotal += lote.valor_total || 0;
      existing.recebidoTotal += lote.valor_recebido || 0;
      existing.pendenteTotal += lote.valor_pendente || 0;
      existing.totalExtintores += lote.total_extintores || 0;
      existing.totalClientes += lote.total_clientes || 0;
      existing.lotes.push(lote);

      (lote.ordens || []).forEach((o) => {
        existing.ordensCount++;
        const cName = o.client?.name || (o.client as any)?.razao_social || "";
        if (cName && !existing.nomesClientes.includes(cName)) {
          existing.nomesClientes.push(cName);
        }
      });

      mapa.set(dataRef, existing);
    });

    const lista = Array.from(mapa.values()).sort((a, b) => b.data.localeCompare(a.data));

    // Aplica filtros de pesquisa, mês, ano e status no histórico
    return lista.filter((dia) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const dataFmt = parseISODateToBR(dia.data).toLowerCase();
        const matchData = dia.data.includes(q) || dataFmt.includes(q);
        const matchClientes = dia.nomesClientes.some((c) => c.toLowerCase().includes(q));
        const matchLote = dia.lotes.some(
          (l) =>
            (l.nome || "").toLowerCase().includes(q) || (l.codigo || "").toLowerCase().includes(q)
        );
        if (!matchData && !matchClientes && !matchLote) return false;
      }

      if (selectedYear !== "all") {
        if (!dia.data.startsWith(selectedYear)) return false;
      }

      if (selectedMonth !== "all") {
        const parts = dia.data.split("-");
        if (parts[1] !== selectedMonth) return false;
      }

      if (statusFilter === "quitado" && dia.pendenteTotal > 0) return false;
      if (statusFilter === "pendente" && dia.pendenteTotal <= 0) return false;

      return true;
    });
  }, [lotes, search, selectedMonth, selectedYear, statusFilter]);

  // Recibos existentes no Supabase para o dia
  const { data: existingLoteReceipts = [], refetch: refetchReceipts } = useQuery({
    queryKey: ["lote_receipts_docs", selectedDate],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("documentos_cliente")
        .select("id, client_id, file_url, file_name, created_at, storage_path")
        .eq("tipo_documento", "Recibo");
      return data || [];
    },
  });

  const existingReceiptsByClient = useMemo(() => {
    const map = new Map<string, any>();
    existingLoteReceipts.forEach((doc) => {
      if (doc.client_id) {
        map.set(doc.client_id, doc);
      }
    });
    return map;
  }, [existingLoteReceipts]);

  // Constrói objeto de recibo para um cliente do caixa
  const buildReceiptDataForClient = (grupo: GroupedClientInLote): EditableReceiptData => {
    const client = grupo.client;
    const clientName = client?.razao_social || client?.nome_fantasia || client?.name || "Cliente";
    const ordensNumeros = grupo.ordens.map((o: any) => `#${o.numero_ordem}`).join(", ");

    const receiptItens: ReceiptItem[] = grupo.itens.map((it: any, idx: number) => ({
      id: it.id,
      identificacao: it.extintor?.identificacao || `CIL-${idx + 1}`,
      tipo_capacidade: it.extintor?.tipo_capacidade || "Pó ABC - 4kg",
      modalidade: it.modalidade_recarga || "Normal",
      localizacao: it.extintor?.localizacao || "Padrão",
      nova_validade: `${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear() + 1}`,
      valor: Number(it.valor_registrado || it.extintor?.valor_servico || 45.0),
    }));

    const firstOrdem = grupo.ordens[0];
    const pmMatch = firstOrdem?.observacoes?.match(/\[PAGTO:([^\]]+)\]/);
    const initialPm = pmMatch
      ? pmMatch[1]
      : firstOrdem?.status === "concluido"
      ? "PIX"
      : "A Prazo (30 dias)";

    const isQuitado = grupo.ordens.every((o: any) => o.status === "concluido");

    const cleanDoc = client?.cnpj || client?.cpf || (client as any)?.documento || undefined;
    const cleanPhone = client?.telefone || client?.phone || (client as any)?.telefone2 || undefined;
    const cleanAddress = [
      client?.address?.street || client?.address_street,
      client?.address?.number || client?.address_number,
      client?.address?.neighborhood || client?.address_neighborhood,
      client?.address?.city || client?.address_city,
      client?.address?.state || client?.address_state,
    ]
      .filter(Boolean)
      .join(", ") || undefined;

    const dataEmissao = selectedDate || todayStr;
    const cleanDateTag = dataEmissao.replace(/-/g, "");

    return {
      numero_recibo: `REC-${cleanDateTag}-${firstOrdem?.numero_ordem || "001"}`,
      data_emissao: dataEmissao,
      cliente_id: grupo.clientId,
      cliente_nome: clientName,
      cliente_documento: cleanDoc,
      cliente_telefone: cleanPhone,
      cliente_endereco: cleanAddress,
      lote_codigo: `FAT-${cleanDateTag}`,
      lote_nome: `Faturamento do Dia - ${parseISODateToBR(dataEmissao)}`,
      ordens_numeros: ordensNumeros,
      itens: receiptItens,
      valor_total: Number(grupo.valorTotal || receiptItens.reduce((sum, it) => sum + it.valor, 0)),
      forma_pagamento: initialPm,
      status_pagamento: isQuitado ? "QUITADO" : "PENDENTE",
      observacoes: "Garantia de 12 meses contra defeitos de recarga e teste de pressão.",
      empresa_nome: companySettings?.nome || "JC Extintores",
      empresa_cnpj: companySettings?.cnpj || undefined,
      empresa_telefone: companySettings?.telefone || undefined,
      empresa_endereco: companySettings?.endereco || undefined,
      empresa_logo: companySettings?.logo_url || undefined,
    };
  };

  // Abre Modal de Recibo PDF
  const handleOpenReceiptForClient = (
    grupo: GroupedClientInLote,
    tab: "recibo" | "emitente" = "recibo"
  ) => {
    const data = buildReceiptDataForClient(grupo);
    setEditingReceiptData(data);
    setReceiptModalTab(tab);
    setReceiptModalOpen(true);
  };

  // Abre Cupom Térmico 58mm
  const handleOpenThermalForClient = (grupo: GroupedClientInLote) => {
    const data = buildReceiptDataForClient(grupo);
    setThermalReceiptData(data);
    setThermalReceiptOpen(true);
  };

  // Atualiza forma de pagamento de um cliente do dia
  const handleUpdateClientPaymentMethod = async (
    grupo: GroupedClientInLote,
    newMethod: string
  ) => {
    try {
      const supabase = createClient();
      for (const o of grupo.ordens) {
        const cleanObs = (o.observacoes || "").replace(/\[PAGTO:[^\]]+\]/g, "").trim();
        const updatedObs = `${cleanObs} [PAGTO:${newMethod}]`.trim();

        await supabase
          .from("ordens_recolhimento")
          .update({ observacoes: updatedObs, updated_at: new Date().toISOString() })
          .eq("id", o.id);
      }

      toast({
        variant: "success",
        title: "Forma de pagamento atualizada!",
        description: `Cliente "${grupo.client?.razao_social || grupo.client?.name}" definido para "${newMethod}".`,
      });

      handleRefresh();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar forma de pagamento",
        description: err.message,
      });
    }
  };

  // Alterna status de pagamento entre Quitado e Pendente
  const handleToggleClientPaymentStatus = async (grupo: GroupedClientInLote) => {
    try {
      const supabase = createClient();
      const isCurrentlyConcluido = grupo.ordens.every((o: any) => o.status === "concluido");
      const nextStatus = isCurrentlyConcluido ? "recolhido" : "concluido";
      const ordemIds = grupo.ordens.map((o: any) => o.id);

      await supabase
        .from("ordens_recolhimento")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .in("id", ordemIds);

      toast({
        variant: "success",
        title: nextStatus === "concluido" ? "Pagamento Quitado!" : "Marcado como Pendente",
        description: `Ordens do cliente atualizadas com sucesso.`,
      });

      handleRefresh();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao alterar status",
        description: err.message,
      });
    }
  };

  // Multi-seleção de lotes para relatório consolidado
  const selectedLotesList = useMemo(() => {
    return lotes.filter((l) => selectedLoteIds.has(l.id));
  }, [lotes, selectedLoteIds]);

  const toggleSelectLote = (id: string) => {
    setSelectedLoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ============================================================================
  // SE ESTIVER VISUALIZANDO UM LOTE ESPECÍFICO ISOLADO (DETALHE TÉCNICO)
  // ============================================================================
  const activeLote = useMemo(() => {
    if (!activeLoteId) return null;
    return lotes.find((l) => l.id === activeLoteId) || null;
  }, [lotes, activeLoteId]);

  if (activeLote) {
    const activeLoteClientes = groupOrdensByClient(activeLote.ordens || []);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveLoteId(null)}
            className="gap-2 w-fit font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Faturamento do Dia
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReceiptModalTab("emitente");
                const dummyData = buildReceiptDataForClient(
                  activeLoteClientes[0] || {
                    clientId: "",
                    client: null,
                    ordens: [],
                    itens: [],
                    valorTotal: 0,
                    totalExtintores: 0,
                    reservas: [],
                    modelosAgrupados: [],
                  }
                );
                setEditingReceiptData(dummyData);
                setReceiptModalOpen(true);
              }}
              className="gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 font-bold text-xs"
            >
              <Building2 className="h-4 w-4 text-emerald-600" />
              Dados do Emitente & Logo
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedLoteIds(new Set([activeLote.id]));
                setIsMultiReportOpen(true);
              }}
              className="gap-2 border-red-200 text-red-700 hover:bg-red-50 font-bold text-xs"
            >
              <Download className="h-4 w-4 text-red-600" />
              Relatório Consolidado (PDF)
            </Button>
          </div>
        </div>

        {/* Card do Cabeçalho do Lote */}
        <Card className="border-2 shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600" />
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted">
                    {activeLote.codigo}
                  </span>
                  <Badge variant="outline" className="font-semibold text-xs">
                    {activeLote.status}
                  </Badge>
                  {activeLote.cidade && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-red-600" />
                      {activeLote.cidade}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl font-bold">{activeLote.nome}</CardTitle>
              </div>

              <div className="flex items-center gap-4 bg-muted/40 p-3 rounded-xl border">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Faturamento
                  </span>
                  <span className="text-lg font-extrabold text-foreground font-mono">
                    {formatMoeda(activeLote.valor_total || 0)}
                  </span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                    Quitado
                  </span>
                  <span className="text-base font-extrabold text-emerald-600 font-mono">
                    {formatMoeda(activeLote.valor_recebido || 0)}
                  </span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-600 block">
                    A Receber
                  </span>
                  <span className="text-base font-extrabold text-amber-600 font-mono">
                    {formatMoeda(activeLote.valor_pendente || 0)}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Lista de clientes do lote */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">
            Clientes do Lote ({activeLoteClientes.length})
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {activeLoteClientes.map((grupo) => {
              const client = grupo.client;
              const clientName =
                client?.razao_social || client?.nome_fantasia || client?.name || "Cliente";
              const isQuitado = grupo.ordens.every((o) => o.status === "concluido");
              const pmMatch = grupo.ordens[0]?.observacoes?.match(/\[PAGTO:([^\]]+)\]/);
              const formaPgto = pmMatch
                ? pmMatch[1]
                : isQuitado
                ? "PIX"
                : "A Prazo (30 dias)";

              return (
                <Card key={grupo.clientId} className="border-2 rounded-2xl overflow-hidden p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base">{clientName}</h3>
                        <Badge
                          variant="outline"
                          className={
                            isQuitado
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
                              : "bg-amber-50 text-amber-700 border-amber-300 font-semibold"
                          }
                        >
                          {isQuitado ? "✓ PAGO / QUITADO" : "⏱ PENDENTE"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        📦 {grupo.totalExtintores} extintor(es) • Total:{" "}
                        <strong className="text-foreground font-mono">
                          {formatMoeda(grupo.valorTotal)}
                        </strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={formaPgto}
                        onValueChange={(val) => handleUpdateClientPaymentMethod(grupo, val)}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt} className="text-xs">
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleClientPaymentStatus(grupo)}
                        className="text-xs h-8"
                      >
                        {isQuitado ? "Pendente" : "Quitar"}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleOpenReceiptForClient(grupo)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-8"
                      >
                        Recibo PDF
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODO 1: VISUALIZAÇÃO PADRÃO — FATURAMENTO DO DIA (CAIXA DIÁRIO)
  // Ao entrar na aba, mostra apenas o dia atual. O usuário pode navegar entre dias
  // ou abrir o histórico completo de dias anteriores sob demanda.
  // ============================================================================
  if (viewMode === "dia") {
    const isToday = selectedDate === todayStr;

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* BARRA DE NAVEGAÇÃO DE DIAS & CONTROLE DO CAIXA */}
        <div className="p-4 bg-card border-2 rounded-2xl shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Seletor & Navegação do Dia */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeDateByOffset(-1)}
                className="gap-1.5 font-bold text-xs h-9 hover:bg-muted"
                title="Ir para o Dia Anterior"
              >
                <ArrowLeft className="h-4 w-4" />
                Dia Anterior
              </Button>

              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-xl border">
                <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(e.target.value);
                  }}
                  className="bg-transparent font-bold text-sm text-foreground focus:outline-hidden cursor-pointer"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => changeDateByOffset(1)}
                className="gap-1.5 font-bold text-xs h-9 hover:bg-muted"
                title="Ir para o Próximo Dia"
              >
                Próximo Dia
                <ArrowRight className="h-4 w-4" />
              </Button>

              {!isToday && (
                <Button
                  size="sm"
                  onClick={() => setSelectedDate(todayStr)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-xs gap-1"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Ir para Hoje
                </Button>
              )}
            </div>

            {/* Ações Secundárias: Ver Histórico Completo & Emitente */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("historico")}
                className="gap-1.5 text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 h-9"
                title="Consultar faturamentos e caixas de datas anteriores"
              >
                <History className="h-4 w-4 text-blue-600" />
                Histórico / Dias Anteriores
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReceiptModalTab("emitente");
                  setEditingReceiptData({
                    numero_recibo: "CONFIG",
                    data_emissao: selectedDate,
                    cliente_id: "",
                    cliente_nome: "",
                    itens: [],
                    valor_total: 0,
                    forma_pagamento: "PIX",
                    status_pagamento: "QUITADO",
                  });
                  setReceiptModalOpen(true);
                }}
                className="h-9 gap-1.5 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                title="Configurar Dados do Emitente e Logo da Empresa nos Recibos"
              >
                <Building2 className="h-4 w-4 text-emerald-600" />
                Emitente & Logo
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefetching}
                className="h-9 px-3"
                title="Atualizar dados do caixa"
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Título & Badge de Status do Dia */}
          <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg md:text-xl font-bold font-display text-foreground">
                  Caixa do Dia: {getFormattedFullDate(selectedDate)}
                </h2>
                {isToday ? (
                  <Badge className="bg-emerald-600 text-white font-bold text-[11px] px-2.5 py-0.5">
                    ● Caixa de Hoje (Aberto)
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="font-semibold text-[11px]">
                    Caixa: {parseISODateToBR(selectedDate)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {caixaDoDia.totalClientes} cliente(s) atendido(s) • {caixaDoDia.totalExtintores} extintor(es) movimentados neste dia
              </p>
            </div>

            {caixaDoDia.faturamentoTotal > 0 && (
              <Badge
                variant="outline"
                className={`text-xs font-bold px-3 py-1 ${
                  caixaDoDia.isQuitado
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-amber-50 text-amber-700 border-amber-300"
                }`}
              >
                {caixaDoDia.isQuitado ? "✓ CAIXA QUITADO" : "⏱ VALORES PENDENTES A RECEBER"}
              </Badge>
            )}
          </div>
        </div>

        {/* CARDS DE RESUMO DO CAIXA DO DIA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-2 bg-blue-50/40 dark:bg-blue-950/20">
            <CardContent className="p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5" /> Faturamento do Dia
              </span>
              <p className="text-2xl font-extrabold text-blue-900 dark:text-blue-100 font-mono">
                {formatMoeda(caixaDoDia.faturamentoTotal)}
              </p>
              <p className="text-[10px] text-blue-700/80">total do dia {parseISODateToBR(selectedDate)}</p>
            </CardContent>
          </Card>

          <Card className="border-2 bg-emerald-50/40 dark:bg-emerald-950/20">
            <CardContent className="p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Quitado / Recebido
              </span>
              <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100 font-mono">
                {formatMoeda(caixaDoDia.recebidoTotal)}
              </p>
              <p className="text-[10px] text-emerald-700/80">valores liquidados no ato</p>
            </CardContent>
          </Card>

          <Card className="border-2 bg-amber-50/40 dark:bg-amber-950/20">
            <CardContent className="p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> A Receber / Pendente
              </span>
              <p className="text-2xl font-extrabold text-amber-900 dark:text-amber-100 font-mono">
                {formatMoeda(caixaDoDia.pendenteTotal)}
              </p>
              <p className="text-[10px] text-amber-700/80">a prazo ou em aberto</p>
            </CardContent>
          </Card>

          <Card className="border-2 bg-card">
            <CardContent className="p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Package className="h-3.5 w-3.5 text-emerald-600" /> Extintores & Clientes
              </span>
              <p className="text-2xl font-extrabold text-foreground">
                {caixaDoDia.totalExtintores}{" "}
                <span className="text-xs font-normal text-muted-foreground">cilindros</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {caixaDoDia.totalClientes} cliente(s) atendido(s)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* DISCRIMINAÇÃO POR FORMA DE PAGAMENTO DO DIA (QUANDO HOUVER VALORES) */}
        {caixaDoDia.pagamentosBreakdown.length > 0 && (
          <div className="p-3 bg-muted/40 rounded-xl border flex items-center gap-3 flex-wrap text-xs">
            <span className="font-bold text-muted-foreground uppercase text-[10px] flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5 text-emerald-600" /> Formas de Pagamento do Dia:
            </span>
            {caixaDoDia.pagamentosBreakdown.map((item) => (
              <Badge key={item.metodo} variant="outline" className="font-semibold text-xs gap-1.5 py-1">
                <span>{item.metodo}:</span>
                <strong className="text-foreground font-mono">{formatMoeda(item.valor)}</strong>
              </Badge>
            ))}
          </div>
        )}

        {/* LISTA DE CLIENTES E ATENDIMENTOS DO DIA */}
        {caixaDoDia.clientes.length === 0 ? (
          <Card className="border-2 border-dashed p-10 text-center rounded-2xl bg-muted/10">
            <div className="max-w-md mx-auto space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-foreground">
                Nenhum faturamento registrado para {isToday ? "hoje" : "este dia"} ({parseISODateToBR(selectedDate)})
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ao selecionar a opção <strong>"Troca"</strong> no recolhimento do cliente ou concluir entregas com esta data, o faturamento deste dia será computado automaticamente aqui no caixa diário.
              </p>

              <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                {ultimaDataComMovimento && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedDate(ultimaDataComMovimento)}
                    className="font-bold text-xs gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                  >
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    Abrir Último Caixa ({parseISODateToBR(ultimaDataComMovimento)})
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={() => setViewMode("historico")}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 font-bold text-xs gap-1.5 shadow-xs"
                >
                  <History className="h-3.5 w-3.5" />
                  Consultar Dias Anteriores
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Atendimentos & Clientes Faturados no Dia ({caixaDoDia.clientes.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Gerencie a forma de pagamento de cada cliente, confirme recebimentos e emita recibos ou cupons térmicos 58mm.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {caixaDoDia.clientes.map((grupo) => {
                const client = grupo.client;
                const clientName =
                  client?.razao_social || client?.nome_fantasia || client?.name || "Cliente";
                const isQuitado = grupo.ordens.every((o: any) => o.status === "concluido");

                // Detecta se é troca imediata
                const isTroca = grupo.ordens.some(
                  (o: any) => o.motivo === "Troca" || (o.observacoes || "").includes("[TROCA_DIRETA]")
                );

                // Detecta forma de pagamento a partir das observações
                const pmMatch = grupo.ordens[0]?.observacoes?.match(/\[PAGTO:([^\]]+)\]/);
                const formaPgto = pmMatch
                  ? pmMatch[1]
                  : isQuitado
                  ? "PIX"
                  : "A Prazo (30 dias)";

                return (
                  <Card
                    key={grupo.clientId}
                    className="border-2 hover:shadow-md transition-all rounded-2xl overflow-hidden"
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Dados do Cliente */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-foreground">{clientName}</h4>

                            {isTroca && (
                              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1">
                                <Zap className="h-3 w-3" /> Troca Imediata
                              </Badge>
                            )}

                            <Badge
                              variant="outline"
                              className={
                                isQuitado
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold text-[11px]"
                                  : "bg-amber-50 text-amber-700 border-amber-300 font-semibold text-[11px]"
                              }
                            >
                              {isQuitado ? "✓ PAGO / QUITADO" : "⏱ PENDENTE / A PRAZO"}
                            </Badge>
                          </div>

                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>
                              <strong>Doc:</strong> {client?.cnpj || client?.cpf || (client as any)?.document || "Não cadastrado"} •{" "}
                              <strong>Tel:</strong> {client?.telefone || (client as any)?.telefone1 || "—"}
                            </p>
                            <p className="truncate max-w-xl">
                              📍 {client?.address_street ? `${client.address_street}, ${client.address_number || "S/N"} - ${client.address_city || ""}` : "Endereço no cadastro"}
                            </p>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                              📦 {grupo.totalExtintores} extintor(es) atendido(s) • OS nº{" "}
                              {grupo.ordens.map((o: any) => o.numero_ordem).join(", #")}
                            </p>
                          </div>
                        </div>

                        {/* Seletor de Forma de Pagamento */}
                        <div className="w-full sm:w-56 space-y-1">
                          <label className="text-[11px] font-bold uppercase text-muted-foreground block">
                            Forma de Pagamento
                          </label>
                          <Select
                            value={formaPgto}
                            onValueChange={(newVal) =>
                              handleUpdateClientPaymentMethod(grupo, newVal)
                            }
                          >
                            <SelectTrigger className="h-9 font-semibold text-xs bg-white dark:bg-neutral-900">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt} className="text-xs">
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Valor & Ações */}
                        <div className="flex flex-col sm:items-end justify-between gap-3 min-w-[220px]">
                          <div>
                            <span className="text-[11px] uppercase font-bold text-muted-foreground block text-left sm:text-right">
                              Total do Cliente
                            </span>
                            <span className="text-xl font-extrabold text-foreground font-mono block text-left sm:text-right">
                              {formatMoeda(grupo.valorTotal)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleClientPaymentStatus(grupo)}
                              className="text-xs h-8 text-muted-foreground hover:text-foreground font-semibold"
                              title="Alternar entre Quitado e Pendente"
                            >
                              {isQuitado ? "Marcar Pendente" : "Marcar Quitado"}
                            </Button>

                            {existingReceiptsByClient.get(grupo.clientId) ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    window.open(
                                      existingReceiptsByClient.get(grupo.clientId)?.file_url,
                                      "_blank"
                                    )
                                  }
                                  className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 font-bold gap-1 text-xs h-8 shadow-xs"
                                  title="Abrir recibo oficial em PDF gravado no perfil"
                                >
                                  <Eye className="h-3.5 w-3.5 text-emerald-600" />
                                  Ver Recibo
                                </Button>

                                <Button
                                  size="sm"
                                  onClick={() => handleOpenReceiptForClient(grupo, "recibo")}
                                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1 text-xs h-8 shadow-xs"
                                  title="Atualizar dados do recibo existente"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  Atualizar
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleOpenReceiptForClient(grupo, "recibo")}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 text-xs h-8 shadow-xs"
                                title="Gerar recibo em PDF oficial"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Recibo (PDF)
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenThermalForClient(grupo)}
                              className="border-neutral-800 bg-neutral-900 text-neutral-100 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 font-bold gap-1.5 text-xs h-8 shadow-xs"
                              title="Impressão direta em rolo térmico 58mm com QR Code"
                            >
                              <Printer className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600" />
                              Cupom 58mm
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL DE RECIBO EDITÁVEL */}
        <ReceiptEditorModal
          open={receiptModalOpen}
          onOpenChange={setReceiptModalOpen}
          initialData={editingReceiptData}
          initialTab={receiptModalTab}
          onSuccess={() => {
            handleRefresh();
            refetchReceipts();
          }}
        />

        {/* MODAL DE CUPOM TÉRMICO 58MM */}
        <ThermalReceipt58mmDialog
          open={thermalReceiptOpen}
          onOpenChange={setThermalReceiptOpen}
          receiptData={thermalReceiptData}
        />
      </div>
    );
  }

  // ============================================================================
  // MODO 2: HISTÓRICO DE DIAS ANTERIORES (SOLICITADO SOB DEMANDA)
  // Mostra a listagem de todos os caixas passados separados dia a dia, com filtros
  // de mês, ano, pesquisa e opção de relatório consolidado de múltiplos dias.
  // ============================================================================
  const totalHistoricoFaturado = historicoPorDia.reduce((acc, d) => acc + d.faturamentoTotal, 0);
  const totalHistoricoRecebido = historicoPorDia.reduce((acc, d) => acc + d.recebidoTotal, 0);
  const totalHistoricoPendente = Math.max(0, totalHistoricoFaturado - totalHistoricoRecebido);

  const handleSelectAllInHistorico = () => {
    const allLoteIdsInView = historicoPorDia.flatMap((d) => d.lotes.map((l) => l.id));
    if (selectedLoteIds.size === allLoteIdsInView.length && allLoteIdsInView.length > 0) {
      setSelectedLoteIds(new Set());
    } else {
      setSelectedLoteIds(new Set(allLoteIdsInView));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* CABEÇALHO DO HISTÓRICO COM BOTÃO DE VOLTAR PARA O DIA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewMode("dia")}
          className="gap-2 w-fit font-bold text-xs bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Caixa de Hoje ({parseISODateToBR(todayStr)})
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setReceiptModalTab("emitente");
              setEditingReceiptData({
                numero_recibo: "CONFIG",
                data_emissao: todayStr,
                cliente_id: "",
                cliente_nome: "",
                itens: [],
                valor_total: 0,
                forma_pagamento: "PIX",
                status_pagamento: "QUITADO",
              });
              setReceiptModalOpen(true);
            }}
            className="h-9 gap-1.5 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
          >
            <Building2 className="h-4 w-4 text-emerald-600" />
            Dados do Emitente & Logo
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="h-9 px-3"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* CARDS DE RESUMO GERAL DO HISTÓRICO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border bg-card">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <Calendar className="h-3 w-3 text-red-600" /> Caixas Registrados
            </span>
            <p className="text-2xl font-extrabold text-foreground">{historicoPorDia.length}</p>
            <p className="text-[10px] text-muted-foreground">dias com faturamento</p>
          </CardContent>
        </Card>

        <Card className="border bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Faturamento Total
            </span>
            <p className="text-2xl font-extrabold text-blue-800 dark:text-blue-100 font-mono">
              {formatMoeda(totalHistoricoFaturado)}
            </p>
            <p className="text-[10px] text-blue-600/80">acumulado nos filtros</p>
          </CardContent>
        </Card>

        <Card className="border bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Quitado / Recebido
            </span>
            <p className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-100 font-mono">
              {formatMoeda(totalHistoricoRecebido)}
            </p>
            <p className="text-[10px] text-emerald-600/80">valores liquidados</p>
          </CardContent>
        </Card>

        <Card className="border bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase flex items-center gap-1">
              <Clock className="h-3 w-3" /> A Receber / Pendente
            </span>
            <p className="text-2xl font-extrabold text-amber-800 dark:text-amber-100 font-mono">
              {formatMoeda(totalHistoricoPendente)}
            </p>
            <p className="text-[10px] text-amber-600/80">faturas em aberto</p>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS & BUSCA DO HISTÓRICO */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por data (DD/MM/AAAA), cliente ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36 h-10 text-xs">
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

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28 h-10 text-xs">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Todos os Anos
                </SelectItem>
                {YEARS_LIST.filter((y) => y !== "all").map((y) => (
                  <SelectItem key={y} value={y} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="w-36 h-10 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Todos os Status
                </SelectItem>
                <SelectItem value="quitado" className="text-xs">
                  Apenas Quitados
                </SelectItem>
                <SelectItem value="pendente" className="text-xs">
                  Com Pendências
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* BARRA DE AÇÃO QUANDO HÁ SELEÇÃO PARA RELATÓRIO CONSOLIDADO */}
        {selectedLoteIds.size > 0 && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-900 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-red-800 dark:text-red-300 text-sm">
                ✓ {selectedLoteIds.size} caixa(s) selecionado(s)
              </span>
              <span className="text-xs text-muted-foreground">
                • Total Faturado:{" "}
                <strong className="text-foreground font-mono">
                  {formatMoeda(
                    selectedLotesList.reduce((acc, l) => acc + (l.valor_total || 0), 0)
                  )}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLoteIds(new Set())}
                className="text-xs h-8 text-muted-foreground"
              >
                Limpar
              </Button>
              <Button
                size="sm"
                onClick={() => setIsMultiReportOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 text-xs h-8 shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Relatório Consolidado ({selectedLoteIds.size} caixas)
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* SELETOR MASTER DE SELEÇÃO */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <label className="flex items-center gap-2 cursor-pointer font-semibold text-foreground">
          <input
            type="checkbox"
            checked={
              historicoPorDia.length > 0 &&
              selectedLoteIds.size === historicoPorDia.flatMap((d) => d.lotes).length
            }
            onChange={handleSelectAllInHistorico}
            className="h-4 w-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
          />
          Selecionar caixas para relatório consolidado
        </label>

        <span>Clique em "Abrir Caixa" para ver os clientes e pagamentos daquele dia</span>
      </div>

      {/* GRID DE DIAS NO HISTÓRICO */}
      {historicoPorDia.length === 0 ? (
        <Card className="border-dashed p-8 text-center text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="font-semibold text-base">Nenhum faturamento anterior encontrado</p>
          <p className="text-xs mt-1">Tente ajustar a pesquisa ou os filtros de mês/ano.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {historicoPorDia.map((dia) => {
            const isDiaQuitado = dia.pendenteTotal <= 0 && dia.faturamentoTotal > 0;
            const loteIdsDesteDia = dia.lotes.map((l) => l.id);
            const isDiaSelected =
              loteIdsDesteDia.length > 0 && loteIdsDesteDia.every((id) => selectedLoteIds.has(id));

            return (
              <Card
                key={dia.data}
                className={`border-2 hover:shadow-md transition-all rounded-2xl overflow-hidden flex flex-col justify-between group ${
                  isDiaSelected ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/10" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <label
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isDiaSelected}
                        onChange={() => {
                          loteIdsDesteDia.forEach((id) => toggleSelectLote(id));
                        }}
                        className="h-4 w-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                        {parseISODateToBR(dia.data)}
                      </span>
                    </label>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        isDiaQuitado
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-amber-50 text-amber-700 border-amber-300"
                      }`}
                    >
                      {isDiaQuitado ? "QUITADO" : "PENDENTE"}
                    </Badge>
                  </div>

                  <CardTitle
                    className="text-base font-bold line-clamp-1 mt-2 text-foreground group-hover:text-emerald-700 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedDate(dia.data);
                      setViewMode("dia");
                    }}
                  >
                    {getFormattedFullDate(dia.data)}
                  </CardTitle>

                  <CardDescription className="text-xs text-muted-foreground line-clamp-1">
                    {dia.nomesClientes.length > 0
                      ? dia.nomesClientes.slice(0, 3).join(", ") +
                        (dia.nomesClientes.length > 3 ? "..." : "")
                      : "Faturamento registrado"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 bg-muted/40 rounded-lg border">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                        Clientes
                      </span>
                      <strong className="text-foreground text-sm font-bold">
                        {dia.totalClientes} un
                      </strong>
                    </div>

                    <div className="p-2 bg-muted/40 rounded-lg border">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                        Extintores
                      </span>
                      <strong className="text-blue-600 dark:text-blue-400 text-sm font-bold">
                        {dia.totalExtintores} un
                      </strong>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-xl border space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Faturamento:</span>
                      <strong className="font-mono text-sm text-foreground">
                        {formatMoeda(dia.faturamentoTotal)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                      <span>Recebido:</span>
                      <strong className="font-mono">{formatMoeda(dia.recebidoTotal)}</strong>
                    </div>

                    {dia.pendenteTotal > 0 && (
                      <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold border-t pt-1">
                        <span>A Receber:</span>
                        <strong className="font-mono">{formatMoeda(dia.pendenteTotal)}</strong>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedDate(dia.data);
                      setViewMode("dia");
                    }}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 gap-1.5 font-bold text-xs h-9 shadow-xs"
                  >
                    <span>Abrir Caixa Deste Dia</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL DE RELATÓRIO CONSOLIDADO */}
      <MultiLoteReportDialog
        open={isMultiReportOpen}
        onOpenChange={setIsMultiReportOpen}
        selectedLotes={selectedLotesList}
      />

      {/* MODAL DE RECIBO EDITÁVEL */}
      <ReceiptEditorModal
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        initialData={editingReceiptData}
        initialTab={receiptModalTab}
        onSuccess={() => {
          handleRefresh();
          refetchReceipts();
        }}
      />

      {/* MODAL DE CUPOM TÉRMICO 58MM */}
      <ThermalReceipt58mmDialog
        open={thermalReceiptOpen}
        onOpenChange={setThermalReceiptOpen}
        receiptData={thermalReceiptData}
      />
    </div>
  );
}
