"use client";

import { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  FileCheck,
  Trash2,
  Edit2,
  DollarSign,
  Printer,
  ArrowRight,
  PlusCircle,
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
import type { Quote, QuoteItem, QuoteStatus } from "@/types";
import { QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  useQuotes,
  useSaveQuote,
  useDeleteQuote,
  useUpdateQuoteStatus,
  useConvertQuoteToOS,
} from "@/hooks/useQuotes";
import { useClients } from "@/hooks/useClients";

interface ItemRow {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export function QuotesList() {
  const { toast } = useToast();
  const { data: quotes = [], isLoading } = useQuotes();
  const { data: clients = [] } = useClients();

  const saveMutation = useSaveQuote();
  const deleteMutation = useDeleteQuote();
  const statusMutation = useUpdateQuoteStatus();
  const convertMutation = useConvertQuoteToOS();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  // Modal de Criação / Edição
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    {
      description: "Recarga de Extintor Pó Químico ABC 4kg / 6kg",
      quantity: 1,
      unit: "un",
      unit_price: 65,
      total: 65,
    },
  ]);

  // Modal de Visualização / Impressão
  const [viewQuote, setViewQuote] = useState<Quote | null>(null);

  // Totais calculados dos itens
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  }, [items]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - (Number(discount) || 0));
  }, [subtotal, discount]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalCount = quotes.length;
    const totalAmount = quotes.reduce((acc, q) => acc + Number(q.total || 0), 0);
    const approvedCount = quotes.filter((q) => q.status === "Aprovado" || q.status === "Convertido").length;
    const pendingCount = quotes.filter((q) => q.status === "Rascunho" || q.status === "Enviado").length;
    return { totalCount, totalAmount, approvedCount, pendingCount };
  }, [quotes]);

  // Filtros de listagem
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchSearch =
        !search ||
        String(q.number).includes(search) ||
        (q.customer?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (q.notes || "").toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === "all" || q.status === statusFilter;
      const matchClient = clientFilter === "all" || q.client_id === clientFilter;

      return matchSearch && matchStatus && matchClient;
    });
  }, [quotes, search, statusFilter, clientFilter]);

  function handleOpenCreate() {
    setEditingQuoteId(null);
    setSelectedClientId(clients[0]?.id || "");
    const in15Days = new Date();
    in15Days.setDate(in15Days.getDate() + 15);
    setExpiresAt(in15Days.toISOString().slice(0, 10));
    setDiscount(0);
    setNotes("Proposta válida por 15 dias. Pagamento em até 30 dias após emissão da NF.");
    setItems([
      {
        description: "Recarga de Extintor Pó Químico ABC 4kg / 6kg",
        quantity: 5,
        unit: "un",
        unit_price: 65,
        total: 325,
      },
      {
        description: "Teste Hidrostático NBR 12779 Mangueira Tipo 2",
        quantity: 2,
        unit: "un",
        unit_price: 90,
        total: 180,
      },
    ]);
    setIsFormOpen(true);
  }

  function handleAddItem() {
    setItems((prev) => [
      ...prev,
      {
        description: "",
        quantity: 1,
        unit: "un",
        unit_price: 0,
        total: 0,
      },
    ]);
  }

  function handleUpdateItem(index: number, field: keyof ItemRow, val: any) {
    setItems((prev) => {
      const copy = [...prev];
      const it = { ...copy[index], [field]: val };
      if (field === "quantity" || field === "unit_price") {
        const q = field === "quantity" ? Number(val) : it.quantity;
        const p = field === "unit_price" ? Number(val) : it.unit_price;
        it.total = (q || 0) * (p || 0);
      }
      copy[index] = it;
      return copy;
    });
  }

  function handleRemoveItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClientId) {
      toast({ variant: "destructive", title: "Selecione um cliente" });
      return;
    }
    if (items.some((it) => !it.description.trim())) {
      toast({ variant: "destructive", title: "Preencha a descrição de todos os itens" });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        id: editingQuoteId || undefined,
        input: {
          client_id: selectedClientId,
          expires_at: expiresAt || null,
          subtotal,
          discount: Number(discount) || 0,
          total,
          notes,
          items: items.map((it) => ({
            description: it.description.trim(),
            quantity: Number(it.quantity) || 1,
            unit: it.unit || "un",
            unit_price: Number(it.unit_price) || 0,
            total: Number(it.total) || 0,
          })),
        },
      });

      toast({
        variant: "success",
        title: editingQuoteId ? "Orçamento atualizado!" : "Orçamento criado com sucesso!",
      });
      setIsFormOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar orçamento",
        description: err?.message,
      });
    }
  }

  async function handleChangeStatus(id: string, status: QuoteStatus) {
    try {
      await statusMutation.mutateAsync({ id, status });
      toast({ variant: "success", title: `Status alterado para ${status}` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao alterar status" });
    }
  }

  async function handleConvert(quote: Quote) {
    if (!confirm(`Deseja converter o Orçamento #${quote.number} em uma nova Ordem de Serviço (OS)?`)) {
      return;
    }
    try {
      await convertMutation.mutateAsync(quote.id);
      toast({
        variant: "success",
        title: "Orçamento Convertido!",
        description: `Ordem de Serviço criada com sucesso para ${quote.customer?.name}.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao converter",
        description: err?.message,
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este orçamento?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ variant: "success", title: "Orçamento excluído!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao excluir" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7 text-primary" />
            Gestão de Orçamentos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie cotações comerciais de recargas e equipamentos com conversão direta em Ordem de Serviço.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="h-10">
          <Plus className="mr-2 h-4 w-4" />
          Novo Orçamento
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total de Propostas
            </CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Orçamentos gerados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Volume em Propostas
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              {formatCurrency(stats.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Soma de todos os orçamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Aprovados / Convertidos
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.approvedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Propostas ganhas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Em Aberto / Negociação
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando decisão do cliente</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente ou termos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[180px] h-9">
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
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Rascunho">Rascunho</SelectItem>
                  <SelectItem value="Enviado">Enviado</SelectItem>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Convertido">Convertido em OS</SelectItem>
                  <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Orçamentos */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando orçamentos...</div>
          ) : filteredQuotes.length === 0 ? (
            <div className="p-12 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-lg">Nenhum orçamento encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em &quot;Novo Orçamento&quot; para elaborar uma proposta comercial.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[180px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((q) => {
                  const statusColor =
                    QUOTE_STATUS_COLORS[q.status] || "bg-gray-100 text-gray-700 border-gray-200";

                  return (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono font-bold text-xs text-primary">
                        #{q.number}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {q.customer?.name || "Sem cliente"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(q.issued_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {q.expires_at ? formatDate(q.expires_at) : "—"}
                      </TableCell>
                      <TableCell className="font-bold text-sm text-foreground">
                        {formatCurrency(q.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor}>
                          {QUOTE_STATUS_LABELS[q.status] || q.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Converter para OS */}
                          {q.status !== "Convertido" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 text-xs font-medium"
                              title="Converter este orçamento em Ordem de Serviço"
                              onClick={() => handleConvert(q)}
                            >
                              <ArrowRight className="h-3.5 w-3.5 mr-1" />
                              Gerar OS
                            </Button>
                          )}

                          {/* Alterar Status */}
                          <Select
                            value={q.status}
                            onValueChange={(val) => handleChangeStatus(q.id, val as QuoteStatus)}
                          >
                            <SelectTrigger className="h-8 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Rascunho">Rascunho</SelectItem>
                              <SelectItem value="Enviado">Enviado</SelectItem>
                              <SelectItem value="Aprovado">Aprovado</SelectItem>
                              <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Visualizar / Imprimir */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Visualizar Proposta"
                            onClick={() => setViewQuote(q)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>

                          {/* Excluir */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Excluir Orçamento"
                            onClick={() => handleDelete(q.id)}
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

      {/* Modal de Criação de Orçamento */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                {editingQuoteId ? "Editar Orçamento" : "Novo Orçamento Comercial"}
              </DialogTitle>
              <DialogDescription>
                Selecione o cliente, adicione os itens de recarga ou serviços e defina as condições.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
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

              <div className="space-y-1.5">
                <Label>Validade da Proposta</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>

            {/* Tabela Dinâmica de Itens */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Itens do Orçamento (Serviços e Peças)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-7 text-xs flex items-center gap-1"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Adicionar Item
                </Button>
              </div>

              <div className="border rounded-md divide-y bg-muted/20">
                {items.map((it, idx) => (
                  <div key={idx} className="p-3 grid gap-2 md:grid-cols-12 items-center">
                    <div className="md:col-span-6 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Descrição do Item / Serviço</Label>
                      <Input
                        value={it.description}
                        onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                        placeholder="Ex: Recarga Extintor ABC 4kg..."
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Qtd</Label>
                      <Input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Valor Unit. (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={it.unit_price}
                        onChange={(e) => handleUpdateItem(idx, "unit_price", e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-between pt-4">
                      <span className="font-bold text-xs text-foreground font-mono">
                        {formatCurrency(it.total)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:bg-red-50"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subtotais e Desconto */}
            <div className="grid gap-4 md:grid-cols-2 pt-2">
              <div className="space-y-1.5">
                <Label>Condições e Observações</Label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Prazo de entrega, garantia Inmetro, condições de pagamento..."
                  className="text-xs"
                />
              </div>

              <div className="p-4 bg-muted/40 rounded-lg space-y-2 flex flex-col justify-center">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Desconto (R$):</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="w-24 h-7 text-xs font-mono text-right"
                  />
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2 text-primary">
                  <span>Total Final:</span>
                  <span className="font-mono">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar Orçamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Impressão / Visualização da Proposta */}
      {viewQuote && (
        <Dialog open={Boolean(viewQuote)} onOpenChange={() => setViewQuote(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Proposta Comercial #{viewQuote.number}</span>
                <Badge variant="outline" className={QUOTE_STATUS_COLORS[viewQuote.status]}>
                  {QUOTE_STATUS_LABELS[viewQuote.status] || viewQuote.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                ExtinControl — Prevenção e Combate a Incêndio
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 border rounded-md bg-white text-slate-800 space-y-4">
              <div className="flex justify-between border-b pb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-bold text-sm text-foreground">{viewQuote.customer?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Emissão</p>
                  <p className="text-xs font-semibold">{formatDate(viewQuote.issued_at)}</p>
                  {viewQuote.expires_at && (
                    <p className="text-[11px] text-amber-700">Validade: {formatDate(viewQuote.expires_at)}</p>
                  )}
                </div>
              </div>

              <div className="py-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Condições Gerais</p>
                <p className="text-xs text-slate-600 whitespace-pre-wrap">{viewQuote.notes || "Sem observações adicionais."}</p>
              </div>

              <div className="flex justify-end pt-3 border-t">
                <div className="text-right space-y-1">
                  <p className="text-xs text-muted-foreground">Valor Total da Proposta</p>
                  <p className="text-2xl font-bold text-primary font-mono">{formatCurrency(viewQuote.total)}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir / PDF
              </Button>
              <Button onClick={() => setViewQuote(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
