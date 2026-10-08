"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
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
  FileDown,
  Layers,
  Building2,
  User,
  Wrench,
  Flame,
  Package,
  Sparkles,
  ExternalLink,
  Shield,
  HelpCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Quote, QuoteItem, QuoteStatus, Customer, Product } from "@/types";
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
import { useProducts } from "@/hooks/useProducts";
import {
  listExtinguisherModels,
  ExtinguisherModel,
} from "@/services/extinguisher-catalog.service";
import {
  listQuoteTemplates,
  QuoteTemplate,
} from "@/services/quote-templates.service";
import { buildQuotePdfDocument } from "@/services/quote-pdf.service";
import { QuickClientModal } from "@/components/clients/quick-client-modal";
import { QuoteTemplateModal } from "@/components/quotes/quote-template-modal";
import { PinModal } from "@/components/ui/pin-modal";
import { isPinRequiredForAction } from "@/services/settings-security.service";

interface ItemRow {
  catalog_item_id?: string;
  description: string;
  tipo_origem?: "extintor" | "catalogo" | "avulso";
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export function QuotesList() {
  const { toast } = useToast();
  const { data: quotes = [], isLoading } = useQuotes();
  const { data: clients = [] } = useClients();
  const { data: products = [] } = useProducts();

  const saveMutation = useSaveQuote();
  const deleteMutation = useDeleteQuote();
  const statusMutation = useUpdateQuoteStatus();
  const convertMutation = useConvertQuoteToOS();

  // Modelos de Orçamento e Extintores sincronizados com Aba Custos
  const [extinguisherModels, setExtinguisherModels] = useState<ExtinguisherModel[]>([]);
  const [quoteTemplates, setQuoteTemplates] = useState<QuoteTemplate[]>([]);

  useEffect(() => {
    listExtinguisherModels().then(setExtinguisherModels).catch(console.warn);
    listQuoteTemplates().then(setQuoteTemplates).catch(console.warn);
  }, []);

  function refreshTemplates() {
    listQuoteTemplates().then(setQuoteTemplates).catch(console.warn);
  }

  // Filtros de listagem
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  // Modal de Criação / Edição
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [condicoesPagamento, setCondicoesPagamento] = useState("");
  const [termosGarantia, setTermosGarantia] = useState("");
  const [clausulaPpci, setClausulaPpci] = useState("");

  const [items, setItems] = useState<ItemRow[]>([
    {
      description: "Recarga de Extintor Pó Químico ABC 4kg",
      tipo_origem: "extintor",
      quantity: 1,
      unit: "un",
      unit_price: 45,
      total: 45,
    },
  ]);

  // Modais auxiliares
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [viewQuote, setViewQuote] = useState<Quote | null>(null);

  // Estados de busca para botões de itens
  const [extinguisherSearch, setExtinguisherSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [isExtinguisherMenuOpen, setIsExtinguisherMenuOpen] = useState(false);
  const [isCatalogMenuOpen, setIsCatalogMenuOpen] = useState(false);

  // Confirmação para converter em OS ao Aprovar
  const [pendingApprovalQuote, setPendingApprovalQuote] = useState<Quote | null>(null);

  // PIN de Segurança
  const [pinAction, setPinAction] = useState<(() => void) | null>(null);
  const [pinTitle, setPinTitle] = useState("");
  const [pinDescription, setPinDescription] = useState("");

  // Cliente selecionado atualmente no formulário
  const currentClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Autocomplete de clientes filtrados
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm.trim()) return clients.slice(0, 8);
    const term = clientSearchTerm.toLowerCase().trim();
    return clients.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const doc = (c.document || "").replace(/\D/g, "");
      const email = (c.email || "").toLowerCase();
      return name.includes(term) || doc.includes(term) || email.includes(term);
    }).slice(0, 10);
  }, [clients, clientSearchTerm]);

  // Totais calculados
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  }, [items]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - (Number(discount) || 0));
  }, [subtotal, discount]);

  // Produtos cadastrados no catálogo (exclui recargas e serviços de extintor)
  const registeredProductsOnly = useMemo(() => {
    return products.filter((p) => {
      if (p.category === "Extintor") return false;
      if (p.type === "servico") return false;
      const name = (p.name || "").toLowerCase();
      if (name.includes("recarga") || name.includes("carga")) return false;
      return true;
    });
  }, [products]);

  // Extintores filtrados por busca
  const filteredExtinguishers = useMemo(() => {
    if (!extinguisherSearch.trim()) return extinguisherModels;
    const term = extinguisherSearch.toLowerCase().trim();
    return extinguisherModels.filter(
      (m) =>
        m.nome.toLowerCase().includes(term) ||
        (m.agente && m.agente.toLowerCase().includes(term)) ||
        (m.capacidade && m.capacidade.toLowerCase().includes(term))
    );
  }, [extinguisherModels, extinguisherSearch]);

  // Produtos cadastrados filtrados por busca
  const filteredCatalogProducts = useMemo(() => {
    if (!catalogSearch.trim()) return registeredProductsOnly;
    const term = catalogSearch.toLowerCase().trim();
    return registeredProductsOnly.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term))
    );
  }, [registeredProductsOnly, catalogSearch]);

  // Estatísticas do topo
  const stats = useMemo(() => {
    const totalCount = quotes.length;
    const totalAmount = quotes.reduce((acc, q) => acc + Number(q.total || 0), 0);
    const approvedCount = quotes.filter((q) => q.status === "Aprovado" || q.status === "Convertido").length;
    const pendingCount = quotes.filter((q) => q.status === "Rascunho" || q.status === "Enviado").length;
    return { totalCount, totalAmount, approvedCount, pendingCount };
  }, [quotes]);

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
    setSelectedClientId("");
    setClientSearchTerm("");
    setSelectedTemplateId("");

    const in15Days = new Date();
    in15Days.setDate(in15Days.getDate() + 15);
    setExpiresAt(in15Days.toISOString().slice(0, 10));

    setDiscount(0);
    setNotes("Proposta comercial para prestação de serviços de prevenção e segurança contra incêndio.");
    setCondicoesPagamento("À vista ou em até 30 dias após emissão da Nota Fiscal.");
    setTermosGarantia("Garantia de 12 meses na recarga e testes conforme normas técnicas do Inmetro.");
    setClausulaPpci("Emissão de documentação e conformidade técnica para vistoria do Corpo de Bombeiros Militar.");

    setItems([
      {
        description: "Recarga / Carga Completa Extintor Pó ABC 4kg",
        tipo_origem: "extintor",
        quantity: 5,
        unit: "un",
        unit_price: 45,
        total: 225,
      },
    ]);
    setIsFormOpen(true);
  }

  function handleOpenEdit(quote: Quote) {
    setEditingQuoteId(quote.id);
    setSelectedClientId(quote.client_id);
    const cli = clients.find((c) => c.id === quote.client_id);
    setClientSearchTerm(cli?.name || "");

    setExpiresAt(quote.expires_at ? quote.expires_at.slice(0, 10) : "");
    setDiscount(Number(quote.discount) || 0);
    setNotes(quote.notes || "");

    // Busca itens do orçamento
    import("@/services/quotes.service").then(({ getQuote }) => {
      getQuote(quote.id)
        .then(({ items: fetchedItems }) => {
          if (fetchedItems && fetchedItems.length > 0) {
            setItems(
              fetchedItems.map((it) => ({
                catalog_item_id: it.catalog_item_id || undefined,
                description: it.description,
                tipo_origem: "avulso",
                quantity: it.quantity,
                unit: it.unit,
                unit_price: it.unit_price,
                total: it.total,
              }))
            );
          }
        })
        .catch(console.warn);
    });

    setIsFormOpen(true);
  }

  // Aplica um Modelo de Orçamento
  function applyTemplate(template: QuoteTemplate) {
    setSelectedTemplateId(template.id);
    if (template.validade_dias) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + template.validade_dias);
      setExpiresAt(expDate.toISOString().slice(0, 10));
    }
    if (template.condicoes_pagamento) setCondicoesPagamento(template.condicoes_pagamento);
    if (template.termos_garantia) setTermosGarantia(template.termos_garantia);
    if (template.clausula_ppci) setClausulaPpci(template.clausula_ppci);

    if (template.itens_padrao && template.itens_padrao.length > 0) {
      setItems(
        template.itens_padrao.map((it) => ({
          description: it.descricao,
          tipo_origem: it.tipo_origem,
          quantity: it.quantidade,
          unit: it.unidade || "un",
          unit_price: it.valor_unitario,
          total: (it.quantidade || 1) * (it.valor_unitario || 0),
        }))
      );
    }

    toast({
      variant: "success",
      title: `Modelo "${template.nome}" aplicado!`,
      description: "Itens, condições e prazos foram carregados no formulário.",
    });
  }

  // Adição de itens
  function handleAddExtinguisher(model: ExtinguisherModel) {
    setItems((prev) => [
      ...prev,
      {
        description: `Recarga / Manutenção ${model.nome}`,
        tipo_origem: "extintor",
        quantity: 1,
        unit: "un",
        unit_price: model.preco_padrao || 45,
        total: model.preco_padrao || 45,
      },
    ]);
    toast({
      variant: "default",
      title: "Extintor adicionado",
      description: `${model.nome} inserido com preço padrão da Aba Custos.`,
    });
  }

  function handleAddCatalogProduct(product: Product) {
    setItems((prev) => [
      ...prev,
      {
        catalog_item_id: product.id,
        description: product.name,
        tipo_origem: "catalogo",
        quantity: 1,
        unit: product.unit || "un",
        unit_price: product.sale_price || 0,
        total: product.sale_price || 0,
      },
    ]);
    toast({
      variant: "default",
      title: "Item do catálogo adicionado",
      description: `${product.name} (${formatCurrency(product.sale_price)})`,
    });
  }

  function handleAddBlankItem() {
    setItems((prev) => [
      ...prev,
      {
        description: "",
        tipo_origem: "avulso",
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

  // Salvar Orçamento
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

    const saveAction = async () => {
      try {
        const fullNotes = [
          notes.trim(),
          condicoesPagamento ? `Pagamento: ${condicoesPagamento}` : "",
          termosGarantia ? `Garantia: ${termosGarantia}` : "",
          clausulaPpci ? `PPCI: ${clausulaPpci}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        await saveMutation.mutateAsync({
          id: editingQuoteId || undefined,
          input: {
            client_id: selectedClientId,
            template_id: selectedTemplateId || null,
            expires_at: expiresAt || null,
            subtotal,
            discount: Number(discount) || 0,
            total,
            notes: fullNotes,
            items: items.map((it) => ({
              catalog_item_id: it.catalog_item_id || null,
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
          description: `Valor total: ${formatCurrency(total)}`,
        });
        setIsFormOpen(false);
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Erro ao salvar orçamento",
          description: err?.message,
        });
      }
    };

    // Não solicita PIN para fazer ou salvar orçamento
    await saveAction();
  }

  // Alteração de Status com Gatilho Operacional (OS)
  async function handleChangeStatus(quote: Quote, newStatus: QuoteStatus) {
    if (newStatus === "Aprovado") {
      setPendingApprovalQuote(quote);
      return;
    }

    try {
      await statusMutation.mutateAsync({ id: quote.id, status: newStatus });
      toast({ variant: "success", title: `Status alterado para ${newStatus}` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao alterar status" });
    }
  }

  // Confirmação de Aprovação com Geração de OS
  async function handleConfirmApproval(generateOS: boolean) {
    if (!pendingApprovalQuote) return;
    const q = pendingApprovalQuote;
    setPendingApprovalQuote(null);

    try {
      if (generateOS) {
        await convertMutation.mutateAsync(q.id);
        toast({
          variant: "success",
          title: "Orçamento Aprovado e Convertido!",
          description: `Ordem de Serviço gerada com sucesso para ${q.customer?.name}.`,
        });
      } else {
        await statusMutation.mutateAsync({ id: q.id, status: "Aprovado" });
        toast({
          variant: "success",
          title: "Orçamento Aprovado!",
          description: "Status atualizado sem criação imediata de OS.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro no fluxo de aprovação",
        description: err?.message,
      });
    }
  }

  // Exclusão com proteção por PIN se configurado
  function handleDelete(id: string) {
    const doDelete = async () => {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ variant: "success", title: "Orçamento excluído!" });
      } catch (err: any) {
        toast({ variant: "destructive", title: "Erro ao excluir" });
      }
    };

    if (isPinRequiredForAction("delete")) {
      setPinTitle("PIN de Exclusão");
      setPinDescription("Digite seu PIN de 4 dígitos para autorizar a exclusão deste orçamento.");
      setPinAction(() => doDelete);
    } else {
      if (confirm("Tem certeza que deseja excluir este orçamento?")) {
        doDelete();
      }
    }
  }

  // Download do PDF do Orçamento
  async function handleDownloadPdf(quote: Quote) {
    try {
      const cli = clients.find((c) => c.id === quote.client_id);
      const { getQuote } = await import("@/services/quotes.service");
      const { items: quoteItems } = await getQuote(quote.id);

      const formattedEnd = cli?.address
        ? [cli.address.street, cli.address.number, cli.address.neighborhood, cli.address.city, cli.address.state]
            .filter(Boolean)
            .join(", ")
        : "";

      const pdfData = {
        numero: String(quote.number || "001"),
        status: quote.status,
        data_emissao: formatDate(quote.issued_at),
        data_validade: quote.expires_at ? formatDate(quote.expires_at) : undefined,
        cliente_nome: cli?.name || quote.customer?.name || "Cliente",
        cliente_documento: cli?.document,
        cliente_telefone: cli?.phone1 || cli?.whatsapp || undefined,
        cliente_email: cli?.email || undefined,
        cliente_endereco: formattedEnd || undefined,
        itens: quoteItems.map((it) => ({
          descricao: it.description,
          quantidade: it.quantity,
          unidade: it.unit,
          preco_unitario: it.unit_price,
          total: it.total,
        })),
        subtotal: quote.subtotal,
        desconto: quote.discount,
        total: quote.total,
        observacoes: quote.notes || undefined,
      };

      const { doc, fileName } = await buildQuotePdfDocument(pdfData);
      doc.save(fileName);

      toast({
        variant: "success",
        title: "PDF gerado com sucesso!",
        description: `Arquivo ${fileName} baixado.`,
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7 text-primary" />
            Gestão de Orçamentos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie propostas personalizadas integradas ao Catálogo e Aba Custos, com geração de PDF e conversão em OS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsTemplateModalOpen(true)}
            className="h-10 border-orange-200 hover:bg-orange-50 text-orange-700"
          >
            <Layers className="mr-2 h-4 w-4" />
            Modelos de Orçamento
          </Button>
          <Button onClick={handleOpenCreate} className="h-10">
            <Plus className="mr-2 h-4 w-4" />
            Novo Orçamento
          </Button>
        </div>
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
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total cotado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Aprovados / Convertidos
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.approvedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Taxa de fechamento positiva</p>
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
            <div className="text-2xl font-bold text-amber-600">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Rascunhos e Enviados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente ou observações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 h-10">
            <SelectValue placeholder="Filtrar por Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="Rascunho">Rascunho</SelectItem>
            <SelectItem value="Enviado">Enviado</SelectItem>
            <SelectItem value="Aprovado">Aprovado</SelectItem>
            <SelectItem value="Convertido">Convertido em OS</SelectItem>
            <SelectItem value="Recusado">Recusado</SelectItem>
            <SelectItem value="Cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full sm:w-56 h-10">
            <SelectValue placeholder="Filtrar por Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Clientes</SelectItem>
            {clients.filter((c) => Boolean(c && c.id)).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name || "Cliente sem nome"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela de Orçamentos */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Carregando orçamentos...</div>
          ) : filteredQuotes.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                <FileSpreadsheet className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-lg">Nenhum orçamento encontrado</p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Crie sua primeira proposta comercial ou ajuste os filtros acima.
                </p>
              </div>
              <Button onClick={handleOpenCreate} className="mt-2">
                <Plus className="mr-1.5 h-4 w-4" />
                Criar Primeiro Orçamento
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Emissão / Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right w-[200px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((q) => {
                  const isConvertido = q.status === "Convertido";
                  const isAprovado = q.status === "Aprovado";

                  return (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono font-bold text-sm text-primary">
                        #{q.number}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-sm">{q.customer?.name || "Cliente sem nome"}</div>
                        {q.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{q.notes}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{formatDate(q.issued_at)}</div>
                        {q.expires_at && (
                          <div className="text-muted-foreground text-[11px]">
                            Vence: {formatDate(q.expires_at)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={q.status || "Rascunho"}
                          onValueChange={(val) => handleChangeStatus(q, val as QuoteStatus)}
                          disabled={isConvertido}
                        >
                          <SelectTrigger className="w-[130px] h-7 text-xs font-medium">
                            <SelectValue>
                              <Badge variant="outline" className={`${QUOTE_STATUS_COLORS[q.status] || "bg-gray-100 text-gray-700"} border-0`}>
                                {QUOTE_STATUS_LABELS[q.status] || q.status}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Rascunho">Rascunho</SelectItem>
                            <SelectItem value="Enviado">Enviado</SelectItem>
                            <SelectItem value="Aprovado">Aprovado</SelectItem>
                            <SelectItem value="Recusado">Recusado</SelectItem>
                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                            <SelectItem value="Convertido">Convertido em OS</SelectItem>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-sm">
                        {formatCurrency(q.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Baixar PDF Formatado */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Baixar PDF Oficial"
                            onClick={() => handleDownloadPdf(q)}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>

                          {/* Se Aprovado, atalho direto para Converter em OS */}
                          {isAprovado && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Gerar Ordem de Serviço (OS)"
                              onClick={() => setPendingApprovalQuote(q)}
                            >
                              <FileCheck className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Editar */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Editar Orçamento"
                            onClick={() => handleOpenEdit(q)}
                          >
                            <Edit2 className="h-4 w-4" />
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

      {/* Modal de Criação / Edição do Orçamento */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <form onSubmit={handleSave} className="space-y-5">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  {editingQuoteId ? "Editar Orçamento Comercial" : "Novo Orçamento Comercial"}
                </DialogTitle>
                <Badge variant="outline" className="text-xs">
                  {editingQuoteId ? "Modo Edição" : "Novo Rascunho"}
                </Badge>
              </div>
              <DialogDescription>
                Selecione o cliente com preenchimento automático, adicione itens do Catálogo ou Extintores da Aba Custos e emita o PDF oficial.
              </DialogDescription>
            </DialogHeader>

            {/* SEÇÃO 1: CLIENTE (Autocomplete e Botão de Cadastro Ágil) */}
            <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                  <Building2 className="h-4 w-4" /> Cliente / Tomador dos Serviços *
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuickClientOpen(true)}
                  className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> + Cadastrar Novo Cliente
                </Button>
              </div>

              {/* Autocomplete Search */}
              <div className="relative">
                <Input
                  value={clientSearchTerm}
                  onChange={(e) => {
                    setClientSearchTerm(e.target.value);
                    setIsClientDropdownOpen(true);
                  }}
                  onFocus={() => setIsClientDropdownOpen(true)}
                  placeholder="Digite o nome, razão social ou CNPJ para buscar..."
                  className="h-9 text-xs"
                />

                {isClientDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-popover border rounded-md shadow-md divide-y">
                    {filteredClients.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedClientId(c.id);
                          setClientSearchTerm(c.name);
                          setIsClientDropdownOpen(false);
                        }}
                        className="p-2 text-xs hover:bg-accent cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {c.document || "Doc não inf."} • {c.phone1 || c.whatsapp || "Sem telefone"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {c.type === "pj" ? "PJ" : "PF"}
                        </Badge>
                      </div>
                    ))}
                    {filteredClients.length === 0 && (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        Nenhum cliente encontrado. Clique em "+ Cadastrar Novo Cliente".
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Snapshot do cliente selecionado */}
              {currentClient && (
                <div className="text-xs p-2.5 rounded-md bg-background border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-foreground">{currentClient.name}</span>
                    <span className="text-muted-foreground ml-2">CNPJ/CPF: {currentClient.document || "—"}</span>
                    {currentClient.phone1 && (
                      <span className="text-muted-foreground ml-2">• Tel: {currentClient.phone1}</span>
                    )}
                  </div>
                  {currentClient.address && (
                    <div className="text-[11px] text-muted-foreground line-clamp-1">
                      Local: {[currentClient.address.street, currentClient.address.number, currentClient.address.city]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SEÇÃO 2: MODELO DE ORÇAMENTO & VALIDADE */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Aplicar Modelo de Orçamento (Opcional)</Label>
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="text-[11px] text-orange-600 hover:underline flex items-center gap-1"
                  >
                    <Layers className="h-3 w-3" /> Gerenciar Modelos
                  </button>
                </div>
                <Select
                  value={selectedTemplateId || undefined}
                  onValueChange={(val) => {
                    const t = quoteTemplates.find((x) => x.id === val);
                    if (t) applyTemplate(t);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione um pacote pré-configurado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {quoteTemplates.filter((tpl) => Boolean(tpl && tpl.id)).map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.nome} ({(tpl.itens_padrao || []).length} itens)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Validade da Proposta</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* SEÇÃO 3: ADICIONAR ITENS (EXTINTORES DA ABA CUSTOS, CATÁLOGO, AVULSO) */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label className="text-sm font-semibold">Itens e Serviços da Proposta</Label>
                  <p className="text-xs text-muted-foreground">
                    Selecione extintores sincronizados com a Aba Custos, produtos do Catálogo ou insira itens avulsos.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Seletor Rápido de Extintor com Busca */}
                  <DropdownMenu open={isExtinguisherMenuOpen} onOpenChange={setIsExtinguisherMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100 font-medium"
                      >
                        <Flame className="mr-1.5 h-3.5 w-3.5 text-orange-600" />
                        + Extintor
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-80 p-2"
                      align="start"
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="relative mb-2 px-1">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Buscar extintor..."
                          value={extinguisherSearch}
                          onChange={(e) => setExtinguisherSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 pl-8 text-xs"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-0.5">
                        {filteredExtinguishers.length === 0 ? (
                          <div className="py-4 text-center text-xs text-muted-foreground">
                            Nenhum extintor encontrado.
                          </div>
                        ) : (
                          filteredExtinguishers.map((m) => (
                            <DropdownMenuItem
                              key={m.id}
                              onClick={() => {
                                handleAddExtinguisher(m);
                                setExtinguisherSearch("");
                                setIsExtinguisherMenuOpen(false);
                              }}
                              className="flex items-center justify-between text-xs cursor-pointer py-1.5 px-2"
                            >
                              <span className="truncate font-medium">{m.nome}</span>
                              <span className="font-semibold text-emerald-600 ml-2 whitespace-nowrap">
                                {formatCurrency(m.preco_padrao)}
                              </span>
                            </DropdownMenuItem>
                          ))
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Seletor do Catálogo de Produtos com Busca (Apenas produtos cadastrados, sem recargas) */}
                  <DropdownMenu open={isCatalogMenuOpen} onOpenChange={setIsCatalogMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 font-medium"
                      >
                        <Package className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                        + Item do Catálogo
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-80 p-2"
                      align="start"
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="relative mb-2 px-1">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Buscar produto cadastrado..."
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 pl-8 text-xs"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-0.5">
                        {filteredCatalogProducts.length === 0 ? (
                          <div className="py-4 text-center text-xs text-muted-foreground">
                            {registeredProductsOnly.length === 0
                              ? "Nenhum produto cadastrado no catálogo (cadastre na aba Produtos)."
                              : "Nenhum produto cadastrado encontrado."}
                          </div>
                        ) : (
                          filteredCatalogProducts.map((p) => (
                            <DropdownMenuItem
                              key={p.id}
                              onClick={() => {
                                handleAddCatalogProduct(p);
                                setCatalogSearch("");
                                setIsCatalogMenuOpen(false);
                              }}
                              className="flex items-center justify-between text-xs cursor-pointer py-1.5 px-2"
                            >
                              <span className="truncate font-medium">{p.name}</span>
                              <span className="font-semibold text-emerald-600 ml-2 whitespace-nowrap">
                                {formatCurrency(p.sale_price)}
                              </span>
                            </DropdownMenuItem>
                          ))
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Item Avulso */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddBlankItem}
                    className="h-8 text-xs"
                  >
                    <PlusCircle className="mr-1 h-3.5 w-3.5" /> Item Avulso
                  </Button>
                </div>
              </div>

              {/* Lista dos Itens Digitados */}
              <div className="border rounded-md divide-y bg-muted/20">
                {items.map((it, idx) => (
                  <div key={idx} className="p-2.5 grid gap-2 sm:grid-cols-12 items-center">
                    <div className="sm:col-span-6 space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-muted-foreground">Descrição do Item / Serviço</Label>
                        {it.tipo_origem && (
                          <span className="text-[9px] text-muted-foreground uppercase">
                            Origem: {it.tipo_origem}
                          </span>
                        )}
                      </div>
                      <Input
                        value={it.description}
                        onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                        placeholder="Ex: Recarga Extintor Pó ABC 4kg ou Vistoria Técnica"
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Qtd</Label>
                      <Input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Valor Unit. (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={it.unit_price}
                        onChange={(e) => handleUpdateItem(idx, "unit_price", e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between pt-3">
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

            {/* SEÇÃO 4: CONDIÇÕES & RESUMO FINANCEIRO */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Condições Comerciais e Normas</Label>
                <div className="space-y-1.5">
                  <Input
                    value={condicoesPagamento}
                    onChange={(e) => setCondicoesPagamento(e.target.value)}
                    placeholder="Condição de pagamento (Ex: 30 dias após NF ou Entrada + 30 dias)"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={termosGarantia}
                    onChange={(e) => setTermosGarantia(e.target.value)}
                    placeholder="Garantia (Ex: 12 meses na recarga e conformidade Inmetro)"
                    className="h-8 text-xs"
                  />
                  <Textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações adicionais ou escopo do trabalho..."
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/40 rounded-lg space-y-2 flex flex-col justify-center">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal dos itens:</span>
                  <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Desconto concedido (R$):</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="w-24 h-7 text-xs font-mono text-right"
                  />
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2 text-primary">
                  <span>VALOR TOTAL:</span>
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

      {/* MODAL DE CADASTRO ÁGIL DE CLIENTE */}
      <QuickClientModal
        open={isQuickClientOpen}
        onOpenChange={setIsQuickClientOpen}
        onClientCreated={(newCli) => {
          setSelectedClientId(newCli.id);
          setClientSearchTerm(newCli.name);
          setIsClientDropdownOpen(false);
        }}
      />

      {/* GERENCIADOR DE MODELOS DE ORÇAMENTO */}
      <QuoteTemplateModal
        open={isTemplateModalOpen}
        onOpenChange={setIsTemplateModalOpen}
        templates={quoteTemplates}
        onTemplatesUpdated={refreshTemplates}
        onSelectTemplate={applyTemplate}
      />

      {/* GATILHO OPERACIONAL: DIALOG AO APROVAR ORÇAMENTO */}
      {pendingApprovalQuote && (
        <Dialog open={Boolean(pendingApprovalQuote)} onOpenChange={() => setPendingApprovalQuote(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                Aprovar Orçamento #{pendingApprovalQuote.number}
              </DialogTitle>
              <DialogDescription>
                O orçamento para <strong>{pendingApprovalQuote.customer?.name}</strong> foi aprovado com sucesso!
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 bg-emerald-50 rounded-lg text-xs text-emerald-900 space-y-2 border border-emerald-200">
              <p className="font-semibold">Deseja gerar automaticamente uma Ordem de Serviço (OS)?</p>
              <p className="text-[11px] text-emerald-800">
                A OS herdará o cliente, os itens de manutenção/recarga e o valor total ({formatCurrency(pendingApprovalQuote.total)}), ficando pronta para agendamento da equipe técnica.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => handleConfirmApproval(false)}
              >
                Apenas Marcar como Aprovado
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleConfirmApproval(true)}
              >
                Sim, Gerar Ordem de Serviço
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL DE VALIDAÇÃO DE PIN DE SEGURANÇA */}
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
