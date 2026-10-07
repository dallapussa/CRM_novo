"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitMerge,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Package,
  Users,
  Loader2,
  MapPin,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { LoteRecolhimento } from "@/types";
import {
  listLotesRecolhimento,
  mergeLotesRecolhimento,
} from "@/services/prevention.service";

interface LoteMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialTargetLoteId?: string;
  initialSourceLoteIds?: string[];
}

export function LoteMergeDialog({
  open,
  onOpenChange,
  onSuccess,
  initialTargetLoteId,
  initialSourceLoteIds,
}: LoteMergeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lotes = [], isLoading } = useQuery({
    queryKey: ["lotes_recolhimento"],
    queryFn: listLotesRecolhimento,
    enabled: open,
  });

  // Apenas lotes ativos (não concluídos) podem ser mesclados
  const activeLotes = useMemo(() => {
    return lotes.filter((l) => l.status !== "concluido");
  }, [lotes]);

  const [targetLoteId, setTargetLoteId] = useState<string>("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  // Inicializa o targetLoteId e selectedSourceIds quando abre
  React.useEffect(() => {
    if (open && activeLotes.length > 0) {
      let currentTargetId = "";
      if (initialTargetLoteId && activeLotes.some((l) => l.id === initialTargetLoteId)) {
        currentTargetId = initialTargetLoteId;
      } else {
        currentTargetId = activeLotes[0].id;
      }
      setTargetLoteId(currentTargetId);

      if (initialSourceLoteIds && initialSourceLoteIds.length > 0) {
        setSelectedSourceIds(initialSourceLoteIds.filter((id) => id !== currentTargetId));
      } else {
        setSelectedSourceIds([]);
      }
    }
  }, [open, activeLotes, initialTargetLoteId, initialSourceLoteIds]);

  const targetLote = useMemo(() => {
    return activeLotes.find((l) => l.id === targetLoteId) || null;
  }, [activeLotes, targetLoteId]);

  // Lotes disponíveis para serem mesclados (exclui o targetLote)
  const availableSourceLotes = useMemo(() => {
    return activeLotes.filter((l) => l.id !== targetLoteId);
  }, [activeLotes, targetLoteId]);

  function toggleSourceLote(loteId: string) {
    setSelectedSourceIds((prev) =>
      prev.includes(loteId) ? prev.filter((id) => id !== loteId) : [...prev, loteId]
    );
  }

  function handleSelectAllSources() {
    if (selectedSourceIds.length === availableSourceLotes.length) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(availableSourceLotes.map((l) => l.id));
    }
  }

  // Estatísticas da mesclagem
  const sourceStats = useMemo(() => {
    const selected = availableSourceLotes.filter((l) => selectedSourceIds.includes(l.id));
    const totalExtintores = selected.reduce((sum, l) => sum + (l.total_extintores || 0), 0);
    const totalClientes = selected.reduce((sum, l) => sum + (l.total_clientes || 0), 0);
    return {
      selected,
      totalExtintores,
      totalClientes,
    };
  }, [availableSourceLotes, selectedSourceIds]);

  const combinedExtintores = (targetLote?.total_extintores || 0) + sourceStats.totalExtintores;
  const combinedClientes = (targetLote?.total_clientes || 0) + sourceStats.totalClientes;

  async function handleConfirmMerge() {
    if (!targetLoteId) {
      toast({
        variant: "destructive",
        title: "Selecione o Lote Principal",
        description: "Escolha qual lote receberá os extintores consolidados.",
      });
      return;
    }

    if (selectedSourceIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Selecione ao menos um lote para mesclar",
        description: "Marque os lotes que serão unificados ao lote principal.",
      });
      return;
    }

    setIsMerging(true);
    try {
      const result = await mergeLotesRecolhimento(targetLoteId, selectedSourceIds);

      toast({
        variant: "success",
        title: "Lotes Mesclados com Sucesso!",
        description: `${selectedSourceIds.length} lote(s) foram unificados no lote [${targetLote?.codigo}]. Total de ${result.totalExtintores} extintor(es) consolidados.`,
      });

      queryClient.invalidateQueries({ queryKey: ["bench_lotes"] });
      queryClient.invalidateQueries({ queryKey: ["lotes_recolhimento"] });
      queryClient.invalidateQueries({ queryKey: ["bench_records"] });
      queryClient.invalidateQueries({ queryKey: ["ordens_recolhimento"] });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao mesclar lotes",
        description: err?.message || "Ocorreu uma falha durante a mesclagem.",
      });
    } finally {
      setIsMerging(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <GitMerge className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                Juntar / Mesclar Lotes da Oficina
              </DialogTitle>
              <p className="text-xs text-orange-100 mt-0.5">
                Consolide múltiplos lotes em um lote principal para otimizar bancada e rotas de entrega
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {activeLotes.length < 2 ? (
            <div className="p-8 text-center border-2 border-dashed rounded-xl space-y-2 text-muted-foreground text-xs">
              <Layers className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="font-semibold text-sm text-foreground">Poucos lotes para mesclar</p>
              <p>
                É necessário ter ao menos 2 lotes ativos criados no sistema para realizar uma mesclagem.
              </p>
            </div>
          ) : (
            <>
              {/* ETAPA 1: Lote Destino */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px] font-bold">
                    1
                  </span>
                  Lote de Destino (Lote Principal que receberá tudo)
                </Label>
                <Select value={targetLoteId} onValueChange={(v) => {
                  setTargetLoteId(v);
                  setSelectedSourceIds((prev) => prev.filter((id) => id !== v));
                }}>
                  <SelectTrigger className="h-10 text-xs bg-white dark:bg-neutral-800">
                    <SelectValue placeholder="Selecione o lote principal" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLotes.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        [{l.codigo}] {l.nome} ({l.total_extintores || 0} cilindros • {l.total_clientes || 0} clientes)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {targetLote && (
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground">Destino: {targetLote.nome}</span>
                      <p className="text-muted-foreground text-[11px] flex items-center gap-2 mt-0.5">
                        {targetLote.cidade && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-red-500" /> {targetLote.cidade}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-orange-500" /> Devolução: {new Date(targetLote.previsao_devolucao + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-[11px] bg-white dark:bg-neutral-900">
                      {targetLote.total_extintores || 0} cilindros atuais
                    </Badge>
                  </div>
                )}
              </div>

              {/* ETAPA 2: Lotes Origem */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px] font-bold">
                      2
                    </span>
                    Selecione os Lotes a serem mesclados nele:
                  </Label>
                  {availableSourceLotes.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllSources}
                      className="text-[11px] text-orange-600 hover:underline font-semibold"
                    >
                      {selectedSourceIds.length === availableSourceLotes.length
                        ? "Desmarcar todos"
                        : "Selecionar todos"}
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {availableSourceLotes.map((lote) => {
                    const isSelected = selectedSourceIds.includes(lote.id);
                    return (
                      <div
                        key={lote.id}
                        onClick={() => toggleSourceLote(lote.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "border-orange-500 bg-orange-50/60 dark:bg-orange-950/20"
                            : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-[10px] font-bold">
                                {lote.codigo}
                              </Badge>
                              <strong className="text-foreground">{lote.nome}</strong>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                              {lote.cidade && <span>{lote.cidade}</span>}
                              <span>• {lote.total_clientes || 0} cliente(s)</span>
                              <span>• Prev. Devolução: {new Date(lote.previsao_devolucao + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                            </p>
                          </div>
                        </div>

                        <Badge className="bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 text-xs font-bold">
                          {lote.total_extintores || 0} cil.
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RESUMO CONSOLIDADO */}
              {selectedSourceIds.length > 0 && targetLote && (
                <div className="p-4 rounded-xl border border-orange-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-neutral-900 dark:to-neutral-800 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-800 dark:text-orange-300">
                    <CheckCircle2 className="h-4 w-4 text-orange-600" />
                    Resumo após a Mesclagem:
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border">
                      <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
                        Total de Cilindros Unificados
                      </span>
                      <strong className="text-base text-orange-600 font-extrabold">
                        {combinedExtintores} unidades
                      </strong>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        ({targetLote.total_extintores || 0} originais + {sourceStats.totalExtintores} mesclados)
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border">
                      <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
                        Clientes Atendidos no Lote
                      </span>
                      <strong className="text-base text-foreground font-extrabold">
                        {combinedClientes} clientes
                      </strong>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        consolidando ordens e devolução única
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 pt-1">
                    As ordens de serviço dos {selectedSourceIds.length} lote(s) secundário(s) serão migradas para o lote principal. Os lotes secundários serão removidos do Kanban.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="p-4 bg-neutral-50 dark:bg-neutral-900 border-t flex flex-row items-center justify-between sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isMerging}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleConfirmMerge}
            disabled={isMerging || selectedSourceIds.length === 0 || !targetLoteId}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            {isMerging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitMerge className="h-4 w-4" />
            )}
            Confirmar Mesclagem dos Lotes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
