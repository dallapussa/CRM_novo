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
import { listLotesRecolhimento, groupOrdensByClient } from "@/services/prevention.service";
import { ReceiptEditorModal } from "@/components/financeiro/receipt-editor-modal";
import { MultiLoteReportDialog } from "@/components/financeiro/multi-lote-report-dialog";
import { ThermalReceipt58mmDialog } from "@/components/financeiro/thermal-receipt-58mm-dialog";
import type { EditableReceiptData, ReceiptItem } from "@/services/receipt-pdf.service";
import { createClient } from "@/lib/supabase/client";

function formatMoeda(val: number): string {
  return Number(val || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "quitado" | "pendente">("all");

  // Multi-seleção de lotes
  const [selectedLoteIds, setSelectedLoteIds] = useState<Set<string>>(new Set());
  const [isMultiReportOpen, setIsMultiReportOpen] = useState(false);

  // Lote selecionado para visualização detalhada
  const [activeLoteId, setActiveLoteId] = useState<string | null>(null);

  // Recibo editável
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptModalTab, setReceiptModalTab] = useState<"recibo" | "emitente">("recibo");
  const [editingReceiptData, setEditingReceiptData] = useState<EditableReceiptData | null>(null);

  // Cupom Térmico 58mm
  const [thermalReceiptOpen, setThermalReceiptOpen] = useState(false);
  const [thermalReceiptData, setThermalReceiptData] = useState<EditableReceiptData | null>(null);

  // Busca lotes do sistema
  const { data: lotes = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["lotes_recolhimento"],
    queryFn: listLotesRecolhimento,
  });

  // Filtragem dos lotes
  const filteredLotes = useMemo(() => {
    return lotes.filter((lote) => {
      // 1. Busca por texto
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const clientNames = (lote.ordens || [])
          .map((o) => (o.client?.name || (o.client as any)?.razao_social || "").toLowerCase())
          .join(" ");

        const matchNome = (lote.nome || "").toLowerCase().includes(q);
        const matchCodigo = (lote.codigo || "").toLowerCase().includes(q);
        const matchCidade = (lote.cidade || "").toLowerCase().includes(q);
        const matchClients = clientNames.includes(q);

        if (!matchNome && !matchCodigo && !matchCidade && !matchClients) return false;
      }

      // 2. Filtro de Mês e Ano
      const dataRef = lote.data_recolhimento || lote.created_at;
      if (dataRef) {
        const parts = dataRef.split("-");
        const year = parts[0];
        const month = parts[1];

        if (selectedYear !== "all" && year !== selectedYear) return false;
        if (selectedMonth !== "all" && month !== selectedMonth) return false;
      }

      // 3. Filtro de Status Financeiro
      if (statusFilter === "quitado") {
        if ((lote.valor_pendente || 0) > 0) return false;
      } else if (statusFilter === "pendente") {
        if ((lote.valor_pendente || 0) <= 0) return false;
      }

      return true;
    });
  }, [lotes, search, selectedMonth, selectedYear, statusFilter]);

  // Lotes selecionados para o relatório consolidado
  const selectedLotesList = useMemo(() => {
    return lotes.filter((l) => selectedLoteIds.has(l.id));
  }, [lotes, selectedLoteIds]);

  // Toggle de seleção
  const toggleSelectLote = (id: string) => {
    setSelectedLoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedLoteIds.size === filteredLotes.length) {
      setSelectedLoteIds(new Set());
    } else {
      setSelectedLoteIds(new Set(filteredLotes.map((l) => l.id)));
    }
  };

  // Lote atualmente aberto no detalhe
  const activeLote = useMemo(() => {
    if (!activeLoteId) return null;
    return lotes.find((l) => l.id === activeLoteId) || null;
  }, [lotes, activeLoteId]);

  // Agrupa clientes do lote ativo
  const activeLoteClientes = useMemo(() => {
    if (!activeLote) return [];
    return groupOrdensByClient(activeLote.ordens || []);
  }, [activeLote]);

  // Busca recibos já emitidos no Supabase para os clientes do lote ativo (evita duplicidade de arquivos)
  const { data: existingLoteReceipts = [], refetch: refetchReceipts } = useQuery({
    queryKey: ["lote_receipts_docs", activeLote?.codigo],
    enabled: !!activeLote?.codigo,
    queryFn: async () => {
      const supabase = createClient();
      const cleanLote = String(activeLote?.codigo || "").replace(/[^a-zA-Z0-9.-]/g, "_");
      const { data } = await supabase
        .from("documentos_cliente")
        .select("id, client_id, file_url, file_name, created_at, storage_path")
        .eq("tipo_documento", "Recibo")
        .ilike("file_name", `%${cleanLote}%`);
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

  // Constrói objeto de recibo para um cliente do lote com número e nome determinísticos do lote
  const buildReceiptDataForClient = (grupo: any): EditableReceiptData => {
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

    // Verifica se há forma de pagamento informada na primeira ordem
    const firstOrdem = grupo.ordens[0];
    const pmMatch = firstOrdem?.observacoes?.match(/\[PAGTO:([^\]]+)\]/);
    const initialPm = pmMatch ? pmMatch[1] : (firstOrdem?.status === "concluido" ? "PIX" : "A Prazo (30 dias)");

    const isQuitado = grupo.ordens.every((o: any) => o.status === "concluido");

    const cleanDoc = client?.cnpj || client?.cpf || client?.documento || undefined;
    const cleanPhone = client?.telefone || client?.phone || client?.telefone2 || undefined;
    const cleanAddress = [
      client?.address?.street || client?.address_street,
      client?.address?.number || client?.address_number,
      client?.address?.neighborhood || client?.address_neighborhood,
      client?.address?.city || client?.address_city,
      client?.address?.state || client?.address_state,
    ]
      .filter(Boolean)
      .join(", ") || undefined;

    const cleanLote = activeLote?.codigo
      ? String(activeLote.codigo).replace(/[^a-zA-Z0-9.-]/g, "_")
      : "";

    return {
      numero_recibo: `REC-${cleanLote || (firstOrdem?.numero_ordem ? `OS${firstOrdem.numero_ordem}` : "001")}`,
      data_emissao: new Date().toISOString().split("T")[0],
      cliente_id: grupo.clientId,
      cliente_nome: clientName,
      cliente_documento: cleanDoc,
      cliente_telefone: cleanPhone,
      cliente_endereco: cleanAddress,
      lote_codigo: activeLote?.codigo,
      lote_nome: activeLote?.nome,
      ordens_numeros: ordensNumeros,
      itens: receiptItens,
      valor_total: Number(grupo.valorTotal || receiptItens.reduce((sum, it) => sum + it.valor, 0)),
      forma_pagamento: initialPm,
      status_pagamento: isQuitado ? "QUITADO" : "PENDENTE",
      observacoes: "Garantia de 12 meses contra defeitos de recarga e teste de pressão.",
      empresa_nome: "EXTINCONTROL PREVENÇÃO CONTRA INCÊNDIO",
    };
  };

  // Abertura do Modal de Recibo PDF para um cliente
  const handleOpenReceiptForClient = (grupo: any, tab: "recibo" | "emitente" = "recibo") => {
    const data = buildReceiptDataForClient(grupo);
    setEditingReceiptData(data);
    setReceiptModalTab(tab);
    setReceiptModalOpen(true);
  };

  // Abertura do Cupom Térmico 58mm direto para um cliente
  const handleOpenThermalForClient = (grupo: any) => {
    const data = buildReceiptDataForClient(grupo);
    setThermalReceiptData(data);
    setThermalReceiptOpen(true);
  };

  // Alteração rápida da forma de pagamento de um cliente
  const handleUpdateClientPaymentMethod = async (grupo: any, newMethod: string) => {
    try {
      const supabase = createClient();
      const ordemIds = grupo.ordens.map((o: any) => o.id);

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

      refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar forma de pagamento",
        description: err.message,
      });
    }
  };

  // Alterna status de pagamento do cliente entre Quitado e Pendente
  const handleToggleClientPaymentStatus = async (grupo: any) => {
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

      refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao alterar status",
        description: err.message,
      });
    }
  };

  // ============================================================================
  // SE ESTIVER VISUALIZANDO UM LOTE ESPECÍFICO (DETALHE FINANCEIRO DO LOTE)
  // ============================================================================
  if (activeLote) {
    const totalCobradoLote = activeLote.valor_total || 0;
    const totalRecebidoLote = activeLote.valor_recebido || 0;
    const totalPendenteLote = activeLote.valor_pendente || 0;

    return (
      <div className="space-y-6">
        {/* Topo com botão voltar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveLoteId(null)}
            className="gap-2 w-fit font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Todos os Lotes
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReceiptModalTab("emitente");
                const dummyData = buildReceiptDataForClient(activeLoteClientes[0] || {
                  clientId: "",
                  client: null,
                  ordens: [],
                  itens: [],
                  valorTotal: 0,
                });
                setEditingReceiptData(dummyData);
                setReceiptModalOpen(true);
              }}
              className="gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 font-bold text-xs"
              title="Configurar Dados do Emitente e Logo da Empresa"
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
              Relatório Consolidado Deste Lote (PDF)
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
                      {activeLote.cidade} {activeLote.regiao ? `• ${activeLote.regiao}` : ""}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl font-bold">{activeLote.nome}</CardTitle>
              </div>

              {/* Totais do Lote */}
              <div className="flex items-center gap-4 bg-muted/40 p-3 rounded-xl border">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Faturamento Lote
                  </span>
                  <span className="text-lg font-extrabold text-foreground font-mono">
                    {formatMoeda(totalCobradoLote)}
                  </span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                    Quitado
                  </span>
                  <span className="text-base font-extrabold text-emerald-600 font-mono">
                    {formatMoeda(totalRecebidoLote)}
                  </span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-600 block">
                    A Receber
                  </span>
                  <span className="text-base font-extrabold text-amber-600 font-mono">
                    {formatMoeda(totalPendenteLote)}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* LISTA DE CLIENTES DO LOTE COM FORMAS DE PAGAMENTO & RECIBOS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Clientes do Lote & Faturamento ({activeLoteClientes.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Consulte valores, defina a forma de pagamento e gere recibos editáveis em PDF com arquivamento direto no perfil do cliente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {activeLoteClientes.map((grupo) => {
              const client = grupo.client;
              const clientName =
                client?.razao_social || client?.nome_fantasia || client?.name || "Cliente";
              const isQuitado = grupo.ordens.every((o) => o.status === "concluido");

              // Detecta forma de pagamento a partir das observações
              const pmMatch = grupo.ordens[0]?.observacoes?.match(/\[PAGTO:([^\]]+)\]/);
              const formaPgto = pmMatch
                ? pmMatch[1]
                : (isQuitado ? "PIX" : "A Prazo (30 dias)");

              return (
                <Card
                  key={grupo.clientId}
                  className="border-2 hover:shadow-md transition-all rounded-2xl overflow-hidden"
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Dados do Cliente */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-foreground">{clientName}</h3>
                          <Badge
                            variant="outline"
                            className={
                              isQuitado
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
                                : "bg-amber-50 text-amber-700 border-amber-300 font-semibold"
                            }
                          >
                            {isQuitado ? "✓ PAGO / QUITADO" : "⏱ PENDENTE / A PRAZO"}
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>
                            <strong>Doc:</strong> {client?.cnpj || client?.cpf || "Não cadastrado"} •{" "}
                            <strong>Tel:</strong> {client?.telefone || "—"}
                          </p>
                          <p className="truncate max-w-lg">
                            📍 {client?.address_street ? `${client.address_street}, ${client.address_number || "S/N"} - ${client.address_city || ""}` : "Endereço não cadastrado"}
                          </p>
                          <p className="text-[11px] text-blue-600 font-semibold">
                            📦 {grupo.totalExtintores} extintor(es) revisado(s) • OS nº{" "}
                            {grupo.ordens.map((o) => o.numero_ordem).join(", #")}
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
                      <div className="flex flex-col sm:items-end justify-between gap-3 min-w-[200px]">
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
                            className="text-xs h-8 text-muted-foreground hover:text-foreground"
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
                                title="Abrir recibo em PDF oficial já existente gravado no Supabase"
                              >
                                <Eye className="h-3.5 w-3.5 text-emerald-600" />
                                Ver Recibo
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleOpenReceiptForClient(grupo, "recibo")}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1 text-xs h-8 shadow-xs"
                                title="Atualizar dados do recibo existente sem duplicar arquivos no lote"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Atualizar Recibo
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleOpenReceiptForClient(grupo, "recibo")}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 text-xs h-8 shadow-xs"
                              title="Gerar recibo em PDF para este cliente no lote"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Gerar Recibo (PDF)
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

        {/* Modal de Recibo Editável */}
        <ReceiptEditorModal
          open={receiptModalOpen}
          onOpenChange={setReceiptModalOpen}
          initialData={editingReceiptData}
          initialTab={receiptModalTab}
          onSuccess={() => {
            refetch();
            refetchReceipts();
          }}
        />

        {/* Modal de Relatório Consolidado de Múltiplos Lotes */}
        <MultiLoteReportDialog
          open={isMultiReportOpen}
          onOpenChange={setIsMultiReportOpen}
          selectedLotes={selectedLotesList}
        />

        {/* Modal de Impressão Térmica 58mm com QR Code */}
        <ThermalReceipt58mmDialog
          open={thermalReceiptOpen}
          onOpenChange={setThermalReceiptOpen}
          receiptData={thermalReceiptData}
        />
      </div>
    );
  }

  // ============================================================================
  // VISUALIZAÇÃO PRINCIPAL: LISTAGEM DE LOTES NO MENU FINANCEIRO
  // ============================================================================
  const totalLotes = lotes.length;
  const totalFaturadoGeral = lotes.reduce((acc, l) => acc + (l.valor_total || 0), 0);
  const totalRecebidoGeral = lotes.reduce((acc, l) => acc + (l.valor_recebido || 0), 0);
  const totalPendenteGeral = Math.max(0, totalFaturadoGeral - totalRecebidoGeral);

  return (
    <div className="space-y-6">
      {/* CARDS DE RESUMO FINANCEIRO GERAL */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border bg-card">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <Package className="h-3 w-3 text-red-600" /> Total de Lotes
            </span>
            <p className="text-2xl font-extrabold text-foreground">{totalLotes}</p>
            <p className="text-[10px] text-muted-foreground">lotes ativos e finalizados</p>
          </CardContent>
        </Card>

        <Card className="border bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Faturamento dos Lotes
            </span>
            <p className="text-2xl font-extrabold text-blue-800 dark:text-blue-100 font-mono">
              {formatMoeda(totalFaturadoGeral)}
            </p>
            <p className="text-[10px] text-blue-600/80">soma total dos cilindros</p>
          </CardContent>
        </Card>

        <Card className="border bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Quitado / Recebido
            </span>
            <p className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-100 font-mono">
              {formatMoeda(totalRecebidoGeral)}
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
              {formatMoeda(totalPendenteGeral)}
            </p>
            <p className="text-[10px] text-amber-600/80">faturas em aberto</p>
          </CardContent>
        </Card>
      </div>

      {/* BARRA DE FERRAMENTAS & FILTROS */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por lote, código, cliente ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro Mês */}
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

            {/* Filtro Ano */}
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

            {/* Filtro Status Financeiro */}
            <Select
              value={statusFilter}
              onValueChange={(val: any) => setStatusFilter(val)}
            >
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

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReceiptModalTab("emitente");
                setEditingReceiptData({
                  numero_recibo: "CONFIG",
                  data_emissao: new Date().toISOString().split("T")[0],
                  cliente_id: "",
                  cliente_nome: "",
                  itens: [],
                  valor_total: 0,
                  forma_pagamento: "PIX",
                  status_pagamento: "QUITADO",
                });
                setReceiptModalOpen(true);
              }}
              className="h-10 gap-1.5 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
              title="Configurar Dados do Emitente do Recibo (CNPJ, Razão Social e Logo)"
            >
              <Building2 className="h-4 w-4 text-emerald-600" />
              Emitente & Logo
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-10 px-3"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* BARRA DE AÇÃO QUANDO HÁ LOTES SELECIONADOS */}
        {selectedLoteIds.size > 0 && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-900 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-red-800 dark:text-red-300 text-sm">
                ✓ {selectedLoteIds.size} lote(s) selecionado(s)
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
                Limpar Seleção
              </Button>
              <Button
                size="sm"
                onClick={() => setIsMultiReportOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 text-xs h-8 shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Gerar Relatório Consolidado ({selectedLoteIds.size} lotes)
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
              filteredLotes.length > 0 &&
              selectedLoteIds.size === filteredLotes.length
            }
            onChange={handleSelectAll}
            className="h-4 w-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
          />
          Selecionar todos os {filteredLotes.length} lotes para relatório
        </label>

        <span>Clique no lote para ver clientes, pagamentos e emitir recibos</span>
      </div>

      {/* GRID DE CARDS DE LOTES */}
      {filteredLotes.length === 0 ? (
        <Card className="border-dashed p-8 text-center text-muted-foreground">
          <DollarSign className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="font-semibold text-base">Nenhum lote financeiro encontrado</p>
          <p className="text-xs mt-1">
            Tente limpar a pesquisa ou os filtros de mês/ano.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLotes.map((lote) => {
            const isSelected = selectedLoteIds.has(lote.id);
            const totalFaturado = lote.valor_total || 0;
            const totalRecebido = lote.valor_recebido || 0;
            const totalPendente = lote.valor_pendente || 0;
            const isQuitado = totalPendente <= 0 && totalFaturado > 0;

            return (
              <Card
                key={lote.id}
                className={`border-2 hover:shadow-md transition-all rounded-2xl overflow-hidden flex flex-col justify-between group ${
                  isSelected ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/10" : ""
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
                        checked={isSelected}
                        onChange={() => toggleSelectLote(lote.id)}
                        className="h-4 w-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                        {lote.codigo}
                      </span>
                    </label>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        isQuitado
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-amber-50 text-amber-700 border-amber-300"
                      }`}
                    >
                      {isQuitado ? "QUITADO" : "PENDENTE"}
                    </Badge>
                  </div>

                  <CardTitle
                    className="text-base font-bold line-clamp-1 mt-2 text-foreground group-hover:text-red-600 transition-colors cursor-pointer"
                    onClick={() => setActiveLoteId(lote.id)}
                  >
                    {lote.nome}
                  </CardTitle>

                  {lote.cidade && (
                    <CardDescription className="text-xs flex items-center gap-1 font-medium text-foreground">
                      <MapPin className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      {lote.cidade} {lote.regiao ? `• ${lote.regiao}` : ""}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-3.5 pt-0">
                  {/* Resumo do Lote */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 bg-muted/40 rounded-lg border">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                        Clientes
                      </span>
                      <strong className="text-foreground text-sm font-bold">
                        {lote.total_clientes || 0} un
                      </strong>
                    </div>

                    <div className="p-2 bg-muted/40 rounded-lg border">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                        Extintores
                      </span>
                      <strong className="text-blue-600 text-sm font-bold">
                        {lote.total_extintores || 0} un
                      </strong>
                    </div>
                  </div>

                  {/* Detalhes Financeiros */}
                  <div className="p-3 bg-muted/30 rounded-xl border space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Faturamento Total:</span>
                      <strong className="font-mono text-sm text-foreground">
                        {formatMoeda(totalFaturado)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                      <span>Total Recebido:</span>
                      <strong className="font-mono">{formatMoeda(totalRecebido)}</strong>
                    </div>

                    {totalPendente > 0 && (
                      <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold border-t pt-1">
                        <span>A Receber:</span>
                        <strong className="font-mono">{formatMoeda(totalPendente)}</strong>
                      </div>
                    )}
                  </div>

                  {/* Botão de Ação para Abrir o Lote */}
                  <Button
                    onClick={() => setActiveLoteId(lote.id)}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 gap-1.5 font-bold text-xs h-9 shadow-xs"
                  >
                    <span>Ver Clientes, Pagamentos & Recibos</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Recibo Editável */}
      <ReceiptEditorModal
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        initialData={editingReceiptData}
        initialTab={receiptModalTab}
        onSuccess={() => {
          refetch();
          refetchReceipts();
        }}
      />

      {/* Modal de Relatório Consolidado de Múltiplos Lotes */}
      <MultiLoteReportDialog
        open={isMultiReportOpen}
        onOpenChange={setIsMultiReportOpen}
        selectedLotes={selectedLotesList}
      />

      {/* Modal de Impressão Térmica 58mm */}
      <ThermalReceipt58mmDialog
        open={thermalReceiptOpen}
        onOpenChange={setThermalReceiptOpen}
        receiptData={thermalReceiptData}
      />
    </div>
  );
}
