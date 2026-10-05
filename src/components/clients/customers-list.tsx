"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  UserCheck,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Eye,
  Filter,
  X,
  MessageCircle,
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
import type { Customer } from "@/types";
import { formatDocument, formatPhone, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useClients, useDeleteClient } from "@/hooks/useClients";

interface CustomersListProps {
  initialCustomers?: Customer[];
}

export function CustomersList({ initialCustomers }: CustomersListProps = {}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();
  const { data: customers = [], isLoading } = useClients(initialCustomers);
  const deleteMutation = useDeleteClient();
  const isDeleting = deleteMutation.isPending;

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (statusFilter !== "all") {
        const isActive = statusFilter === "active";
        if (c.is_active !== isActive) return false;
      }
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const haystack = [
          c.name,
          c.document,
          c.email,
          c.phone1,
          c.phone2,
          c.whatsapp,
          c.ie_rg,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [customers, search, typeFilter, statusFilter]);

  async function handleDelete() {
    if (!deleteCustomer) return;
    try {
      await deleteMutation.mutateAsync(deleteCustomer.id);
      toast({
        variant: "success",
        title: "Cliente excluído",
        description: `${deleteCustomer.name} foi removido com sucesso.`,
      });
      setDeleteCustomer(null);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description:
          err?.message ||
          "Não foi possível excluir. Verifique se há OS vinculadas.",
      });
    }
  }

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
  }

  const hasActiveFilters =
    search || typeFilter !== "all" || statusFilter !== "all";

  const totalPf = customers.filter((c) => c.type === "pf").length;
  const totalPj = customers.filter((c) => c.type === "pj").length;
  const totalActive = customers.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">
              {customers.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPf} PF · {totalPj} PJ
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-green-600">
              {totalActive}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {customers.length - totalActive} inativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Exibindo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">
              {filteredCustomers.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              resultado(s) dos filtros
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, documento, telefone ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-10"
            >
              <X className="mr-1.5 h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="pf">Pessoa Física</SelectItem>
                <SelectItem value="pj">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button asChild className="h-10">
            <Link href="/dashboard/clientes/novo">
              <Plus className="mr-1.5 h-4 w-4" />
              Novo Cliente
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Carregando clientes...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-primary">
                <UserCheck className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-lg">
                  {customers.length === 0
                    ? "Nenhum cliente cadastrado"
                    : "Nenhum cliente encontrado"}
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {customers.length === 0
                    ? "Comece cadastrando seu primeiro cliente para gerenciar OS, extintores e financeiro."
                    : "Tente ajustar os filtros de busca ou limpe os campos de pesquisa."}
                </p>
              </div>
              {customers.length === 0 && (
                <Button asChild className="mt-2">
                  <Link href="/dashboard/clientes/novo">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Cadastrar primeiro cliente
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[160px]">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold leading-tight">
                            {c.name}
                          </p>
                          {c.email && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {c.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            c.type === "pj"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-sky-50 text-sky-700 border-sky-200"
                          }
                        >
                          {c.type === "pj" ? "PJ" : "PF"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatDocument(c.document)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {formatPhone(c.phone1)}
                          </div>
                          {c.whatsapp && (
                            <div className="mt-0.5">
                              <a
                                href={`https://wa.me/55${c.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                                title="Abrir conversa no WhatsApp"
                              >
                                <MessageCircle className="h-3 w-3 fill-emerald-500/20" />
                                {formatPhone(c.whatsapp)}
                              </a>
                            </div>
                          )}
                          {c.phone2 && c.phone2 !== c.whatsapp && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Phone className="h-3 w-3 shrink-0" />
                              {formatPhone(c.phone2)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(c.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            c.is_active
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }
                        >
                          {c.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {(c.whatsapp || c.phone1) && (
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Conversar no WhatsApp"
                            >
                              <a
                                href={`https://wa.me/55${(c.whatsapp || c.phone1).replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Ver detalhes"
                          >
                            <Link href={`/dashboard/clientes/${c.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Editar"
                          >
                            <Link href={`/dashboard/clientes/${c.id}/editar`}>
                              <Edit2 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Excluir"
                            onClick={() => setDeleteCustomer(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteCustomer} onOpenChange={(o) => !o && setDeleteCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cliente?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{" "}
              <span className="font-semibold">{deleteCustomer?.name}</span>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteCustomer(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
