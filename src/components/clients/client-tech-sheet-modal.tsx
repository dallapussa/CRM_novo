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
  DollarSign,
  Save,
} from "lucide-react";
import type { Customer, ExtintorInventario } from "@/types";
import {
  listClientExtintores,
  saveExtintor,
  batchAddExtintores,
  renewExtintoresBatch,
  deleteExtintor,
} from "@/services/prevention.service";
import { formatCurrency, formatDocument, formatPhone, formatMonthYear, toMonthInput, monthInputToDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderPickupModal } from "./order-pickup-modal";
import { ClientDragDropUploader } from "./client-drag-drop-uploader";
import { LabelPrinterDialog, LabelTarget } from "@/components/labels/label-printer-dialog";
import { saveClientPpci } from "@/services/clients.service";
import { PPCI_ENQUADRAMENTO_OPTIONS } from "@/types";

interface ClientTechSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onCustomerUpdated?: () => void;
  initialTab?: TabKey;
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
  initialTab = "extintores",
}: ClientTechSheetModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);
  const [extintores, setExtintores] = useState<ExtintorInventario[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Estados de Edição do PPCI
  const [ppciIsento, setPpciIsento] = useState<boolean>(customer?.ppci_isento ?? false);
  const [ppciEnquadramento, setPpciEnquadramento] = useState<string>(
    customer?.ppci_enquadramento || (customer?.ppci_isento ? "Isento de PPCI" : "PSPCI (Plano Simplificado)")
  );
  const [ppciExpiresAt, setPpciExpiresAt] = useState<string>(customer?.ppci_expires_at || "");
  const [ppciNumber, setPpciNumber] = useState<string>(customer?.ppci_number || "");
  const [ppciMetragem, setPpciMetragem] = useState<string>(customer?.metragem ? String(customer.metragem) : "");
  const [ppciCpf, setPpciCpf] = useState<string>(customer?.cpf_responsavel || "");
  const [ppciContato, setPpciContato] = useState<string>(customer?.contato_responsavel || "");
  const [ppciSenhaGov, setPpciSenhaGov] = useState<string>(customer?.senha_gov || "");
  const [isSavingPpci, setIsSavingPpci] = useState(false);

  useEffect(() => {
    if (customer) {
      setPpciIsento(customer.ppci_isento ?? false);
      setPpciEnquadramento(
        customer.ppci_enquadramento || (customer.ppci_isento ? "Isento de PPCI" : "PSPCI (Plano Simplificado)")
      );
      setPpciExpiresAt(customer.ppci_expires_at || "");
      setPpciNumber(customer.ppci_number || "");
      setPpciMetragem(customer.metragem ? String(customer.metragem) : "");
      setPpciCpf(customer.cpf_responsavel || "");
      setPpciContato(customer.contato_responsavel || "");
      setPpciSenhaGov(customer.senha_gov || "");
    }
  }, [customer]);

  async function handleSavePpci() {
    if (!customer) return;
    setIsSavingPpci(true);
    try {
      await saveClientPpci(customer.id, {
        ppci_isento: ppciIsento,
        ppci_enquadramento: ppciEnquadramento,
        ppci_expires_at: ppciExpiresAt || null,
        ppci_number: ppciNumber.trim() || null,
        metragem: ppciMetragem ? Number(ppciMetragem) : null,
        cpf_responsavel: ppciCpf.trim() || null,
        contato_responsavel: ppciContato.trim() || null,
        senha_gov: ppciSenhaGov.trim() || null,
      });

      toast({
        variant: "success",
        title: "Dados do PPCI atualizados!",
        description: `Enquadramento: ${ppciEnquadramento}. Vencimento: ${ppciExpiresAt ? new Date(ppciExpiresAt + "T12:00:00").toLocaleDateString("pt-BR") : "Não definido"}.`,
      });

      queryClient.invalidateQueries({ queryKey: ["expiring-items"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onCustomerUpdated?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar PPCI",
        description: err.message || "Tente novamente.",
      });
    } finally {
      setIsSavingPpci(false);
    }
  }

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
  const [dataVencimento, setDataVencimento] = useState<string>("");
  const [dataUltimaRecarga, setDataUltimaRecarga] = useState<string>("");
  const [isSubmittingExtintor, setIsSubmittingExtintor] = useState(false);

  // Estados da Aba de Preços Bidirecional
  const [priceInputs, setPriceInputs] = useState<Record<string, number>>({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);
  const [savedPriceIds, setSavedPriceIds] = useState<Set<string>>(new Set());
  const [typePriceInputs, setTypePriceInputs] = useState<Record<string, number>>({});

  // Senha GOV toggle
  const [showGovPassword, setShowGovPassword] = useState(false);
  const [copiedGov, setCopiedGov] = useState(false);

  useEffect(() => {
    // Sincroniza priceInputs com os valores atuais dos extintores
    const map: Record<string, number> = {};
    const typeMap: Record<string, number> = {};
    for (const ext of extintores) {
      map[ext.id] = Number(ext.valor_servico) || 0;
      if (typeMap[ext.tipo_capacidade] === undefined) {
        typeMap[ext.tipo_capacidade] = Number(ext.valor_servico) || 0;
      }
    }
    setPriceInputs(map);
    setTypePriceInputs((prev) => ({ ...typeMap, ...prev }));
  }, [extintores]);

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
          data_ultima_recarga: dataUltimaRecarga || undefined,
          data_vencimento: monthInputToDate(dataVencimento) || editingExtintor.data_vencimento,
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
            localizacao,
            monthInputToDate(dataVencimento) || undefined,
            dataUltimaRecarga || undefined
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
            data_ultima_recarga: dataUltimaRecarga || undefined,
            data_vencimento: monthInputToDate(dataVencimento) || undefined,
            status: "no_cliente",
          });
          toast({ variant: "success", title: "Extintor cadastrado com sucesso." });
        }
      }
      setIsAddExtintorOpen(false);
      setEditingExtintor(null);
      loadExtintores();
      onCustomerUpdated?.();
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
    setDataUltimaRecarga(ext.data_ultima_recarga ? ext.data_ultima_recarga.split("T")[0] : "");
    setDataVencimento(toMonthInput(ext.data_vencimento));
    setBatchCount(1);
    setIsAddExtintorOpen(true);
  }

  function openAddModal() {
    const today = new Date().toISOString().split("T")[0];
    const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];
    setEditingExtintor(null);
    setIdentificacao(`Extintor ${extintores.length + 1}`);
    setTipoCapacidade("PÓ ABC - 4kg");
    setLocalizacao("Recepção");
    setValorServico(45.0);
    setDataUltimaRecarga(today);
    setDataVencimento(toMonthInput(nextYear));
    setBatchCount(1);
    setIsAddExtintorOpen(true);
  }

  // Preços Agrupados por Modelo
  const groupedByType = useMemo(() => {
    const map = new Map<string, { count: number; total: number; samplePrice: number }>();
    for (const ext of extintores) {
      const key = ext.tipo_capacidade || "Padrão";
      const cur = map.get(key) || { count: 0, total: 0, samplePrice: Number(ext.valor_servico) || 0 };
      cur.count += 1;
      cur.total += Number(ext.valor_servico) || 0;
      map.set(key, cur);
    }
    return Array.from(map.entries()).map(([tipo, data]) => ({
      tipo,
      count: data.count,
      samplePrice: data.count > 0 ? data.total / data.count : 0,
    }));
  }, [extintores]);

  // Salvar Preço Individual
  async function handleSaveSinglePrice(extintorId: string) {
    if (!customer) return;
    const novoPreco = Number(priceInputs[extintorId]);
    if (isNaN(novoPreco) || novoPreco < 0) {
      toast({ variant: "destructive", title: "Valor inválido", description: "Informe um valor positivo." });
      return;
    }
    setSavingPriceId(extintorId);
    try {
      await saveExtintor({
        id: extintorId,
        client_id: customer.id,
        valor_servico: novoPreco,
      });
      setExtintores((prev) =>
        prev.map((e) => (e.id === extintorId ? { ...e, valor_servico: novoPreco } : e))
      );
      setSavedPriceIds((prev) => new Set(prev).add(extintorId));
      setTimeout(() => {
        setSavedPriceIds((prev) => {
          const next = new Set(prev);
          next.delete(extintorId);
          return next;
        });
      }, 2500);
      toast({
        variant: "success",
        title: "Preço atualizado!",
        description: `Novo valor: ${formatCurrency(novoPreco)}`,
      });
      onCustomerUpdated?.();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao salvar preço", description: err?.message });
    } finally {
      setSavingPriceId(null);
    }
  }

  // Aplicar Preço a Todos de um Modelo
  async function handleApplyPriceToType(tipo: string) {
    if (!customer) return;
    const preco = Number(typePriceInputs[tipo]);
    if (isNaN(preco) || preco < 0) {
      toast({ variant: "destructive", title: "Valor inválido", description: "Informe um valor positivo." });
      return;
    }
    const targetExts = extintores.filter((e) => e.tipo_capacidade === tipo);
    if (targetExts.length === 0) return;

    try {
      for (const ext of targetExts) {
        await saveExtintor({
          id: ext.id,
          client_id: customer.id,
          valor_servico: preco,
        });
      }
      setExtintores((prev) =>
        prev.map((e) => (e.tipo_capacidade === tipo ? { ...e, valor_servico: preco } : e))
      );
      setPriceInputs((prev) => {
        const next = { ...prev };
        for (const ext of targetExts) {
          next[ext.id] = preco;
        }
        return next;
      });
      toast({
        variant: "success",
        title: "Preços do modelo atualizados!",
        description: `Aplicado ${formatCurrency(preco)} para ${targetExts.length} extintor(es) do tipo ${tipo}.`,
      });
      onCustomerUpdated?.();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao aplicar preços", description: err?.message });
    }
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
                      const [dueY, dueM] = (ext.data_vencimento || "").split("-").map(Number);
                      const now = new Date();
                      const curY = now.getFullYear();
                      const curM = now.getMonth() + 1; // 1-12
                      const isExpired = dueY && dueM ? (dueY < curY || (dueY === curY && dueM < curM)) : false;
                      const isCurrentMonth = dueY && dueM ? (dueY === curY && dueM === curM) : false;

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
                                disabled={ext.status === "em_bancada"}
                                onChange={() => handleToggleSelect(ext.id)}
                                title={
                                  ext.status === "em_bancada"
                                    ? "Este extintor já foi recolhido e está na bancada da oficina"
                                    : "Selecionar para recolhimento"
                                }
                                className={`mt-1 h-4 w-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500 ${
                                  ext.status === "em_bancada" ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                                }`}
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
                                    : isCurrentMonth
                                    ? "bg-amber-500 text-white hover:bg-amber-500"
                                    : "bg-emerald-600 text-white hover:bg-emerald-600"
                                }`}
                              >
                                {isExpired ? "VENCIDO" : isCurrentMonth ? "VENCE ESTE MÊS" : "EM DIA"}
                              </Badge>

                              {ext.status === "em_bancada" && (
                                <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                                  Na Bancada (Oficina)
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
                                    isExpired
                                      ? "text-red-600"
                                      : isCurrentMonth
                                      ? "text-amber-600"
                                      : "text-foreground"
                                  }`}
                                >
                                  {formatMonthYear(ext.data_vencimento)}
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
            {/* TAB 2: PPCI & ALVARÁ (EDITÁVEL) */}
            {/* ========================================================================= */}
            {activeTab === "ppci" && (
              <div className="space-y-4">
                <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-5">
                  {/* Cabeçalho do PPCI com Status Dinâmico */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                    <div>
                      <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-amber-600" />
                        Gestão do PPCI & Alvará do Corpo de Bombeiros
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Edite o tipo de enquadramento, data de validade e credenciais técnicas deste cliente.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {ppciIsento ? (
                        <Badge className="bg-emerald-600 text-white font-bold px-3 py-1">
                          Isento de PPCI
                        </Badge>
                      ) : (
                        <>
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-semibold px-2.5 py-1 text-xs">
                            {ppciEnquadramento || "PPCI Obrigatório"}
                          </Badge>
                          {ppciExpiresAt ? (
                            (() => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const expDate = new Date(ppciExpiresAt + "T00:00:00");
                              const diff = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                              if (diff < 0) {
                                return (
                                  <Badge className="bg-red-600 text-white font-bold px-2.5 py-1 text-xs">
                                    Vencido há {Math.abs(diff)} dias
                                  </Badge>
                                );
                              } else if (diff === 0) {
                                return (
                                  <Badge className="bg-red-600 text-white font-bold px-2.5 py-1 text-xs animate-pulse">
                                    Vence HOJE!
                                  </Badge>
                                );
                              } else if (diff <= 30) {
                                return (
                                  <Badge className="bg-amber-500 text-white font-bold px-2.5 py-1 text-xs">
                                    Vence em {diff} dias
                                  </Badge>
                                );
                              }
                              return (
                                <Badge className="bg-emerald-600 text-white font-bold px-2.5 py-1 text-xs">
                                  Em dia ({diff} dias)
                                </Badge>
                              );
                            })()
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Sem vencimento definido
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Toggle de Isenção */}
                  <div className="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border">
                    <div className="space-y-0.5">
                      <Label htmlFor="ppci_isento_toggle" className="text-xs font-bold text-foreground cursor-pointer">
                        Cliente classificado como ISENTO de elaboração de PPCI?
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Marque se o imóvel possui dispensa perante o Corpo de Bombeiros.
                      </p>
                    </div>
                    <Switch
                      id="ppci_isento_toggle"
                      checked={ppciIsento}
                      onCheckedChange={(checked) => {
                        setPpciIsento(checked);
                        if (checked) {
                          setPpciEnquadramento("Isento de PPCI");
                        } else if (ppciEnquadramento === "Isento de PPCI") {
                          setPpciEnquadramento("PSPCI (Plano Simplificado)");
                        }
                      }}
                    />
                  </div>

                  {/* Grid de Campos Técnicos Editáveis */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Tipo de Enquadramento */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        Tipo de Enquadramento do PPCI
                      </Label>
                      <Select
                        value={ppciEnquadramento}
                        onValueChange={(val) => setPpciEnquadramento(val)}
                        disabled={ppciIsento}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Selecione o enquadramento" />
                        </SelectTrigger>
                        <SelectContent>
                          {PPCI_ENQUADRAMENTO_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">
                        Classificação técnica do Corpo de Bombeiros
                      </p>
                    </div>

                    {/* Data de Vencimento do Alvará / PPCI */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>Data de Vencimento do Alvará</span>
                        {ppciExpiresAt && (
                          <span className="text-[11px] font-mono text-red-600">
                            {new Date(ppciExpiresAt + "T12:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </Label>
                      <Input
                        type="date"
                        value={ppciExpiresAt}
                        onChange={(e) => setPpciExpiresAt(e.target.value)}
                        disabled={ppciIsento}
                        className="h-9 text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Alimentará os alertas do Dashboard de Vencimentos
                      </p>
                    </div>

                    {/* Número do Alvará / Protocolo */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        Nº Alvará / Protocolo CBMRS
                      </Label>
                      <Input
                        value={ppciNumber}
                        onChange={(e) => setPpciNumber(e.target.value)}
                        placeholder="Ex: 12345/2026"
                        disabled={ppciIsento}
                        className="h-9 text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Identificador oficial do processo
                      </p>
                    </div>
                  </div>

                  {/* Campos Complementares se Não For Isento */}
                  {!ppciIsento && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Metragem da Edificação</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            value={ppciMetragem}
                            onChange={(e) => setPpciMetragem(e.target.value)}
                            placeholder="Ex: 350.50"
                            className="h-9 text-xs pr-10"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground">
                            m²
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">CPF do Responsável</Label>
                        <Input
                          value={ppciCpf}
                          onChange={(e) => setPpciCpf(e.target.value)}
                          placeholder="000.000.000-00"
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Contato do Responsável</Label>
                        <Input
                          value={ppciContato}
                          onChange={(e) => setPpciContato(e.target.value)}
                          placeholder="(00) 00000-0000"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Senha GOV.BR */}
                  <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-amber-600" />
                        Senha de Acesso ao Portal GOV.BR (Bombeiros / SISBOM)
                      </Label>
                      {ppciSenhaGov && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(ppciSenhaGov);
                            setCopiedGov(true);
                            toast({ variant: "success", title: "Senha copiada!" });
                            setTimeout(() => setCopiedGov(false), 2000);
                          }}
                          className="h-7 text-xs gap-1 border-amber-300"
                        >
                          {copiedGov ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          Copiar Senha
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type={showGovPassword ? "text" : "password"}
                        value={ppciSenhaGov}
                        onChange={(e) => setPpciSenhaGov(e.target.value)}
                        placeholder="Insira a senha do portal GOV para tramitação..."
                        className="h-9 text-xs font-mono bg-white dark:bg-neutral-900"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowGovPassword(!showGovPassword)}
                        className="h-9 px-3 shrink-0"
                      >
                        {showGovPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Botão de Salvar Alterações do PPCI */}
                  <div className="pt-2 border-t flex justify-end">
                    <Button
                      type="button"
                      onClick={handleSavePpci}
                      disabled={isSavingPpci}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 shadow-sm"
                    >
                      {isSavingPpci ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Salvar Dados do PPCI
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: PREÇOS */}
            {/* ========================================================================= */}
            {/* TAB 3: PREÇOS (GESTÃO BIDIRECIONAL) */}
            {/* ========================================================================= */}
            {activeTab === "precos" && (
              <div className="space-y-4">
                {/* Cabeçalho da Aba Preços */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                      Tabela de Preços & Valores Acordados
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Edite os valores abaixo para atualizar o inventário do cliente em tempo real.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                      Total Lote: {formatCurrency(totalLote)}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      onClick={openAddModal}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> + Novo Extintor
                    </Button>
                  </div>
                </div>

                {/* Resumo por Modelo / Tipo de Extintor */}
                {groupedByType.length > 0 && (
                  <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Preço Padrão por Modelo (Aplicação em Lote)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {groupedByType.map((grp) => {
                        const currentInputPrice = typePriceInputs[grp.tipo] ?? grp.samplePrice;
                        return (
                          <div
                            key={grp.tipo}
                            className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 rounded-xl space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                                {grp.tipo}
                              </span>
                              <Badge variant="secondary" className="text-[10px]">
                                {grp.count} un.
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                  R$
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={currentInputPrice}
                                  onChange={(e) =>
                                    setTypePriceInputs((prev) => ({
                                      ...prev,
                                      [grp.tipo]: parseFloat(e.target.value) || 0,
                                    }))
                                  }
                                  className="h-8 pl-8 text-xs font-semibold"
                                />
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleApplyPriceToType(grp.tipo)}
                                className="h-8 px-2.5 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300"
                                title="Aplicar este valor a todos os extintores deste modelo"
                              >
                                Aplicar a todos
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tabela Detalhada Item-a-Item */}
                <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Valores Individuais por Extintor
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {extintores.length} extintor(es) cadastrado(s)
                    </span>
                  </div>

                  {extintores.length === 0 ? (
                    <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground">
                      <Flame className="h-8 w-8 mx-auto text-neutral-400 mb-2" />
                      <p className="text-sm font-semibold">Nenhum extintor cadastrado</p>
                      <p className="text-xs mt-1">Cadastre extintores para definir valores personalizados.</p>
                    </div>
                  ) : (
                    <div className="border rounded-xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                      <div className="bg-neutral-50 dark:bg-neutral-800/60 grid grid-cols-12 px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase">
                        <div className="col-span-3">Identificação</div>
                        <div className="col-span-3">Modelo / Tipo</div>
                        <div className="col-span-3">Localização</div>
                        <div className="col-span-3 text-right">Valor do Serviço</div>
                      </div>

                      {extintores.map((ext) => {
                        const isSaving = savingPriceId === ext.id;
                        const isSaved = savedPriceIds.has(ext.id);
                        const currentVal = priceInputs[ext.id] !== undefined ? priceInputs[ext.id] : ext.valor_servico;

                        return (
                          <div
                            key={ext.id}
                            className="grid grid-cols-12 px-3 py-2.5 items-center text-xs hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors"
                          >
                            <div className="col-span-3 font-bold text-neutral-900 dark:text-neutral-100">
                              {ext.identificacao}
                            </div>
                            <div className="col-span-3 text-muted-foreground">
                              {ext.tipo_capacidade}
                            </div>
                            <div className="col-span-3 text-muted-foreground truncate">
                              {ext.localizacao || "—"}
                            </div>
                            <div className="col-span-3 flex items-center justify-end gap-2">
                              <div className="relative w-28">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                  R$
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={currentVal}
                                  onChange={(e) =>
                                    setPriceInputs((prev) => ({
                                      ...prev,
                                      [ext.id]: parseFloat(e.target.value) || 0,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleSaveSinglePrice(ext.id);
                                    }
                                  }}
                                  className="h-8 pl-8 pr-2 text-xs font-bold text-right"
                                />
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={isSaving}
                                onClick={() => handleSaveSinglePrice(ext.id)}
                                className={`h-8 px-2 gap-1 text-xs transition-colors ${
                                  isSaved
                                    ? "text-emerald-600 bg-emerald-50"
                                    : "text-neutral-700 hover:text-emerald-700 hover:bg-neutral-100"
                                }`}
                                title="Salvar alteração de preço"
                              >
                                {isSaving ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : isSaved ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    <span className="hidden sm:inline text-[11px] font-bold text-emerald-600">Salvo</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline text-[11px]">Salvar</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ext-venc" className="text-xs font-semibold">
                  Mês/Ano de Vencimento (MM/AAAA) *
                </Label>
                <Input
                  id="ext-venc"
                  type="month"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="ext-recarga" className="text-xs font-semibold">
                  Data da Última Recarga
                </Label>
                <Input
                  id="ext-recarga"
                  type="date"
                  value={dataUltimaRecarga}
                  onChange={(e) => setDataUltimaRecarga(e.target.value)}
                />
              </div>
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
                      {formatMonthYear(e.data_vencimento)}
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
