"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Users,
  UserPlus,
  Edit2,
  Shield,
  UserCog,
  Filter,
  X,
  Mail,
  Phone,
  Trash2,
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
import type { Profile, UserRole } from "@/types";
import { ROLE_LABELS, ROLE_COLORS } from "@/types";
import { formatDate, formatPhone } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSetUserActive, useUsers } from "@/hooks/useUsers";

interface UsersListProps {
  initialUsers?: Profile[];
}

export function UsersList({ initialUsers }: UsersListProps = {}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: users = [], isLoading } = useUsers(initialUsers);
  const [deleteUser, setDeleteUser] = useState<Profile | null>(null);
  const { toast } = useToast();
  const setActiveMutation = useSetUserActive();
  const isDeleting = setActiveMutation.isPending;

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all") {
        const isActive = statusFilter === "active";
        if (u.is_active !== isActive) return false;
      }
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const haystack = [u.full_name, u.email, u.phone, u.document, u.company_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  async function handleDelete() {
    if (!deleteUser) return;
    try {
      await setActiveMutation.mutateAsync({ id: deleteUser.id, is_active: false });
      toast({
        variant: "success",
        title: "Usuário inativado",
        description: `${deleteUser.full_name} foi inativado com sucesso.`,
      });
      setDeleteUser(null);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao inativar",
        description: err?.message || "Não foi possível inativar o usuário.",
      });
    }
  }

  async function handleToggleActive(user: Profile) {
    const newState = !user.is_active;
    try {
      await setActiveMutation.mutateAsync({ id: user.id, is_active: newState });
      toast({
        variant: "success",
        title: newState ? "Usuário ativado" : "Usuário inativado",
        description: `${user.full_name} foi ${newState ? "ativado" : "inativado"}.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: err?.message || "Não foi possível atualizar o status.",
      });
    }
  }

  function clearFilters() {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
  }

  const hasActiveFilters =
    search || roleFilter !== "all" || statusFilter !== "all";

  const countByRole = (role: UserRole) => users.filter((u) => u.role === role).length;
  const totalActive = users.filter((u) => u.is_active).length;

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/30">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-blue-900">Como criar um novo usuário?</p>
              <p className="text-sm text-blue-800/80 mt-1">
                1. Crie o usuário no painel do Supabase (menu Authentication → Users → Add user).
                Defina o e-mail e senha temporária.<br />
                2. Depois, clique em &quot;Novo Usuário&quot; abaixo para cadastrar o perfil
                (nome, telefone, função, etc.), vinculando o mesmo ID de usuário do Auth.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total da Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{users.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalActive} ativos · {users.length - totalActive} inativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Administradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-red-600">
              {countByRole("admin")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comercial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-blue-600">
              {countByRole("comercial") + countByRole("tecnico")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              + Técnicos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-green-600">
              {countByRole("financeiro")}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, telefone..."
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
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px] h-10">
                <SelectValue placeholder="Perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos perfis</SelectItem>
                {Object.entries(ROLE_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
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
            <Link href="/dashboard/usuarios/novo">
              <Plus className="mr-1.5 h-4 w-4" />
              Novo Usuário
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Carregando usuários...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-primary">
                <Users className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-lg">
                  {users.length === 0
                    ? "Nenhum usuário cadastrado"
                    : "Nenhum usuário encontrado"}
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {users.length === 0
                    ? "Cadastre os membros da sua equipe para começar a atribuir OS e gerenciar acessos."
                    : "Tente ajustar os filtros de busca."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[200px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const roleKey = u.role as UserRole;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-white font-semibold text-sm">
                              {u.full_name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-semibold leading-tight">{u.full_name}</p>
                              {u.company_name && (
                                <p className="text-xs text-muted-foreground mt-0.5">{u.company_name}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ROLE_COLORS[roleKey]}>
                            <Shield className="mr-1 h-3 w-3" />
                            {ROLE_LABELS[roleKey]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-0.5">
                            {u.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[200px]">{u.email}</span>
                              </div>
                            )}
                            {u.phone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />
                                {formatPhone(u.phone)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(u.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              u.is_active
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }
                          >
                            {u.is_active ? "Ativo" : "Inativo"}
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
                              <Link href={`/dashboard/usuarios/${u.id}/editar`}>
                                <Edit2 className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={u.is_active ? "Inativar" : "Ativar"}
                              onClick={() => handleToggleActive(u)}
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                            {u.is_active && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Inativar"
                                onClick={() => setDeleteUser(u)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

      <Dialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inativar usuário?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja inativar{" "}
              <span className="font-semibold">{deleteUser?.full_name}</span>?
              O usuário não poderá mais acessar o sistema. Esta ação pode ser revertida
              ativando o usuário novamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteUser(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Inativando..." : "Sim, inativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
