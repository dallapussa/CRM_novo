"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Printer,
  Download,
  MessageCircle,
  Truck,
  Flame,
  DollarSign,
  CreditCard,
  QrCode,
  Banknote,
  FileText,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatMonthYear } from "@/lib/utils";
import {
  confirmClientDeliveryAndPayment,
  type GroupedClientInLote,
} from "@/services/prevention.service";
import {
  buildReceiptPdfDocument,
  saveReceiptPdfToClientDocuments,
  type EditableReceiptData,
} from "@/services/receipt-pdf.service";
import type {
  OrdemRecolhimento,
  PaymentMethod,
  DeliveryReceiptData,
  ItemRecolhimento,
} from "@/types";

interface DeliveryReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientGroup?: GroupedClientInLote | null;
  ordem?: OrdemRecolhimento | null;
  loteId?: string;
  loteCodigo?: string;
  onSuccess?: (receiptData: DeliveryReceiptData) => void;
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: any; isImmediate: boolean }[] = [
  { id: "PIX", label: "PIX Instantâneo", icon: QrCode, isImmediate: true },
  { id: "Dinheiro", label: "Dinheiro (À Vista)", icon: Banknote, isImmediate: true },
  { id: "Cartão de Débito", label: "Cartão de Débito", icon: CreditCard, isImmediate: true },
  { id: "Cartão de Crédito", label: "Cartão de Crédito", icon: CreditCard, isImmediate: true },
  { id: "Boleto", label: "Boleto Bancário (A Prazo)", icon: FileText, isImmediate: false },
  { id: "A Prazo", label: "A Prazo / Faturar", icon: Clock, isImmediate: false },
  { id: "Não Recebido", label: "Não Recebido (Cobrar Depois)", icon: AlertTriangle, isImmediate: false },
];

