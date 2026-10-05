"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  FileSpreadsheet,
  FireExtinguisher,
  Waves,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useExtinguishers } from "@/hooks/useExtinguishers";
import { useHoses } from "@/hooks/useHoses";
import { useServiceOrders } from "@/hooks/useServiceOrders";
import { useOrders } from "@/hooks/useOrders";
import { formatDate, formatCurrency } from "@/lib/utils";

export function ReportsView() {
  const { data: extinguishers = [] } = useExtinguishers();
  const { data: hoses = [] } = useHoses();
  const { data: orders = [] } = useOrders();
  const { data: serviceOrders = [] } = useServiceOrders();

  const [activeTab, setActiveTab] = useState<"vencimentos" | "operacional" | "financeiro">("vencimentos");

  // Análise de Vencimentos de Extintores
  const extAnalysis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);

    const in60 = new Date(today);
    in60.setDate(in60.getDate() + 60);

    let expired = 0;
    let next30 = 0;
    let next60 = 0;
    let ok = 0;

    const list: Array<{
      id: string;
      item: string;
      type: "Extintor" | "Mangueira";
      serial: string;
      customer: string;
      expiration: string;
      status: "Vencido" | "Vence em 30 dias" | "Vence em 60 dias" | "Em dia";
    }> = [];

    extinguishers.forEach((e) => {
      if (!e.expiration_date) return;
      const exp = new Date(e.expiration_date + "T00:00:00");
      let status: "Vencido" | "Vence em 30 dias" | "Vence em 60 dias" | "Em dia" = "Em dia";

      if (exp < today) {
        expired++;
        status = "Vencido";
      } else if (exp <= in30) {
        next30++;
        status = "Vence em 30 dias";
      } else if (exp <= in60) {
        next60++;
        status = "Vence em 60 dias";
      } else {
        ok++;
      }

      list.push({
        id: e.id,
        item: `${e.type} (${e.capacity})`,
        type: "Extintor",
        serial: e.serial_number,
        customer: e.customer?.name || "Sem cliente",
        expiration: e.expiration_date,
        status,
      });
    });

    hoses.forEach((h) => {
      if (!h.next_test_at) return;
      const exp = new Date(h.next_test_at);
      let status: "Vencido" | "Vence em 30 dias" | "Vence em 60 dias" | "Em dia" = "Em dia";

      if (exp < today) {
        expired++;
        status = "Vencido";
      } else if (exp <= in30) {
        next30++;
        status = "Vence em 30 dias";
      } else if (exp <= in60) {
        next60++;
        status = "Vence em 60 dias";
      } else {
        ok++;
      }

      list.push({
        id: h.id,
        item: `Mangueira ${h.tipo} ${h.comprimento}m`,
        type: "Mangueira",
        serial: h.numero_serie || h.patrimonio || "—",
        customer: h.client?.name || "Sem cliente",
        expiration: h.next_test_at,
        status,
      });
    });

    list.sort((a, b) => new Date(a.expiration).getTime() - new Date(b.expiration).getTime());

    return { expired, next30, next60, ok, list };
  }, [extinguishers, hoses]);

  // Exportar para CSV
  function handleExportCSV() {
    const headers = "Tipo,Equipamento,Numero_Serie,Cliente,Data_Validade,Situacao\n";
    const rows = extAnalysis.list
      .map(
        (r) =>
          `"${r.type}","${r.item}","${r.serial}","${r.customer}","${formatDate(r.expiration)}","${r.status}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `relatorio_vencimentos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Relatórios & Indicadores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle de vencimentos de recarga, histórico de equipamentos e desempenho operacional.
          </p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="h-10">
          <Download className="mr-2 h-4 w-4" />
          Exportar Planilha (CSV)
        </Button>
      </div>

      {/* Seletor de Relatório */}
      <div className="flex items-center gap-2 border-b pb-3">
        <Button
          variant={activeTab === "vencimentos" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("vencimentos")}
        >
          Validades & Vencimentos
        </Button>
        <Button
          variant={activeTab === "operacional" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("operacional")}
        >
          Ordens de Serviço & Oficina
        </Button>
        <Button
          variant={activeTab === "financeiro" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("financeiro")}
        >
          Resumo Financeiro
        </Button>
      </div>

      {/* Relatório de Vencimentos */}
      {activeTab === "vencimentos" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-red-800 uppercase">
                  Vencidos
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{extAnalysis.expired}</div>
                <p className="text-xs text-red-600/80 mt-1">Necessitam recarga imediata</p>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-amber-800 uppercase">
                  Vencem em até 30 Dias
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">{extAnalysis.next30}</div>
                <p className="text-xs text-amber-600/80 mt-1">Oportunidade de contato</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-blue-800 uppercase">
                  Vencem em até 60 Dias
                </CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{extAnalysis.next60}</div>
                <p className="text-xs text-blue-600/80 mt-1">Planejamento futuro</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-green-800 uppercase">
                  Em Dia (Conforme)
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{extAnalysis.ok}</div>
                <p className="text-xs text-green-600/80 mt-1">Cargas vigentes</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Equipamentos e Cronograma de Vencimentos</CardTitle>
              <CardDescription>
                Lista ordenada por data de vencimento para prospecção de recargas e orçamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {extAnalysis.list.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum equipamento cadastrado ainda.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Nº de Série</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extAnalysis.list.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {it.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-sm">{it.item}</TableCell>
                        <TableCell className="font-mono text-xs">{it.serial}</TableCell>
                        <TableCell className="text-sm">{it.customer}</TableCell>
                        <TableCell className="text-sm font-medium">{formatDate(it.expiration)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              it.status === "Vencido"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : it.status === "Vence em 30 dias"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : it.status === "Vence em 60 dias"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-green-50 text-green-700 border-green-200"
                            }
                          >
                            {it.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Relatório Operacional */}
      {activeTab === "operacional" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desempenho de Ordens de Serviço</CardTitle>
            <CardDescription>Status das ordens emitidas para manutenção e recarga</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">Total de OS</p>
                <p className="text-2xl font-bold mt-1">{serviceOrders.length}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">Concluídas</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {serviceOrders.filter((os) => os.status === "concluida").length}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">Em Andamento / Pendente</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {serviceOrders.filter((os) => os.status !== "concluida" && os.status !== "cancelada").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatório Financeiro */}
      {activeTab === "financeiro" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faturamento de Pedidos e Recargas</CardTitle>
            <CardDescription>Resumo dos valores comercializados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">Total Faturado</p>
                <p className="text-2xl font-bold text-emerald-700 font-mono mt-1">
                  {formatCurrency(
                    orders
                      .filter((o) => o.status === "faturado" || o.status === "entregue")
                      .reduce((acc, cur) => acc + Number(cur.total || 0), 0)
                  )}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">Pendente de Faturamento</p>
                <p className="text-2xl font-bold text-amber-700 font-mono mt-1">
                  {formatCurrency(
                    orders
                      .filter((o) => o.status === "pendente")
                      .reduce((acc, cur) => acc + Number(cur.total || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
