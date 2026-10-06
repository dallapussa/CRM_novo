"use client";

import { useState, useMemo } from "react";
import {
  Waves,
  Plus,
  Search,
  Filter,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Edit2,
  Trash2,
  FileText,
  Clock,
  Printer,
} from "lucide-react";
import { LabelPrinterDialog, type LabelTarget } from "@/components/labels/label-printer-dialog";
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
import { useHoses, useSaveHose, useDeleteHose } from "@/hooks/useHoses";
import { useClients } from "@/hooks/useClients";
import { useSaveBenchRecord } from "@/hooks/useBench";
import {
  type Hose,
  type HoseType,
  HOSE_TYPES,
  HOSE_LENGTHS,
  HOSE_DIAMETERS,
} from "@/types";
import { formatDate } from "@/lib/utils";

export function HosesList() {
  const { toast } = useToast();
  const { data: hoses = [], isLoading } = useHoses();
  const { data: clients = [] } = useClients();
  const saveMutation = useSaveHose();
  const deleteMutation = useDeleteHose();
  const saveBenchMutation = useSaveBenchRecord();

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHose, setEditingHose] = useState<Hose | null>(null);
  const [printTarget, setPrintTarget] = useState<LabelTarget | null>(null);

  const [formValues, setFormValues] = useState({
    client_id: "",
    tipo: "Tipo 2" as HoseType,
    comprimento: 15,
    diametro_polegadas: "1 1/2\"",
    numero_serie: "",
    patrimonio: "",
    localizacao: "",
    fabricante: "",
    last_test_at: "",
    next_test_at: "",
    status: "Ativo",
    observacoes: "",
  });

  // Filtros
  const filteredHoses = useMemo(() => {
    return hoses.filter((h) => {
      if (clientFilter !== "all" && h.client_id !== clientFilter) return false;
      if (statusFilter !== "all" && h.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const text = [
          h.tipo,
          h.patrimonio,
          h.numero_serie,
          h.localizacao,
          h.client?.name,
          h.observacoes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [hoses, clientFilter, statusFilter, search]);

  // Contadores
  const stats = useMemo(() => {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);

    let overdue = 0;
    let expiringSoon = 0;
    hoses.forEach((h) => {
      if (h.next_test_at) {
        const due = new Date(h.next_test_at);
        if (due < now) overdue++;
        else if (due <= in30Days) expiringSoon++;
      }
    });
    return {
      total: hoses.length,
      overdue,
      expiringSoon,
    };
  }, [hoses]);

  function handleOpenCreate() {
    setEditingHose(null);
    const today = new Date().toISOString().slice(0, 10);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().slice(0, 10);

    setFormValues({
      client_id: clients[0]?.id || "",
      tipo: "Tipo 2",
      comprimento: 15,
      diametro_polegadas: "1 1/2\"",
      numero_serie: "",
      patrimonio: "",
      localizacao: "",
      fabricante: "",
      last_test_at: today,
      next_test_at: nextYearStr,
      status: "Ativo",
      observacoes: "",
    });
    setIsFormOpen(true);
  }

  function handleOpenEdit(hose: Hose) {
    setEditingHose(hose);
    setFormValues({
      client_id: hose.client_id,
      tipo: (hose.tipo as HoseType) || "Tipo 2",
      comprimento: hose.comprimento || 15,
      diametro_polegadas: hose.diametro_polegadas || "1 1/2\"",
      numero_serie: hose.numero_serie || "",
      patrimonio: hose.patrimonio || "",
      localizacao: hose.localizacao || "",
      fabricante: hose.fabricante || "",
      last_test_at: hose.last_test_at ? hose.last_test_at.slice(0, 10) : "",
      next_test_at: hose.next_test_at ? hose.next_test_at.slice(0, 10) : "",
      status: hose.status || "Ativo",
      observacoes: hose.observacoes || "",
    });
    setIsFormOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValues.client_id) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "Selecione um cliente para vincular a mangueira.",
      });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        input: {
          client_id: formValues.client_id,
          tipo: formValues.tipo,
          comprimento: Number(formValues.comprimento),
          diametro_polegadas: formValues.diametro_polegadas,
          numero_serie: formValues.numero_serie.trim() || null,
          patrimonio: formValues.patrimonio.trim() || null,
          localizacao: formValues.localizacao.trim() || null,
          fabricante: formValues.fabricante.trim() || null,
          last_test_at: formValues.last_test_at || null,
          next_test_at: formValues.next_test_at || null,
          status: formValues.status,
          observacoes: formValues.observacoes.trim() || null,
        },
        id: editingHose ? editingHose.id : undefined,
      });

      toast({
        variant: "success",
        title: editingHose ? "Mangueira atualizada" : "Mangueira cadastrada",
        description: `Mangueira ${formValues.tipo} (${formValues.comprimento}m) salva com sucesso.`,
      });
      setIsFormOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: err?.message || "Não foi possível salvar a mangueira.",
      });
    }
  }

  async function handleDelete(hose: Hose) {
    if (!confirm(`Excluir a mangueira "${hose.tipo} - ${hose.patrimonio || 'Sem patrimônio'}"?`)) return;
    try {
      await deleteMutation.mutateAsync(hose.id);
      toast({
        variant: "success",
        title: "Excluída",
        description: "Mangueira removida com sucesso.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: err?.message || "Não foi possível remover a mangueira.",
      });
    }
  }

  // Enviar mangueira diretamente para a bancada de manutenção
  async function handleSendToBench(hose: Hose) {
    try {
      await saveBenchMutation.mutateAsync({
        input: {
          client_id: hose.client_id,
          hose_id: hose.id,
          customer_name: hose.client?.name || "Cliente",
          equip_type: `Mangueira ${hose.tipo} (${hose.comprimento}m - ${hose.diametro_polegadas})`,
          equip_capacity: `${hose.comprimento}m`,
          equip_serial: hose.patrimonio || hose.numero_serie || "S/N",
          stage: "entrada",
          priority: "media",
          notes: `Enviada para teste hidrostático anual (NBR 12779). Local: ${hose.localizacao || "Não informada"}.`,
        },
      });

      toast({
        variant: "success",
        title: "Enviada para a Bancada!",
        description: "A mangueira agora está na etapa de Entrada da oficina.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: err?.message || "Não foi possível registrar na bancada.",
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight flex items-center gap-2">
            <Waves className="h-7 w-7 text-sky-600" />
            Mangueiras de Incêndio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle de mangueiras prediais e industriais, ensaios hidrostáticos anuais (NBR 12779) e validades.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="h-10 gap-2">
          <Plus className="h-4 w-4" />
          Nova Mangueira
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Mangueiras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Equipamentos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencendo em 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-amber-600">{stats.expiringSoon}</div>
            <p className="text-xs text-muted-foreground mt-1">Teste anual a vencer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Testes Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground mt-1">Necessitam teste imediato</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por patrimônio, tipo, cliente ou localização..."
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
            <SelectTrigger className="w-full sm:w-[140px] h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Aprovada">Aprovada</SelectItem>
              <SelectItem value="Em teste">Em teste</SelectItem>
              <SelectItem value="Reprovada">Reprovada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Mangueiras */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Carregando mangueiras...</div>
          ) : filteredHoses.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Waves className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-lg">
                  {hoses.length === 0 ? "Nenhuma mangueira cadastrada" : "Nenhuma mangueira encontrada"}
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {hoses.length === 0
                    ? "Cadastre as mangueiras dos clientes para controlar os ensaios hidrostáticos anuais."
                    : "Tente ajustar os filtros de busca."}
                </p>
              </div>
              {hoses.length === 0 && (
                <Button onClick={handleOpenCreate} className="mt-2">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Cadastrar primeira mangueira
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mangueira / Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Último Ensaio</TableHead>
                    <TableHead>Próximo Ensaio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[160px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHoses.map((hose) => {
                    const isOverdue = Boolean(hose.next_test_at && new Date(hose.next_test_at) < new Date());
                    return (
                      <TableRow key={hose.id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-foreground flex items-center gap-1.5">
                              {hose.tipo} · {hose.comprimento}m ({hose.diametro_polegadas})
                            </p>
                            {hose.patrimonio && (
                              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                Patr: {hose.patrimonio}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate max-w-[180px]">
                              {hose.client?.name || "Sem cliente"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {hose.localizacao || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(hose.last_test_at)}
                        </TableCell>
                        <TableCell>
                          {hose.next_test_at ? (
                            <div className="flex items-center gap-1 text-sm font-medium">
                              {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />}
                              <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
                                {formatDate(hose.next_test_at)}
                              </span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              hose.status === "Aprovada" || hose.status === "Ativo"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : hose.status === "Reprovada"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }
                          >
                            {hose.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                              onClick={() => setPrintTarget({ kind: "hose", data: hose })}
                              title="Imprimir Etiqueta"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                              onClick={() => handleSendToBench(hose)}
                              title="Enviar mangueira para Bancada / Oficina"
                            >
                              <Wrench className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEdit(hose)}
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(hose)}
                              title="Excluir"
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

      {/* Modal de Cadastro / Edição */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Waves className="h-5 w-5 text-sky-600" />
                <DialogTitle>
                  {editingHose ? "Editar Mangueira" : "Nova Mangueira de Incêndio"}
                </DialogTitle>
              </div>
              <DialogDescription>
                Informe os dados técnicos da mangueira para controle e teste hidrostático.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Cliente */}
              <div className="space-y-1.5">
                <Label>Cliente Vinculado *</Label>
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

              {/* Tipo, Comprimento e Diâmetro */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo *</Label>
                  <Select
                    value={formValues.tipo}
                    onValueChange={(val) => setFormValues((prev) => ({ ...prev, tipo: val as HoseType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOSE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Comprimento</Label>
                  <Select
                    value={formValues.comprimento.toString()}
                    onValueChange={(val) =>
                      setFormValues((prev) => ({ ...prev, comprimento: Number(val) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOSE_LENGTHS.map((l) => (
                        <SelectItem key={l} value={l.toString()}>
                          {l} metros
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Diâmetro</Label>
                  <Select
                    value={formValues.diametro_polegadas}
                    onValueChange={(val) =>
                      setFormValues((prev) => ({ ...prev, diametro_polegadas: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOSE_DIAMETERS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Patrimônio / Número de Série e Localização */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nº Patrimônio / Série</Label>
                  <Input
                    value={formValues.patrimonio}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, patrimonio: e.target.value }))}
                    placeholder="Ex: MG-0042"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Localização / Abrigo</Label>
                  <Input
                    value={formValues.localizacao}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, localizacao: e.target.value }))}
                    placeholder="Ex: Abrigo 1 - Térreo"
                  />
                </div>
              </div>

              {/* Datas de Ensaio */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Último Ensaio Hidrostático</Label>
                  <Input
                    type="date"
                    value={formValues.last_test_at}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormValues((prev) => {
                        let next = prev.next_test_at;
                        if (val) {
                          const d = new Date(val);
                          d.setFullYear(d.getFullYear() + 1);
                          next = d.toISOString().slice(0, 10);
                        }
                        return { ...prev, last_test_at: val, next_test_at: next };
                      });
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Próximo Ensaio (Validade Anual)</Label>
                  <Input
                    type="date"
                    value={formValues.next_test_at}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, next_test_at: e.target.value }))}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label>Status Operacional</Label>
                <Select
                  value={formValues.status}
                  onValueChange={(val) => setFormValues((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo / Aprovada</SelectItem>
                    <SelectItem value="Em teste">Em manutenção / Teste</SelectItem>
                    <SelectItem value="Reprovada">Reprovada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea
                  rows={2}
                  value={formValues.observacoes}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Informações adicionais sobre união, engate Storz, etc..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? "Salvando..."
                  : editingHose
                  ? "Salvar Alterações"
                  : "Cadastrar Mangueira"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <LabelPrinterDialog
        open={!!printTarget}
        onOpenChange={(o) => !o && setPrintTarget(null)}
        target={printTarget}
      />
    </div>
  );
}
