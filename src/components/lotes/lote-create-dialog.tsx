"use client";

import React, { useState, useEffect } from "react";
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
import { Calendar, Truck, Clock, MapPin, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { LoteRecolhimento } from "@/types";
import { saveLoteRecolhimento } from "@/services/prevention.service";

interface LoteCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteToEdit?: LoteRecolhimento | null;
  initialCity?: string;
  onSuccess?: (lote: LoteRecolhimento) => void;
}

export function LoteCreateDialog({
  open,
  onOpenChange,
  loteToEdit,
  initialCity = "",
  onSuccess,
}: LoteCreateDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [regiao, setRegiao] = useState("");
  const [dataRecolhimento, setDataRecolhimento] = useState(todayStr);
  const [prazoDias, setPrazoDias] = useState<number>(14);
  const [previsaoDevolucao, setPrevisaoDevolucao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Recalcula previsão de devolução ao mudar data de recolhimento ou prazo em dias
  useEffect(() => {
    if (!dataRecolhimento) return;
    const base = new Date(dataRecolhimento + "T12:00:00");
    base.setDate(base.getDate() + Number(prazoDias || 7));
    const calculated = base.toISOString().split("T")[0];
    setPrevisaoDevolucao(calculated);
  }, [dataRecolhimento, prazoDias]);

  // Carrega valores quando abre para edição ou criação
  useEffect(() => {
    if (loteToEdit) {
      setNome(loteToEdit.nome);
      setCidade(loteToEdit.cidade || "");
      setRegiao(loteToEdit.regiao || "");
      setDataRecolhimento(loteToEdit.data_recolhimento);
      setPrazoDias(loteToEdit.prazo_dias || 14);
      setPrevisaoDevolucao(loteToEdit.previsao_devolucao);
      setObservacoes(loteToEdit.observacoes || "");
    } else {
      const city = initialCity || "";
      setCidade(city);
      setRegiao("");
      setDataRecolhimento(todayStr);
      setPrazoDias(14);
      const base = new Date(todayStr + "T12:00:00");
      base.setDate(base.getDate() + 14);
      const prev = base.toISOString().split("T")[0];
      setPrevisaoDevolucao(prev);
      setNome(city ? `${city} - Rota Devolução 14 dias (${formatPtDate(prev)})` : "");
      setObservacoes("");
    }
  }, [loteToEdit, open, initialCity, todayStr]);

  function formatPtDate(iso: string) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  function handleQuickPrazo(days: number) {
    setPrazoDias(days);
    const base = new Date(dataRecolhimento + "T12:00:00");
    base.setDate(base.getDate() + days);
    const prev = base.toISOString().split("T")[0];
    setPrevisaoDevolucao(prev);

    // Sugere nome dinâmico se o usuário não tiver customizado
    const city = cidade.trim() || "Região";
    setNome(`${city} - Rota ${days} dias (${formatPtDate(prev)})`);
  }

  async function handleSave() {
    if (!cidade.trim() && !nome.trim()) {
      toast({
        variant: "destructive",
        title: "Identificação obrigatória",
        description: "Informe ao menos a Cidade ou um Nome para o Lote.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await saveLoteRecolhimento({
        id: loteToEdit?.id,
        nome: nome.trim() || `${cidade.trim() || "Lote"} - Rota ${prazoDias} dias`,
        cidade: cidade.trim() || null,
        regiao: regiao.trim() || null,
        data_recolhimento: dataRecolhimento,
        prazo_dias: prazoDias,
        previsao_devolucao: previsaoDevolucao,
        observacoes: observacoes.trim() || null,
        status: loteToEdit?.status || "aguardando_descarga",
      });

      toast({
        title: loteToEdit ? "Lote atualizado!" : "Lote criado com sucesso!",
        description: `${saved.codigo} - ${saved.nome}`,
      });

      onOpenChange(false);
      onSuccess?.(saved);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar lote",
        description: err.message || "Não foi possível registrar o lote.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {loteToEdit ? "Editar Lote Geral" : "Novo Lote Geral de Recolhimento"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Agrupe extintores recolhidos por região/cidade e defina o prazo de retorno aos clientes.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cidade e Região */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Cidade / Polo
              </Label>
              <Input
                placeholder="Ex: Cruz Alta"
                value={cidade}
                onChange={(e) => {
                  setCidade(e.target.value);
                  if (!loteToEdit) {
                    setNome(
                      `${e.target.value || "Região"} - Rota ${prazoDias} dias (${formatPtDate(previsaoDevolucao)})`
                    );
                  }
                }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Região / Bairro / Rota</Label>
              <Input
                placeholder="Ex: Centro / Bonini"
                value={regiao}
                onChange={(e) => setRegiao(e.target.value)}
              />
            </div>
          </div>

          {/* Nome do Lote */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Nome de Identificação do Lote</Label>
              <button
                type="button"
                onClick={() => {
                  const city = cidade.trim() || "Região Central";
                  setNome(`${city} - Devolução ${prazoDias} dias (${formatPtDate(previsaoDevolucao)})`);
                }}
                className="text-[11px] text-red-600 hover:underline flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                Gerar automático
              </button>
            </div>
            <Input
              placeholder="Ex: Cruz Alta - Rota Centro (Devolução 14 dias)"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          {/* Atalho de Prazos Rápidos: 7 ou 14 dias */}
          <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1 text-foreground">
              <Clock className="h-3.5 w-3.5 text-red-600" />
              Prazo de Devolução (Selecione o Ciclo)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={prazoDias === 7 ? "default" : "outline"}
                className={`h-11 justify-start gap-2 ${
                  prazoDias === 7 ? "bg-red-600 hover:bg-red-700 text-white" : ""
                }`}
                onClick={() => handleQuickPrazo(7)}
              >
                <Badge variant={prazoDias === 7 ? "secondary" : "outline"} className="px-1.5 py-0.5">
                  7 Dias
                </Badge>
                <span className="text-xs font-medium">1 Semana</span>
              </Button>

              <Button
                type="button"
                variant={prazoDias === 14 ? "default" : "outline"}
                className={`h-11 justify-start gap-2 ${
                  prazoDias === 14 ? "bg-red-600 hover:bg-red-700 text-white" : ""
                }`}
                onClick={() => handleQuickPrazo(14)}
              >
                <Badge variant={prazoDias === 14 ? "secondary" : "outline"} className="px-1.5 py-0.5">
                  14 Dias
                </Badge>
                <span className="text-xs font-medium">2 Semanas</span>
              </Button>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Data de Recolhimento
              </Label>
              <Input
                type="date"
                value={dataRecolhimento}
                onChange={(e) => setDataRecolhimento(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-red-600" />
                Data Prevista de Retorno
              </Label>
              <Input
                type="date"
                value={previsaoDevolucao}
                onChange={(e) => setPrevisaoDevolucao(e.target.value)}
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Observações da Rota</Label>
            <Textarea
              placeholder="Ex: Recolhimento de manhã na Av. Principal. Separar no caminhão rota da volta."
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {loteToEdit ? "Salvar Alterações" : "Criar Lote Geral"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
