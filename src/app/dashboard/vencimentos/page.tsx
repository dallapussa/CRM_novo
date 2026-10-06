"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Search,
  MessageCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Flame,
  ShieldCheck,
  Waves,
  Building2,
  ArrowUpDown,
  RefreshCw,
  Loader2,
  Truck,
  Layers,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  FileText,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getExpiringItems,
  listClientExtintores,
  VencimentoItem,
  groupExpiringExtintoresByClient,
  ClienteLoteVencimento,
} from "@/services/prevention.service";
import { ClientTechSheetModal } from "@/components/clients/client-tech-sheet-modal";
import { OrderPickupModal } from "@/components/clients/order-pickup-modal";
import { getClient } from "@/services/clients.service";
import { useToast } from "@/hooks/use-toast";
import { formatMonthYear } from "@/lib/utils";
import type { Customer, ExtintorInventario } from "@/types";

function VencimentosContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const queryStatus = searchParams?.get("status");
  const initialPeriod =
    queryStatus && ["vencidos", "mes_atual", "proximo_mes", "all"].includes(queryStatus)
      ? queryStatus
      : "mes_atual"; // Abre diretamente na aba "Vencendo este mês"

  const [viewMode, setViewMode] = useState<"lotes" | "detalhado">("lotes");
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<string>(initialPeriod);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [techSheetTab, setTechSheetTab] = useState<"extintores" | "ppci">("extintores");
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (queryStatus && ["vencidos", "mes_atual", "proximo_mes", "all"].includes(queryStatus)) {
      setPeriodFilter(queryStatus);
    }
  }, [queryStatus]);

  // Estados da Ordem de Recolhimento
  const [isPickupOpen, setIsPickupOpen] = useState(false);
  const [pickupCustomer, setPickupCustomer] = useState<Customer | null>(null);
  const [pickupExtintores, setPickupExtintores] = useState<ExtintorInventario[]>([]);
  const [loadingPickupId, setLoadingPickupId] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["expiring-items"],
    queryFn: getExpiringItems,
  });

  const items = useMemo(() => data?.items || [], [data?.items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro de período
      if (periodFilter === "vencidos" && item.status_alerta !== "vencido") return false;
      if (periodFilter === "mes_atual" && item.status_alerta !== "mes_atual") return false;
      if (periodFilter === "proximo_mes" && item.status_alerta !== "proximo_mes") return false;

      // Filtro de categoria
      if (categoryFilter !== "all" && item.categoria !== categoryFilter) return false;

      // Busca textual
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchClient = item.cliente_nome.toLowerCase().includes(q);
        const matchItem = item.item_nome.toLowerCase().includes(q);
        const matchLoc = (item.localizacao || "").toLowerCase().includes(q);
        if (!matchClient && !matchItem && !matchLoc) return false;
      }

      return true;
    });
  }, [items, periodFilter, categoryFilter, search]);

  // Agrupamento em lotes por cliente (para extintores)
  const clientLots = useMemo(() => {
    return groupExpiringExtintoresByClient(filteredItems);
  }, [filteredItems]);

  function toggleExpandClient(clienteId: string) {
    setExpandedClients((prev) => ({
      ...prev,
      [clienteId]: !prev[clienteId],
    }));
  }

  async function handleOpenClientTechSheet(clientId: string, tab: "extintores" | "ppci" = "extintores") {
    try {
      const client = await getClient(clientId);
      if (client) {
        setTechSheetTab(tab);
        setSelectedCustomer(client);
      }
    } catch {
      //
    }
  }

  // Recolhimento do Lote Completo de um Cliente
  async function handleRecolherLoteCliente(group: ClienteLoteVencimento) {
    if (group.todos_em_bancada) {
      toast({
        variant: "destructive",
        title: "Lote já na Oficina",
        description: "Todos os extintores deste cliente já se encontram na bancada de manutenção.",
      });
      return;
    }

    setLoadingPickupId(group.cliente_id);
    try {
      const client = await getClient(group.cliente_id);
      if (!client) {
        toast({
          variant: "destructive",
          title: "Cliente não localizado",
          description: "Não foi possível carregar os dados deste cliente.",
        });
        return;
      }

      const clientExtintores = await listClientExtintores(group.cliente_id);
      if (!clientExtintores || clientExtintores.length === 0) {
        toast({
          variant: "destructive",
          title: "Nenhum extintor no inventário",
          description: "Cadastre extintores para este cliente na Ficha Técnica antes de recolher.",
        });
        return;
      }

      // IDs disponíveis no lote de vencimento (que não estão em bancada)
      const idsDisponiveis = new Set(
        group.extintores_disponiveis.map((it) => it.extintor_id || it.id).filter(Boolean)
      );

      // Filtra os extintores reais do cliente evitando estritamente os que já estão na bancada
      let targetExtintores = clientExtintores.filter((e) => {
        if (e.status === "em_bancada") return false;
        return idsDisponiveis.has(e.id);
      });

      // Fallback: se não encontrou por ID exato, pega todos os extintores do cliente que não estão em bancada
      if (targetExtintores.length === 0) {
        targetExtintores = clientExtintores.filter((e) => e.status !== "em_bancada");
      }

      if (targetExtintores.length === 0) {
        toast({
          variant: "destructive",
          title: "Todos os extintores já estão na Bancada",
          description: "Não há extintores pendentes para recolher neste momento.",
        });
        return;
      }

      setPickupCustomer(client);
      setPickupExtintores(targetExtintores);
      setIsPickupOpen(true);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao iniciar recolhimento do lote",
        description: err?.message || "Tente novamente.",
      });
    } finally {
      setLoadingPickupId(null);
    }
  }

  // Recolhimento individual (quando na visão detalhada)
  async function handleRecolherExtintor(item: VencimentoItem) {
    if (item.extintor_status === "em_bancada") {
      toast({
        variant: "destructive",
        title: "Extintor já recolhido",
        description: "Este extintor já está na bancada de manutenção da oficina.",
      });
      return;
    }

    setLoadingPickupId(item.id);
    try {
      const client = await getClient(item.cliente_id);
      if (!client) {
        toast({
          variant: "destructive",
          title: "Cliente não localizado",
          description: "Não foi possível carregar os dados deste cliente.",
        });
        return;
      }

      const clientExtintores = await listClientExtintores(item.cliente_id);
      if (!clientExtintores || clientExtintores.length === 0) {
        toast({
          variant: "destructive",
          title: "Nenhum extintor no inventário",
          description: "Cadastre extintores para este cliente na Ficha Técnica antes de recolher.",
        });
        return;
      }

      let target = clientExtintores.find(
        (e) => e.id === item.extintor_id || e.id === item.id
      );

      if (!target) {
        const cleanName = item.item_nome.split(" (")[0].trim().toLowerCase();
        target = clientExtintores.find(
          (e) => e.identificacao.toLowerCase() === cleanName
        );
      }

      const chosen = target || clientExtintores.find((e) => e.status !== "em_bancada");
      if (!chosen || chosen.status === "em_bancada") {
        toast({
          variant: "destructive",
          title: "Extintor já na Bancada",
          description: "Este extintor já está na oficina.",
        });
        return;
      }

      setPickupCustomer(client);
      setPickupExtintores([chosen]);
      setIsPickupOpen(true);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao iniciar recolhimento",
        description: err?.message || "Tente novamente.",
      });
    } finally {
      setLoadingPickupId(null);
    }
  }

  function generateWhatsAppUrl(item: VencimentoItem) {
    const rawPhone = (item.cliente_telefone || "").replace(/\D/g, "");
    if (!rawPhone) return "#";

    // Validade estritamente mês/ano para extintores
    const dataTxt = item.categoria === "Extintores"
      ? formatMonthYear(item.data_vencimento)
      : new Date(item.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR");

    const statusMsg =
      item.status_alerta === "vencido"
        ? `está com o prazo VENCIDO (${dataTxt})`
        : `vence em breve (${dataTxt})`;

    const text = `Olá, *${item.cliente_nome}*! 👋\n\nAqui é da equipe técnica da *ExtinControl Prevenção Contra Incêndio*.\n\nIdentificamos em nosso sistema que o seguinte item:\n🔥 *${item.item_nome}* (${item.categoria})\n${statusMsg}.\n\nPodemos agendar a visita técnica para inspeção, renovação e recarga preventiva?\n\nAguardamos seu retorno para programar o atendimento! 😊`;

    return `https://wa.me/55${rawPhone}?text=${encodeURIComponent(text)}`;
  }

  function generateLoteWhatsAppUrl(group: ClienteLoteVencimento) {
    const rawPhone = (group.cliente_telefone || "").replace(/\D/g, "");
    if (!rawPhone) return "#";

    const modelosTxt = group.modelos_agrupados.map((m) => `${m.count}x ${m.modelo}`).join(", ");
    const mesesTxt = group.meses_vencimento.join(", ");
    const statusMsg = group.tem_vencido
      ? `constatamos itens com validade VENCIDA (${mesesTxt})`
      : `a validade expira em breve (${mesesTxt})`;

    const text = `Olá, *${group.cliente_nome}*! 👋\n\nAqui é da equipe técnica da *ExtinControl Prevenção Contra Incêndio*.\n\nIdentificamos em nosso sistema o vencimento do lote de extintores da sua empresa:\n🔥 *Lote de ${group.total_extintores} extintor(es)*: ${modelosTxt}\n📅 *Vencimento:* ${mesesTxt} (${statusMsg}).\n\nPodemos programar o recolhimento deste lote completo para revisão e recarga preventiva na nossa oficina?\n\nAguardamos seu retorno para agendar a retirada! 😊`;

    return `https://wa.me/55${rawPhone}?text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="space-y-6">
      {/* Título & Descrição */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-red-600" />
            Gestão de Vencimentos & Renovação Preventiva
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe equipamentos e alvarás com prazos expirados ou a vencer para contato comercial ativo
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          Atualizar Lista
        </Button>
      </div>

      {/* 3 CARDS DE CONTADORES NO TOPO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* CARD 1: Vencidos */}
        <div
          onClick={() => setPeriodFilter("vencidos")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            periodFilter === "vencidos"
              ? "bg-red-50 dark:bg-red-950/40 border-red-500 ring-2 ring-red-500/20"
              : "bg-white dark:bg-neutral-900 border-red-200 dark:border-red-900/50 hover:border-red-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <Badge className="bg-red-600 text-white font-bold px-2.5 py-0.5 text-xs hover:bg-red-600">
              Vencidos
            </Badge>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-red-700 dark:text-red-400">
              {data?.vencidosCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Itens com prazo já expirado no cliente
            </p>
          </div>
        </div>

        {/* CARD 2: Vencendo Este Mês */}
        <div
          onClick={() => setPeriodFilter("mes_atual")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            periodFilter === "mes_atual"
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-white dark:bg-neutral-900 border-amber-200 dark:border-amber-900/50 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <Badge className="bg-amber-500 text-white font-bold px-2.5 py-0.5 text-xs hover:bg-amber-500">
              Vencendo Este Mês
            </Badge>
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-amber-700 dark:text-amber-400">
              {data?.vencendoMesCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Necessitam agendamento preventivo urgente
            </p>
          </div>
        </div>

        {/* CARD 3: Próximo Mês */}
        <div
          onClick={() => setPeriodFilter("proximo_mes")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            periodFilter === "proximo_mes"
              ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-500 ring-2 ring-neutral-500/20"
              : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 font-bold px-2.5 py-0.5 text-xs">
              Próximo Mês
            </Badge>
            <CalendarDays className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-neutral-800 dark:text-neutral-200">
              {data?.proximoMesCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Previsão de renovações do próximo ciclo
            </p>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS & BUSCA */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Input de Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, identificação do extintor, PPCI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selects de Filtros */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[170px] text-xs">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Prazos</SelectItem>
                  <SelectItem value="vencidos">Somente Vencidos</SelectItem>
                  <SelectItem value="mes_atual">Vencendo Este Mês</SelectItem>
                  <SelectItem value="proximo_mes">Próximo Mês</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px] text-xs">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  <SelectItem value="Extintores">Extintores</SelectItem>
                  <SelectItem value="PPCI">PPCI / Alvarás</SelectItem>
                  <SelectItem value="Mangueiras">Mangueiras</SelectItem>
                </SelectContent>
              </Select>

              {(periodFilter !== "all" || categoryFilter !== "all" || search) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPeriodFilter("all");
                    setCategoryFilter("all");
                    setSearch("");
                  }}
                  className="text-xs"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SELETOR DE VISUALIZAÇÃO: LOTES POR CLIENTE (PADRÃO) vs LISTA INDIVIDUAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-100 dark:bg-neutral-800/70 p-2.5 rounded-xl border">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={viewMode === "lotes" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("lotes")}
            className={`gap-2 text-xs font-bold ${
              viewMode === "lotes"
                ? "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Truck className="h-4 w-4" />
            Lotes por Cliente ({clientLots.length})
          </Button>

          <Button
            type="button"
            variant={viewMode === "detalhado" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("detalhado")}
            className={`gap-2 text-xs font-bold ${
              viewMode === "detalhado"
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="h-4 w-4" />
            Lista Individual de Itens ({filteredItems.length})
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          {viewMode === "lotes"
            ? "Agrupado por cliente para recolhimento em lote direto para a bancada"
            : "Visualização individualizada incluindo PPCI e mangueiras"}
        </p>
      </div>

      {/* VISÃO 1: LOTES POR CLIENTE (PADRÃO) */}
      {viewMode === "lotes" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando lotes de clientes...
            </div>
          ) : clientLots.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                Nenhum lote de extintores encontrado com os filtros selecionados.
              </CardContent>
            </Card>
          ) : (
            clientLots.map((group) => {
              const isExpanded = !!expandedClients[group.cliente_id];

              return (
                <Card
                  key={group.cliente_id}
                  className={`border transition-all shadow-sm ${
                    group.todos_em_bancada
                      ? "bg-neutral-50/70 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800 opacity-90"
                      : group.tem_vencido
                      ? "border-red-300 dark:border-red-900/60 bg-white dark:bg-neutral-900"
                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                  }`}
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Linha Superior: Dados do Cliente + Badges de Status */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenClientTechSheet(group.cliente_id, "extintores")}
                            className="text-base font-bold text-neutral-900 dark:text-neutral-100 hover:text-red-600 transition-colors flex items-center gap-1.5"
                          >
                            <Building2 className="h-4 w-4 text-red-600" />
                            {group.cliente_nome}
                          </button>

                          {group.cliente_fantasia && (
                            <span className="text-xs text-muted-foreground">
                              ({group.cliente_fantasia})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          {group.cliente_documento && (
                            <span className="font-mono">{group.cliente_documento}</span>
                          )}
                          {group.cliente_telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {group.cliente_telefone}
                            </span>
                          )}
                          {group.cliente_endereco && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {group.cliente_endereco}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Badges de Vencimento e Status da Oficina */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {group.todos_em_bancada ? (
                          <Badge className="bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 font-bold text-xs gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" />
                            Lote Já na Bancada (Oficina)
                          </Badge>
                        ) : group.extintores_em_bancada.length > 0 ? (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300">
                            {group.extintores_em_bancada.length} na oficina / {group.extintores_disponiveis.length} a recolher
                          </Badge>
                        ) : null}

                        {group.tem_vencido ? (
                          <Badge className="bg-red-600 text-white font-bold text-xs">
                            VENCIDO
                          </Badge>
                        ) : group.tem_mes_atual ? (
                          <Badge className="bg-amber-500 text-white font-bold text-xs">
                            VENCE ESTE MÊS
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-neutral-600">
                            PRÓXIMO MÊS
                          </Badge>
                        )}

                        <Badge className="bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-bold text-xs">
                          {group.total_extintores} {group.total_extintores === 1 ? "Cilindro" : "Cilindros"}
                        </Badge>
                      </div>
                    </div>

                    {/* Linha Central: Resumo do Lote (Modelos e Meses de Vencimento) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border text-xs">
                      {/* Modelos de Extintores */}
                      <div>
                        <span className="font-semibold text-muted-foreground block mb-1">
                          Composição do Lote:
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {group.modelos_agrupados.map((m, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-[11px] font-medium bg-white dark:bg-neutral-900 border text-neutral-800 dark:text-neutral-200"
                            >
                              <Flame className="h-3 w-3 text-red-500 mr-1" />
                              <strong className="mr-1">{m.count}x</strong> {m.modelo}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Meses de Vencimento (apenas MM/AAAA) */}
                      <div>
                        <span className="font-semibold text-muted-foreground block mb-1">
                          Vencimento dos Cilindros (Mês/Ano):
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {group.meses_vencimento.map((m, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-[11px] font-mono font-bold bg-white dark:bg-neutral-900 border-red-200 text-red-700 dark:text-red-400"
                            >
                              📅 {m}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Detalhamento Expansível dos Cilindros do Lote */}
                    {isExpanded && (
                      <div className="border rounded-lg overflow-hidden bg-white dark:bg-neutral-900 mt-2">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-neutral-50 dark:bg-neutral-800/60 text-[11px]">
                              <TableHead>Identificação / Cilindro</TableHead>
                              <TableHead>Tipo / Capacidade</TableHead>
                              <TableHead>Localização</TableHead>
                              <TableHead>Vencimento (MM/AAAA)</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="text-xs">
                            {group.extintores.map((ext) => {
                              const isEmBancada = ext.extintor_status === "em_bancada";
                              return (
                                <TableRow key={ext.id}>
                                  <TableCell className="font-mono font-bold">
                                    {ext.item_nome}
                                  </TableCell>
                                  <TableCell>{ext.subtipo || "Extintor"}</TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {ext.localizacao || "—"}
                                  </TableCell>
                                  <TableCell className="font-mono font-semibold">
                                    {formatMonthYear(ext.data_vencimento)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {isEmBancada ? (
                                      <Badge className="bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 text-[10px] font-bold">
                                        Na Bancada
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] text-neutral-600">
                                        No Cliente
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Linha Inferior: Botões de Ação do Lote */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpandClient(group.cliente_id)}
                        className="text-xs text-muted-foreground hover:text-foreground gap-1 justify-start px-1"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Ocultar cilindros do lote
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            Ver todos os {group.total_extintores} cilindros do lote
                          </>
                        )}
                      </Button>

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenClientTechSheet(group.cliente_id, "extintores")}
                          className="h-9 px-3 text-xs gap-1.5 font-medium"
                        >
                          <FileText className="h-3.5 w-3.5 text-neutral-600" />
                          Ficha Técnica
                        </Button>

                        {group.cliente_telefone ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-9 px-3 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold gap-1.5 shadow-sm"
                            title="Enviar aviso do lote completo no WhatsApp"
                          >
                            <a
                              href={generateLoteWhatsAppUrl(group)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                              WhatsApp Lote
                            </a>
                          </Button>
                        ) : null}

                        {/* Botão de Recolhimento do Lote */}
                        <Button
                          type="button"
                          size="sm"
                          disabled={group.todos_em_bancada || loadingPickupId === group.cliente_id}
                          onClick={() => handleRecolherLoteCliente(group)}
                          className={`h-9 px-4 text-xs font-bold gap-2 shadow-sm ${
                            group.todos_em_bancada
                              ? "bg-neutral-300 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed"
                              : "bg-orange-600 hover:bg-orange-700 text-white"
                          }`}
                          title={
                            group.todos_em_bancada
                              ? "Todos os cilindros deste lote já estão na bancada"
                              : "Recolher o lote completo de extintores deste cliente para a bancada"
                          }
                        >
                          {loadingPickupId === group.cliente_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Truck className="h-4 w-4" />
                          )}
                          {group.todos_em_bancada
                            ? "Lote Já na Oficina"
                            : `Recolher Lote (${group.extintores_disponiveis.length} cilindros)`}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* VISÃO 2: TABELA DETALHADA INDIVIDUAL (COM PPCI E MANGUEIRAS) */}
      {viewMode === "detalhado" && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Itens Monitorados Individualmente ({filteredItems.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Extintores com validade mês/ano e bloqueio de duplicidade para bancada
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Carregando vencimentos do sistema...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Nenhum item encontrado com os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Equipamento / Item</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Vencimento (MM/AAAA)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const isOverdue = item.status_alerta === "vencido";
                      const isThisMonth = item.status_alerta === "mes_atual";
                      const isEmBancada = item.extintor_status === "em_bancada";

                      // Para extintores, exibe estritamente MM/AAAA. Para PPCI, data completa.
                      const dataFormatada = item.categoria === "Extintores"
                        ? formatMonthYear(item.data_vencimento)
                        : new Date(item.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR");

                      return (
                        <TableRow key={`${item.categoria}-${item.id}`}>
                          {/* Nome do Cliente com Link para Ficha Técnica */}
                          <TableCell>
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenClientTechSheet(
                                  item.cliente_id,
                                  item.categoria === "PPCI" ? "ppci" : "extintores"
                                )
                              }
                              className="text-left font-bold text-neutral-900 dark:text-neutral-100 hover:text-red-600 transition-colors"
                            >
                              {item.cliente_nome}
                            </button>
                          </TableCell>

                          {/* Categoria */}
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold gap-1 ${
                                item.categoria === "Extintores"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : item.categoria === "PPCI"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {item.categoria === "Extintores" && <Flame className="h-3 w-3" />}
                              {item.categoria === "PPCI" && <ShieldCheck className="h-3 w-3" />}
                              {item.categoria === "Mangueiras" && <Waves className="h-3 w-3" />}
                              {item.categoria}
                            </Badge>
                          </TableCell>

                          {/* Item */}
                          <TableCell className="font-medium text-sm">
                            <div className="flex items-center gap-2">
                              <span>{item.item_nome}</span>
                              {isEmBancada && (
                                <Badge className="bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 text-[9px] font-bold">
                                  Na Bancada
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Localização */}
                          <TableCell className="text-xs text-muted-foreground">
                            {item.localizacao || "—"}
                          </TableCell>

                          {/* Vencimento (MM/AAAA para extintor) */}
                          <TableCell className="font-mono text-xs">
                            <span className={isOverdue ? "font-bold text-red-600" : ""}>
                              {dataFormatada}
                            </span>
                            <span className="block text-[10px] text-muted-foreground">
                              {isOverdue
                                ? `Expirou há ${Math.abs(item.dias_restantes)} dias`
                                : item.dias_restantes === 0
                                ? "Vence hoje!"
                                : `Em ${item.dias_restantes} dias`}
                            </span>
                          </TableCell>

                          {/* Badge de Alerta */}
                          <TableCell>
                            {isOverdue ? (
                              <Badge className="bg-red-600 text-white font-bold text-[10px] hover:bg-red-600">
                                VENCIDO
                              </Badge>
                            ) : isThisMonth ? (
                              <Badge className="bg-amber-500 text-white font-bold text-[10px] hover:bg-amber-500">
                                VENCE ESTE MÊS
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-neutral-600">
                                PRÓXIMO MÊS
                              </Badge>
                            )}
                          </TableCell>

                          {/* Ações: Recolher Extintor com trava anti-duplicidade, Editar PPCI, Enviar WhatsApp */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {item.categoria === "Extintores" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleRecolherExtintor(item)}
                                  disabled={isEmBancada || loadingPickupId === item.id}
                                  className={`h-8 px-2.5 text-xs font-semibold gap-1.5 shadow-sm ${
                                    isEmBancada
                                      ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                      : "bg-orange-600 hover:bg-orange-700 text-white"
                                  }`}
                                  title={
                                    isEmBancada
                                      ? "Este extintor já está na bancada da oficina"
                                      : "Abrir Ordem de Recolhimento para Oficina / Bancada"
                                  }
                                >
                                  {loadingPickupId === item.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Truck className="h-3.5 w-3.5" />
                                  )}
                                  {isEmBancada ? "Na Bancada" : "Recolher"}
                                </Button>
                              )}

                              {item.categoria === "PPCI" && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenClientTechSheet(item.cliente_id, "ppci")}
                                  className="h-8 px-2.5 text-xs border-amber-300 text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-semibold gap-1.5 shadow-sm"
                                  title="Editar PPCI e Alvará do Cliente"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                                  Editar PPCI
                                </Button>
                              )}

                              {item.cliente_telefone ? (
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold gap-1.5 shadow-sm"
                                  title="Enviar aviso pré-configurado no WhatsApp"
                                >
                                  <a
                                    href={generateWhatsAppUrl(item)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                                    WhatsApp
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground italic px-1">
                                  Sem telefone
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Ficha Técnica acionado ao clicar no cliente ou Editar PPCI */}
      {selectedCustomer && (
        <ClientTechSheetModal
          open={!!selectedCustomer}
          onOpenChange={(o) => !o && setSelectedCustomer(null)}
          customer={selectedCustomer}
          initialTab={techSheetTab}
          onCustomerUpdated={() => refetch()}
        />
      )}

      {/* Modal de Ordem de Recolhimento acionado pelo botão Recolher */}
      {isPickupOpen && pickupCustomer && (
        <OrderPickupModal
          open={isPickupOpen}
          onOpenChange={setIsPickupOpen}
          customer={pickupCustomer}
          selectedExtintores={pickupExtintores}
          onSuccess={() => {
            refetch();
            setIsPickupOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default function VencimentosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          Carregando Vencimentos...
        </div>
      }
    >
      <VencimentosContent />
    </Suspense>
  );
}
