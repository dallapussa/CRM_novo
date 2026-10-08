"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  ClipboardList,
  Edit2,
  Trash2,
  Eye,
  Filter,
  X,
  User,
  Calendar,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Ban,
  FileDown,
} from "lucide-react";
import { buildServiceOrderPdfDocument } from "@/services/service-order-pdf.service";
import { listServiceOrderItems } from "@/services/service-orders.service";
import { PinModal } from "@/components/ui/pin-modal";
import { isPinRequiredForAction } from "@/services/settings-security.service";
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
import type { ServiceOrder } from "@/types";
import {
  OS_STATUS_LABELS,
  OS_STATUS_COLORS,
  OS_PRIORITY_LABELS,
  OS_PRIORITY_COLORS,
} from "@/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDeleteServiceOrder, useServiceOrders } from "@/hooks/useServiceOrders";
import { useClients } from "@/hooks/useClients";
import { useUsers } from "@/hooks/useUsers";

interface OSListProps {
  initialOrders?: ServiceOrder[];
}

type OSStatusKey = keyof typeof OS_STATUS_LABELS;
type OSPriorityKey = keyof typeof OS_PRIORITY_LABELS;

const STATUS_ICONS: Record<OSStatusKey, typeof Clock> = {
  pendente: Clock,
  andamento: ArrowUpRight,
  atrasada: AlertTriangle,
  concluida: CheckCircle2,
  cancelada: Ban,
};

