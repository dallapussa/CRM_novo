"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  FileText,
  Shield,
  Users,
  LayoutList,
  Save,
  CheckCircle2,
  Lock,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  getCompanySettings,
  saveCompanySettings,
  type CompanySettings,
} from "@/services/company-settings.service";
import {
  getAppSettings,
  saveAppSettings,
  updatePin,
  DEFAULT_QUOTE_TERMS,
  DEFAULT_SECURITY_CONFIG,
  DEFAULT_MENU_ITEMS,
  type AppSettings,
  type MenuItemConfig,
} from "@/services/settings-security.service";
import { ROLE_PERMISSIONS, ROLE_LABELS, type RolePermission, type UserRole } from "@/types";

const ALL_ROLES: UserRole[] = ["admin", "comercial", "tecnico", "financeiro", "cliente"];

const ALL_PERMISSIONS: { key: RolePermission; label: string; group: string }[] = [
  { key: "dashboard", label: "Dashboard & Visão Geral", group: "Geral" },
  { key: "users", label: "Gestão de Usuários", group: "Geral" },
  { key: "clients", label: "Cadastro de Clientes", group: "Comercial" },
  { key: "leads", label: "Gestão de Leads", group: "Comercial" },
  { key: "quotes", label: "Gestão de Orçamentos", group: "Comercial" },
  { key: "agenda", label: "Agenda de Visitas", group: "Comercial" },
  { key: "whatsapp", label: "Mensagens WhatsApp", group: "Comercial" },
  { key: "catalog", label: "Catálogo de Produtos & Serviços", group: "Catálogo" },
  { key: "extinguishers", label: "Extintores de Clientes", group: "Operações" },
  { key: "hoses", label: "Mangueiras de Incêndio", group: "Operações" },
  { key: "service_orders", label: "Ordens de Serviço (OS)", group: "Operações" },
  { key: "bench", label: "Bancada de Recargas (Kanban)", group: "Operações" },
  { key: "orders", label: "Pedidos de Venda", group: "Financeiro" },
  { key: "receipts", label: "Recibos & Contas Financeiras", group: "Financeiro" },
  { key: "reports", label: "Relatórios Comerciais", group: "Financeiro" },
  { key: "financial_costs", label: "Aba Custos Financeiros", group: "Financeiro" },
];

