"use client";

import { useState, useMemo } from "react";
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Clock,
  MapPin,
  Building2,
  Trash2,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Truck,
  Wrench,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { AgendaEvent } from "@/types";
import { formatDateTime, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAgendaEvents, useSaveAgendaEvent, useDeleteAgendaEvent } from "@/hooks/useAgenda";
import { useClients } from "@/hooks/useClients";

const EVENT_PRESETS = [
  { title: "Coleta de Extintores", icon: Truck, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { title: "Entrega de Equipamentos", icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200" },
  { title: "Vistoria Técnica / Orçamento", icon: UserCheck, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { title: "Manutenção Preventiva / Teste Mangueiras", icon: Wrench, color: "text-purple-600 bg-purple-50 border-purple-200" },
];

export function AgendaView() {
  const { toast } = useToast();
  const { data: events = [], isLoading } = useAgendaEvents();
  const { data: clients = [] } = useClients();

  const saveMutation = useSaveAgendaEvent();
  const deleteMutation = useDeleteAgendaEvent();

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"todos" | "hoje" | "semana">("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("Coleta de Extintores");
  const [clientId, setClientId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  function handleOpenCreate() {
    setTitle(EVENT_PRESETS[0].title);
    setClientId(clients[0]?.id || "");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const startIso = tomorrow.toISOString().slice(0, 16);
    tomorrow.setHours(10, 30, 0, 0);
    const endIso = tomorrow.toISOString().slice(0, 16);

    setStartsAt(startIso);
    setEndsAt(endIso);
    setLocation("No endereço do cliente");
    setDescription("");
    setIsDialogOpen(true);
  }

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Informe o título do compromisso" });
      return;
    }
    if (!startsAt) {
      toast({ variant: "destructive", title: "Informe a data e horário de início" });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        input: {
          title: title.trim(),
          client_id: clientId || null,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
          location: location.trim() || null,
          description: description.trim() || null,
        },
      });

      toast({ variant: "success", title: "Agendamento salvo com sucesso!" });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao agendar", description: err?.message });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja remover este agendamento?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ variant: "success", title: "Agendamento removido!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao excluir" });
    }
  }

  // Filtragem
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const next7Days = new Date(now);
    next7Days.setDate(next7Days.getDate() + 7);

    return events.filter((ev) => {
      const matchSearch =
        !search ||
        ev.title.toLowerCase().includes(search.toLowerCase()) ||
        (ev.location || "").toLowerCase().includes(search.toLowerCase()) ||
        (ev.client_id && (clientMap.get(ev.client_id) || "").toLowerCase().includes(search.toLowerCase()));

      const evDate = new Date(ev.starts_at);
      const evDateStr = ev.starts_at.slice(0, 10);

      let matchDate = true;
      if (dateFilter === "hoje") {
        matchDate = evDateStr === todayStr;
      } else if (dateFilter === "semana") {
        matchDate = evDate >= now && evDate <= next7Days;
      }

      return matchSearch && matchDate;
    });
  }, [events, search, dateFilter, clientMap]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" />
            Agenda de Visitas & Coletas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle de compromissos técnicos, coletas de extintores, entregas e vistorias.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="h-10">
          <Plus className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, cliente ou local..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant={dateFilter === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilter("todos")}
                className="text-xs"
              >
                Todos
              </Button>
              <Button
                variant={dateFilter === "hoje" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilter("hoje")}
                className="text-xs"
              >
                Hoje
              </Button>
              <Button
                variant={dateFilter === "semana" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilter("semana")}
                className="text-xs"
              >
                Próximos 7 Dias
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Compromissos */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">Carregando compromissos...</div>
      ) : filteredEvents.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarIcon className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-semibold text-lg">Nenhum compromisso agendado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Clique em &quot;Novo Agendamento&quot; para marcar vistorias, coletas ou entregas.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((ev) => {
            const clientName = ev.client_id ? clientMap.get(ev.client_id) : null;
            const isToday = ev.starts_at.slice(0, 10) === new Date().toISOString().slice(0, 10);

            return (
              <Card key={ev.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                {isToday && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">
                    HOJE
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      {ev.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-600 -mr-2 -mt-2"
                      onClick={() => handleDelete(ev.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {clientName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                      <span className="font-medium text-foreground">{clientName}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>Início: {formatDateTime(ev.starts_at)}</span>
                  </div>

                  {ev.location && (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                  )}

                  {ev.description && (
                    <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded mt-2 border">
                      {ev.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Agendamento */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveEvent} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Novo Agendamento
              </DialogTitle>
              <DialogDescription>
                Agende uma visita técnica, coleta de extintores ou entrega.
              </DialogDescription>
            </DialogHeader>

            {/* Presets Rápidos */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipo de Compromisso</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {EVENT_PRESETS.map((p) => (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => setTitle(p.title)}
                    className={`text-[11px] p-2 rounded border text-left font-medium transition-colors ${
                      title === p.title
                        ? "bg-primary text-white border-primary"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Título / Descrição Curta *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Coleta de 10 extintores no Condomínio Solar"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Cliente Vinculado</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente (opcional)" />
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

            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data & Horário Início *</Label>
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Término Estimado</Label>
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Localização / Endereço</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Rua das Flores, 120 - Portaria Central"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Observações Técnicas</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Falar com Sr. Carlos (Síndico). Trazer extintores de reserva."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Confirmar Agendamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
