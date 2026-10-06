"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Package,
  Users,
  Database,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { LoteRecolhimento, LoteRecolhimentoStatus } from "@/types";
import { listLotesRecolhimento } from "@/services/prevention.service";
import { LoteCreateDialog } from "@/components/lotes/lote-create-dialog";
import { LoteDetailView } from "@/components/lotes/lote-detail-view";

const SQL_MIGRATION_SNIPPET = `-- 9. TABELA DE LOTES DE RECOLHIMENTO
create table if not exists public.lotes_recolhimento (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  codigo text not null,
  nome text not null,
  cidade text,
  regiao text,
  data_recolhimento date not null default current_date,
  prazo_dias integer not null default 7,
  previsao_devolucao date not null,
  status text not null default 'em_oficina' check (status in ('recolhendo', 'em_oficina', 'pronto_entrega', 'concluido')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_lotes_recolhimento_status on public.lotes_recolhimento(status);
create index if not exists idx_lotes_recolhimento_previsao on public.lotes_recolhimento(previsao_devolucao);

alter table public.ordens_recolhimento add column if not exists lote_id uuid references public.lotes_recolhimento(id) on delete set null;
create index if not exists idx_ordens_recolhimento_lote_id on public.ordens_recolhimento(lote_id);

alter table public.lotes_recolhimento enable row level security;
drop policy if exists lotes_recolhimento_authenticated on public.lotes_recolhimento;
create policy lotes_recolhimento_authenticated on public.lotes_recolhimento
  for all to authenticated
  using (true)
  with check (true);`;

