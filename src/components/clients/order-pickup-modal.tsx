"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type {
  Customer,
  ExtintorInventario,
  ModalidadeRecarga,
  OrdemRecolhimentoMotivo,
} from "@/types";
import { createOrdemRecolhimento } from "@/services/prevention.service";
import { formatCurrency } from "@/lib/utils";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modalidades individuais por extintor
  const [modalidades, setModalidades] = useState<Record<string, ModalidadeRecarga>>({});

  // Motivo da OS
  const [motivo, setMotivo] = useState<OrdemRecolhimentoMotivo>("Recarga Anual");

  // Reserva
  const [deixouReserva, setDeixouReserva] = useState<boolean>(false);
  const [detalhesReserva, setDetalhesReserva] = useState<string>("");

  // Dados operacionais
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];

  const [tecnicoResponsavel, setTecnicoResponsavel] = useState<string>("Técnico de Campo");
  const [dataRecolhimento, setDataRecolhimento] = useState<string>(today);
  const [previsaoDevolucao, setPrevisaoDevolucao] = useState<string>(nextWeek);
  const [observacoes, setObservacoes] = useState<string>("");

  function getModalidade(extId: string): ModalidadeRecarga {
    return modalidades[extId] || "Normal";
  }

  function setAllModalidade(mode: ModalidadeRecarga) {
    const next: Record<string, ModalidadeRecarga> = {};
    selectedExtintores.forEach((e) => {
      next[e.id] = mode;
    });
    setModalidades(next);
  }

  function toggleIndividualModalidade(extId: string, current: ModalidadeRecarga) {
    setModalidades((prev) => ({
      ...prev,
      [extId]: current === "Normal" ? "Reaproveitamento" : "Normal",
    }));
  }

  async function handleConfirm() {
    if (selectedExtintores.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum extintor selecionado",
        description: "Selecione pelo menos um extintor para recolher.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createOrdemRecolhimento({
        clientId: customer.id,
        motivo,
        deixouReserva,
        detalhesReserva,
        tecnicoResponsavel,
        dataRecolhimento,
        previsaoDevolucao,
        observacoes,
        itens: selectedExtintores.map((e) => ({
          extintorId: e.id,
          modalidade: getModalidade(e.id),
          valorRegistrado: e.valor_servico || 45.0,
        })),
      });

      toast({
        variant: "success",
        title: `OS de Recolhimento nº ${result.numero_ordem} Gerada!`,
        description: `${selectedExtintores.length} extintor(es) foram enviados para a oficina (em bancada).`,
      });

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
        {/* Cabeçalho Laranja Vibrante */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                Recolher {selectedExtintores.length} Extintor(es)
              </DialogTitle>
              <p className="text-xs text-orange-100 mt-0.5">
                Abertura de Ordem de Serviço para manutenção e recarga na oficina
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
                  variant="ghost"
                  onClick={() => setAllModalidade("Normal")}
                  className="h-6 text-xs px-2 hover:bg-white dark:hover:bg-neutral-700"
                >
                  Normal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setAllModalidade("Reaproveitamento")}
                  className="h-6 text-xs px-2 hover:bg-white dark:hover:bg-neutral-700 text-orange-600"
                >
                  Reaproveitamento
                </Button>
              </div>
            </div>

            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl divide-y divide-neutral-100 dark:divide-neutral-800 max-h-56 overflow-y-auto">
              {selectedExtintores.map((ext) => {
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
                        <span className="text-emerald-600 font-medium">
                          {formatCurrency(ext.valor_servico)}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant={mode === "Normal" ? "default" : "outline"}
                        onClick={() => toggleIndividualModalidade(ext.id, mode)}
                        className={`h-7 text-xs px-2.5 font-medium ${
                          mode === "Normal"
                            ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                            : ""
                        }`}
                      >
                        Normal
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={mode === "Reaproveitamento" ? "default" : "outline"}
                        onClick={() => toggleIndividualModalidade(ext.id, mode)}
                        className={`h-7 text-xs px-2.5 font-medium ${
                          mode === "Reaproveitamento"
                            ? "bg-orange-600 text-white hover:bg-orange-700"
                            : "text-orange-600 border-orange-200 hover:bg-orange-50"
                        }`}
                      >
                        Reaproveitamento
                      </Button>
                    </div>
                  </div>
                );
              })}
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
                      ? "border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200 ring-2 ring-orange-500/20 font-bold"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-700"
                  }`}
                >
                  <p className="text-xs">{m}</p>
                </button>
              ))}
            </div>
          </div>

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

          {/* SEÇÃO 4: Dados Operacionais */}
          <div className="space-y-3">
            <Label className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-600" />
              4. Dados Operacionais
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
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando na Oficina...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirmar Recolhimento ({selectedExtintores.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