export function OSList({ initialOrders }: OSListProps = {}) {
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [technicianFilter, setTechnicianFilter] = useState<string>("all");
  const { data: orders = [], isLoading } = useServiceOrders(initialOrders);
  const { data: clients = [] } = useClients();
  const { data: profiles = [] } = useUsers();
  const customers = clients.map(({ id, name }) => ({ id, name }));
  const technicians = profiles.filter((profile) => ["admin", "tecnico"].includes(profile.role) && profile.is_active);
  const [deleteItem, setDeleteItem] = useState<ServiceOrder | null>(null);
  const [pinAction, setPinAction] = useState<(() => void) | null>(null);
  const [pinTitle, setPinTitle] = useState("");
  const [pinDescription, setPinDescription] = useState("");
  const { toast } = useToast();
  const deleteMutation = useDeleteServiceOrder();
  const isDeleting = deleteMutation.isPending;

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (customerFilter !== "all" && o.customer_id !== customerFilter) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (priorityFilter !== "all" && o.priority !== priorityFilter) return false;
      if (technicianFilter !== "all" && o.technician_id !== technicianFilter) return false;
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const customerName = customers.find((c) => c.id === o.customer_id)?.name || "";
        const techName = technicians.find((t) => t.id === o.technician_id)?.full_name || "";
        const haystack = [
          String(o.number),
          o.type,
          o.description,
          customerName,
          techName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [orders, search, customerFilter, statusFilter, priorityFilter, technicianFilter, customers, technicians]);

  async function handleDownloadPdf(o: ServiceOrder) {
    try {
      const items = await listServiceOrderItems(o.id);
      const cli = clients.find((c) => c.id === o.customer_id);
      const formattedEnd = cli?.address
        ? [cli.address.street, cli.address.number, cli.address.neighborhood, cli.address.city, cli.address.state]
            .filter(Boolean)
            .join(", ")
        : "";

      const tech = technicians.find((t) => t.id === o.technician_id);

      const pdfData = {
        numero: String(o.number || "001"),
        status: o.status,
        data_abertura: formatDate(o.created_at),
        data_agendamento: o.scheduled_date ? formatDate(o.scheduled_date) : undefined,
        data_conclusao: o.completed_at ? formatDate(o.completed_at) : undefined,
        tecnico_nome: tech?.full_name || o.technician?.full_name || undefined,
        cliente_nome: cli?.name || o.customer?.name || "Cliente",
        cliente_documento: cli?.document,
        cliente_telefone: cli?.phone1 || cli?.whatsapp,
        cliente_endereco: formattedEnd || undefined,
        itens: items.map((it) => ({
          descricao: it.description,
          quantidade: it.quantity,
          unidade: "un",
        })),
        observacoes: o.description || undefined,
      };

      const { doc, fileName } = await buildServiceOrderPdfDocument(pdfData);
      doc.save(fileName);

      toast({
        variant: "success",
        title: "PDF Operacional gerado!",
        description: `Arquivo ${fileName} baixado sem valores comerciais.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: err?.message,
      });
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;

    const doDelete = async () => {
      try {
        await deleteMutation.mutateAsync(deleteItem.id);
        toast({
          variant: "success",
          title: "OS excluída",
          description: `Ordem de serviço #${deleteItem.number} removida com sucesso.`,
        });
        setDeleteItem(null);
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Erro ao excluir",
          description: err?.message || "Não foi possível excluir a OS.",
        });
      }
    };

    if (isPinRequiredForAction("delete")) {
      setPinTitle("PIN de Exclusão de OS");
      setPinDescription(`Digite seu PIN de 4 dígitos para autorizar a exclusão da OS #${deleteItem.number}.`);
      setPinAction(() => doDelete);
    } else {
      await doDelete();
    }
  }

  function clearFilters() {
    setSearch("");
    setCustomerFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setTechnicianFilter("all");
  }

  const hasActiveFilters =
    search ||
    customerFilter !== "all" ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    technicianFilter !== "all";

  const pendentes = orders.filter((o) => o.status === "pendente").length;
  const andamento = orders.filter((o) => o.status === "andamento").length;
  const concluidas = orders.filter((o) => o.status === "concluida").length;
  const valorTotal = orders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de OS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{orders.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendentes} pendentes · {andamento} em andamento
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-yellow-600">{pendentes}</div>
            <p className="text-xs text-muted-foreground mt-1">aguardando atendimento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-green-600">{concluidas}</div>
            <p className="text-xs text-muted-foreground mt-1">finalizadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento (amostra)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-indigo-600">
              {formatCurrency(valorTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">total em OS</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente ou descrição..."
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {Object.entries(OS_STATUS_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px] h-10">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(OS_PRIORITY_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[170px] h-10">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos clientes</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
              <SelectTrigger className="w-[170px] h-10">
                <SelectValue placeholder="Técnico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos técnicos</SelectItem>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button asChild className="h-10">
            <Link href="/dashboard/os/nova">
              <Plus className="mr-1.5 h-4 w-4" />
              Nova OS
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Carregando ordens de serviço...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-primary">
                <ClipboardList className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-lg">
                  {orders.length === 0
                    ? "Nenhuma OS criada ainda"
                    : "Nenhuma OS encontrada"}
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {orders.length === 0
                    ? "Crie sua primeira Ordem de Serviço para começar a organizar os atendimentos."
                    : "Tente ajustar os filtros de busca."}
                </p>
              </div>
              {orders.length === 0 && (
                <Button asChild className="mt-2">
                  <Link href="/dashboard/os/nova">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Criar primeira OS
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº OS</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Agendamento</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[160px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o) => {
                    const customer = customers.find((c) => c.id === o.customer_id);
                    const tech = technicians.find((t) => t.id === o.technician_id);
                    const statusKey = o.status as OSStatusKey;
                    const priorityKey = o.priority as OSPriorityKey;
                    const StatusIcon = STATUS_ICONS[statusKey] || Clock;
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-semibold">#{o.number}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                              <User className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-medium">{customer?.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{o.type}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(o.scheduled_date)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tech?.full_name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={OS_PRIORITY_COLORS[priorityKey]}
                          >
                            {OS_PRIORITY_LABELS[priorityKey]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(o.total)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={OS_STATUS_COLORS[statusKey]}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {OS_STATUS_LABELS[statusKey]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                              title="Baixar OS Operacional (Sem valores)"
                              onClick={() => handleDownloadPdf(o)}
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Ver detalhes"
                            >
                              <Link href={`/dashboard/os/${o.id}`}>
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
                              <Link href={`/dashboard/os/${o.id}/editar`}>
                                <Edit2 className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Excluir"
                              onClick={() => setDeleteItem(o)}
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
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Ordem de Serviço?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a OS{" "}
              <span className="font-semibold">#{deleteItem?.number}</span>? Esta ação
              remove também os itens vinculados e não pode ser desfeita.
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

      {/* Pin Modal para ações protegidas */}
      {pinAction && (
        <PinModal
          open={Boolean(pinAction)}
          onOpenChange={(op: boolean) => {
            if (!op) setPinAction(null);
          }}
          title={pinTitle}
          description={pinDescription}
          onSuccess={() => {
            const act = pinAction;
            setPinAction(null);
            act();
          }}
        />
      )}
    </div>
  );
}
