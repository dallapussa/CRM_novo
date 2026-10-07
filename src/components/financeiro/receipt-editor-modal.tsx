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
  Building,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  type EditableReceiptData,
  type ReceiptItem,
  buildReceiptPdfDocument,
  saveReceiptPdfToClientDocuments,
} from "@/services/receipt-pdf.service";
import { ThermalReceipt58mmDialog } from "./thermal-receipt-58mm-dialog";

interface ReceiptEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: EditableReceiptData | null;
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
  onSuccess,
}: ReceiptEditorModalProps) {
  const { toast } = useToast();
  const [data, setData] = useState<EditableReceiptData | null>(null);
  const [saveToDocs, setSaveToDocs] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [thermalOpen, setThermalOpen] = useState(false);

  useEffect(() => {
    if (initialData && open) {
      setData({
        ...initialData,
        numero_recibo:
          initialData.numero_recibo ||
          `REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(10 + Math.random() * 90)}`,
        data_emissao:
          initialData.data_emissao || new Date().toISOString().split("T")[0],
        itens: initialData.itens ? [...initialData.itens] : [],
        observacoes:
          initialData.observacoes ||
          "Garantia de 12 meses contra defeitos de recarga e teste de pressão.",
      });
    }
  }, [initialData, open]);

  if (!data) return null;

  // Atualização de campos principais
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

  // Gerar e Salvar PDF
  const handleGeneratePdf = async () => {
    if (!data) return;
    setIsGenerating(true);

    try {
      // 1. Gera o PDF vetorizado com jsPDF e Selo de Autenticidade com QR Code
      const { doc, fileName } = await buildReceiptPdfDocument(data);

      // 2. Faz o download direto no dispositivo
      doc.save(fileName);

      // 3. Se marcado, salva no menu de documentos do cliente no Supabase
      if (saveToDocs && data.cliente_id) {
        try {
          await saveReceiptPdfToClientDocuments(data.cliente_id, data, doc);
          toast({
            variant: "success",
            title: "Recibo gerado e anexado ao cliente!",
            description: `O arquivo "${fileName}" foi baixado e já está disponível no Menu Documentos do cliente.`,
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
                Editar e Gerar Recibo em PDF
              </DialogTitle>
              <DialogDescription>
                Personalize os dados, valores e condições antes de gerar o documento PDF oficial.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
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
              </div>

              <div>
                <Label className="text-xs font-semibold">Data de Emissão</Label>
                <Input
                  type="date"
                  value={data.data_emissao}
                  onChange={(e) => updateField("data_emissao", e.target.value)}
                  className="text-sm h-9 mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Status do Pagamento</Label>
                <Select
                  value={data.status_pagamento}
                  onValueChange={(val: any) => updateField("status_pagamento", val)}
                >
                  <SelectTrigger className="h-9 mt-1 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QUITADO">✓ Quitado / Pago</SelectItem>
                    <SelectItem value="PENDENTE">⏱ Pendente / A Prazo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 2. DADOS DO CLIENTE */}
          <div className="p-4 bg-muted/40 rounded-xl border space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building className="h-4 w-4 text-blue-600" />
              Dados do Cliente
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Nome / Razão Social</Label>
                <Input
                  value={data.cliente_nome}
                  onChange={(e) => updateField("cliente_nome", e.target.value)}
                  className="text-sm h-9 mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">CPF / CNPJ</Label>
                <Input
                  value={data.cliente_documento || ""}
                  onChange={(e) => updateField("cliente_documento", e.target.value)}
                  placeholder="Ex: 00.000.000/0001-00"
                  className="text-sm h-9 mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
                <Input
                  value={data.cliente_telefone || ""}
                  onChange={(e) => updateField("cliente_telefone", e.target.value)}
                  placeholder="Ex: (55) 99999-9999"
                  className="text-sm h-9 mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Endereço Completo</Label>
                <Input
                  value={data.cliente_endereco || ""}
                  onChange={(e) => updateField("cliente_endereco", e.target.value)}
                  placeholder="Rua, Número, Bairro, Cidade"
                  className="text-sm h-9 mt-1"
                />
              </div>
            </div>
          </div>

          {/* 3. ITENS E EXTINTORES DO RECIBO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                Itens e Cilindros no Recibo ({data.itens.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="gap-1.5 text-xs h-8 border-dashed"
              >
                <Plus className="h-3.5 w-3.5 text-red-600" />
                Adicionar Cilindro
              </Button>
            </div>

            <div className="border rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground font-semibold border-b">
                  <tr>
                    <th className="p-2.5">Item / Selo</th>
                    <th className="p-2.5">Modelo / Carga</th>
                    <th className="p-2.5">Modalidade</th>
                    <th className="p-2.5">Validade</th>
                    <th className="p-2.5 w-28 text-right">Valor Unit. (R$)</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.itens.map((it, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="p-2 font-mono">
                        <Input
                          value={it.identificacao}
                          onChange={(e) => handleItemChange(idx, "identificacao", e.target.value)}
                          className="h-7 text-xs font-mono font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={it.tipo_capacidade}
                          onChange={(e) => handleItemChange(idx, "tipo_capacidade", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={it.modalidade}
                          onValueChange={(val) => handleItemChange(idx, "modalidade", val)}
                        >
                          <SelectTrigger className="h-7 text-xs">
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
                          className="h-7 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={it.valor}
                          onChange={(e) => handleItemChange(idx, "valor", parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs text-right font-mono font-bold"
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
              <strong>Disponibilizar PDF na aba "Documentos" do cliente:</strong> O arquivo PDF gerado será salvo no perfil do cliente para consulta futura e re-impressão.
            </label>
          </div>

          {/* 7. INFORMATIVO DE AUTENTICIDADE DIGITAL & QR CODE */}
          <div className="flex items-center gap-3 p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <strong>Segurança Anti-Adulteração:</strong> Este recibo é gerado com <strong>Selo de Autenticidade Digital e QR Code</strong> vinculado diretamente ao arquivo salvo no Supabase, substituindo assinaturas manuais e prevenindo adulterações.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
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
            {isGenerating ? "Gerando PDF..." : "Gerar e Baixar Recibo PDF"}
          </Button>
        </DialogFooter>

        {/* Modal de Impressão Térmica 58mm com QR Code */}
        <ThermalReceipt58mmDialog
          open={thermalOpen}
          onOpenChange={setThermalOpen}
          receiptData={data}
        />
      </DialogContent>
    </Dialog>
  );
}
