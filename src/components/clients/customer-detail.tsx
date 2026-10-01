"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Edit2,
  UserCheck,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  ClipboardList,
  FireExtinguisher,
  Calendar,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Customer, ServiceOrder } from "@/types";
import {
  OS_STATUS_COLORS,
  OS_STATUS_LABELS,
} from "@/types";
import {
  formatCurrency,
  formatDate,
  formatDocument,
  formatPhone,
} from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useDeleteClient } from "@/hooks/useClients";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CustomerDetailProps {
  customer: Customer;
  serviceOrders: (ServiceOrder & {
    technician?: { full_name: string | null } | null;
  })[];
  extinguishersCount: number;
  openInvoicesCount: number;
  totalRevenue: number;
}

export function CustomerDetail({
  customer,
  serviceOrders,
  extinguishersCount,
  openInvoicesCount,
  totalRevenue,
}: CustomerDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showDelete, setShowDelete] = useState(false);
  const deleteMutation = useDeleteClient();
  const isDeleting = deleteMutation.isPending;

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(customer.id);
      toast({
        variant: "success",
        title: "Cliente excluído",
        description: "Cliente removido com sucesso.",
      });
      router.push("/dashboard/clientes");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description:
          err?.message ||
          "Verifique se há OS ou extintores vinculados a este cliente.",
      });
    } finally {
      setShowDelete(false);
    }
  }

  const address = customer.address;
  const hasAddress =
    address &&
    (address.street || address.city || address.neighborhood || address.cep);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9">
            <Link href="/dashboard/clientes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
                {customer.name}
              </h1>
              <Badge
                variant="outline"
                className={
                  customer.type === "pj"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-sky-50 text-sky-700 border-sky-200"
                }
              >
                {customer.type === "pj" ? (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> PJ
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3" /> PF
                  </span>
                )}
              </Badge>
              <Badge
                variant="outline"
                className={
                  customer.is_active
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                }
              >
                {customer.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastrado em {formatDate(customer.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Excluir
          </Button>
          <Button asChild>
            <Link href={`/dashboard/clientes/${customer.id}/editar`}>
              <Edit2 className="mr-1.5 h-4 w-4" />
              Editar Cadastro
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ordens de Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">
              {serviceOrders.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de OS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total em OS</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Extintores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">
              {extinguishersCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Equipamentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Financeiro em aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-orange-600">
              {openInvoicesCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">fatura(s)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base">Documentos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {customer.type === "pj" ? "CNPJ" : "CPF"}
                </p>
                <p className="font-mono font-semibold">
                  {formatDocument(customer.document)}
                </p>
              </div>
              {customer.ie_rg && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {customer.type === "pj" ? "Inscrição Estadual" : "RG"}
                  </p>
                  <p className="font-semibold">{customer.ie_rg}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base">Contato</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">{formatPhone(customer.phone1)}</p>
                  <p className="text-xs text-muted-foreground">Principal</p>
                </div>
              </div>
              {customer.phone2 && (
                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">{formatPhone(customer.phone2)}</p>
                    <p className="text-xs text-muted-foreground">Secundário</p>
                  </div>
                </div>
              )}
              {customer.email && (
                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <a
                      href={`mailto:${customer.email}`}
                      className="font-semibold hover:underline text-primary"
                    >
                      {customer.email}
                    </a>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {hasAddress && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-base">Endereço</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 text-sm">
                  {address?.street && (
                    <p>
                      <span className="text-muted-foreground">
                        {address.street}
                      </span>
                      {address?.number && (
                        <span>, {address.number}</span>
                      )}
                    </p>
                  )}
                  {address?.complement && (
                    <p className="text-muted-foreground">{address.complement}</p>
                  )}
                  {address?.neighborhood && (
                    <p>{address.neighborhood}</p>
                  )}
                  {(address?.city || address?.state) && (
                    <p>
                      {address?.city}
                      {address?.city && address?.state && " - "}
                      {address?.state}
                    </p>
                  )}
                  {address?.cep && (
                    <p className="font-mono text-xs text-muted-foreground mt-2">
                      CEP: {address.cep}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {customer.notes && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-base">Observações</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {customer.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-base">
                    Últimas Ordens de Serviço
                  </CardTitle>
                </div>
                <CardDescription>
                  Histórico de serviços do cliente
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard/os/novo">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nova OS
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {serviceOrders.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <ClipboardList className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="font-semibold">Nenhuma OS criada</p>
                    <p className="text-sm text-muted-foreground">
                      Assim que a primeira OS for criada, aparecerá aqui.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Técnico</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceOrders.slice(0, 10).map((os) => {
                        const statusKey = os.status;
                        return (
                          <TableRow
                            key={os.id}
                            className="cursor-pointer"
                            onClick={() =>
                              router.push(`/dashboard/os/${os.id}`)
                            }
                          >
                            <TableCell className="font-mono font-semibold">
                              #{os.number.toString().padStart(4, "0")}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(os.scheduled_date)}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {os.type}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={OS_STATUS_COLORS[statusKey]}
                              >
                                {OS_STATUS_LABELS[statusKey]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {os.technician?.full_name || "—"}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(os.total)}
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <div className="flex items-center gap-2">
                  <FireExtinguisher className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-base">Extintores</CardTitle>
                </div>
                <CardDescription>Equipamentos cadastrados</CardDescription>
              </div>
              <Button asChild size="sm" variant="ghost" disabled>
                <Link href={`/dashboard/extintores?customer=${customer.id}`}>
                  Ver todos
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="py-4 text-center">
                {extinguishersCount === 0 ? (
                  <div className="space-y-2">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                      <FireExtinguisher className="h-7 w-7" />
                    </div>
                    <p className="font-semibold">Nenhum extintor cadastrado</p>
                    <p className="text-sm text-muted-foreground">
                      Cadastre os equipamentos do cliente.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl font-bold font-display">
                      {extinguishersCount}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      extintor(es) vinculado(s)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showDelete} onOpenChange={(o) => !o && setShowDelete(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cliente?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{" "}
              <span className="font-semibold">{customer.name}</span>? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDelete(false)}
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
