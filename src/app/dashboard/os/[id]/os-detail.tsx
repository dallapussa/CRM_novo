"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Edit2,
  Printer,
  ClipboardList,
  User,
  UserCheck,
  Calendar,
  Clock,
  FileText,
  Package,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ArrowUpRight,
  MapPin,
  Phone,
  Mail,
  Save,
  Camera,
  Upload,
  FileDown,
} from "lucide-react";
import { buildServiceOrderPdfDocument } from "@/services/service-order-pdf.service";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type {
  ServiceOrder,
  ServiceOrderItem,
  Customer,
  Profile,
  OSStatus,
} from "@/types";
import {
  OS_STATUS_LABELS,
  OS_STATUS_COLORS,
  OS_PRIORITY_LABELS,
  OS_PRIORITY_COLORS,
  OS_PERIOD_LABELS,
} from "@/types";
import { formatCurrency, formatDate, formatDateTime, formatPhone, formatDocument } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useServiceOrderPhotos, useUpdateServiceOrder, useUploadServiceOrderPhoto } from "@/hooks/useServiceOrders";

type OSStatusKey = keyof typeof OS_STATUS_LABELS;
type OSPriorityKey = keyof typeof OS_PRIORITY_LABELS;

const STATUS_ICONS: Record<OSStatusKey, typeof Clock> = {
  pendente: Clock,
  andamento: ArrowUpRight,
  atrasada: AlertTriangle,
  concluida: CheckCircle2,
  cancelada: Ban,
};

interface OSDetailProps {
  order: ServiceOrder;
  items: ServiceOrderItem[];
  customer: Customer | null;
  technician: Profile | null;
}

const statusUpdateSchema = z.object({
  status: z.enum(["pendente", "andamento", "atrasada", "concluida", "cancelada"]),
  arrival_time: z.string().optional(),
  departure_time: z.string().optional(),
  technical_report: z.string().optional(),
  cancellation_reason: z.string().optional(),
});

