"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download,
  Printer,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  Package,
} from "lucide-react";
import type { LoteRecolhimento } from "@/types";
import {
  type MultiLoteReportData,
  buildMultiLotesReportPdfDocument,
} from "@/services/receipt-pdf.service";
import { useToast } from "@/hooks/use-toast";

interface MultiLoteReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLotes: LoteRecolhimento[];
}

function formatMoeda(val: number): string {
  return Number(val || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function MultiLoteReportDialog({
  open,
  onOpenChange,
  selectedLotes,
}: MultiLoteReportDialogProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  // Consolidação dos dados dos lotes
  const reportData = useMemo<MultiLoteReportData>(() => {
    let totalExtintores = 0;
    let totalClientes = 0;
    let valorTotalFaturado = 0;
    let valorTotalRecebido = 0;
    const paymentMap: Record<string, number> = {};
    const clientesList: MultiLoteReportData["clientesDetalhados"] = [];

    const uniqueClientIds = new Set<string>();

    selectedLotes.forEach((lote) => {
      totalExtintores += lote.total_extintores || 0;
      valorTotalFaturado += lote.valor_total || 0;
      valorTotalRecebido += lote.valor_recebido || 0;

      (lote.ordens || []).forEach((ordem) => {
        const cId = ordem.client_id || `unknown-${ordem.id}`;
        uniqueClientIds.add(cId);

        const clientName =
          ordem.client?.name ||
          (ordem.client as any)?.razao_social ||
          "Cliente";

        const valorOrdem = (ordem.itens || []).reduce(
          (sum, it) => sum + Number(it.valor_registrado || it.extintor?.valor_servico || 45.0),
          0
        );

        // Detecta forma de pagamento a partir das observações ou padrão
        const pmMatch = ordem.observacoes?.match(/\[PAGTO:([^\]]+)\]/);
        const formaPgto = pmMatch ? pmMatch[1] : (ordem.status === "concluido" ? "PIX" : "A Combinar");

        paymentMap[formaPgto] = (paymentMap[formaPgto] || 0) + valorOrdem;

        clientesList.push({
          loteCodigo: lote.codigo,
          clienteNome: clientName,
          clienteCidade: lote.cidade || undefined,
          extintoresQtd: (ordem.itens || []).length,
          formaPagamento: formaPgto,
          valor: valorOrdem,
          status: ordem.status === "concluido" ? "Quitado" : "Pendente",
        });
      });
    });

    totalClientes = uniqueClientIds.size;
    const valorTotalPendente = Math.max(0, valorTotalFaturado - valorTotalRecebido);

    return {
      lotes: selectedLotes,
      totalExtintores,
      totalClientes,
      valorTotalFaturado,
      valorTotalRecebido,
      valorTotalPendente,
      breakdownPorFormaPagamento: paymentMap,
      clientesDetalhados: clientesList,
    };
  }, [selectedLotes]);

  const handleDownloadPdf = () => {
    setIsDownloading(true);
    try {
      const { doc, fileName } = buildMultiLotesReportPdfDocument(reportData);
      doc.save(fileName);
      toast({
        variant: "success",
        title: "Relatório Consolidado Baixado!",
        description: `Arquivo salvo como "${fileName}".`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: err.message,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Relatório Financeiro Consolidado de Lotes
              </DialogTitle>
              <DialogDescription>
                Consolidação financeira de {selectedLotes.length} lote(s) selecionado(s) com totais faturados, recebidos e pendências.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* CARDS DE RESUMO FINANCEIRO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border bg-slate-50/50 dark:bg-slate-900/40">
              <CardContent className="p-3.5 space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <Package className="h-3 w-3 text-red-600" /> Total Extintores
                </p>
                <p className="text-xl font-extrabold text-foreground">
                  {reportData.totalExtintores} un
                </p>
                <p className="text-[10px] text-muted-foreground">
                  em {reportData.totalClientes} clientes atendidos
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-blue-50/50 dark:bg-blue-950/30">
              <CardContent className="p-3.5 space-y-1">
                <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Faturamento Bruto
                </p>
                <p className="text-xl font-extrabold text-blue-800 dark:text-blue-100 font-mono">
                  {formatMoeda(reportData.valorTotalFaturado)}
                </p>
                <p className="text-[10px] text-blue-600/80">
                  {selectedLotes.length} lotes consolidados
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-emerald-50/50 dark:bg-emerald-950/30">
              <CardContent className="p-3.5 space-y-1">
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Total Quitado
                </p>
                <p className="text-xl font-extrabold text-emerald-800 dark:text-emerald-100 font-mono">
                  {formatMoeda(reportData.valorTotalRecebido)}
                </p>
                <p className="text-[10px] text-emerald-600/80">valores já recebidos</p>
              </CardContent>
            </Card>

            <Card className="border bg-amber-50/50 dark:bg-amber-950/30">
              <CardContent className="p-3.5 space-y-1">
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Total a Receber
                </p>
                <p className="text-xl font-extrabold text-amber-800 dark:text-amber-100 font-mono">
                  {formatMoeda(reportData.valorTotalPendente)}
                </p>
                <p className="text-[10px] text-amber-600/80">a prazo ou pendente</p>
              </CardContent>
            </Card>
          </div>

          {/* TABELA DE LOTES SELECIONADOS */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Lotes Inclusos no Relatório ({selectedLotes.length})
            </h3>
            <div className="border rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground font-semibold border-b">
                  <tr>
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Nome / Rota</th>
                    <th className="p-2.5">Cidade</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-center">Extintores</th>
                    <th className="p-2.5 text-right">Faturamento (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedLotes.map((lote) => (
                    <tr key={lote.id} className="hover:bg-muted/30">
                      <td className="p-2.5 font-mono font-bold">{lote.codigo}</td>
                      <td className="p-2.5 font-semibold text-foreground">{lote.nome}</td>
                      <td className="p-2.5 text-muted-foreground">{lote.cidade || "—"}</td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[10px]">
                          {lote.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-center font-bold">{lote.total_extintores || 0} un</td>
                      <td className="p-2.5 text-right font-mono font-extrabold text-foreground">
                        {formatMoeda(lote.valor_total || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* DETALHAMENTO DE CLIENTES DOS LOTES */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Clientes e Ordens Consolidadas ({reportData.clientesDetalhados.length})
            </h3>
            <div className="border rounded-xl overflow-hidden max-h-64 overflow-y-auto shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground font-semibold border-b sticky top-0">
                  <tr>
                    <th className="p-2.5">Cliente</th>
                    <th className="p-2.5">Lote</th>
                    <th className="p-2.5 text-center">Extintores</th>
                    <th className="p-2.5">Forma Pgto</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportData.clientesDetalhados.map((c, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="p-2.5 font-semibold text-foreground">{c.clienteNome}</td>
                      <td className="p-2.5 font-mono text-muted-foreground">{c.loteCodigo}</td>
                      <td className="p-2.5 text-center">{c.extintoresQtd} un</td>
                      <td className="p-2.5">{c.formaPagamento}</td>
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={
                            c.status === "Quitado"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {formatMoeda(c.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>

          <Button
            variant="outline"
            onClick={() => window.print()}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>

          <Button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="bg-red-600 hover:bg-red-700 text-white gap-2 font-bold shadow-sm"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? "Gerando PDF..." : "Baixar Relatório Consolidado em PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
