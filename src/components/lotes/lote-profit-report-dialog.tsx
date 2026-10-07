"use client";

import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Printer,
  Sparkles,
  Flame,
  Fuel,
  Percent,
  CheckCircle2,
  Calendar,
  Building2,
  Clock,
  Layers,
} from "lucide-react";
import { formatCurrency, formatMonthYear } from "@/lib/utils";
import type { LoteRecolhimento } from "@/types";
import {
  calculateItemCostAndProfit,
  type ExtinguisherModel,
  DEFAULT_EXTINGUISHER_MODELS,
} from "@/services/extinguisher-catalog.service";

interface LoteProfitReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lote: LoteRecolhimento;
  catalogModels?: ExtinguisherModel[];
}

export function LoteProfitReportDialog({
  open,
  onOpenChange,
  lote,
  catalogModels = DEFAULT_EXTINGUISHER_MODELS,
}: LoteProfitReportDialogProps) {
  // Processa cada item do lote com o custo real baseado na modalidade (Normal vs Reaproveitamento)
  const reportData = useMemo(() => {
    const ordens = lote.ordens || [];
    const rows: Array<{
      ordemId: string;
      ordemNumero: number;
      clientId: string;
      clientName: string;
      itemId: string;
      identificacao: string;
      tipoCapacidade: string;
      modalidade: "Normal" | "Reaproveitamento" | string;
      custo: number;
      receita: number;
      lucro: number;
      margem: number;
      modeloUtilizado: string;
    }> = [];

    let totalReceita = 0;
    let totalCusto = 0;
    let qtdNormal = 0;
    let custoNormal = 0;
    let receitaNormal = 0;
    let qtdReap = 0;
    let custoReap = 0;
    let receitaReap = 0;

    ordens.forEach((ordem) => {
      const clientName =
        (ordem.client as any)?.razao_social ||
        (ordem.client as any)?.nome_fantasia ||
        ordem.client?.name ||
        "Cliente";

      (ordem.itens || []).forEach((it) => {
        const ext = it.extintor;
        const tipoCap = ext?.tipo_capacidade || "Pó ABC - 4kg";
        const modalidade = it.modalidade_recarga || "Reaproveitamento";
        const valorCobrado = Number(it.valor_registrado || ext?.valor_servico || 45.0);

        const { custo, lucro, margemPercentual, modeloUtilizado } = calculateItemCostAndProfit(
          tipoCap,
          modalidade,
          valorCobrado,
          catalogModels
        );

        totalReceita += valorCobrado;
        totalCusto += custo;

        const isReap =
          modalidade.toLowerCase().includes("reaproveita") || modalidade === "Reaproveitamento";

        if (isReap) {
          qtdReap += 1;
          custoReap += custo;
          receitaReap += valorCobrado;
        } else {
          qtdNormal += 1;
          custoNormal += custo;
          receitaNormal += valorCobrado;
        }

        rows.push({
          ordemId: ordem.id,
          ordemNumero: ordem.numero_ordem,
          clientId: ordem.client_id,
          clientName,
          itemId: it.id,
          identificacao: ext?.identificacao || "Extintor",
          tipoCapacidade: tipoCap,
          modalidade,
          custo,
          receita: valorCobrado,
          lucro,
          margem: margemPercentual,
          modeloUtilizado,
        });
      });
    });

    const totalLucro = Math.round((totalReceita - totalCusto) * 100) / 100;
    const margemGlobal = totalReceita > 0 ? Math.round((totalLucro / totalReceita) * 1000) / 10 : 0;

    const lucroNormal = Math.round((receitaNormal - custoNormal) * 100) / 100;
    const margemNormal = receitaNormal > 0 ? Math.round((lucroNormal / receitaNormal) * 1000) / 10 : 0;

    const lucroReap = Math.round((receitaReap - custoReap) * 100) / 100;
    const margemReap = receitaReap > 0 ? Math.round((lucroReap / receitaReap) * 1000) / 10 : 0;

    return {
      rows,
      totalItens: rows.length,
      totalReceita,
      totalCusto,
      totalLucro,
      margemGlobal,
      normal: {
        qtd: qtdNormal,
        custo: custoNormal,
        receita: receitaNormal,
        lucro: lucroNormal,
        margem: margemNormal,
      },
      reaproveitamento: {
        qtd: qtdReap,
        custo: custoReap,
        receita: receitaReap,
        lucro: lucroReap,
        margem: margemReap,
      },
    };
  }, [lote, catalogModels]);

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl bg-white dark:bg-neutral-900 border-0 shadow-2xl">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white p-6 rounded-t-2xl border-b border-neutral-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-600 text-white font-mono font-bold text-xs">
                  {lote.codigo}
                </Badge>
                <Badge variant="outline" className="text-neutral-300 border-neutral-600 text-xs">
                  Relatório Financeiro de Rentabilidade
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold text-white mt-1.5 tracking-tight flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                Demonstrativo de Lucro Líquido & Custos do Lote
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400 mt-0.5">
                Calculado com base nos custos de recarga cadastrados no Menu Custos (considerando modo Normal e Reaproveitamento).
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <Printer className="h-3.5 w-3.5 text-emerald-400" />
                Imprimir Relatório
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* CARDS DE RESUMO FINANCEIRO CONSOLIDADO */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border shadow-xs bg-neutral-50 dark:bg-neutral-800/40">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Receita Cobrada
                </span>
                <p className="text-2xl font-black text-foreground font-mono">
                  {formatCurrency(reportData.totalReceita)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Faturamento de {reportData.totalItens} extintor(es)
                </p>
              </CardContent>
            </Card>

            <Card className="border shadow-xs bg-neutral-50 dark:bg-neutral-800/40">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Custo Operacional
                </span>
                <p className="text-2xl font-black text-amber-700 dark:text-amber-400 font-mono">
                  {formatCurrency(reportData.totalCusto)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Insumos e cargas das recargas
                </p>
              </CardContent>
            </Card>

            <Card className="border shadow-xs bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                  Lucro Líquido
                </span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(reportData.totalLucro)}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                  Receita descontada dos custos
                </p>
              </CardContent>
            </Card>

            <Card className="border shadow-xs bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                  Margem de Lucro Global
                </span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {reportData.margemGlobal}%
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Retorno sobre o faturamento
                </p>
              </CardContent>
            </Card>
          </div>

          {/* COMPARATIVO: RECARGA NORMAL VS REAPROVEITAMENTO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bloco 1: Recarga Normal */}
            <div className="p-4 rounded-xl border bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-amber-600" />
                  <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                    Recarga Normal (Carga Completa)
                  </h4>
                </div>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold">
                  {reportData.normal.qtd} extintor(es)
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                Troca total de pó químico, ensaio completo e substituição integral de insumos.
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Custo Total:</span>
                  <strong className="font-mono text-amber-800 dark:text-amber-300">
                    {formatCurrency(reportData.normal.custo)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Receita:</span>
                  <strong className="font-mono text-foreground">
                    {formatCurrency(reportData.normal.receita)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Lucro ({reportData.normal.margem}%):</span>
                  <strong className="font-mono text-emerald-600">
                    {formatCurrency(reportData.normal.lucro)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Bloco 2: Reaproveitamento */}
            <div className="p-4 rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <h4 className="font-bold text-sm text-blue-900 dark:text-blue-200">
                    Reaproveitamento de Agente Extintor
                  </h4>
                </div>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-xs font-bold">
                  {reportData.reaproveitamento.qtd} extintor(es)
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                Pó reaproveitado após ensaio de teor/umidade. Custo apenas de pressurização, anel e selos.
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-200/60 dark:border-blue-900/40 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Custo Total:</span>
                  <strong className="font-mono text-blue-800 dark:text-blue-300">
                    {formatCurrency(reportData.reaproveitamento.custo)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Receita:</span>
                  <strong className="font-mono text-foreground">
                    {formatCurrency(reportData.reaproveitamento.receita)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Lucro ({reportData.reaproveitamento.margem}%):</span>
                  <strong className="font-mono text-emerald-600">
                    {formatCurrency(reportData.reaproveitamento.lucro)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* TABELA DETALHADA ITEM A ITEM */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Detalhamento por Extintor & Cliente ({reportData.totalItens} cilindros)
              </h4>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/70 text-muted-foreground font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Cliente</th>
                    <th className="py-2.5 px-3 text-left">OS</th>
                    <th className="py-2.5 px-3 text-left">Cilindro / Modelo</th>
                    <th className="py-2.5 px-3 text-left">Modalidade</th>
                    <th className="py-2.5 px-3 text-right">Custo da Recarga</th>
                    <th className="py-2.5 px-3 text-right">Valor Cobrado</th>
                    <th className="py-2.5 px-3 text-right">Lucro Líquido</th>
                    <th className="py-2.5 px-3 text-right">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.rows.map((row, idx) => {
                    const isReap =
                      row.modalidade.toLowerCase().includes("reaproveita") ||
                      row.modalidade === "Reaproveitamento";

                    return (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2 px-3 font-semibold text-foreground max-w-[150px] truncate">
                          {row.clientName}
                        </td>
                        <td className="py-2 px-3 font-mono text-muted-foreground">
                          #{row.ordemNumero}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-foreground">{row.identificacao}</span>
                          <span className="text-muted-foreground block text-[11px]">
                            {row.tipoCapacidade}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              isReap
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {row.modalidade}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-amber-700 dark:text-amber-400 font-semibold">
                          {formatCurrency(row.custo)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                          {formatCurrency(row.receita)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(row.lucro)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[11px] text-muted-foreground">
                          {row.margem}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/60 font-bold border-t text-foreground">
                  <tr>
                    <td colSpan={4} className="py-3 px-3">
                      Total Consolidado ({reportData.totalItens} extintores)
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700 dark:text-amber-400">
                      {formatCurrency(reportData.totalCusto)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {formatCurrency(reportData.totalReceita)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-600 text-sm">
                      {formatCurrency(reportData.totalLucro)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700">
                      {reportData.margemGlobal}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ÁREA EXCLUSIVA DE IMPRESSÃO TIMBRADA */}
          <div className="hidden print:block mt-8 pt-6 border-t border-neutral-400 space-y-6 text-xs text-black">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h2 className="text-base font-black uppercase">EXTINCONTROL PREVENÇÃO CONTRA INCÊNDIO</h2>
                <p className="text-[11px]">Relatório Gerencial de Rentabilidade & Lucro por Lote de Recarga</p>
                <p className="text-[10px] text-neutral-600">Lote: {lote.codigo} • {lote.nome}</p>
              </div>
              <div className="text-right">
                <p>Data de Emissão: {new Date().toLocaleDateString("pt-BR")}</p>
                <p className="font-bold">Lucro Líquido: {formatCurrency(reportData.totalLucro)}</p>
                <p>Margem Operacional: {reportData.margemGlobal}%</p>
              </div>
            </div>

            <div className="flex justify-between items-end pt-8">
              <div className="text-center w-56 border-t border-black pt-1">
                Responsável Técnico / Oficina
              </div>
              <div className="text-center w-56 border-t border-black pt-1">
                Gerência Financeira / Diretoria
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-neutral-50 dark:bg-neutral-800/40">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-neutral-900 text-white hover:bg-neutral-800 font-bold"
          >
            Fechar Relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