export function DeliveryReceiptDialog({
  open,
  onOpenChange,
  clientGroup,
  ordem,
  loteId,
  loteCodigo,
  onSuccess,
}: DeliveryReceiptDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "receipt">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<DeliveryReceiptData | null>(null);

  const effectiveClient = clientGroup?.client || ordem?.client;
  const effectiveClientId = clientGroup?.clientId || ordem?.client_id || "";

  const effectiveOrdens: OrdemRecolhimento[] = useMemo(() => {
    if (clientGroup?.ordens && clientGroup.ordens.length > 0) return clientGroup.ordens;
    if (ordem) return [ordem];
    return [];
  }, [clientGroup, ordem]);

  const effectiveItens: ItemRecolhimento[] = useMemo(() => {
    if (clientGroup?.itens && clientGroup.itens.length > 0) return clientGroup.itens;
    if (ordem?.itens) return ordem.itens;
    return [];
  }, [clientGroup, ordem]);

  const clientName =
    effectiveClient?.razao_social ||
    effectiveClient?.nome_fantasia ||
    effectiveClient?.name ||
    "Cliente";

  const osNumeros = effectiveOrdens.map((o) => o.numero_ordem).filter(Boolean);
  const osIds = effectiveOrdens.map((o) => o.id);

  const reservas = useMemo(() => {
    if (clientGroup?.reservas && clientGroup.reservas.length > 0) {
      return clientGroup.reservas;
    }
    if (ordem?.deixou_reserva && ordem.detalhes_reserva) {
      return [{ numero_ordem: ordem.numero_ordem, detalhes: ordem.detalhes_reserva }];
    }
    return [];
  }, [clientGroup, ordem]);

  // Itens com preços editáveis
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      const map: Record<string, number> = {};
      effectiveItens.forEach((it) => {
        map[it.id] = Number(it.valor_registrado || it.extintor?.valor_servico || 45.0);
      });
      setItemPrices(map);
      setStep("form");
      setReceiptData(null);
    }
  }, [open, effectiveItens]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState<string>("");

  const totalCalculado = Object.values(itemPrices).reduce((acc, val) => acc + (Number(val) || 0), 0);
  const selectedOption = PAYMENT_OPTIONS.find((p) => p.id === paymentMethod) || PAYMENT_OPTIONS[0];

  function handlePriceChange(itemId: string, newPrice: string) {
    const parsed = parseFloat(newPrice.replace(",", "."));
    setItemPrices((prev) => ({
      ...prev,
      [itemId]: isNaN(parsed) ? 0 : parsed,
    }));
  }

  async function handleConfirmDelivery() {
    setIsSubmitting(true);
    try {
      const isPaid = selectedOption.isImmediate;
      const receipt = await confirmClientDeliveryAndPayment({
        orderIds: osIds,
        orderId: osIds[0],
        loteId: loteId || effectiveOrdens[0]?.lote_id || undefined,
        clientId: effectiveClientId,
        paymentMethod,
        amount: totalCalculado,
        amountPaid: isPaid ? totalCalculado : 0,
        isPaid,
        notes: notes.trim() || undefined,
        dueDate: !isPaid ? dueDate : undefined,
      });

      setReceiptData(receipt);
      setStep("receipt");
      toast({
        variant: "success",
        title: "Extintores Entregues e Renovados!",
        description: `Recibo nº ${receipt.numero_recibo} gerado com sucesso. Extintores renovados por +1 ano.`,
      });
      onSuccess?.(receipt);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao registrar entrega",
        description: err?.message || "Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  function handlePrintReceipt() {
    window.print();
  }

  async function handleDownloadPdfAndSaveDocs() {
    if (!receiptData) return;
    setIsGeneratingPdf(true);
    try {
      const pdfData: EditableReceiptData = {
        numero_recibo: String(receiptData.numero_recibo),
        data_emissao: receiptData.data_emissao,
        cliente_id: effectiveClientId,
        cliente_nome: receiptData.cliente_nome,
        cliente_documento: receiptData.cliente_documento,
        cliente_telefone: receiptData.cliente_telefone,
        cliente_endereco: receiptData.cliente_endereco,
        lote_codigo: receiptData.lote_codigo,
        ordens_numeros: String(receiptData.ordens_numeros || (osNumeros.length > 0 ? osNumeros.join(", #") : receiptData.ordem_numero)),
        itens: (receiptData.itens || []).map((it) => ({
          identificacao: it.identificacao,
          tipo_capacidade: it.tipo_capacidade,
          modalidade: it.modalidade,
          nova_validade: formatMonthYear(it.nova_validade),
          valor: it.valor,
        })),
        valor_total: receiptData.valor_total,
        forma_pagamento: receiptData.forma_pagamento,
        status_pagamento: receiptData.status_pagamento,
        observacoes: receiptData.observacoes,
      };

      const { doc, fileName } = buildReceiptPdfDocument(pdfData);
      doc.save(fileName);

      if (effectiveClientId) {
        await saveReceiptPdfToClientDocuments(effectiveClientId, pdfData, doc);
        toast({
          variant: "success",
          title: "Recibo em PDF baixado e salvo no Menu Documentos!",
          description: `O arquivo "${fileName}" foi arquivado no perfil do cliente.`,
        });
      } else {
        toast({
          variant: "success",
          title: "Recibo em PDF baixado com sucesso!",
          description: `Arquivo salvo como "${fileName}".`,
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: err.message,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  function generateWhatsAppUrl() {
    if (!receiptData) return "#";
    const rawPhone = (
      receiptData.cliente_telefone ||
      effectiveClient?.telefone ||
      effectiveClient?.phone ||
      ""
    ).replace(/\D/g, "");
    if (!rawPhone) return "#";

    const osLabel =
      osNumeros.length > 0
        ? `OS #${osNumeros.join(", #")}`
        : `OS #${receiptData.ordem_numero}`;

    const text = `Olá, *${receiptData.cliente_nome}*! 👋\n\nAqui é da equipe da *ExtinControl Prevenção Contra Incêndio*.\n\nConfirmamos a devolução e reinstalação dos seus extintores referente à *${osLabel}* (Lote ${receiptData.lote_codigo}).\n\n📄 *Recibo de Devolução nº ${receiptData.numero_recibo}*\n💰 *Valor Total:* ${formatCurrency(receiptData.valor_total)}\n💳 *Forma de Pagamento:* ${receiptData.forma_pagamento} (${receiptData.status_pagamento})\n\nTodos os extintores foram revisados, recarregados e têm garantia com nova validade estendida até o próximo ano.\n\nAgradecemos a preferência e parceria! 🚒🔥`;

    return `https://wa.me/55${rawPhone}?text=${encodeURIComponent(text)}`;
  }

  const clientAddress = [
    effectiveClient?.address?.street || effectiveClient?.address_street,
    effectiveClient?.address?.number || effectiveClient?.address_number,
    effectiveClient?.address?.neighborhood || effectiveClient?.address_neighborhood,
    effectiveClient?.address?.city || effectiveClient?.address_city,
  ]
    .filter(Boolean)
    .join(", ");

  const clientDoc =
    effectiveClient?.document ||
    effectiveClient?.cnpj ||
    effectiveClient?.cpf ||
    effectiveClient?.documento;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 border-0 shadow-2xl rounded-2xl bg-white dark:bg-neutral-900">
        {step === "form" ? (
          <div className="p-6 space-y-6">
            {/* Header */}
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 dark:bg-orange-950/40 rounded-xl text-orange-600">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">
                      Entrega, Cobrança & Recibo ao Cliente
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Confirme os valores dos extintores do cliente, forma de pagamento e renove o inventário.
                    </DialogDescription>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {osNumeros.map((num) => (
                    <Badge key={num} className="bg-orange-600 text-white font-bold text-xs">
                      OS #{num}
                    </Badge>
                  ))}
                </div>
              </div>
            </DialogHeader>

            {/* Informações do Cliente & Alerta de Reserva */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-orange-600" />
                  {clientName}
                </p>
                {clientDoc && (
                  <span className="text-muted-foreground font-mono">
                    CNPJ/CPF: {clientDoc}
                  </span>
                )}
              </div>

              {clientAddress && (
                <p className="text-muted-foreground">
                  📍 {clientAddress}
                </p>
              )}

              {reservas.length > 0 && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 rounded-lg space-y-1 text-amber-900 dark:text-amber-200 font-semibold mt-2">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Atenção: Recolher extintor(es) de reserva deixado(s) com este cliente:</span>
                  </div>
                  {reservas.map((r, rIdx) => (
                    <p key={rIdx} className="pl-5 text-xs text-amber-950 dark:text-amber-100">
                      • (OS #{r.numero_ordem}): <span className="underline">{r.detalhes}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Tabela de Extintores & Valores Unitários */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Extintores do Cliente ({effectiveItens.length} cilindros)
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Valores editáveis por cilindro
                </span>
              </div>

              <div className="border rounded-xl overflow-hidden divide-y max-h-[300px] overflow-y-auto">
                {effectiveItens.map((it) => {
                  const ext = it.extintor;
                  const unitPrice = itemPrices[it.id] ?? 45.0;
                  const osDaOrigem = effectiveOrdens.find((o) => o.id === it.ordem_id);

                  return (
                    <div
                      key={it.id}
                      className="p-3 bg-white dark:bg-neutral-900 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Flame className="h-4 w-4 text-orange-500 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-foreground">
                              {ext?.identificacao || "Extintor"}
                            </p>
                            {osDaOrigem && effectiveOrdens.length > 1 && (
                              <Badge variant="outline" className="text-[9px] font-mono">
                                OS #{osDaOrigem.numero_ordem}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {ext?.tipo_capacidade || "Pó ABC - 4kg"} • 📍 {ext?.localizacao || "Localização padrão"}
                          </p>
                          <Badge variant="outline" className="text-[10px] mt-0.5">
                            Modo: {it.modalidade_recarga || "Normal"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Label htmlFor={`price-${it.id}`} className="text-[11px] text-muted-foreground">
                          R$ / un:
                        </Label>
                        <Input
                          id={`price-${it.id}`}
                          type="number"
                          step="0.01"
                          value={unitPrice}
                          onChange={(e) => handlePriceChange(it.id, e.target.value)}
                          className="w-24 h-8 text-right font-bold text-xs"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totalizador */}
              <div className="flex items-center justify-between p-3.5 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200">
                <span className="font-bold text-sm text-orange-900 dark:text-orange-200">
                  Valor Total a Cobrar ({effectiveItens.length} extintores):
                </span>
                <span className="text-xl font-extrabold text-orange-700 dark:text-orange-300 font-mono">
                  {formatCurrency(totalCalculado)}
                </span>
              </div>
            </div>

            {/* Opções de Forma de Pagamento */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                Selecione a Forma de Pagamento
              </Label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = paymentMethod === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPaymentMethod(opt.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 shadow-sm ${
                        isSelected
                          ? "border-orange-600 bg-orange-50/50 dark:bg-orange-950/30 ring-2 ring-orange-500/20"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Icon className={`h-4 w-4 ${isSelected ? "text-orange-600" : "text-muted-foreground"}`} />
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            opt.isImmediate
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {opt.isImmediate ? "À Vista" : "A Prazo"}
                        </Badge>
                      </div>
                      <p className={`text-xs font-bold ${isSelected ? "text-orange-900 dark:text-orange-200" : "text-foreground"}`}>
                        {opt.label}
                      </p>
                    </button>
                  );
                })}
              </div>

              {!selectedOption.isImmediate && (
                <div className="pt-2">
                  <Label htmlFor="due_date" className="text-xs">
                    Vencimento do Boleto / Faturamento:
                  </Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-9 text-xs mt-1 max-w-xs"
                  />
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs">
                Observações de Devolução / Recebimento:
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Entregue na portaria para o síndico João. Chave PIX enviada."
                rows={2}
                className="text-xs"
              />
            </div>

            {/* Footer com Botão de Confirmação */}
            <DialogFooter className="border-t pt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleConfirmDelivery}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-4 shadow-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Confirmar Entrega, Cobrança & Renovar (+1 Ano)
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ========================================================================= */
          /* TELA DO RECIBO OFICIAL FORMATADO */
          /* ========================================================================= */
          receiptData && (
            <div className="p-6 space-y-6">
              {/* Controles no Topo */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Recibo de Devolução & Pagamento Emitido!
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Extintores renovados com sucesso no inventário do cliente.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPdfAndSaveDocs}
                    disabled={isGeneratingPdf}
                    className="gap-1.5 text-xs border-red-200 text-red-700 hover:bg-red-50 font-bold"
                  >
                    <Download className="h-3.5 w-3.5 text-red-600" />
                    Baixar PDF
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePrintReceipt}
                    className="gap-1.5 text-xs"
                  >
                    <Printer className="h-3.5 w-3.5 text-blue-600" />
                    Imprimir
                  </Button>

                  {(receiptData.cliente_telefone || effectiveClient?.telefone) && (
                    <Button
                      asChild
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold"
                    >
                      <a
                        href={generateWhatsAppUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* RECIBO TIMBRADO FORMATADO */}
              <div
                id="receipt-print-area"
                className="p-6 bg-white dark:bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl space-y-5 text-xs text-neutral-800 dark:text-neutral-200"
              >
                {/* Cabeçalho da Empresa */}
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <Flame className="h-5 w-5 text-red-600" />
                      EXTINCONTROL
                    </h2>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      Prevenção e Combate a Incêndio • Recargas, Testes & PPCI
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      CNPJ: 00.000.000/0001-00 • Fone: (55) 3322-0000
                    </p>
                  </div>

                  <div className="text-right">
                    <Badge className="bg-neutral-900 text-white font-mono text-xs">
                      RECIBO Nº {receiptData.numero_recibo}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Emissão: <strong>{receiptData.data_emissao}</strong>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      OS: #{receiptData.ordens_numeros || (osNumeros.length > 0 ? osNumeros.join(", #") : receiptData.ordem_numero)} • Lote: {receiptData.lote_codigo}
                    </p>
                  </div>
                </div>

                {/* Dados do Cliente */}
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg space-y-1 text-xs">
                  <p className="font-bold text-neutral-900 dark:text-neutral-100">
                    CLIENTE: {receiptData.cliente_nome}
                  </p>
                  {receiptData.cliente_documento && (
                    <p className="text-muted-foreground">
                      CNPJ/CPF: {receiptData.cliente_documento}
                    </p>
                  )}
                  {receiptData.cliente_endereco && (
                    <p className="text-muted-foreground">
                      Endereço de Instalação: {receiptData.cliente_endereco}
                    </p>
                  )}
                </div>

                {/* Tabela dos Extintores Devolvidos */}
                <div>
                  <table className="w-full text-left text-xs border border-collapse">
                    <thead>
                      <tr className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-bold">
                        <th className="p-2 border">Cilindro / ID</th>
                        <th className="p-2 border">Modelo / Carga</th>
                        <th className="p-2 border">Local Reinstalação</th>
                        <th className="p-2 border">Nova Validade</th>
                        <th className="p-2 border text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptData.itens.map((it, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2 border font-bold font-mono">{it.identificacao}</td>
                          <td className="p-2 border">{it.tipo_capacidade} ({it.modalidade})</td>
                          <td className="p-2 border text-muted-foreground">📍 {it.localizacao || "Padrão"}</td>
                          <td className="p-2 border font-bold text-emerald-700 dark:text-emerald-400">
                            {formatMonthYear(it.nova_validade)}
                          </td>
                          <td className="p-2 border text-right font-mono font-bold">
                            {formatCurrency(it.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totais & Pagamento */}
                <div className="p-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-between border">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Forma de Pagamento:{" "}
                      <strong className="text-foreground">{receiptData.forma_pagamento}</strong>
                    </p>
                    <Badge
                      className={`text-[10px] font-bold mt-1 ${
                        receiptData.status_pagamento === "QUITADO"
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-600 text-white"
                      }`}
                    >
                      {receiptData.status_pagamento === "QUITADO" ? "PAGO / QUITADO" : "PENDENTE / A PRAZO"}
                    </Badge>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold">Valor Total</p>
                    <p className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                      {formatCurrency(receiptData.valor_total)}
                    </p>
                  </div>
                </div>

                {receiptData.observacoes && (
                  <p className="text-[11px] text-muted-foreground italic">
                    Obs: {receiptData.observacoes}
                  </p>
                )}

                {/* Canhoto de Assinatura */}
                <div className="pt-8 border-t flex justify-between gap-6 text-[10px] text-muted-foreground">
                  <div className="text-center flex-1">
                    <div className="border-t border-neutral-400 pt-1">
                      Assinatura do Técnico / Responsável Entrega
                    </div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="border-t border-neutral-400 pt-1">
                      Assinatura e Carimbo do Cliente Recebedor ({receiptData.cliente_nome})
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão Concluir */}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Fechar
                </Button>

                <Button
                  type="button"
                  onClick={handleDownloadPdfAndSaveDocs}
                  disabled={isGeneratingPdf}
                  className="bg-red-600 text-white hover:bg-red-700 font-bold gap-2 shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  {isGeneratingPdf ? "Gerando PDF..." : "Baixar Recibo em PDF & Salvar nos Documentos"}
                </Button>
              </DialogFooter>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
