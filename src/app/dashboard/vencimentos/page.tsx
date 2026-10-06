"use client";

import React, { useState } from "react";
import Link from "next/link";
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
import { getExpiringItems, VencimentoItem } from "@/services/prevention.service";
import { ClientTechSheetModal } from "@/components/clients/client-tech-sheet-modal";
import { getClient } from "@/services/clients.service";
import type { Customer } from "@/types";

export default function VencimentosPage() {
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["expiring-items"],
    queryFn: getExpiringItems,
  });

  const items = data?.items || [];

  const filteredItems = items.filter((item) => {
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

  async function handleOpenClientTechSheet(clientId: string) {
    try {
      const client = await getClient(clientId);
      if (client) setSelectedCustomer(client);
    } catch {
      //
    }
  }

  function generateWhatsAppUrl(item: VencimentoItem) {
    const rawPhone = (item.cliente_telefone || "").replace(/\D/g, "");
    if (!rawPhone) return "#";

    const formattedDate = new Date(item.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR");
    const statusMsg =
      item.status_alerta === "vencido"
        ? `está com o prazo VENCIDO desde ${formattedDate}`
        : `vence em breve no dia ${formattedDate}`;

    const text = `Olá, *${item.cliente_nome}*! 👋\n\nAqui é da equipe técnica da *ExtinControl Prevenção Contra Incêndio*.\n\nIdentificamos em nosso sistema que o seguinte item:\n🔥 *${item.item_nome}* (${item.categoria})\n${statusMsg}.\n\nPodemos agendar a visita técnica para inspeção, renovação e recarga preventiva?\n\nAguardamos seu retorno para programar o atendimento! 😊`;

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

      {/* TABELA DE VENCIMENTOS */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">
                Itens Monitorados ({filteredItems.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Clique no nome do cliente para abrir a ficha técnica ou no WhatsApp para contato rápido
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
                    <TableHead>Data Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const isOverdue = item.status_alerta === "vencido";
                    const isThisMonth = item.status_alerta === "mes_atual";

                    return (
                      <TableRow key={`${item.categoria}-${item.id}`}>
                        {/* Nome do Cliente com Link para Ficha Técnica */}
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleOpenClientTechSheet(item.cliente_id)}
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
                          {item.item_nome}
                        </TableCell>

                        {/* Localização */}
                        <TableCell className="text-xs text-muted-foreground">
                          {item.localizacao || "—"}
                        </TableCell>

                        {/* Vencimento */}
                        <TableCell className="font-mono text-xs">
                          <span className={isOverdue ? "font-bold text-red-600" : ""}>
                            {new Date(item.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
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

                        {/* Botão Enviar WhatsApp */}
                        <TableCell className="text-right">
                          {item.cliente_telefone ? (
                            <Button
                              asChild
                              size="sm"
                              className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
                              title="Enviar aviso pré-configurado no WhatsApp"
                            >
                              <a
                                href={generateWhatsAppUrl(item)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                Enviar WhatsApp
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Sem telefone
                            </span>
                          )}
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

      {/* Modal Ficha Técnica acionado ao clicar no cliente */}
      {selectedCustomer && (
        <ClientTechSheetModal
          open={!!selectedCustomer}
          onOpenChange={(o) => !o && setSelectedCustomer(null)}
          customer={selectedCustomer}
        />
      )}
    </div>
  );
}