export function OSDetail({ order, items, customer, technician }: OSDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photosQuery = useServiceOrderPhotos(order.id);
  const updateMutation = useUpdateServiceOrder();
  const uploadPhotoMutation = useUploadServiceOrderPhoto();
  const photos = photosQuery.data ?? [];
  const isLoadingPhotos = photosQuery.isLoading;
  const isUpdating = updateMutation.isPending;
  const isUploadingPhoto = uploadPhotoMutation.isPending;
  const [status, setStatus] = useState<OSStatus>(order.status);
  const [arrivalTime, setArrivalTime] = useState(order.arrival_time || "");
  const [departureTime, setDepartureTime] = useState(order.departure_time || "");
  const [technicalReport, setTechnicalReport] = useState(order.technical_report || "");
  const [cancellationReason, setCancellationReason] = useState(order.cancellation_reason || "");

  const subtotal = items.reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);

  const statusKey = status as OSStatusKey;
  const priorityKey = order.priority as OSPriorityKey;
  const StatusIcon = STATUS_ICONS[statusKey] || Clock;

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    if (!extensions[file.type]) {
      toast({
        variant: "destructive",
        title: "Formato não suportado",
        description: "Envie uma imagem JPG, PNG ou WebP.",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Imagem muito grande",
        description: "O limite por foto é de 10 MB.",
      });
      return;
    }

    try {
      await uploadPhotoMutation.mutateAsync({ id: order.id, file });
      toast({ variant: "success", title: "Foto adicionada à OS" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar foto",
        description: error instanceof Error ? error.message : "Não foi possível salvar a imagem.",
      });
    }
  }

  async function handleUpdateStatus() {
    try {
      const payload: any = {
        status,
        arrival_time: arrivalTime || null,
        departure_time: departureTime || null,
        technical_report: technicalReport?.trim() || null,
      };
      if (status === "cancelada") {
        payload.cancellation_reason = cancellationReason?.trim() || null;
      }
      if (status === "concluida" && !order.completed_at) {
        payload.completed_at = new Date().toISOString();
      }

      const parsed = statusUpdateSchema.safeParse({
        status,
        arrival_time: arrivalTime,
        departure_time: departureTime,
        technical_report: technicalReport,
        cancellation_reason: cancellationReason,
      });
      if (!parsed.success) {
        const errs = parsed.error.issues.map((i) => i.message).join(", ");
        throw new Error(errs);
      }

      await updateMutation.mutateAsync({ id: order.id, patch: payload });

      toast({
        variant: "success",
        title: "OS atualizada!",
        description: "Status e informações atualizados com sucesso.",
      });
      router.refresh();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: err?.message || "Não foi possível atualizar a OS.",
      });
    }
  }

  async function handleDownloadPdf() {
    try {
      const formattedEnd = customer?.address
        ? [
            customer.address.street,
            customer.address.number,
            customer.address.neighborhood,
            customer.address.city,
            customer.address.state,
          ]
            .filter(Boolean)
            .join(", ")
        : "";

      const pdfData = {
        numero: String(order.number || "001"),
        status: order.status,
        data_abertura: formatDate(order.created_at),
        data_agendamento: order.scheduled_date ? formatDate(order.scheduled_date) : undefined,
        data_conclusao: order.completed_at ? formatDate(order.completed_at) : undefined,
        tecnico_nome: technician?.full_name || order.technician?.full_name || undefined,
        cliente_nome: customer?.name || "Cliente",
        cliente_documento: customer?.document,
        cliente_telefone: customer?.phone1 || customer?.whatsapp,
        cliente_endereco: formattedEnd || undefined,
        itens: items.map((it) => ({
          descricao: it.description,
          quantidade: it.quantity,
          unidade: "un",
        })),
        observacoes: order.description || technicalReport || undefined,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9">
            <Link href="/dashboard/os">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
                OS #{order.number}
              </h1>
              <Badge variant="outline" className={OS_STATUS_COLORS[statusKey]}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {OS_STATUS_LABELS[statusKey]}
              </Badge>
              <Badge variant="outline" className={OS_PRIORITY_COLORS[priorityKey]}>
                {OS_PRIORITY_LABELS[priorityKey]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Criada em {formatDateTime(order.created_at)} · Tipo: {order.type}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/os/${order.id}/editar`}>
              <Edit2 className="mr-1.5 h-4 w-4" />
              Editar OS
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <FileDown className="mr-1.5 h-4 w-4" />
            PDF Operacional (Sem valores)
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base">Cliente</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-lg">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.type === "pj" ? "PJ" : "PF"} · {formatDocument(customer.document)}
                      {customer.ie_rg && ` · ${customer.type === "pj" ? "IE" : "RG"}: ${customer.ie_rg}`}
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/clientes/${customer.id}`}>
                      Ver perfil do cliente
                    </Link>
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  {customer.phone1 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-green-600" />
                      {formatPhone(customer.phone1)}
                      {customer.phone2 && (
                        <span className="text-muted-foreground">· {formatPhone(customer.phone2)}</span>
                      )}
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-blue-600" />
                      {customer.email}
                    </div>
                  )}
                  {customer.address && (
                    <div className="sm:col-span-2 flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-orange-600 mt-0.5" />
                      <span>
                        {customer.address.street && `${customer.address.street}`}
                        {customer.address.number && `, ${customer.address.number}`}
                        {customer.address.complement && ` - ${customer.address.complement}`}
                        {customer.address.neighborhood && ` · ${customer.address.neighborhood}`}
                        {customer.address.city && ` · ${customer.address.city}`}
                        {customer.address.state && `/${customer.address.state}`}
                        {customer.address.cep && ` · CEP ${customer.address.cep}`}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-red-600" />
              <CardTitle className="text-base">Agendamento</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Data:</span>{" "}
              <span className="font-medium">{formatDate(order.scheduled_date)}</span>
            </div>
            {order.scheduled_period && (
              <div>
                <span className="text-muted-foreground">Período:</span>{" "}
                <span className="font-medium">{OS_PERIOD_LABELS[order.scheduled_period]}</span>
              </div>
            )}
            <Separator />
            <div>
              <span className="text-muted-foreground">Técnico:</span>{" "}
              <span className="font-medium">{technician?.full_name || "Não atribuído"}</span>
            </div>
            {order.completed_at && (
              <div>
                <span className="text-muted-foreground">Concluída em:</span>{" "}
                <span className="font-medium text-green-700">{formatDateTime(order.completed_at)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-base">Descrição do Serviço</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{order.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-base">Fotos da execução</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Registros visuais vinculados a esta ordem de serviço.
            </CardDescription>
          </div>
          <>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handlePhotoUpload}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingPhoto}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploadingPhoto ? "Enviando..." : "Adicionar foto"}
            </Button>
          </>
        </CardHeader>
        <CardContent>
          {isLoadingPhotos ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Carregando fotos...
            </p>
          ) : photos.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              Nenhuma foto foi adicionada a esta OS.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.signedUrl || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-md border border-border/60 bg-muted/30"
                >
                  {photo.signedUrl ? (
                    <Image
                      src={photo.signedUrl}
                      alt={photo.caption || "Foto da execução"}
                      width={640}
                      height={480}
                      unoptimized
                      className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground">
                      <Camera className="h-6 w-6" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="truncate text-xs font-medium">
                      {photo.caption || "Foto da execução"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(photo.created_at)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base">Itens da OS</CardTitle>
            </div>
            <CardDescription>Produtos e serviços executados</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
              Nenhum item adicionado nesta OS.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[100px]">Tipo</TableHead>
                      <TableHead className="w-[90px] text-right">Qtd</TableHead>
                      <TableHead className="w-[130px] text-right">Unit.</TableHead>
                      <TableHead className="w-[130px] text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="text-sm">{i.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            i.type === "produto"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : i.type === "mao_obra"
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }>
                            {i.type === "produto" ? "Produto" : i.type === "mao_obra" ? "Mão de Obra" : "Serviço"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">{i.quantity}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(i.unit_price)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(i.total_price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-end gap-2 pt-2">
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-semibold w-32 text-right">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-muted-foreground">Desconto:</span>
                  <span className="font-semibold w-32 text-right text-red-600">- {formatCurrency(order.discount)}</span>
                </div>
                <div className="flex items-center gap-6 pt-1 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold font-display w-32 text-right text-green-700">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-green-600" />
            <CardTitle className="text-base">Atualização de Status & Execução</CardTitle>
          </div>
          <CardDescription>Atualize o andamento da OS, registre horários e relatório técnico.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status da OS</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as OSStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OS_STATUS_LABELS).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Horário de Chegada</Label>
              <Input
                type="datetime-local"
                value={arrivalTime?.slice(0, 16) || ""}
                onChange={(e) => setArrivalTime(e.target.value ? new Date(e.target.value).toISOString() : "")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Horário de Saída</Label>
              <Input
                type="datetime-local"
                value={departureTime?.slice(0, 16) || ""}
                onChange={(e) => setDepartureTime(e.target.value ? new Date(e.target.value).toISOString() : "")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Relatório Técnico</Label>
            <Textarea
              rows={5}
              value={technicalReport || ""}
              onChange={(e) => setTechnicalReport(e.target.value)}
              placeholder="Descreva o que foi feito, observações, medições, peças trocadas, etc."
            />
          </div>

          {status === "cancelada" && (
            <div className="space-y-1.5">
              <Label>Motivo do Cancelamento *</Label>
              <Textarea
                rows={3}
                value={cancellationReason || ""}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Informe o motivo do cancelamento da OS"
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={handleUpdateStatus} disabled={isUpdating}>
              <Save className="mr-2 h-4 w-4" />
              {isUpdating ? "Salvando..." : "Salvar Atualizações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações Internas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
