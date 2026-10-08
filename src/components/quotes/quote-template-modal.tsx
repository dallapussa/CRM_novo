"use client";

import { useState } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Check,
  Edit2,
  Layers,
  Sparkles,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  QuoteTemplate,
  QuoteTemplateItem,
  listQuoteTemplates,
  saveQuoteTemplate,
  deleteQuoteTemplate,
} from "@/services/quote-templates.service";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface QuoteTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: QuoteTemplate[];
  onTemplatesUpdated: () => void;
  onSelectTemplate?: (template: QuoteTemplate) => void;
}

export function QuoteTemplateModal({
  open,
  onOpenChange,
  templates,
  onTemplatesUpdated,
  onSelectTemplate,
}: QuoteTemplateModalProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [validadeDias, setValidadeDias] = useState(15);
  const [condicoesPagamento, setCondicoesPagamento] = useState("");
  const [termosGarantia, setTermosGarantia] = useState("");
  const [clausulaPpci, setClausulaPpci] = useState("");
  const [items, setItems] = useState<QuoteTemplateItem[]>([]);

  function handleStartNew() {
    setSelectedTemplate(null);
    setNome("Novo Modelo de Orçamento");
    setDescricao("Descrição da proposta e escopo padrão");
    setValidadeDias(15);
    setCondicoesPagamento("À vista ou 30 dias após emissão da NF.");
    setTermosGarantia("Garantia de 12 meses conforme normas vigentes.");
    setClausulaPpci("Conformidade com instruções técnicas do Corpo de Bombeiros Militar.");
    setItems([
      {
        tipo_origem: "extintor",
        descricao: "Recarga Extintor Pó ABC 4kg",
        quantidade: 1,
        valor_unitario: 45,
        unidade: "un",
      },
    ]);
    setIsEditing(true);
  }

  function handleStartEdit(tpl: QuoteTemplate) {
    setSelectedTemplate(tpl);
    setNome(tpl.nome);
    setDescricao(tpl.descricao);
    setValidadeDias(tpl.validade_dias || 15);
    setCondicoesPagamento(tpl.condicoes_pagamento || "");
    setTermosGarantia(tpl.termos_garantia || "");
    setClausulaPpci(tpl.clausula_ppci || "");
    setItems([...tpl.itens_padrao]);
    setIsEditing(true);
  }

  function handleAddItem() {
    setItems((prev) => [
      ...prev,
      {
        tipo_origem: "catalogo",
        descricao: "",
        quantidade: 1,
        valor_unitario: 0,
        unidade: "un",
      },
    ]);
  }

  function handleUpdateItem(idx: number, field: keyof QuoteTemplateItem, val: any) {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  }

  function handleRemoveItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveTemplate() {
    if (!nome.trim()) {
      toast({ variant: "destructive", title: "Informe o nome do modelo" });
      return;
    }

    try {
      await saveQuoteTemplate({
        id: selectedTemplate?.id,
        nome: nome.trim(),
        descricao: descricao.trim(),
        validade_dias: validadeDias,
        condicoes_pagamento: condicoesPagamento.trim(),
        termos_garantia: termosGarantia.trim(),
        clausula_ppci: clausulaPpci.trim(),
        itens_padrao: items.filter((it) => it.descricao.trim()),
      });

      toast({
        variant: "success",
        title: "Modelo salvo com sucesso!",
      });

      setIsEditing(false);
      onTemplatesUpdated();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar modelo",
        description: err?.message,
      });
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Tem certeza que deseja excluir este modelo?")) return;
    try {
      await deleteQuoteTemplate(id);
      toast({ variant: "success", title: "Modelo excluído com sucesso!" });
      onTemplatesUpdated();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao excluir" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-orange-600" />
              Modelos de Orçamento (Tipos e Pacotes)
            </DialogTitle>
            {!isEditing && (
              <Button size="sm" onClick={handleStartNew} className="h-8">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Novo Modelo
              </Button>
            )}
          </div>
          <DialogDescription>
            Crie e gerencie modelos pré-configurados (Ex: Hidrantes, Simplificado, Completo PPCI) com itens e termos padrão.
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Nome do Modelo *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Hidrantes & Mangueiras"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Validade Padrão (Dias)</Label>
                <Input
                  type="number"
                  min="1"
                  value={validadeDias}
                  onChange={(e) => setValidadeDias(Number(e.target.value) || 15)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <Label className="text-xs">Descrição do Modelo</Label>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Finalidade deste tipo de proposta..."
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Itens Padrão */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Itens Padrão do Modelo</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-7 text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" /> Adicionar Item
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {items.map((it, idx) => (
                  <div key={idx} className="p-2 border rounded-md grid gap-2 sm:grid-cols-12 items-center bg-muted/20">
                    <div className="sm:col-span-6">
                      <Input
                        value={it.descricao}
                        onChange={(e) => handleUpdateItem(idx, "descricao", e.target.value)}
                        placeholder="Descrição do item/serviço..."
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        min="1"
                        value={it.quantidade}
                        onChange={(e) => handleUpdateItem(idx, "quantidade", Number(e.target.value) || 1)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        value={it.valor_unitario}
                        onChange={(e) => handleUpdateItem(idx, "valor_unitario", Number(e.target.value) || 0)}
                        className="h-7 text-xs font-mono"
                        placeholder="R$ Unitário"
                      />
                    </div>
                    <div className="sm:col-span-1 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500"
                        onClick={() => handleRemoveItem(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Termos e Cláusulas */}
            <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-xs">Condições de Pagamento</Label>
                <Textarea
                  rows={2}
                  value={condicoesPagamento}
                  onChange={(e) => setCondicoesPagamento(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Termos de Garantia</Label>
                <Textarea
                  rows={2}
                  value={termosGarantia}
                  onChange={(e) => setTermosGarantia(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Cláusula de Normas Técnicas / PPCI</Label>
                <Textarea
                  rows={2}
                  value={clausulaPpci}
                  onChange={(e) => setClausulaPpci(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTemplate}>Salvar Modelo</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="relative hover:border-orange-300 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-orange-500" />
                        {tpl.nome}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {tpl.descricao || "Sem descrição"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {tpl.validade_dias || 15} dias
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                    <p className="font-medium text-[11px] text-foreground">
                      {tpl.itens_padrao.length} item(ns) pré-configurado(s):
                    </p>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {tpl.itens_padrao.slice(0, 3).map((it, idx) => (
                        <li key={idx} className="line-clamp-1">
                          {it.quantidade}x {it.descricao} ({formatCurrency(it.valor_unitario)})
                        </li>
                      ))}
                      {tpl.itens_padrao.length > 3 && (
                        <li className="text-[10px] text-muted-foreground">
                          + {tpl.itens_padrao.length - 3} outros itens
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleStartEdit(tpl)}
                      >
                        <Edit2 className="mr-1 h-3 w-3" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteTemplate(tpl.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {onSelectTemplate && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={() => {
                          onSelectTemplate(tpl);
                          onOpenChange(false);
                        }}
                      >
                        <Check className="mr-1 h-3 w-3" /> Aplicar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
