"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PackageCheck,
  Wrench,
  Truck,
  MapPin,
  Calendar,
  Users,
  Flame,
  GitMerge,
  ArrowRight,
  ShieldCheck,
  Building,
  Phone,
  FileText,
} from "lucide-react";
import type { LoteRecolhimento } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface LoteInspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lote: LoteRecolhimento | null;
  onAdvanceStage?: (loteId: string, nextStage: any) => void;
}

export function LoteInspectDialog({
  open,
  onOpenChange,
  lote,
  onAdvanceStage,
}: LoteInspectDialogProps) {
  if (!lote) return null;

  const mergeTag = lote.observacoes?.match(/\[Mesclado[^\]]+\]/);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs font-bold border-white/40 text-white bg-white/10">
                  {lote.codigo}
                </Badge>
                <Badge className="bg-white/20 text-white border-0 text-[11px]">
                  {lote.status === "aguardando_descarga" || lote.status === "recolhendo"
                    ? "1. Chegada / Descarga"
                    : lote.status === "em_oficina"
                    ? "2. Na Oficina (Bancada)"
                    : "3. Saída (Revisado)"}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold text-white mt-1.5 tracking-tight">
                {lote.nome}
              </DialogTitle>
              {lote.cidade && (
                <p className="text-xs text-orange-100 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5" /> {lote.cidade} {lote.regiao ? `• ${lote.regiao}` : ""}
                </p>
              )}
            </div>

            <div className="text-right bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
              <span className="text-[10px] text-orange-100 uppercase font-semibold block">Prev. Devolução</span>
              <strong className="text-base text-white font-bold">
                {new Date(lote.previsao_devolucao + "T12:00:00").toLocaleDateString("pt-BR")}
              </strong>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Indicador de Mescla se houver */}
          {mergeTag && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-purple-600 shrink-0" />
              <span>
                <strong>Lote Unificado:</strong> {mergeTag[0].replace(/[\[\]]/g, "")}
              </span>
            </div>
          )}

          {/* Resumo de Cilindros e Modelos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border bg-neutral-50 dark:bg-neutral-800/50">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Total de Cilindros</span>
              <strong className="text-xl font-black text-orange-600">{lote.total_extintores || 0} un</strong>
            </div>

            <div className="p-3 rounded-xl border bg-neutral-50 dark:bg-neutral-800/50">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Total de Clientes</span>
              <strong className="text-xl font-black text-foreground">{lote.total_clientes || 0}</strong>
            </div>

            <div className="p-3 rounded-xl border bg-neutral-50 dark:bg-neutral-800/50 col-span-2 sm:col-span-1">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Valor do Lote</span>
              <strong className="text-xl font-black text-emerald-600">
                {formatCurrency(lote.valor_total || 0)}
              </strong>
            </div>
          </div>

          {/* Modelos Agrupados no Lote */}
          {lote.modelos_agrupados && lote.modelos_agrupados.length > 0 && (
            <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-xl border space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-orange-600" />
                Composição de Tipos e Capacidades:
              </span>
              <div className="flex flex-wrap gap-2">
                {lote.modelos_agrupados.map((m, idx) => (
                  <Badge key={idx} variant="secondary" className="px-2.5 py-1 text-xs font-semibold gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px] font-bold">
                      {m.count}
                    </span>
                    {m.modelo}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Clientes e Extintores Recolhidos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Clientes e Extintores deste Lote ({lote.ordens?.length || 0} OS)
              </h4>
            </div>

            {(!lote.ordens || lote.ordens.length === 0) ? (
              <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground text-xs">
                Nenhum cliente ou ordem de recolhimento vinculada a este lote ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {lote.ordens.map((ordem) => {
                  const client = ordem.client;
                  const itens = ordem.itens || [];
                  return (
                    <div
                      key={ordem.id}
                      className="p-4 rounded-xl border bg-white dark:bg-neutral-900 space-y-3 shadow-xs hover:border-orange-300 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-sm text-foreground">
                              {client?.name || "Cliente"}
                            </h5>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              OS nº {ordem.numero_ordem}
                            </Badge>
                          </div>
                          {(client?.telefone || client?.document) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              {client.document && <span>{client.document}</span>}
                              {client.telefone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> {client.telefone}
                                </span>
                              )}
                            </p>
                          )}
                        </div>

                        <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs font-bold self-start sm:self-center">
                          {itens.length} extintor(es)
                        </Badge>
                      </div>

                      {/* Lista de cilindros da OS */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {itens.map((it, idx) => (
                          <div
                            key={it.id || idx}
                            className="p-2 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg border flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                                {it.extintor?.identificacao || `Cilindro #${idx + 1}`}
                              </span>
                              <span className="text-muted-foreground truncate">
                                {it.extintor?.tipo_capacidade || "Pó ABC 4kg"}
                              </span>
                            </div>

                            <Badge variant="outline" className="text-[10px] shrink-0 font-medium">
                              {it.modalidade_recarga || "Reaproveitamento"}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      {ordem.deixou_reserva && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200">
                          Reserva no local: {ordem.detalhes_reserva || "Sim"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-neutral-50 dark:bg-neutral-900 border-t flex flex-row items-center justify-between">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
            Fechar
          </Button>

          {onAdvanceStage && (lote.status === "aguardando_descarga" || lote.status === "recolhendo") && (
            <Button
              type="button"
              onClick={() => {
                onAdvanceStage(lote.id, "em_oficina");
                onOpenChange(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              <PackageCheck className="h-4 w-4" />
              Descarregar Lote ➔ Na Oficina
            </Button>
          )}

          {onAdvanceStage && lote.status === "em_oficina" && (
            <Button
              type="button"
              onClick={() => {
                onAdvanceStage(lote.id, "saida");
                onOpenChange(false);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              <Wrench className="h-4 w-4" />
              Concluir Oficina ➔ Enviar p/ Saída
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
