"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  X,
  Flame,
  ShieldCheck,
  Tag,
  Building2,
  Users,
  Paperclip,
  Plus,
  FileSpreadsheet,
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Edit2,
  Trash2,
  Check,
  Copy,
  Eye,
  EyeOff,
  Phone,
  Mail,
  MapPin,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { Customer, ExtintorInventario } from "@/types";
import {
  listClientExtintores,
  saveExtintor,
  batchAddExtintores,
  renewExtintoresBatch,
  deleteExtintor,
} from "@/services/prevention.service";
import { formatCurrency, formatDocument, formatPhone } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { OrderPickupModal } from "./order-pickup-modal";
import { ClientDragDropUploader } from "./client-drag-drop-uploader";
import { LabelPrinterDialog, LabelTarget } from "@/components/labels/label-printer-dialog";

interface ClientTechSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onCustomerUpdated?: () => void;
}

type TabKey =
  | "extintores"
  | "ppci"
  | "precos"
  | "dados"
  | "responsaveis"
  | "documentos";

export function ClientTechSheetModal({
  open,
  onOpenChange,
  customer,
  onCustomerUpdated,
}: ClientTechSheetModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("extintores");
  const [extintores, setExtintores] = useState<ExtintorInventario[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Modais Secundários
  const [isPickupOpen, setIsPickupOpen] = useState(false);
  const [isAddExtintorOpen, setIsAddExtintorOpen] = useState(false);
  const [labelTarget, setLabelTarget] = useState<LabelTarget | null>(null);
  const [isMemorialOpen, setIsMemorialOpen] = useState(false);

  // Estados de Criação / Edição de Extintor
  const [editingExtintor, setEditingExtintor] = useState<ExtintorInventario | null>(null);
  const [batchCount, setBatchCount] = useState<number>(1);
  const [tipoCapacidade, setTipoCapacidade] = useState<string>("PÓ ABC - 4kg");
  const [identificacao, setIdentificacao] = useState<string>("");
  const [localizacao, setLocalizacao] = useState<string>("Recepção");
  const [valorServico, setValorServico] = useState<number>(45.0);
  const [isSubmittingExtintor, setIsSubmittingExtintor] = useState(false);

  // Senha GOV toggle
  const [showGovPassword, setShowGovPassword] = useState(false);
  const [copiedGov, setCopiedGov] = useState(false);

  useEffect(() => {
    if (open && customer) {
      loadExtintores();
      setSelectedIds(new Set());
      setActiveTab("extintores");
    }
  }, [open, customer]);

  async function loadExtintores() {
    if (!customer) return;
    setIsLoading(true);
    try {
      const data = await listClientExtintores(customer.id);
      setExtintores(data);
    } catch (err: any) {
      console.error("Erro ao carregar extintores:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Cálculos de Totais
  const totalLote = useMemo(() => {
    return extintores.reduce((acc, curr) => acc + (Number(curr.valor_servico) || 0), 0);
  }, [extintores]);

  const selectedExtintores = useMemo(() => {
    return extintores.filter((e) => selectedIds.has(e.id));
  }, [extintores, selectedIds]);

  const totalSelecionado = useMemo(() => {
    return selectedExtintores.reduce((acc, curr) => acc + (Number(curr.valor_servico) || 0), 0);
  }, [selectedExtintores]);

  const allSelected = extintores.length > 0 && selectedIds.size === extintores.length;

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(extintores.map((e) => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Ações em Lote
  async function handleRenewBatch() {
    if (selectedIds.size === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum extintor selecionado",
        description: "Selecione ao menos um extintor para renovar.",
      });
      return;
    }

    try {
      await renewExtintoresBatch(Array.from(selectedIds));
      toast({
        variant: "success",
        title: "Extintores renovados!",
        description: `${selectedIds.size} extintor(es) tiveram a validade estendida por +1 ano.`,
      });
      loadExtintores();
      setSelectedIds(new Set());
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao renovar",
        description: err?.message || "Não foi possível renovar os extintores.",
      });
    }
  }

  async function handleDeleteExtintor(id: string) {
    if (!confirm("Tem certeza que deseja remover este extintor do inventário?")) return;
    try {
      await deleteExtintor(id);
      toast({ variant: "success", title: "Extintor removido com sucesso." });
      loadExtintores();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao remover", description: err?.message });
    }
  }

  async function handleSaveExtintorSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setIsSubmittingExtintor(true);
    try {
      if (editingExtintor) {
        await saveExtintor({
          id: editingExtintor.id,
          client_id: customer.id,
          identificacao,
          tipo_capacidade: tipoCapacidade,
          localizacao,
          valor_servico: valorServico,
          data_vencimento: editingExtintor.data_vencimento,
          status: editingExtintor.status,
        });
        toast({ variant: "success", title: "Extintor atualizado com sucesso." });
      } else {
        if (batchCount > 1) {
          await batchAddExtintores(
            customer.id,
            batchCount,
            tipoCapacidade,
            valorServico,
            localizacao
          );
          toast({
            variant: "success",
            title: `Lote de ${batchCount} extintores criado com sucesso!`,
          });
        } else {
          await saveExtintor({
            client_id: customer.id,
            identificacao: identificacao || "Extintor 01",
            tipo_capacidade: tipoCapacidade,
            localizacao,
            valor_servico: valorServico,
            status: "no_cliente",
          });
          toast({ variant: "success", title: "Extintor cadastrado com sucesso." });
        }
      }
      setIsAddExtintorOpen(false);
      setEditingExtintor(null);
      loadExtintores();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: err?.message,
      });
    } finally {
      setIsSubmittingExtintor(false);
    }
  }

  function openEditModal(ext: ExtintorInventario) {
    setEditingExtintor(ext);
    setIdentificacao(ext.identificacao);
    setTipoCapacidade(ext.tipo_capacidade);
    setLocalizacao(ext.localizacao || "");
    setValorServico(ext.valor_servico);
    setBatchCount(1);
    setIsAddExtintorOpen(true);
  }

  function openAddModal() {
    setEditingExtintor(null);
    setIdentificacao(`Extintor ${extintores.length + 1}`);
    setTipoCapacidade("PÓ ABC - 4kg");
    setLocalizacao("Recepção");
    setValorServico(45.0);
    setBatchCount(1);
    setIsAddExtintorOpen(true);
  }

  if (!customer) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden p-0 gap-0 rounded-2xl flex flex-col">
          {/* CABEÇALHO ESCURO (NAVY / SLATE) */}
          <div className="bg-slate-900 text-white p-6 shrink-0 relative">
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700">
                <Building2 className="h-6 w-6 text-red-500" />
              </div>
              <div className="min-w-0 pr-8">
                <div className="flex items-center gap-3 flex-wrap">
                  <DialogTitle className="text-xl font-bold text-white tracking-tight">
                    {customer.name}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="border-slate-700 text-slate-300 text-xs font-mono"
                  >
                    {formatDocument(customer.document)}
                  </Badge>
                  {customer.is_active ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">Inativo</Badge>
                  )}
                  {customer.ppci_isento && (
                    <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px]">
                      Isento de PPCI
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span>Ficha Técnica do Cliente & Gestão de Manutenções</span>
                  {customer.phone1 && (
                    <span>• {formatPhone(customer.phone1)}</span>
                  )}
                </p>
              </div>
            </div>

            {/* BARRA DE NAVEGAÇÃO DE TABS */}
            <div className="flex items-center gap-1 mt-6 border-b border-slate-800 overflow-x-auto no-scrollbar">
              {[
                {
                  key: "extintores",
                  label: `Extintores (${extintores.length})`,
                  icon: Flame,
                },
                { key: "ppci", label: "PPCI & Alvará", icon: ShieldCheck },
                { key: "precos", label: "Preços", icon: Tag },
                { key: "dados", label: "Dados Cadastrais", icon: Building2 },
                { key: "responsaveis", label: "Responsáveis", icon: Users },
                { key: "documentos", label: "Documentos", icon: Paperclip },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as TabKey)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                      isActive
                        ? "border-red-500 text-white bg-slate-800/80"
                        : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isActive ? "text-red-500" : "text-slate-400"}`}
                    />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CORPO DO MODAL (CONTEÚDO DAS TABS) */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-zinc-950">
            {/* ========================================================================= */}
            {/* TAB 1: EXTINTORES */}
            {/* ========================================================================= */}
            {activeTab === "extintores" && (
              <div className="space-y-4">
                {/* BARRA DE AÇÕES EM LOTE E TOTAIS */}
                <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  {/* Checkbox Selecionar Todos + Totais */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Selecionar Todos ({selectedIds.size}/{extintores.length})
                      </span>
                    </label>

                    {/* Display de Totais */}
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          Total Lote: {formatCurrency(totalLote)}
                        </span>
                      </div>
                      <div className="px-3 py-1 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl">
                        <span className="text-[11px] font-bold text-orange-700 dark:text-orange-300">
                          Total Selecionado: {formatCurrency(totalSelecionado)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={openAddModal}
                      className="bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 gap-1.5 text-xs font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Cadastrar Extintor
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsMemorialOpen(true)}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
                      Gerar Memorial
                    </Button>

                    <Button
                      size="sm"
                      disabled={selectedIds.size === 0}
                      onClick={() => setIsPickupOpen(true)}
                      className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5 text-xs font-bold shadow-sm"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      Recolher {selectedIds.size} Selecionado(s)
                    </Button>

                    <Button
                      size="sm"
                      disabled={selectedIds.size === 0}
                      onClick={handleRenewBatch}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Renovar {selectedIds.size} Selecionado(s)
                    </Button>
                  </div>
                </div>

                {/* LISTA DE EXTINTORES EM CARDS RICOS */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" /> Carregando inventário...
                  </div>
                ) : extintores.length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    <Flame className="h-8 w-8 mx-auto text-neutral-400 mb-2" />
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      Nenhum extintor cadastrado para este cliente
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique no botão &quot;+ Cadastrar Extintor&quot; acima para cadastrar em lote ou individualmente.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {extintores.map((ext) => {
                      const isSelected = selectedIds.has(ext.id);
                      const isExpired =
                        new Date(ext.data_vencimento + "T23:59:59") < new Date();

                      return (
                        <div
                          key={ext.id}
                          className={`p-4 bg-white dark:bg-neutral-900 border rounded-2xl transition-all shadow-sm flex flex-col justify-between gap-3 ${
                            isSelected
                              ? "border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/20"
                              : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(ext.id)}
                                className="mt-1 h-4 w-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                              />
                              <div>
                                <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                                  {ext.identificacao}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  📍 {ext.localizacao || "Localização não definida"}
                                </p>
                              </div>
                            </div>

                            {/* Badges de Status e Tipo */}
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800"
                              >
                                {ext.tipo_capacidade}
                              </Badge>

                              <Badge
                                className={`text-[10px] font-bold ${
                                  isExpired
                                    ? "bg-red-600 text-white hover:bg-red-600"
                                    : "bg-emerald-600 text-white hover:bg-emerald-600"
                                }`}
                              >
                                {isExpired ? "VENCIDO" : "EM DIA"}
                              </Badge>

                              {ext.status === "em_bancada" && (
                                <Badge className="bg-blue-600 text-white text-[10px]">
                                  Em Oficina
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Datas & Valor */}
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-100 dark:border-neutral-800">
                            <div className="space-y-0.5">
                              <p className="text-muted-foreground">
                                Recarga:{" "}
                                <span className="font-medium text-foreground">
                                  {ext.data_ultima_recarga
                                    ? new Date(ext.data_ultima_recarga + "T00:00:00").toLocaleDateString("pt-BR")
                                    : "—"}
                                </span>
                              </p>
                              <p className="text-muted-foreground">
                                Vencimento:{" "}
                                <span
                                  className={`font-bold ${
                                    isExpired ? "text-red-600" : "text-foreground"
                                  }`}
                                >
                                  {new Date(ext.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                                </span>
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-[11px] text-muted-foreground">Serviço</p>
                              <p className="text-sm font-extrabold text-emerald-600">
                                {formatCurrency(ext.valor_servico)}
                              </p>
                            </div>
                          </div>

                          {/* Botões Secundários Laterais */}
                          <div className="flex items-center justify-end gap-1 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(ext)}
                              className="h-7 px-2 text-xs text-neutral-600 hover:text-neutral-900 gap-1"
                            >
                              <Edit2 className="h-3.5 w-3.5" /> Editar
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setLabelTarget({
                                  kind: "custom",
                                  title: ext.tipo_capacidade,
                                  serialNumber: ext.identificacao,
                                  customerName: customer.name,
                                  type: ext.tipo_capacidade,
                                  capacityOrLength: ext.tipo_capacidade,
                                  location: ext.localizacao || undefined,
                                  expirationDate: ext.data_vencimento,
                                  rechargeDate: ext.data_ultima_recarga || undefined,
                                })
                              }
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1"
                            >
                              <Printer className="h-3.5 w-3.5" /> Selo / Etiqueta
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExtintor(ext.id)}
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Excluir
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: PPCI & ALVARÁ */}
            {/* ========================================================================= */}
            {activeTab === "ppci" && (
              <div className="space-y-4">
                <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                        Status do PPCI (Plano de Prevenção Contra Incêndio)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Informações técnicas perante o Corpo de Bombeiros Militar
                      </p>
                    </div>
                    {customer.ppci_isento ? (
                      <Badge className="bg-emerald-600 text-white font-bold px-3 py-1">
                        Isento de PPCI
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500 text-white font-bold px-3 py-1">
                        PPCI Obrigatório
                      </Badge>
                    )}
                  </div>

                  {customer.ppci_isento ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
                      ✅ Este cliente está classificado como <strong>Isento</strong> de elaboração de PPCI.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-1">
                        <span className="text-xs text-muted-foreground font-semibold">Metragem da Edificação</span>
                        <p className="text-lg font-extrabold text-neutral-900 dark:text-neutral-100">
                          {customer.metragem ? `${customer.metragem} m²` : "Não informada"}
                        </p>
                      </div>

                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-1">
                        <span className="text-xs text-muted-foreground font-semibold">Responsável pelo PPCI</span>
                        <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                          {customer.cpf_responsavel ? `CPF: ${customer.cpf_responsavel}` : "Não informado"}
                        </p>
                        {customer.contato_responsavel && (
                          <p className="text-xs text-muted-foreground">
                            Contato: {customer.contato_responsavel}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Senha GOV.BR */}
                  {customer.senha_gov && (
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-amber-600" />
                          Senha de Acesso ao Portal GOV.BR
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(customer.senha_gov || "");
                            setCopiedGov(true);
                            toast({ variant: "success", title: "Senha copiada!" });
                            setTimeout(() => setCopiedGov(false), 2000);
                          }}
                          className="h-7 text-xs gap-1 border-amber-300"
                        >
                          {copiedGov ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          Copiar Senha
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-sm bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-amber-200">
                        <span>{showGovPassword ? customer.senha_gov : "••••••••••••"}</span>
                        <button
                          type="button"
                          onClick={() => setShowGovPassword(!showGovPassword)}
                          className="ml-auto text-muted-foreground hover:text-foreground p-1"
                        >
                          {showGovPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: PREÇOS */}
            {/* ========================================================================= */}
            {activeTab === "precos" && (
              <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Tabela de Serviços & Recargas Acordadas
                </h3>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border rounded-xl overflow-hidden text-sm">
                  {[
                    { item: "Recarga Extintor Pó ABC 4kg", preco: 45.0 },
                    { item: "Recarga Extintor Pó ABC 6kg", preco: 60.0 },
                    { item: "Recarga Extintor CO2 6kg", preco: 85.0 },
                    { item: "Recarga Extintor Água Pressurizada 10L", preco: 40.0 },
                    { item: "Teste Hidrostático de Mangueira (Tipo 1 / 2)", preco: 55.0 },
                    { item: "Vistoria Técnica & Emissão de ART", preco: 350.0 },
                  ].map((srv, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{srv.item}</span>
                      <span className="font-extrabold text-emerald-600">{formatCurrency(srv.preco)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: DADOS CADASTRAIS */}
            {/* ========================================================================= */}
            {activeTab === "dados" && (
              <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-4 text-sm">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Informações de Cadastro
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-semibold">Razão Social / Nome</span>
                    <p className="font-bold text-neutral-900 dark:text-neutral-100">{customer.name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-semibold">CNPJ / CPF</span>
                    <p className="font-mono">{formatDocument(customer.document)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-semibold">Telefone Principal</span>
                    <p>{customer.phone1 ? formatPhone(customer.phone1) : "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-semibold">WhatsApp</span>
                    <p>{customer.whatsapp ? formatPhone(customer.whatsapp) : "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-semibold">E-mail</span>
                    <p>{customer.email || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-semibold">Endereço Completo</span>
                    <p>
                      {customer.address?.street
                        ? `${customer.address.street}, ${customer.address.number || "S/N"} - ${customer.address.neighborhood || ""} - ${customer.address.city || ""}/${customer.address.state || ""}`
                        : "Não informado"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: RESPONSÁVEIS */}
            {/* ========================================================================= */}
            {activeTab === "responsaveis" && (
              <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-4 text-sm">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Responsáveis & Contatos Operacionais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-1">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Responsável pelo PPCI</p>
                    <p className="font-bold text-base">{customer.cpf_responsavel || "Não cadastrado"}</p>
                    <p className="text-xs text-muted-foreground">{customer.contato_responsavel || "Sem telefone específico"}</p>
                  </div>
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-1">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Contato Comercial / Financeiro</p>
                    <p className="font-bold text-base">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.phone1 ? formatPhone(customer.phone1) : "Sem telefone"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 6: DOCUMENTOS */}
            {/* ========================================================================= */}
            {activeTab === "documentos" && (
              <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
                <ClientDragDropUploader clientId={customer.id} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE ORDEM DE RECOLHIMENTO */}
      {isPickupOpen && (
        <OrderPickupModal
          open={isPickupOpen}
          onOpenChange={setIsPickupOpen}
          customer={customer}
          selectedExtintores={selectedExtintores}
          onSuccess={() => {
            loadExtintores();
            setSelectedIds(new Set());
            onCustomerUpdated?.();
          }}
        />
      )}

      {/* DIÁLOGO DE IMPRESSÃO DE ETIQUETA / SELO */}
      {labelTarget && (
        <LabelPrinterDialog
          open={!!labelTarget}
          onOpenChange={(o) => !o && setLabelTarget(null)}
          target={labelTarget}
        />
      )}

      {/* MODAL PARA CADASTRO DE EXTINTOR (INDIVIDUAL OU EM LOTE) */}
      <Dialog open={isAddExtintorOpen} onOpenChange={setIsAddExtintorOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingExtintor ? "Editar Extintor" : "Cadastrar Extintor"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveExtintorSubmit} className="space-y-4 pt-2">
            {!editingExtintor && (
              <div className="space-y-1">
                <Label htmlFor="batch-count">Quantidade a Adicionar (em lote)</Label>
                <Input
                  id="batch-count"
                  type="number"
                  min={1}
                  max={50}
                  value={batchCount}
                  onChange={(e) => setBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Selecione ex: 5 para criar 5 extintores numerados automaticamente.
                </p>
              </div>
            )}

            {editingExtintor && (
              <div className="space-y-1">
                <Label htmlFor="ext-id">Identificação / Patrimônio</Label>
                <Input
                  id="ext-id"
                  value={identificacao}
                  onChange={(e) => setIdentificacao(e.target.value)}
                  placeholder="Ex: ABC 4kg 01"
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="ext-tipo">Tipo e Capacidade</Label>
              <select
                id="ext-tipo"
                value={tipoCapacidade}
                onChange={(e) => setTipoCapacidade(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-md border border-input bg-background"
              >
                <option value="PÓ ABC - 4kg">PÓ ABC - 4kg</option>
                <option value="PÓ ABC - 6kg">PÓ ABC - 6kg</option>
                <option value="PÓ BC - 4kg">PÓ BC - 4kg</option>
                <option value="CO2 - 6kg">CO2 - 6kg</option>
                <option value="ÁGUA - 10L">ÁGUA - 10L</option>
                <option value="ESPUMA - 10L">ESPUMA MECÂNICA - 10L</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ext-loc">Localização no Imóvel</Label>
              <Input
                id="ext-loc"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                placeholder="Ex: Recepção, Cozinha, Corredor 2º Andar"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ext-val">Valor do Serviço / Recarga (R$)</Label>
              <Input
                id="ext-val"
                type="number"
                step="0.01"
                value={valorServico}
                onChange={(e) => setValorServico(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddExtintorOpen(false)}
                disabled={isSubmittingExtintor}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingExtintor}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {isSubmittingExtintor ? "Salvando..." : "Salvar no Inventário"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO / VISUALIZADOR DE MEMORIAL DESCRITIVO */}
      <Dialog open={isMemorialOpen} onOpenChange={setIsMemorialOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              Memorial Descritivo de Extintores
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
              <p className="font-bold text-sm">{customer.name}</p>
              <p className="text-muted-foreground">Documento: {formatDocument(customer.document)}</p>
              <p className="text-muted-foreground">
                Total de Equipamentos: {extintores.length} unidades | Valor Total de Manutenção: {formatCurrency(totalLote)}
              </p>
            </div>

            <table className="w-full border-collapse border border-neutral-200 dark:border-neutral-800">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800 text-left">
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">Identificação</th>
                  <th className="p-2 border">Tipo/Carga</th>
                  <th className="p-2 border">Localização</th>
                  <th className="p-2 border">Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {extintores.map((e, idx) => (
                  <tr key={e.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="p-2 border">{idx + 1}</td>
                    <td className="p-2 border font-bold">{e.identificacao}</td>
                    <td className="p-2 border">{e.tipo_capacidade}</td>
                    <td className="p-2 border">{e.localizacao || "—"}</td>
                    <td className="p-2 border font-mono">
                      {new Date(e.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="gap-1.5"
              >
                <Printer className="h-4 w-4" /> Imprimir Memorial
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
