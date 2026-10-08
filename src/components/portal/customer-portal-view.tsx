"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  FireExtinguisher,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  MessageCircle,
  Phone,
  Building,
  MapPin,
  ClipboardList,
  DollarSign,
  Check,
  X,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCheck,
  UserCheck,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  getLoggedCustomer,
  loadCustomerPortalData,
  customerApproveQuote,
  customerRejectQuote,
  type CustomerPortalData,
} from "@/services/customer-portal.service";
import { buildQuotePdfDocument, type QuotePdfData } from "@/services/quote-pdf.service";
import { AnexoDView } from "./anexo-d-view";
import type { Customer, ExtintorInventario, Quote, QuoteItem } from "@/types";

type PortalQuote = Quote & { items: QuoteItem[] };

export function CustomerPortalView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CustomerPortalData | null>(null);
  const [activeTab, setActiveTab] = useState("recargas");

  // Filtros de extintores
  const [extFilter, setExtFilter] = useState<"todos" | "vencendo" | "vencidos" | "em_dia">("todos");
  const [extSearch, setExtSearch] = useState("");

  // Expansão de orçamentos
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);

  // Modais de Aprovação e Recusa de Orçamento
  const [quoteToApprove, setQuoteToApprove] = useState<PortalQuote | null>(null);
  const [approvalNote, setApprovalNote] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  const [quoteToReject, setQuoteToReject] = useState<PortalQuote | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const [downloadingQuoteId, setDownloadingQuoteId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const logged = await getLoggedCustomer();
      if (!logged.customer) {
        setData(null);
        return;
      }
      const portalData = await loadCustomerPortalData(logged.customer.id);
      setData(portalData);
    } catch (err) {
      console.error("Erro ao carregar portal:", err);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as informações do seu painel.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Handler de aprovação
  async function handleConfirmApprove() {
    if (!quoteToApprove || !data?.customer) return;
    setIsApproving(true);
    try {
      await customerApproveQuote(quoteToApprove.id, data.customer.name, approvalNote);
      toast({
        variant: "success",
        title: "Orçamento Aprovado!",
        description: `O orçamento nº ${quoteToApprove.number} foi aprovado com sucesso. Nossa equipe entrará em contato!`,
      });
      setQuoteToApprove(null);
      setApprovalNote("");
      await loadData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao aprovar orçamento",
        description: err.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsApproving(false);
    }
  }

  // Handler de recusa
  async function handleConfirmReject() {
    if (!quoteToReject || !data?.customer) return;
    if (!rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Informe o motivo",
        description: "Por favor, especifique o motivo da recusa da proposta.",
      });
      return;
    }
    setIsRejecting(true);
    try {
      await customerRejectQuote(quoteToReject.id, data.customer.name, rejectionReason);
      toast({
        variant: "success",
        title: "Orçamento Atualizado",
        description: `O orçamento nº ${quoteToReject.number} foi marcado como recusado.`,
      });
      setQuoteToReject(null);
      setRejectionReason("");
      await loadData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar proposta",
        description: err.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsRejecting(false);
    }
  }

  // Download do PDF do orçamento
  async function handleDownloadPdf(quote: Quote & { items: any[] }) {
    if (!data) return;
    setDownloadingQuoteId(quote.id);
    try {
      const pdfPayload: QuotePdfData = {
        numero: String(quote.number || "1"),
        status: quote.status,
        data_emissao: quote.issued_at ? formatDate(quote.issued_at) : formatDate(quote.created_at),
        data_validade: quote.expires_at ? formatDate(quote.expires_at) : undefined,
        cliente_nome: data.customer.name,
        cliente_razao_social: data.customer.name,
        cliente_documento: data.customer.document || undefined,
        cliente_telefone: data.customer.phone1 || data.customer.whatsapp || undefined,
        cliente_email: data.customer.email || undefined,
        cliente_endereco: data.customer.address
          ? `${data.customer.address.street || ""}, ${data.customer.address.number || "S/N"} - ${
              data.customer.address.city || ""
            }`
          : undefined,
        subtotal: quote.subtotal,
        desconto: quote.discount,
        total: quote.total,
        observacoes: quote.notes || undefined,
        responsavel_nome: data.company.nome,
        itens: (quote.items || []).map((it) => ({
          descricao: it.description,
          quantidade: it.quantity,
          unidade: it.unit || "un",
          preco_unitario: it.unit_price,
          total: it.total,
        })),
      };

      const { doc, fileName } = await buildQuotePdfDocument(pdfPayload);
      doc.save(fileName);
      toast({
        variant: "success",
        title: "Download Iniciado",
        description: `PDF do Orçamento nº ${quote.number} baixado com sucesso!`,
      });
    } catch (err: any) {
      console.error("Erro ao gerar PDF do orçamento:", err);
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o arquivo PDF do orçamento.",
      });
    } finally {
      setDownloadingQuoteId(null);
    }
  }

  // Filtragem de extintores
  const now = new Date();
  const in30Days = new Date(Date.now() + 30 * 86400000);

  const filteredExtinguishers = (data?.extinguishers || []).filter((ext) => {
    // Filtro de texto
    const searchMatch =
      extSearch.trim() === "" ||
      ext.identificacao?.toLowerCase().includes(extSearch.toLowerCase()) ||
      ext.localizacao?.toLowerCase().includes(extSearch.toLowerCase()) ||
      ext.tipo_capacidade?.toLowerCase().includes(extSearch.toLowerCase());

    if (!searchMatch) return false;

    // Filtro de status
    if (extFilter === "todos") return true;

    if (!ext.data_vencimento) return extFilter === "em_dia";

    const exp = new Date(ext.data_vencimento);
    if (isNaN(exp.getTime())) return extFilter === "em_dia";

    if (extFilter === "vencidos") return exp < now;
    if (extFilter === "vencendo") return exp >= now && exp <= in30Days;
    if (extFilter === "em_dia") return exp > in30Days;

    return true;
  });

  // Mensagem para solicitar recarga via WhatsApp
  const vencendoOuVencidosCount = (data?.stats.extintoresVencendo || 0) + (data?.stats.extintoresVencidos || 0);
  const whatsappMaintenanceMsg = encodeURIComponent(
    `Olá, equipe ${data?.company.nome || "JC Extintores"}! Sou do cliente ${data?.customer.name || ""}.\nEstou acompanhando pelo Portal do Cliente e gostaria de agendar a recarga e inspeção periódica de extintores.`
  );
  const companyPhoneClean = (data?.company.telefone || "55999657943").replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${companyPhoneClean.startsWith("55") ? companyPhoneClean : `55${companyPhoneClean}`}?text=${whatsappMaintenanceMsg}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        <p className="text-sm text-muted-foreground font-medium">Carregando seu Portal do Cliente...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">Acesso ao Portal do Cliente</h2>
        <p className="text-sm text-muted-foreground">
          Não localizamos uma empresa vinculada ao seu usuário atual. Entre em contato com a administração da JC Extintores para sincronizar suas credenciais de acesso.
        </p>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <a href="https://wa.me/5555999657943" target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-2 h-4 w-4" /> Falar com o Suporte
          </a>
        </Button>
      </div>
    );
  }

  const { customer, company, stats } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ============================================================ */}
      {/* 1. HERO HEADER: BOAS-VINDAS & DADOS DA EMPRESA              */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-800 to-red-950 p-6 md:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-red-300 border border-white/10">
              <ShieldCheck className="h-3.5 w-3.5 text-red-400" /> Portal Exclusivo do Cliente
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {customer.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-300">
              {customer.document && (
                <span className="flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-neutral-400" /> CNPJ/CPF: {customer.document}
                </span>
              )}
              {customer.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                  {customer.address.city}/{customer.address.state || "RS"}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <Button
              asChild
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 shadow-sm"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-1.5 h-4 w-4" /> Falar no WhatsApp
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9"
            >
              <a href={`tel:${company.telefone.replace(/\D/g, "")}`}>
                <Phone className="mr-1.5 h-3.5 w-3.5" /> Ligar para {company.nome}
              </a>
            </Button>
          </div>
        </div>

        {/* Efeito sutil de brilho no fundo */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ============================================================ */}
      {/* 2. CARDS DE RESUMO OPERACIONAL E CONFORMIDADE               */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Próximas Recargas */}
        <Card
          className="cursor-pointer hover:border-red-400 transition-all shadow-sm"
          onClick={() => setActiveTab("recargas")}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold">
              <span>Extintores</span>
              <FireExtinguisher className="h-4 w-4 text-red-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {stats.totalExtintores}
              <span className="text-xs font-normal text-muted-foreground">equipamentos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-xs">
              {stats.extintoresVencidos > 0 ? (
                <span className="text-red-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> {stats.extintoresVencidos} vencido(s)
                </span>
              ) : stats.extintoresVencendo > 0 ? (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {stats.extintoresVencendo} vencendo
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Todos em dia
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: PPCI / Alvará de Bombeiros */}
        <Card
          className="cursor-pointer hover:border-blue-400 transition-all shadow-sm"
          onClick={() => setActiveTab("ppci")}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold">
              <span>Alvará dos Bombeiros</span>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {stats.ppciStatus === "isento"
                ? "Isento"
                : stats.ppciDiasRestantes !== null
                ? stats.ppciDiasRestantes > 0
                  ? `${stats.ppciDiasRestantes}d`
                  : "Vencido"
                : "Em análise"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground truncate">
              {customer.ppci_enquadramento || (customer.ppci_isento ? "Isento de PPCI" : "PSPCI Simplificado")}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Vistorias Realizadas */}
        <Card
          className="cursor-pointer hover:border-emerald-400 transition-all shadow-sm"
          onClick={() => setActiveTab("vistorias")}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold">
              <span>Vistorias Realizadas</span>
              <ClipboardList className="h-4 w-4 text-emerald-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {stats.totalVistorias}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Laudos técnicos e relatórios
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Orçamentos Pendentes */}
        <Card
          className="cursor-pointer hover:border-purple-400 transition-all shadow-sm"
          onClick={() => setActiveTab("orcamentos")}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold">
              <span>Orçamentos</span>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {stats.orcamentosPendentes}
              <span className="text-xs font-normal text-muted-foreground">aguardando</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-purple-700 font-medium">
              {stats.orcamentosPendentes > 0 ? "Aprovar propostas online" : "Nenhuma proposta pendente"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* 3. TABS PRINCIPAIS DO PORTAL DO CLIENTE                     */}
      {/* ============================================================ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/60 rounded-xl">
          <TabsTrigger value="recargas" className="py-2.5 text-xs font-semibold">
            <FireExtinguisher className="mr-1.5 h-4 w-4 text-red-500" />
            Próximas Recargas
          </TabsTrigger>
          <TabsTrigger value="anexo-d" className="py-2.5 text-xs font-semibold">
            <FileText className="mr-1.5 h-4 w-4 text-orange-500" />
            Anexo D (Memorial)
          </TabsTrigger>
          <TabsTrigger value="ppci" className="py-2.5 text-xs font-semibold">
            <ShieldCheck className="mr-1.5 h-4 w-4 text-blue-500" />
            PPCI & Documentos
          </TabsTrigger>
          <TabsTrigger value="vistorias" className="py-2.5 text-xs font-semibold">
            <ClipboardList className="mr-1.5 h-4 w-4 text-emerald-500" />
            Vistorias Realizadas
          </TabsTrigger>
          <TabsTrigger value="orcamentos" className="py-2.5 text-xs font-semibold relative">
            <DollarSign className="mr-1.5 h-4 w-4 text-purple-500" />
            Meus Orçamentos
            {stats.orcamentosPendentes > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-bold">
                {stats.orcamentosPendentes}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------ */}
        {/* ABA 1: PRÓXIMAS RECARGAS & EXTINTORES                         */}
        {/* ------------------------------------------------------------ */}
        <TabsContent value="recargas" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <FireExtinguisher className="h-5 w-5 text-red-600" />
                    Inventário e Vencimento de Extintores
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Monitore as datas de validade da carga e do teste hidrostático dos seus equipamentos de combate a incêndio.
                  </CardDescription>
                </div>
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-1.5 h-4 w-4" /> Solicitar Manutenção / Recarga
                  </a>
                </Button>
              </div>

              {/* Barra de Filtros e Pesquisa */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por local ou selo..."
                    value={extSearch}
                    onChange={(e) => setExtSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  <Button
                    variant={extFilter === "todos" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setExtFilter("todos")}
                  >
                    Todos ({data.extinguishers.length})
                  </Button>
                  <Button
                    variant={extFilter === "vencidos" ? "destructive" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setExtFilter("vencidos")}
                  >
                    Vencidos ({stats.extintoresVencidos})
                  </Button>
                  <Button
                    variant={extFilter === "vencendo" ? "default" : "outline"}
                    size="sm"
                    className={`h-8 text-xs ${extFilter === "vencendo" ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                    onClick={() => setExtFilter("vencendo")}
                  >
                    Vencendo em 30d ({stats.extintoresVencendo})
                  </Button>
                  <Button
                    variant={extFilter === "em_dia" ? "default" : "outline"}
                    size="sm"
                    className={`h-8 text-xs ${extFilter === "em_dia" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                    onClick={() => setExtFilter("em_dia")}
                  >
                    Em dia ({stats.extintoresEmDia})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredExtinguishers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  Nenhum extintor encontrado com os filtros selecionados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-y text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-3">Localização / Setor</th>
                        <th className="p-3">Tipo & Carga</th>
                        <th className="p-3">Identificação / Selo</th>
                        <th className="p-3">Última Recarga</th>
                        <th className="p-3">Próximo Vencimento</th>
                        <th className="p-3 text-right">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredExtinguishers.map((ext) => {
                        const expDate = ext.data_vencimento ? new Date(ext.data_vencimento) : null;
                        let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        let badgeLabel = "Em dia";

                        if (expDate) {
                          if (expDate < now) {
                            badgeColor = "bg-red-50 text-red-700 border-red-200 animate-pulse";
                            badgeLabel = "Vencido";
                          } else if (expDate <= in30Days) {
                            badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                            badgeLabel = "Vence em breve";
                          }
                        }

                        return (
                          <tr key={ext.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-semibold text-foreground">
                              {ext.localizacao || "Padrão"}
                            </td>
                            <td className="p-3 font-medium">
                              {ext.tipo_capacidade || "Pó ABC 4kg"}
                            </td>
                            <td className="p-3 font-mono text-[11px] text-muted-foreground">
                              {ext.identificacao || "-"}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {ext.data_ultima_recarga ? formatDate(ext.data_ultima_recarga) : "-"}
                            </td>
                            <td className="p-3 font-bold text-foreground">
                              {ext.data_vencimento ? formatDate(ext.data_vencimento) : "12 meses"}
                            </td>
                            <td className="p-3 text-right">
                              <Badge variant="outline" className={badgeColor}>
                                {badgeLabel}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------ */}
        {/* ABA 2: ANEXO D (MEMORIAL DESCRITIVO NBR 12962 / CBMRS)        */}
        {/* ------------------------------------------------------------ */}
        <TabsContent value="anexo-d" className="space-y-4">
          <AnexoDView
            customer={customer}
            company={company}
            extinguishers={data.extinguishers}
          />
        </TabsContent>

        {/* ------------------------------------------------------------ */}
        {/* ABA 3: PPCI & PREVENÇÃO & DOCUMENTOS ARQUIVADOS              */}
        {/* ------------------------------------------------------------ */}
        <TabsContent value="ppci" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-700">
                  <ShieldCheck className="h-5 w-5" />
                  Status do PPCI
                </CardTitle>
                <CardDescription className="text-xs">
                  Situação do Plano de Prevenção junto aos Bombeiros.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Enquadramento Técnico:</span>
                  <p className="font-semibold text-foreground">
                    {customer.ppci_enquadramento || (customer.ppci_isento ? "Isento de PPCI" : "PSPCI (Simplificado)")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Número do Alvará / APPCI:</span>
                  <p className="font-semibold text-foreground">
                    {customer.ppci_number || "Em tramitação / Não informado"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Área Protegida Aprovada:</span>
                  <p className="font-semibold text-foreground">
                    {customer.metragem ? `${customer.metragem} m²` : "Conforme projeto"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Data de Vencimento do Alvará:</span>
                  <p className="font-bold text-foreground">
                    {customer.ppci_expires_at ? formatDate(customer.ppci_expires_at) : "Aguardando vistoria"}
                  </p>
                  {stats.ppciDiasRestantes !== null && (
                    <Badge
                      variant="outline"
                      className={`mt-1.5 ${
                        stats.ppciDiasRestantes < 0
                          ? "bg-red-50 text-red-700 border-red-200"
                          : stats.ppciDiasRestantes <= 30
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {stats.ppciDiasRestantes < 0
                        ? `Vencido há ${Math.abs(stats.ppciDiasRestantes)} dias`
                        : `Válido por mais ${stats.ppciDiasRestantes} dias`}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                  Documentos & Laudos Arquivados
                </CardTitle>
                <CardDescription className="text-xs">
                  Projetos, ART/RRT, Alvarás dos Bombeiros e laudos de vistoria disponíveis para download.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.documents.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-xs">
                    Nenhum documento anexado no momento. Entre em contato com a JC Extintores para solicitar vias digitais.
                  </div>
                ) : (
                  <div className="divide-y">
                    {data.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30 px-2 rounded-lg transition-colors"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-blue-600" />
                            {doc.file_name}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span>Tipo: {doc.tipo_documento}</span>
                            <span>Adicionado em: {formatDate(doc.created_at)}</span>
                          </div>
                        </div>
                        {doc.file_url ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs shrink-0"
                          >
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-1.5 h-3.5 w-3.5" /> Acessar Documento
                            </a>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">Arquivo indisponível</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------ */}
        {/* ABA 4: VISTORIAS REALIZADAS                                  */}
        {/* ------------------------------------------------------------ */}
        <TabsContent value="vistorias" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-600" />
                Histórico de Vistorias e Ordens de Serviço
              </CardTitle>
              <CardDescription className="text-xs">
                Consulte as vistorias técnicas executadas na sua edificação, técnicos responsáveis e pareceres.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.serviceOrders.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  Nenhuma ordem de serviço ou vistoria registrada até o momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.serviceOrders.map((os) => (
                    <div
                      key={os.id}
                      className="p-4 rounded-xl border bg-card hover:border-emerald-300 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            OS #{os.number} — {os.type}
                          </span>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            {os.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {os.completed_at ? formatDate(os.completed_at) : formatDate(os.scheduled_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5" />
                            {os.technician_name}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs space-y-1.5 text-muted-foreground">
                        <p><strong>Descrição dos Serviços:</strong> {os.description}</p>
                        {os.technical_report && (
                          <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-emerald-950 text-xs">
                            <p className="font-semibold text-emerald-900 mb-0.5 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Parecer Técnico da Vistoria:
                            </p>
                            <p className="whitespace-pre-line">{os.technical_report}</p>
                          </div>
                        )}
                        {os.signature_name && (
                          <p className="text-[11px] text-neutral-500 pt-1">
                            Comprovante assinado no local por: <strong>{os.signature_name}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------ */}
        {/* ABA 5: VISUALIZAR E APROVAR ORÇAMENTOS                       */}
        {/* ------------------------------------------------------------ */}
        <TabsContent value="orcamentos" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                    Propostas Comerciais e Orçamentos
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Visualize os detalhes das propostas de manutenção, baixe o PDF oficial e aprove ou recuse online.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data.quotes.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  Nenhum orçamento emitido para sua empresa no momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {data.quotes.map((q) => {
                    const isExpanded = expandedQuoteId === q.id;
                    const isPending = q.status === "Pendente" || q.status === "Rascunho" || q.status === "Enviado";
                    const isApproved = q.status === "Aprovado";
                    const isRejected = q.status === "Recusado";

                    return (
                      <div
                        key={q.id}
                        className={`rounded-xl border transition-all ${
                          isPending
                            ? "border-purple-300 bg-purple-50/20 shadow-sm"
                            : isApproved
                            ? "border-emerald-200 bg-emerald-50/10"
                            : "border-border bg-card"
                        }`}
                      >
                        {/* Linha Resumo do Orçamento */}
                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base text-foreground">
                                Orçamento #{q.number}
                              </span>
                              <Badge
                                variant="outline"
                                className={
                                  isApproved
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : isRejected
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-purple-100 text-purple-800 border-purple-300 animate-pulse"
                                }
                              >
                                {isApproved ? "Aprovado" : isRejected ? "Recusado" : "Aguardando sua Aprovação"}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span>Emissão: {formatDate(q.issued_at)}</span>
                              {q.expires_at && <span>Validade: {formatDate(q.expires_at)}</span>}
                              <span>Itens: {q.items?.length || 0}</span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <div className="text-left sm:text-right mr-2">
                              <span className="text-[11px] text-muted-foreground block">Valor Total:</span>
                              <span className="text-lg font-extrabold text-foreground">
                                {formatCurrency(q.total)}
                              </span>
                            </div>

                            {/* Botão de Download do PDF */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              disabled={downloadingQuoteId === q.id}
                              onClick={() => handleDownloadPdf(q)}
                            >
                              {downloadingQuoteId === q.id ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Baixar PDF
                            </Button>

                            {/* Botões Interativos de Decisão se estiver pendente */}
                            {isPending && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shadow-sm font-semibold"
                                  onClick={() => setQuoteToApprove(q)}
                                >
                                  <Check className="mr-1.5 h-3.5 w-3.5" /> Aprovar Orçamento
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-8"
                                  onClick={() => setQuoteToReject(q)}
                                >
                                  <X className="mr-1.5 h-3.5 w-3.5" /> Recusar
                                </Button>
                              </>
                            )}

                            {/* Toggle de Detalhes dos Itens */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => setExpandedQuoteId(isExpanded ? null : q.id)}
                              title={isExpanded ? "Ocultar itens" : "Ver itens da proposta"}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Detalhes Expansíveis com Tabela de Itens */}
                        {isExpanded && (
                          <div className="border-t bg-muted/20 p-4 space-y-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Itens da Proposta Comercial:
                            </h4>
                            <div className="overflow-x-auto rounded-lg border bg-white">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-muted/60 text-muted-foreground border-b font-semibold">
                                  <tr>
                                    <th className="p-2.5">Descrição do Produto / Serviço</th>
                                    <th className="p-2.5 text-center">Qtd</th>
                                    <th className="p-2.5 text-right">Valor Unit.</th>
                                    <th className="p-2.5 text-right">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y text-neutral-800">
                                  {(q.items || []).map((it, idx) => (
                                    <tr key={it.id || idx}>
                                      <td className="p-2.5 font-medium">{it.description}</td>
                                      <td className="p-2.5 text-center">{it.quantity} {it.unit || "un"}</td>
                                      <td className="p-2.5 text-right">{formatCurrency(it.unit_price)}</td>
                                      <td className="p-2.5 text-right font-semibold">{formatCurrency(it.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-muted/40 font-bold border-t">
                                  {q.discount > 0 && (
                                    <tr>
                                      <td colSpan={3} className="p-2 text-right text-red-600">Desconto Concedido:</td>
                                      <td className="p-2 text-right text-red-600">-{formatCurrency(q.discount)}</td>
                                    </tr>
                                  )}
                                  <tr>
                                    <td colSpan={3} className="p-2.5 text-right">Total da Proposta:</td>
                                    <td className="p-2.5 text-right text-sm text-foreground">{formatCurrency(q.total)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>

                            {q.notes && (
                              <div className="p-2.5 rounded-lg bg-muted/40 text-[11px] text-muted-foreground">
                                <p className="font-semibold text-foreground">Observações / Condições:</p>
                                <p className="whitespace-pre-line mt-0.5">{q.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/* 4. MODAL DE APROVAÇÃO DE ORÇAMENTO PELO CLIENTE              */}
      {/* ============================================================ */}
      <Dialog open={!!quoteToApprove} onOpenChange={(open) => !open && setQuoteToApprove(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              Confirmar Aprovação do Orçamento
            </DialogTitle>
            <DialogDescription>
              Você está prestes a aprovar a proposta comercial <strong>#{quoteToApprove?.number}</strong> emitida por {company.nome}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <p><strong>Valor Total da Proposta:</strong> {formatCurrency(quoteToApprove?.total || 0)}</p>
              <p><strong>Itens inclusos:</strong> {quoteToApprove?.items?.length || 0} itens</p>
              <p className="text-[11px] text-emerald-800 pt-1">
                Ao confirmar, a ordem de serviço será liberada para execução e a equipe da {company.nome} será notificada.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observações adicionais ou instruções (opcional):</Label>
              <Textarea
                placeholder="Ex: Pode agendar a vistoria para a próxima terça-feira pela manhã..."
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuoteToApprove(null)}>
              Cancelar
            </Button>
            <Button
              disabled={isApproving}
              onClick={handleConfirmApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Aprovando...
                </>
              ) : (
                "Confirmar Aprovação"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 5. MODAL DE RECUSA DE ORÇAMENTO PELO CLIENTE                */}
      {/* ============================================================ */}
      <Dialog open={!!quoteToReject} onOpenChange={(open) => !open && setQuoteToReject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <X className="h-5 w-5" />
              Recusar Orçamento #{quoteToReject?.number}
            </DialogTitle>
            <DialogDescription>
              Por favor, compartilhe conosco o motivo da recusa para que possamos ajustar a proposta às suas necessidades.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo da recusa *</Label>
              <Textarea
                placeholder="Ex: Valor acima do orçamento disponível, optamos por adiar os serviços, etc."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="text-xs"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuoteToReject(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={isRejecting}
              onClick={handleConfirmReject}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recusando...
                </>
              ) : (
                "Confirmar Recusa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