export default function LotesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loteToEdit, setLoteToEdit] = useState<LoteRecolhimento | null>(null);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  const {
    data: lotes = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["lotes_recolhimento"],
    queryFn: listLotesRecolhimento,
  });

  const selectedLote = selectedLoteId
    ? lotes.find((l) => l.id === selectedLoteId) || null
    : null;

  // Filtros
  const filteredLotes = lotes.filter((l) => {
    const matchesSearch =
      search === "" ||
      l.nome.toLowerCase().includes(search.toLowerCase()) ||
      l.codigo.toLowerCase().includes(search.toLowerCase()) ||
      (l.cidade && l.cidade.toLowerCase().includes(search.toLowerCase())) ||
      (l.regiao && l.regiao.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "ativos" && l.status !== "concluido") ||
      l.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Métricas
  const totalLotesAtivos = lotes.filter((l) => l.status !== "concluido").length;
  const totalExtintoresEmOficina = lotes
    .filter((l) => l.status !== "concluido")
    .reduce((sum, l) => sum + (l.total_extintores || 0), 0);
  const lotesConcluidos = lotes.filter((l) => l.status === "concluido").length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const devolucoesUrgentes = lotes.filter((l) => {
    if (l.status === "concluido") return false;
    const devDate = new Date(l.previsao_devolucao + "T00:00:00");
    const diff = Math.ceil((devDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 3; // vence em 3 dias ou já venceu
  }).length;

  const statusLabels: Record<LoteRecolhimentoStatus, { label: string; color: string }> = {
    recolhendo: { label: "Em Recolhimento", color: "bg-blue-100 text-blue-800 border-blue-200" },
    em_oficina: { label: "Na Oficina / Bancada", color: "bg-amber-100 text-amber-800 border-amber-200" },
    pronto_entrega: { label: "Pronto p/ Entrega", color: "bg-purple-100 text-purple-800 border-purple-200" },
    concluido: { label: "Concluído", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  };

  function copySqlToClipboard() {
    navigator.clipboard.writeText(SQL_MIGRATION_SNIPPET);
    toast({
      title: "SQL copiado!",
      description: "Cole no Editor SQL do seu Supabase para criar a tabela de Lotes no banco remoto.",
    });
  }

  // Se o usuário selecionou um lote para abrir detalhes, exibe o LoteDetailView
  if (selectedLote) {
    return (
      <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
        <LoteDetailView
          lote={selectedLote}
          onBack={() => setSelectedLoteId(null)}
          onRefresh={() => refetch()}
          onEdit={() => {
            setLoteToEdit(selectedLote);
            setCreateDialogOpen(true);
          }}
        />

        <LoteCreateDialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) setLoteToEdit(null);
          }}
          loteToEdit={loteToEdit}
          onSuccess={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Lotes de Recolhimento & Rotas de Devolução
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestão integrada de macro lotes por região/cidade, contagem na chegada/saída e romaneio de devolução.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Button
            onClick={() => {
              setLoteToEdit(null);
              setCreateDialogOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Novo Lote Geral
          </Button>
        </div>
      </div>

      {/* Cartões de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lotes Ativos
            </CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalLotesAtivos}</div>
            <p className="text-xs text-muted-foreground mt-1">Rotas em andamento ou oficina</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Extintores na Oficina
            </CardTitle>
            <Package className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totalExtintoresEmOficina}</div>
            <p className="text-xs text-muted-foreground mt-1">Cilindros agregados nos lotes ativos</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Devoluções Próximas
            </CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{devolucoesUrgentes}</div>
            <p className="text-xs text-muted-foreground mt-1">Prazos de 7 ou 14 dias vencendo</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lotes Concluídos
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{lotesConcluidos}</div>
            <p className="text-xs text-muted-foreground mt-1">Rotas entregues e finalizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Caixa de Ajuda / Migration SQL (colapsável) */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSqlGuide(!showSqlGuide)}
          className="w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between text-xs font-medium text-foreground"
        >
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-600" />
            Configuração do Banco no Supabase (SQL da Migração de Lotes)
          </span>
          {showSqlGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showSqlGuide && (
          <div className="p-4 bg-muted/10 border-t space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                O sistema já suporta armazenamento de lotes localmente e sincronização com o Supabase. Para criar a tabela <code>public.lotes_recolhimento</code> no seu banco de dados, execute o script abaixo no Supabase SQL Editor:
              </p>
              <Button size="sm" variant="outline" onClick={copySqlToClipboard} className="gap-1.5 text-xs">
                <Copy className="h-3.5 w-3.5" />
                Copiar SQL
              </Button>
            </div>
            <pre className="p-3 bg-slate-950 text-slate-100 rounded text-xs font-mono overflow-x-auto max-h-48">
              {SQL_MIGRATION_SNIPPET}
            </pre>
          </div>
        )}
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por lote, cidade, região ou código..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="ativos">Apenas Ativos</SelectItem>
              <SelectItem value="em_oficina">Na Oficina</SelectItem>
              <SelectItem value="pronto_entrega">Pronto Entrega</SelectItem>
              <SelectItem value="concluido">Concluídos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Lotes */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-red-600" />
          Carregando lotes de recolhimento...
        </div>
      ) : filteredLotes.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-3">
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">Nenhum lote encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {search || statusFilter !== "all"
                ? "Nenhum lote corresponde aos filtros informados. Tente limpar os filtros."
                : "Crie seu primeiro Lote Geral para agrupar os recolhimentos de extintores por região ou data de devolução."}
            </p>
            <Button
              onClick={() => {
                setLoteToEdit(null);
                setCreateDialogOpen(true);
              }}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              Criar Primeiro Lote Geral
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLotes.map((lote) => {
            const statusConf = statusLabels[lote.status] || {
              label: lote.status,
              color: "bg-gray-100 text-gray-800 border-gray-200",
            };

            const devDate = new Date(lote.previsao_devolucao + "T00:00:00");
            const diffDays = Math.ceil((devDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            return (
              <Card
                key={lote.id}
                className="hover:shadow-md transition-shadow border-2 flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                      {lote.codigo}
                    </span>
                    <Badge variant="outline" className={`font-semibold ${statusConf.color}`}>
                      {statusConf.label}
                    </Badge>
                  </div>

                  <CardTitle className="text-base font-bold line-clamp-1 mt-1 text-foreground">
                    {lote.nome}
                  </CardTitle>

                  {lote.cidade && (
                    <CardDescription className="text-xs flex items-center gap-1 font-medium text-foreground">
                      <MapPin className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      {lote.cidade} {lote.regiao ? `• ${lote.regiao}` : ""}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Informações de Prazo */}
                  <div className="p-2.5 bg-muted/40 rounded-lg border space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Recolhido em:
                      </span>
                      <strong className="text-foreground">
                        {new Date(lote.data_recolhimento + "T12:00:00").toLocaleDateString("pt-BR")}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-red-600" />
                        Devolução:
                      </span>
                      <strong className="text-foreground">
                        {new Date(lote.previsao_devolucao + "T12:00:00").toLocaleDateString("pt-BR")} (
                        {lote.prazo_dias}d)
                      </strong>
                    </div>

                    {lote.status !== "concluido" && (
                      <div className="pt-1 border-t flex justify-end">
                        <span
                          className={`font-semibold text-[11px] ${
                            diffDays < 0
                              ? "text-red-600"
                              : diffDays <= 2
                              ? "text-amber-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {diffDays < 0
                            ? `⚠️ Atrasado (${Math.abs(diffDays)}d)`
                            : diffDays === 0
                            ? "🚨 Devolução é hoje!"
                            : `Retorno em ${diffDays} dia(s)`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Totais de Clientes e Cilindros */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 rounded border bg-card">
                      <p className="text-muted-foreground flex items-center justify-center gap-1">
                        <Users className="h-3.5 w-3.5" /> Clientes
                      </p>
                      <p className="text-base font-bold text-foreground mt-0.5">
                        {lote.total_clientes || 0}
                      </p>
                    </div>

                    <div className="p-2 rounded border bg-card">
                      <p className="text-muted-foreground flex items-center justify-center gap-1">
                        <Package className="h-3.5 w-3.5" /> Extintores
                      </p>
                      <p className="text-base font-bold text-blue-600 mt-0.5">
                        {lote.total_extintores || 0} un
                      </p>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700 text-white gap-2 font-medium"
                      size="sm"
                      onClick={() => setSelectedLoteId(lote.id)}
                    >
                      <span>Abrir Lote & Romaneio</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog para Criar ou Editar Lote */}
      <LoteCreateDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setLoteToEdit(null);
        }}
        loteToEdit={loteToEdit}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
