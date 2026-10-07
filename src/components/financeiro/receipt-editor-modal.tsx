"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Printer,
  UploadCloud,
  FileCheck,
  ShieldCheck,
  Building2,
  AlertTriangle,
  Eye,
  ImageIcon,
  Save,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  type EditableReceiptData,
  type ReceiptItem,
  buildReceiptPdfDocument,
  saveReceiptPdfToClientDocuments,
  checkLoteReceiptExists,
} from "@/services/receipt-pdf.service";
import {
  getCompanySettings,
  saveCompanySettings,
  type CompanySettings,
  DEFAULT_COMPANY_SETTINGS,
} from "@/services/company-settings.service";
import { ThermalReceipt58mmDialog } from "./thermal-receipt-58mm-dialog";

interface ReceiptEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: EditableReceiptData | null;
  initialTab?: "recibo" | "emitente";
  onSuccess?: () => void;
}

const PAYMENT_METHODS = [
  "PIX",
  "Dinheiro",
  "Cartão de Débito",
  "Cartão de Crédito",
  "Boleto",
  "A Prazo (30 dias)",
  "Não Recebido",
];

export function ReceiptEditorModal({
  open,
  onOpenChange,
  initialData,
  initialTab = "recibo",
  onSuccess,
}: ReceiptEditorModalProps) {
  const { toast } = useToast();
  const [data, setData] = useState<EditableReceiptData | null>(null);
  const [activeTab, setActiveTab] = useState<"recibo" | "emitente">(initialTab);
  const [saveToDocs, setSaveToDocs] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [thermalOpen, setThermalOpen] = useState(false);

  // Dados do emitente (Empresa & Logo)
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Verificação de recibo já existente para o lote
  const [existingReceipt, setExistingReceipt] = useState<{
    exists: boolean;
    fileUrl?: string;
    fileName?: string;
    createdAt?: string;
  } | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, open]);

  useEffect(() => {
    if (open) {
      // 1. Carrega dados do emitente configurados
      getCompanySettings().then((settings) => {
        setCompanySettings(settings);

        if (initialData) {
          const cleanLote = initialData.lote_codigo
            ? String(initialData.lote_codigo).replace(/[^a-zA-Z0-9.-]/g, "_")
            : "";
          const baseNum = initialData.ordens_numeros
            ? initialData.ordens_numeros.replace(/[^0-9]/g, "")
            : "01";

          const defaultRecNum = cleanLote
            ? `REC-${cleanLote}`
            : `REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${baseNum}`;

          setData({
            ...initialData,
            numero_recibo: initialData.numero_recibo || defaultRecNum,
            data_emissao:
              initialData.data_emissao || new Date().toISOString().split("T")[0],
            itens: initialData.itens ? [...initialData.itens] : [],
            observacoes:
              initialData.observacoes ||
              "Garantia de 12 meses contra defeitos de recarga e teste de pressão.",
            empresa_nome:
              (settings.nome && !settings.nome.toUpperCase().includes("EXTINCONTROL"))
                ? settings.nome
                : (initialData.empresa_nome && !initialData.empresa_nome.toUpperCase().includes("EXTINCONTROL"))
                ? initialData.empresa_nome
                : settings.nome || DEFAULT_COMPANY_SETTINGS.nome,
            empresa_cnpj: settings.cnpj || initialData.empresa_cnpj || DEFAULT_COMPANY_SETTINGS.cnpj,
            empresa_telefone: settings.telefone || initialData.empresa_telefone || DEFAULT_COMPANY_SETTINGS.telefone,
            empresa_endereco: settings.endereco || initialData.empresa_endereco || DEFAULT_COMPANY_SETTINGS.endereco,
            empresa_logo: settings.logo_url || initialData.empresa_logo || undefined,
          });
        }
      });

      // 2. Verifica se já existe recibo gravado para este cliente e lote
      if (initialData?.cliente_id) {
        checkLoteReceiptExists(initialData.cliente_id, initialData.lote_codigo).then((res) => {
          setExistingReceipt(res);
        });
      } else {
        setExistingReceipt(null);
      }
    }
  }, [initialData, open]);

  if (!data) return null;

  // Atualização de campos do recibo
  const updateField = (field: keyof EditableReceiptData, val: any) => {
    setData((prev) => (prev ? { ...prev, [field]: val } : null));
  };

  // Manipulação de itens do recibo
  const handleItemChange = (index: number, field: keyof ReceiptItem, val: any) => {
    setData((prev) => {
      if (!prev) return null;
      const newItens = [...prev.itens];
      newItens[index] = { ...newItens[index], [field]: val };

      // Recalcula valor total
      const newTotal = newItens.reduce((acc, it) => acc + (Number(it.valor) || 0), 0);
      return { ...prev, itens: newItens, valor_total: newTotal };
    });
  };

  const handleAddItem = () => {
    setData((prev) => {
      if (!prev) return null;
      const newItem: ReceiptItem = {
        identificacao: `EXT-${String(prev.itens.length + 1).padStart(2, "0")}`,
        tipo_capacidade: "Pó ABC - 4kg",
        modalidade: "Normal",
        nova_validade: `${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear() + 1}`,
        valor: 45.0,
      };
      const newItens = [...prev.itens, newItem];
      const newTotal = newItens.reduce((acc, it) => acc + (Number(it.valor) || 0), 0);
      return { ...prev, itens: newItens, valor_total: newTotal };
    });
  };

  const handleRemoveItem = (index: number) => {
    setData((prev) => {
      if (!prev) return null;
      const newItens = prev.itens.filter((_, i) => i !== index);
      const newTotal = newItens.reduce((acc, it) => acc + (Number(it.valor) || 0), 0);
      return { ...prev, itens: newItens, valor_total: newTotal };
    });
  };

  // Upload e conversão do logo do emitente
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem válida (PNG, JPG ou WEBP).",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCompanySettings((prev) => ({ ...prev, logo_url: base64 }));
      setData((prev) => (prev ? { ...prev, empresa_logo: base64 } : null));
      toast({
        variant: "success",
        title: "Logo carregado com sucesso!",
        description: "Clique em 'Salvar Dados do Emitente' para fixar as alterações.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setCompanySettings((prev) => ({ ...prev, logo_url: null }));
    setData((prev) => (prev ? { ...prev, empresa_logo: undefined } : null));
  };

  // Salvar configurações do emitente
  const handleSaveCompany = async () => {
    setIsSavingCompany(true);
    try {
      const saved = await saveCompanySettings(companySettings);
      setCompanySettings(saved);
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          empresa_nome: saved.nome,
          empresa_cnpj: saved.cnpj,
          empresa_telefone: saved.telefone,
          empresa_endereco: saved.endereco,
          empresa_logo: saved.logo_url || undefined,
        };
      });

      toast({
        variant: "success",
        title: "Dados do emitente salvos!",
        description: "Nome, CNPJ, contato e logotipo salvos para todos os recibos e cupons.",
      });

      setActiveTab("recibo");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar dados do emitente",
        description: err.message || "Tente novamente.",
      });
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Gerar e Salvar PDF
  const handleGeneratePdf = async () => {
    if (!data) return;
    setIsGenerating(true);

    try {
      // 1. Gera o PDF vetorizado com jsPDF e Selo de Autenticidade com QR Code
      const { doc, fileName } = await buildReceiptPdfDocument(data);

      // 2. Faz o download direto no dispositivo
      doc.save(fileName);

      // 3. Se marcado, salva no menu de documentos do cliente no Supabase (sobrescrevendo em caso de mesmo lote)
      if (saveToDocs && data.cliente_id) {
        try {
          await saveReceiptPdfToClientDocuments(data.cliente_id, data, doc);
          toast({
            variant: "success",
            title: existingReceipt?.exists
              ? "Recibo do lote atualizado com sucesso!"
              : "Recibo gerado e anexado ao cliente!",
            description: `O arquivo "${fileName}" foi salvo nos Documentos do cliente sem duplicar registros.`,
          });
        } catch (uploadErr: any) {
          console.warn("Aviso ao salvar no storage de documentos:", uploadErr);
          toast({
            variant: "success",
            title: "PDF baixado com sucesso!",
            description: "O arquivo foi baixado no dispositivo.",
          });
        }
      } else {
        toast({
          variant: "success",
          title: "Recibo em PDF baixado com sucesso!",
          description: `Arquivo salvo como "${fileName}".`,
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: err.message || "Tente novamente.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Configuração e Emissão de Recibo
              </DialogTitle>
              <DialogDescription>
                Personalize os itens do recibo ou edite os dados do emitente e logotipo da empresa.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ABAS: RECIBO DO CLIENTE vs DADOS DO EMITENTE */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4 w-full h-11 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
            <TabsTrigger
              value="recibo"
              className="gap-2 font-bold text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:shadow-xs"
            >
              <FileText className="h-4 w-4 text-red-600" />
              Recibo do Cliente
              {existingReceipt?.exists && (
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-1" title="Recibo já emitido" />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="emitente"
              className="gap-2 font-bold text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:shadow-xs"
            >
              <Building2 className="h-4 w-4 text-emerald-600" />
              Dados do Emitente & Logo
            </TabsTrigger>
          </TabsList>

          {/* =========================================================================
              ABA 1: RECIBO DO CLIENTE
              ========================================================================= */}
          <TabsContent value="recibo" className="space-y-6 py-1">
            {/* AVISO DE RECIBO JÁ EXISTENTE (ANTI-DUPLICAÇÃO) */}
            {existingReceipt?.exists && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">
                      Recibo já emitido para este lote ({existingReceipt.fileName})
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Emitido em {new Date(existingReceipt.createdAt || "").toLocaleDateString("pt-BR")}. Ao salvar novamente, o arquivo em nuvem será atualizado, <strong>garantindo que não sejam criadas cópias duplicadas no lote</strong>.
                    </p>
                  </div>
                </div>
                {existingReceipt.fileUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(existingReceipt.fileUrl, "_blank")}
                    className="shrink-0 text-xs border-emerald-400 bg-white dark:bg-neutral-900 hover:bg-emerald-50 text-emerald-900 dark:text-emerald-100 gap-1.5 h-8 font-bold shadow-2xs"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Abrir Recibo Salvo
                  </Button>
                )}
              </div>
            )}

            {/* 1. DADOS GERAIS DO RECIBO */}
            <div className="p-4 bg-muted/40 rounded-xl border space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-red-600" />
                Identificação do Recibo
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Número do Recibo</Label>
                  <Input
                    value={data.numero_recibo}
                    onChange={(e) => updateField("numero_recibo", e.target.value)}
                    className="font-mono text-sm h-9 mt-1"
                  />
                  <span className="text-[10px] text-muted-foreground">Identificador único do lote</span>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Data de Emissão</Label>
                  <Input
                    type="date"
                    value={data.data_emissao}
                    onChange={(e) => updateField("data_emissao", e.target.value)}
                    className="text-xs h-9 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Status de Pagamento</Label>
                  <Select
                    value={data.status_pagamento}
                    onValueChange={(val: any) => updateField("status_pagamento", val)}
                  >
                    <SelectTrigger className="h-9 mt-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QUITADO">✓ Quitado / Pago</SelectItem>
                      <SelectItem value="PENDENTE">⏱ Pendente / A Prazo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Informações da Empresa Emitente no Recibo */}
              <div className="pt-2 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {data.empresa_logo ? (
                    <img
                      src={data.empresa_logo}
                      alt="Logo"
                      className="h-6 w-12 object-contain bg-white rounded border p-0.5"
                    />
                  ) : (
                    <Building2 className="h-4 w-4 text-red-600" />
                  )}
                  <span>
                    Emitente: <strong>{data.empresa_nome || companySettings.nome || "JC Extintores"}</strong> ({data.empresa_cnpj || companySettings.cnpj || "CNPJ"})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("emitente")}
                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                >
                  Alterar dados do emitente / Logo →
                </Button>
              </div>
            </div>

            {/* 2. DADOS DO CLIENTE */}
            <div className="p-4 bg-muted/40 rounded-xl border space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Dados do Cliente
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome / Razão Social</Label>
                  <Input
                    value={data.cliente_nome}
                    onChange={(e) => updateField("cliente_nome", e.target.value)}
                    className="text-xs h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Documento (CPF / CNPJ)</Label>
                  <Input
                    value={data.cliente_documento || ""}
                    onChange={(e) => updateField("cliente_documento", e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="text-xs h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Telefone de Contato</Label>
                  <Input
                    value={data.cliente_telefone || ""}
                    onChange={(e) => updateField("cliente_telefone", e.target.value)}
                    placeholder="(55) 99999-9999"
                    className="text-xs h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Endereço Completo</Label>
                  <Input
                    value={data.cliente_endereco || ""}
                    onChange={(e) => updateField("cliente_endereco", e.target.value)}
                    placeholder="Rua, Número, Bairro, Cidade"
                    className="text-xs h-9 mt-1"
                  />
                </div>
              </div>
            </div>

            {/* 3. ITENS DO RECIBO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Itens / Extintores ({data.itens.length})
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Edite as informações dos cilindros, modalidades de recarga e valores unitários.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="gap-1.5 text-xs h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar Extintor
                </Button>
              </div>

              <div className="border rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b">
                    <tr>
                      <th className="p-2.5 text-left">Identificação</th>
                      <th className="p-2.5 text-left">Tipo / Carga</th>
                      <th className="p-2.5 text-left">Modalidade</th>
                      <th className="p-2.5 text-left">Validade</th>
                      <th className="p-2.5 text-right w-28">Valor (R$)</th>
                      <th className="p-2.5 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.itens.map((it, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="p-2">
                          <Input
                            value={it.identificacao}
                            onChange={(e) => handleItemChange(idx, "identificacao", e.target.value)}
                            className="h-8 text-xs font-mono font-bold"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={it.tipo_capacidade}
                            onChange={(e) => handleItemChange(idx, "tipo_capacidade", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <Select
                            value={it.modalidade}
                            onValueChange={(val) => handleItemChange(idx, "modalidade", val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Normal">Normal</SelectItem>
                              <SelectItem value="Reaproveitamento">Reaproveitamento</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input
                            value={it.nova_validade || ""}
                            onChange={(e) => handleItemChange(idx, "nova_validade", e.target.value)}
                            placeholder="MM/AAAA"
                            className="h-8 text-xs text-center"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={it.valor}
                            onChange={(e) => handleItemChange(idx, "valor", parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right font-mono font-bold"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remover Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. FORMA DE PAGAMENTO & TOTAL */}
            <div className="p-4 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-semibold">Forma de Pagamento</Label>
                <Select
                  value={String(data.forma_pagamento)}
                  onValueChange={(val) => updateField("forma_pagamento", val)}
                >
                  <SelectTrigger className="h-9 w-full sm:w-64 bg-white dark:bg-neutral-900 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm} value={pm}>
                        {pm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-right">
                <span className="text-xs uppercase font-bold text-muted-foreground block">
                  Valor Total do Recibo
                </span>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="text-sm font-bold text-red-600">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={data.valor_total}
                    onChange={(e) => updateField("valor_total", parseFloat(e.target.value) || 0)}
                    className="h-10 text-xl font-extrabold w-36 text-right font-mono text-red-600 bg-white dark:bg-neutral-900 border-red-300"
                  />
                </div>
              </div>
            </div>

            {/* 5. OBSERVAÇÕES & TERMO DE GARANTIA */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações e Termo de Garantia</Label>
              <Textarea
                rows={2}
                value={data.observacoes || ""}
                onChange={(e) => updateField("observacoes", e.target.value)}
                placeholder="Instruções adicionais, prazo de garantia ou dados bancários..."
                className="text-xs"
              />
            </div>

            {/* 6. OPÇÃO DE SALVAR NOS DOCUMENTOS DO CLIENTE */}
            <div className="flex items-center gap-3 p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <input
                type="checkbox"
                id="saveToDocsCheck"
                checked={saveToDocs}
                onChange={(e) => setSaveToDocs(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="saveToDocsCheck" className="text-xs text-blue-900 dark:text-blue-200 cursor-pointer">
                <strong>Salvar nos Documentos do Cliente:</strong> O arquivo PDF será arquivado no perfil do cliente sem duplicar registros para o mesmo lote.
              </label>
            </div>

            {/* 7. INFORMATIVO DE AUTENTICIDADE DIGITAL & QR CODE */}
            <div className="flex items-center gap-3 p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <strong>Segurança Anti-Adulteração:</strong> Este recibo é gerado com <strong>Selo de Autenticidade Digital e QR Code</strong> vinculado diretamente ao arquivo salvo no Supabase, substituindo assinaturas manuais e prevenindo adulterações.
              </div>
            </div>
          </TabsContent>

          {/* =========================================================================
              ABA 2: DADOS DO EMITENTE & LOGO
              ========================================================================= */}
          <TabsContent value="emitente" className="space-y-5 py-1">
            <div className="p-4 bg-muted/40 rounded-xl border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    Dados Cadastrais da Empresa Emitente
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Estas informações constarão no cabeçalho do recibo em PDF e no cupom térmico 58mm.
                  </p>
                </div>
                <Badge variant="outline" className="border-emerald-300 text-emerald-800 font-semibold">
                  Emitente Oficial
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Nome da Empresa / Razão Social</Label>
                  <Input
                    value={companySettings.nome}
                    onChange={(e) => setCompanySettings((prev) => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome da empresa emitente..."
                    className="text-xs h-9 mt-1 font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">CNPJ</Label>
                  <Input
                    value={companySettings.cnpj}
                    onChange={(e) => setCompanySettings((prev) => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                    className="text-xs h-9 mt-1 font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Telefone / WhatsApp Comercial</Label>
                  <Input
                    value={companySettings.telefone}
                    onChange={(e) => setCompanySettings((prev) => ({ ...prev, telefone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                    className="text-xs h-9 mt-1 font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">E-mail de Contato</Label>
                  <Input
                    type="email"
                    value={companySettings.email}
                    onChange={(e) => setCompanySettings((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="contato@empresa.com.br"
                    className="text-xs h-9 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Endereço / Localização</Label>
                  <Input
                    value={companySettings.endereco}
                    onChange={(e) => setCompanySettings((prev) => ({ ...prev, endereco: e.target.value }))}
                    placeholder="Rua, Número, Bairro - Cidade, UF"
                    className="text-xs h-9 mt-1"
                  />
                </div>
              </div>
            </div>

            {/* UPLOAD E GERENCIAMENTO DO LOGO */}
            <div className="p-4 bg-muted/40 rounded-xl border space-y-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-emerald-600" />
                  Logotipo da Empresa
                </h3>
                <p className="text-xs text-muted-foreground">
                  O logo será impresso no topo direito do PDF e no topo do cupom térmico de 58mm.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-white dark:bg-neutral-900 border rounded-xl">
                {/* Visualizador de Logo */}
                <div className="h-24 w-40 bg-neutral-50 dark:bg-neutral-800 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg flex items-center justify-center p-2 shrink-0 overflow-hidden">
                  {companySettings.logo_url ? (
                    <img
                      src={companySettings.logo_url}
                      alt="Logo da Empresa"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mx-auto text-neutral-400" />
                      <span className="text-[10px] block mt-1">Sem Logotipo</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    Formatos recomendados: <strong>PNG transparente ou JPG</strong> (dimensões mínimas sugeridas: 300x120px).
                  </p>
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold shadow-2xs">
                        <UploadCloud className="h-3.5 w-3.5" />
                        Escolher Imagem...
                      </span>
                    </label>

                    {companySettings.logo_url && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-8"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remover Logo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÃO PARA SALVAR DADOS DO EMITENTE */}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={handleSaveCompany}
                disabled={isSavingCompany}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm text-xs"
              >
                <Save className="h-4 w-4" />
                {isSavingCompany ? "Salvando..." : "Salvar Dados do Emitente & Logo"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0 flex-wrap border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setThermalOpen(true)}
            className="gap-2 border-neutral-300 font-bold text-xs"
          >
            <Printer className="h-4 w-4 text-neutral-700" />
            Imprimir Cupom 58mm (QR Code)
          </Button>

          <Button
            onClick={handleGeneratePdf}
            disabled={isGenerating}
            className="bg-red-600 hover:bg-red-700 text-white gap-2 font-bold shadow-sm"
          >
            <Download className="h-4 w-4" />
            {isGenerating
              ? "Gerando PDF..."
              : existingReceipt?.exists
              ? "Atualizar e Baixar Recibo PDF (Sem Duplicar)"
              : "Gerar e Baixar Recibo PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Modal de Impressão Térmica 58mm com QR Code */}
      <ThermalReceipt58mmDialog
        open={thermalOpen}
        onOpenChange={setThermalOpen}
        receiptData={data}
      />
    </Dialog>
  );
}