export function SettingsView() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("empresa");

  // Dados da Empresa
  const [company, setCompany] = useState<CompanySettings>({
    nome: "",
    cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    logo_url: null,
  });

  // Configurações Globais
  const [appSettings, setAppSettings] = useState<AppSettings>(() => getAppSettings());

  // Form de alteração do PIN
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isChangingPin, setIsChangingPin] = useState(false);

  // Nova condição de pagamento
  const [newPaymentCond, setNewPaymentCond] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const c = await getCompanySettings();
      setCompany(c);
      const s = getAppSettings();
      setAppSettings(s);
    } catch (e) {
      console.warn("Erro ao carregar configurações:", e);
    }
  }

  // Salva dados da empresa
  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveCompanySettings(company);
      toast({
        variant: "success",
        title: "Dados da empresa atualizados!",
        description: "As informações cadastrais e o logo serão usados nos cabeçalhos de Orçamentos e Recibos.",
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: err.message });
    }
  }

  // Salva termos do orçamento
  async function handleSaveQuoteTerms(e: React.FormEvent) {
    e.preventDefault();
    try {
      const updated = await saveAppSettings({
        quoteTerms: appSettings.quoteTerms,
      });
      setAppSettings(updated);
      toast({
        variant: "success",
        title: "Termos do orçamento salvos!",
        description: "Validade, garantias, cláusula PPCI e condições de pagamento atualizadas.",
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao salvar termos", description: err.message });
    }
  }

  function handleAddPaymentCond() {
    if (!newPaymentCond.trim()) return;
    setAppSettings((prev) => ({
      ...prev,
      quoteTerms: {
        ...prev.quoteTerms,
        condicoesPagamento: [...prev.quoteTerms.condicoesPagamento, newPaymentCond.trim()],
      },
    }));
    setNewPaymentCond("");
  }

  function handleRemovePaymentCond(idx: number) {
    setAppSettings((prev) => ({
      ...prev,
      quoteTerms: {
        ...prev.quoteTerms,
        condicoesPagamento: prev.quoteTerms.condicoesPagamento.filter((_, i) => i !== idx),
      },
    }));
  }

  // Alteração do PIN
  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast({ variant: "destructive", title: "O novo PIN deve ter exatamente 4 dígitos numéricos." });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ variant: "destructive", title: "A confirmação do novo PIN não confere." });
      return;
    }

    setIsChangingPin(true);
    try {
      const res = await updatePin(oldPin, newPin);
      if (res.success) {
        toast({
          variant: "success",
          title: "PIN de segurança alterado com sucesso!",
          description: "Use o novo PIN para autorizar alterações de preço e exclusões.",
        });
        setOldPin("");
        setNewPin("");
        setConfirmPin("");
      } else {
        toast({ variant: "destructive", title: res.message || "Erro ao alterar PIN" });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao processar alteração", description: err.message });
    } finally {
      setIsChangingPin(false);
    }
  }

  // Toggle de permissão na matriz por perfil
  function handleTogglePermission(role: UserRole, perm: RolePermission) {
    if (role === "admin") return; // Admin sempre tem tudo

    const currentList =
      appSettings.rolePermissions[role] || (ROLE_PERMISSIONS[role] ? [...ROLE_PERMISSIONS[role]] : []);

    const hasIt = currentList.includes(perm);
    const updatedList = hasIt ? currentList.filter((p) => p !== perm) : [...currentList, perm];

    const updatedPermissions = {
      ...appSettings.rolePermissions,
      [role]: updatedList,
    };

    setAppSettings((prev) => ({
      ...prev,
      rolePermissions: updatedPermissions,
    }));
  }

  async function handleSavePermissions() {
    try {
      await saveAppSettings({
        rolePermissions: appSettings.rolePermissions,
      });
      toast({
        variant: "success",
        title: "Permissões dos perfis atualizadas!",
        description: "O Administrador definiu com sucesso o que cada nível de acesso pode visualizar.",
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao salvar permissões", description: err.message });
    }
  }

  // Ordenação e Visibilidade do Menu
  function handleMoveMenu(index: number, direction: "up" | "down") {
    const list = [...appSettings.menuItems];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    // Atualiza order sequencial
    const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    setAppSettings((prev) => ({ ...prev, menuItems: reordered }));
  }

  function handleToggleMenuRole(itemId: string, role: UserRole) {
    if (role === "admin") return;
    setAppSettings((prev) => ({
      ...prev,
      menuItems: prev.menuItems.map((item) => {
        if (item.id !== itemId) return item;
        const exists = item.visibleRoles.includes(role);
        const visibleRoles = exists
          ? item.visibleRoles.filter((r) => r !== role)
          : [...item.visibleRoles, role];
        return { ...item, visibleRoles };
      }),
    }));
  }

  async function handleSaveMenuConfig() {
    try {
      await saveAppSettings({
        menuItems: appSettings.menuItems,
      });
      toast({
        variant: "success",
        title: "Ordem e visibilidade do menu salvas!",
        description: "O menu lateral agora reflete a ordem e os acessos definidos.",
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao salvar menu", description: err.message });
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" />
            Configurações & Segurança do Sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie dados da empresa emitente, termos de orçamentos, PIN de segurança e níveis de acesso.
          </p>
        </div>

        <Badge variant="outline" className="h-7 gap-1 border-primary/40 text-primary self-start">
          <Shield className="h-3.5 w-3.5" />
          Painel do Administrador
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 max-w-2xl h-11 bg-muted/70 p-1">
          <TabsTrigger value="empresa" className="gap-2 text-xs font-bold">
            <Building2 className="h-4 w-4 text-blue-600" />
            Empresa & Orçamentos
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-2 text-xs font-bold">
            <Lock className="h-4 w-4 text-amber-600" />
            Segurança & PIN
          </TabsTrigger>
          <TabsTrigger value="permissoes" className="gap-2 text-xs font-bold">
            <Users className="h-4 w-4 text-emerald-600" />
            Níveis de Acesso
          </TabsTrigger>
          <TabsTrigger value="menu" className="gap-2 text-xs font-bold">
            <LayoutList className="h-4 w-4 text-purple-600" />
            Menu Lateral
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            ABA 1: EMPRESA & TERMOS DO ORÇAMENTO
            ========================================================================= */}
        <TabsContent value="empresa" className="space-y-6">
          {/* Dados Cadastrais da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Dados da Empresa Emitente (Cabeçalho de Recibos e Orçamentos)
              </CardTitle>
              <CardDescription className="text-xs">
                Estes dados alimentam automaticamente o cabeçalho oficial do Orçamento em PDF e dos Recibos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCompany} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Razão Social / Nome da Empresa *</Label>
                    <Input
                      value={company.nome}
                      onChange={(e) => setCompany({ ...company, nome: e.target.value })}
                      placeholder="Ex: JC Extintores & Segurança Contra Incêndio"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">CNPJ *</Label>
                    <Input
                      value={company.cnpj}
                      onChange={(e) => setCompany({ ...company, cnpj: e.target.value })}
                      placeholder="00.000.000/0001-00"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Telefone / WhatsApp Comercial *</Label>
                    <Input
                      value={company.telefone}
                      onChange={(e) => setCompany({ ...company, telefone: e.target.value })}
                      placeholder="(55) 99999-9999"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">E-mail Comercial *</Label>
                    <Input
                      type="email"
                      value={company.email}
                      onChange={(e) => setCompany({ ...company, email: e.target.value })}
                      placeholder="contato@empresa.com.br"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Endereço Completo (Rua, Número, Bairro, Cidade - UF) *</Label>
                  <Input
                    value={company.endereco}
                    onChange={(e) => setCompany({ ...company, endereco: e.target.value })}
                    placeholder="Rua Exemplo, 123, Bairro, Cruz Alta - RS"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">URL do Logotipo da Empresa (PNG / JPEG)</Label>
                  <Input
                    value={company.logo_url || ""}
                    onChange={(e) => setCompany({ ...company, logo_url: e.target.value || null })}
                    placeholder="https://exemplo.com/logo.png"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Exibido no canto superior do Orçamento e Recibos impressos.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
                    <Save className="h-4 w-4" />
                    Salvar Dados da Empresa
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Termos e Rodapé Padrão do Orçamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                Termos, Garantias e Cláusulas Padrão do Orçamento (PDF)
              </CardTitle>
              <CardDescription className="text-xs">
                Textos que aparecem no rodapé de todas as propostas comerciais geradas no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveQuoteTerms} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Validade Padrão da Proposta (Dias) *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={appSettings.quoteTerms.validadeDias}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          quoteTerms: { ...appSettings.quoteTerms, validadeDias: Number(e.target.value) || 15 },
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Termo de Garantia Padrão *</Label>
                  <Textarea
                    rows={2}
                    value={appSettings.quoteTerms.garantiaTexto}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        quoteTerms: { ...appSettings.quoteTerms, garantiaTexto: e.target.value },
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Cláusula Especial PPCI / Corpo de Bombeiros *</Label>
                  <Textarea
                    rows={2}
                    value={appSettings.quoteTerms.clausulaPpciTexto}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        quoteTerms: { ...appSettings.quoteTerms, clausulaPpciTexto: e.target.value },
                      })
                    }
                    required
                  />
                </div>

                {/* Condições de Pagamento Disponíveis */}
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs font-bold">Condições de Pagamento Disponíveis na Criação do Orçamento</Label>
                  <div className="flex flex-wrap gap-2">
                    {appSettings.quoteTerms.condicoesPagamento.map((cond, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="py-1 px-2.5 text-xs flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800"
                      >
                        <span>{cond}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePaymentCond(idx)}
                          className="text-muted-foreground hover:text-red-600"
                        >
                          &times;
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1 max-w-md">
                    <Input
                      placeholder="Adicionar nova condição (Ex: Boleto 60 dias)..."
                      value={newPaymentCond}
                      onChange={(e) => setNewPaymentCond(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddPaymentCond}
                      className="gap-1 h-9"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
                    <Save className="h-4 w-4" />
                    Salvar Termos do Orçamento
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            ABA 2: SEGURANÇA & PIN (4 DÍGITOS)
            ========================================================================= */}
        <TabsContent value="seguranca" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-600" />
                PIN de Segurança Operacional (Padrão: 1234)
              </CardTitle>
              <CardDescription className="text-xs">
                O PIN de 4 dígitos é exigido para autorizar: 1. Alteração de preços (Catálogo, Custos e Orçamentos); 2. Toda exclusão de cadastros.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Opções de Exigência */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ações Protegidas por PIN:
                </h4>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={appSettings.security.requirePinForPriceChange}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        security: { ...appSettings.security, requirePinForPriceChange: e.target.checked },
                      })
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      Exigir PIN para alteração de preços
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      No Catálogo, na Aba Custos Financeiros e em itens avulsos de orçamentos.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={appSettings.security.requirePinForDelete}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        security: { ...appSettings.security, requirePinForDelete: e.target.checked },
                      })
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      Exigir PIN para toda ação de exclusão
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Deletar clientes, extintores, ordens de serviço, orçamentos e produtos.
                    </span>
                  </div>
                </label>

                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await saveAppSettings({ security: appSettings.security });
                      toast({ variant: "success", title: "Regras de PIN salvas!" });
                    }}
                    className="text-xs h-8"
                  >
                    Salvar Regras de Exigência
                  </Button>
                </div>
              </div>

              {/* Formulário para Alterar o PIN */}
              <form onSubmit={handleChangePin} className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-4 max-w-md">
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-amber-600" />
                    Alterar PIN de Segurança
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    O PIN padrão inicial de fábrica é <strong className="font-mono">1234</strong>.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">PIN Atual *</Label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="font-mono text-center tracking-widest text-base w-32"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Novo PIN (4 dígitos) *</Label>
                    <Input
                      type="password"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••"
                      className="font-mono text-center tracking-widest text-base w-32"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Confirmar Novo PIN *</Label>
                    <Input
                      type="password"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••"
                      className="font-mono text-center tracking-widest text-base w-32"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isChangingPin || newPin.length !== 4}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  {isChangingPin ? "Salvando..." : "Salvar Novo PIN"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            ABA 3: NÍVEIS DE ACESSO & PERMISSÕES (ADMIN DECIDE O QUE CADA UM ACESSA)
            ========================================================================= */}
        <TabsContent value="permissoes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  Matriz de Permissões por Nível de Acesso
                </CardTitle>
                <CardDescription className="text-xs">
                  O Administrador decide quais módulos cada perfil tem permissão de visualizar e operar no sistema.
                </CardDescription>
              </div>

              <Button
                onClick={handleSavePermissions}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs"
              >
                <Save className="h-4 w-4" />
                Salvar Permissões
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/60 border-b">
                      <th className="text-left p-3 font-bold">Módulo / Permissão</th>
                      {ALL_ROLES.map((r) => (
                        <th key={r} className="text-center p-3 font-bold">
                          <span>{ROLE_LABELS[r]}</span>
                          {r === "admin" && (
                            <span className="block text-[10px] text-muted-foreground font-normal">
                              (Acesso total)
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_PERMISSIONS.map((p) => (
                      <tr key={p.key} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <span className="font-bold text-foreground block">{p.label}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{p.group}</span>
                        </td>
                        {ALL_ROLES.map((r) => {
                          const isAdmin = r === "admin";
                          const customList = appSettings.rolePermissions[r];
                          const isAllowed = isAdmin
                            ? true
                            : customList
                            ? customList.includes(p.key)
                            : ROLE_PERMISSIONS[r]?.includes(p.key);

                          return (
                            <td key={r} className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={Boolean(isAllowed)}
                                disabled={isAdmin}
                                onChange={() => handleTogglePermission(r, p.key)}
                                className={`h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 ${
                                  isAdmin ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                                }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            ABA 4: ORGANIZAÇÃO DO MENU LATERAL (ORDENAR E OCULTAR)
            ========================================================================= */}
        <TabsContent value="menu" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutList className="h-5 w-5 text-purple-600" />
                  Personalização da Ordem e Visibilidade do Menu Lateral
                </CardTitle>
                <CardDescription className="text-xs">
                  Reorganize a ordem dos itens com as setas para cima/baixo e defina para quais perfis cada menu é exibido.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAppSettings((prev) => ({ ...prev, menuItems: DEFAULT_MENU_ITEMS }))}
                  className="text-xs h-8 gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restaurar Padrão
                </Button>
                <Button
                  onClick={handleSaveMenuConfig}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 text-xs h-8"
                >
                  <Save className="h-4 w-4" /> Salvar Ordem do Menu
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {appSettings.menuItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                  >
                    {/* Controles de Ordem e Nome */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => handleMoveMenu(idx, "up")}
                          className="h-7 w-7 text-neutral-600"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={idx === appSettings.menuItems.length - 1}
                          onClick={() => handleMoveMenu(idx, "down")}
                          className="h-7 w-7 text-neutral-600"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <span className="w-6 text-center font-mono text-xs font-bold text-muted-foreground">
                        #{idx + 1}
                      </span>

                      <div>
                        <span className="font-bold text-sm text-foreground">{item.title}</span>
                        <span className="text-[11px] text-muted-foreground block font-mono">
                          {item.href}
                        </span>
                      </div>
                    </div>

                    {/* Checkboxes de Visibilidade por Perfil */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-muted-foreground mr-1">Visível em:</span>
                      {ALL_ROLES.map((r) => {
                        const isVisible = item.visibleRoles.includes(r);
                        return (
                          <label
                            key={r}
                            className={`px-2 py-1 rounded-md border text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors ${
                              isVisible
                                ? "bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold"
                                : "bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700 text-muted-foreground"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isVisible}
                              disabled={r === "admin"}
                              onChange={() => handleToggleMenuRole(item.id, r)}
                              className="h-3 w-3 rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span>{ROLE_LABELS[r]}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
