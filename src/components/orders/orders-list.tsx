"use client";

import { useState, useMemo } from "react";
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  FileText,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOrders, useSaveOrder, useDeleteOrder } from "@/hooks/useOrders";
import { useClients } from "@/hooks/useClients";
import {
  type Order,
  type OrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function OrdersList() {
  const { toast } = useToast();
  const { data: orders = [], isLoading } = useOrders();
  const { data: clients = [] } = useClients();
  const saveMutation = useSaveOrder();
  const deleteMutation = useDeleteOrder();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const [formValues, setFormValues] = useState({
    client_id: "",
    total: 0,
    status: "pendente" as OrderStatus,
    notes: "",
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (clientFilter !== "all" && o.client_id !== clientFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const text = [
          o.client?.name,
          o.notes,
          o.total.toString(),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, clientFilter, search]);

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const pendentes = orders.filter((o) => o.status === "pendente").length;
    const faturados = orders.filter((o) => o.status === "faturado").length;
    return {
      total: orders.length,
      totalRevenue,
      pendentes,
      faturados,
    };
  }, [orders]);

  function handleOpenCreate() {
    setEditingOrder(null);
    setFormValues({
      client_id: clients[0]?.id || "",
      total: 0,
      status: "pendente",
      notes: "",
    });
    setIsFormOpen(true);
  }

  function handleOpenEdit(order: Order) {
    setEditingOrder(order);
    setFormValues({
      client_id: order.client_id,
      total: order.total || 0,
      status: order.status,
      notes: order.notes || "",
    });
    setIsFormOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValues.client_id) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "Selecione um cliente para vincular o pedido.",
      });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        input: {
          client_id: formValues.client_id,
          total: Number(formValues.total) || 0,
          status: formValues.status,
          notes: formValues.notes.trim() || null,
        },
        id: editingOrder ? editingOrder.id : undefined,
      });

      toast({
        variant: "success",
        title: editingOrder ? "Pedido atualizado" : "Pedido criado",
        description: `Pedido de ${formatCurrency(formValues.total)} salvo com sucesso.`,
      });
      setIsFormOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: err?.message || "Não foi possível registrar o pedido.",
      });
    }
  }

  async function handleDelete(order: Order) {
    if (!confirm("Excluir este pedido?")) return;
    try {
      await deleteMutation.mutateAsync(order.id);
      toast({
        variant: "success",
        title: "Excluído",
        description: "Pedido removido com sucesso.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: err?.message || "Não foi possível remover o pedido.",
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-7 w-7 text-indigo-600" />
            Pedidos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie pedidos de venda, recargas em lote, entrega e faturamento de clientes.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="h-10 gap-2">
          <Plus className="h-4 w-4" />
          Novo Pedido
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Registros no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-amber-600">{stats.pendentes}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando entrega/faturamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-emerald-600">{stats.faturados}</div>
            <p className="text-xs text-muted-foreground mt-1">Concluídos e faturados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volume Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-primary">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total em pedidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou observações..."
            className="pl-9 h-10"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-10">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px] h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="faturado">Faturado</SelectItem>
              <SelectItem value="entregue">Entregue</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Pedidos */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Carregando pedidos...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShoppingCart className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-lg">
                  {orders.length === 0 ? "Nenhum pedido cadastrado" : "Nenhum pedido encontrado"}
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {orders.length === 0
                    ? "Crie novos pedidos para registrar vendas, recargas e entregas de equipamentos."
                    : "Tente ajustar os filtros de busca."}
                </p>
              </div>
              {orders.length === 0 && (
                <Button onClick={handleOpenCreate} className="mt-2">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Criar primeiro pedido
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-right w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{order.client?.name || "Cliente avulso"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={ORDER_STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}
                        >
                          {ORDER_STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {order.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEdit(order)}
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(order)}
                            title="Excluir"
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

      {/* Modal de Criação / Edição de Pedido */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                <DialogTitle>
                  {editingOrder ? "Editar Pedido" : "Novo Pedido de Venda / Serviço"}
                </DialogTitle>
              </div>
              <DialogDescription>
                Informe os dados do pedido para controle financeiro e entrega.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Select
                  value={formValues.client_id}
                  onValueChange={(val) => setFormValues((prev) => ({ ...prev, client_id: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valor Total (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formValues.total}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, total: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Status do Pedido</Label>
                  <Select
                    value={formValues.status}
                    onValueChange={(val) =>
                      setFormValues((prev) => ({ ...prev, status: val as OrderStatus }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="faturado">Faturado</SelectItem>
                      <SelectItem value="entregue">Entregue</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Observações / Descrição dos Itens</Label>
                <Textarea
                  rows={3}
                  value={formValues.notes}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ex: 5x Recarga extintor PQS 6kg, 2x Mangueira Tipo 2..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : editingOrder ? "Salvar Alterações" : "Criar Pedido"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
