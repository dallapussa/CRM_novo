"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  FireExtinguisher,
  Edit2,
  Trash2,
  Filter,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Customer, Extinguisher } from "@/types";
import { EXTINGUISHER_TYPES } from "@/types";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDeleteExtinguisher, useExtinguishers } from "@/hooks/useExtinguishers";
import { useClients } from "@/hooks/useClients";

interface ExtinguishersListProps {
  initialExtinguishers?: Extinguisher[];
}

type ExpiryStatus = "vencido" | "vence_em_breve" | "ok";

function getExpiryStatus(expirationDate: string): ExpiryStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate + "T00:00:00");
  const diffDays = Math.floor((exp.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "vencido";
  if (diffDays <= 30) return "vence_em_breve";
  return "ok";
}

const EXPIRY_CONFIG: Record<
  ExpiryStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  vencido: {
    label: "Vencido",
    className: "bg-red-100 text-red-700 border-red-200",
    icon: AlertTriangle,
  },
  vence_em_breve: {
    label: "Vence em breve",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Clock,
  },
  ok: {
    label: "Em dia",
    className: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
};

export function ExtinguishersList({ initialExtinguishers }: ExtinguishersListProps = {}) {
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expiryFilter, setExpiryFilter] = useState<string>("all");
  const { data: extinguishers = [], isLoading } = useExtinguishers(initialExtinguishers);
  const { data: clientData = [] } = useClients();
  const customers = clientData.filter((customer) => customer.is_active).map(({ id, name }) => ({ id, name }));
  const [deleteItem, setDeleteItem] = useState<Extinguisher | null>(null);
  const { toast } = useToast();
  const deleteMutation = useDeleteExtinguisher();
  const isDeleting = deleteMutation.isPending;

  const filtered = useMemo(() => {
    return extinguishers.filter((e) => {
      if (customerFilter !== "all" && e.customer_id !== customerFilter) return false;
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (expiryFilter !== "all" && getExpiryStatus(e.expiration_date) !== expiryFilter)
        return false;
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const haystack = [
          e.serial_number,
          e.type,
          e.location,
          e.manufacturer,
          e.customer?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [extinguishers, search, customerFilter, typeFilter, expiryFilter]);

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      await deleteMutation.mutateAsync(deleteItem.id);
      toast({
        variant: "success",
        title: "Extintor excluído",
        description: "Equipamento removido com sucesso.",
      });
      setDeleteItem(null);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: err?.message || "Não foi possível excluir o equipamento.",
      });
    }
  }

  function clearFilters() {
    setSearch("");
    setCustomerFilter("all");
    setTypeFilter("all");
    setExpiryFilter("all");
  }

  const hasActiveFilters =
    search || customerFilter !== "all" || typeFilter !== "all" || expiryFilter !== "all";

  const vencidos = extinguishers.filter(
    (e) => getExpiryStatus(e.expiration_date) === "vencido"
  ).length;
  const vencemBreve = extinguishers.filter(
    (e) => getExpiryStatus(e.expiration_date) === "vence_em_breve"
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Extintores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">
              {extinguishers.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-red-600">
              {vencidos}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              precisam de recarga urgente
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vencem em 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-yellow-600">
              {vencemBreve}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              agendar recarga
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por série, cliente ou local..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
              <X className="mr-1.5 h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[170px] h-10">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos clientes</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] h-10">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                {EXTINGUISHER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={expiryFilter} onValueChange={setExpiryFilter}>
              <SelectTrigger className="w-[160px] h-10">
                <SelectValue placeholder="Validade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="vencido">Vencidos</SelectItem>
                <SelectItem value="vence_em_breve">Vence em breve</SelectItem>
                <SelectItem value="ok">Em dia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button asChild className="h-10">
            <Link href="/dashboard/extintores/novo">
              <Plus className="mr-1.5 h-4 w-4" />
              Novo Extintor
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Carregando extintores...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-primary">
                <FireExtinguisher className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-lg">
                  {extinguishers.length === 0
                    ? "Nenhum extintor cadastrado"
                    : "Nenhum extintor encontrado"}
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {extinguishers.length === 0
                    ? "Cadastre os equipamentos dos clientes para controlar validades."
                    : "Tente ajustar os filtros de busca."}
                </p>
              </div>
              {extinguishers.length === 0 && (
                <Button asChild className="mt-2">
                  <Link href="/dashboard/extintores/novo">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Cadastrar primeiro extintor
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Série</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right w-[110px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => {
                  const exp = getExpiryStatus(e.expiration_date);
                  const expCfg = EXPIRY_CONFIG[exp];
                  const ExpIcon = expCfg.icon;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {e.serial_number}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {e.customer?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{e.type}</TableCell>
                      <TableCell className="text-sm">{e.capacity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                        {e.location || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(e.expiration_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={expCfg.className}>
                          <ExpIcon className="mr-1 h-3 w-3" />
                          {expCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Editar"
                          >
                            <Link href={`/dashboard/extintores/${e.id}/editar`}>
                              <Edit2 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Excluir"
                            onClick={() => setDeleteItem(e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir extintor?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o extintor{" "}
              <span className="font-semibold">{deleteItem?.serial_number}</span>? Esta
              ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteItem(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
