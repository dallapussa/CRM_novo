"use client";

import { useState, useMemo } from "react";
import {
  MessageCircle,
  Send,
  Copy,
  Check,
  Building2,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  title: string;
  category: "vencimento" | "orcamento" | "coleta" | "oficina";
  icon: any;
  text: string;
}

const TEMPLATES: Template[] = [
  {
    id: "vencimento_extintores",
    title: "Aviso de Extintores a Vencer",
    category: "vencimento",
    icon: AlertTriangle,
    text: `Olá, {cliente}! Tudo bem? 🚒\n\nIdentificamos em nosso sistema que a carga dos extintores de incêndio da sua empresa está próxima do vencimento neste mês.\n\nPara manter a sua edificação em conformidade com as normas do Corpo de Bombeiros (PPCI) e segurança do seu patrimônio, podemos agendar a retirada e recarga dos equipamentos nesta semana?\n\nAguardamos seu retorno para programarmos o técnico!`,
  },
  {
    id: "orcamento_pronto",
    title: "Orçamento Pronto para Aprovação",
    category: "orcamento",
    icon: FileCheck,
    text: `Olá, {cliente}! Tudo bem? 📋\n\nO orçamento para recarga e manutenção preventiva dos seus extintores e mangueiras já está elaborado e pronto para análise.\n\nOferecemos garantia de conformidade técnica, selo Inmetro e laudo de conformidade.\n\nPodemos confirmar a aprovação para iniciar o cronograma de atendimento?`,
  },
  {
    id: "coleta_agendada",
    title: "Confirmação de Coleta / Retirada",
    category: "coleta",
    icon: Truck,
    text: `Olá, {cliente}! 🚚\n\nConfirmamos a visita da nossa equipe técnica para coleta dos extintores no seu endereço.\n\nDeixaremos extintores de reserva provisórios para que seu local nunca fique desprotegido durante o período de oficina.\n\nQualquer dúvida, estamos à disposição!`,
  },
  {
    id: "oficina_pronta",
    title: "Equipamentos Prontos na Oficina",
    category: "oficina",
    icon: ShieldCheck,
    text: `Olá, {cliente}! Boas notícias! ✅\n\nA manutenção, recarga e inspeção dos seus equipamentos de combate a incêndio foram concluídas com sucesso na nossa oficina.\n\nTodos os selos Inmetro foram aplicados. Qual o melhor dia e horário para realizarmos a entrega e instalação no local?`,
  },
];

export function WhatsappHub() {
  const { toast } = useToast();
  const { data: clients = [] } = useClients();

  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0].id);
  const [customMessage, setCustomMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Cliente selecionado
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || clients[0];
  }, [clients, selectedClientId]);

  // Template selecionado
  const activeTemplate = useMemo(() => {
    return TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];
  }, [selectedTemplateId]);

  // Mensagem calculada com variáveis substituídas
  const resolvedMessage = useMemo(() => {
    if (customMessage) return customMessage;
    const clientName = selectedClient?.name || "{cliente}";
    return activeTemplate.text.replaceAll("{cliente}", clientName);
  }, [customMessage, selectedClient, activeTemplate]);

  // Número limpo para WhatsApp
  const cleanPhone = useMemo(() => {
    if (!selectedClient?.phone1) return "";
    const digits = selectedClient.phone1.replace(/\D/g, "");
    if (!digits) return "";
    return digits.startsWith("55") ? digits : `55${digits}`;
  }, [selectedClient]);

  function handleSelectTemplate(tmpl: Template) {
    setSelectedTemplateId(tmpl.id);
    const clientName = selectedClient?.name || "{cliente}";
    setCustomMessage(tmpl.text.replaceAll("{cliente}", clientName));
  }

  function handleCopy() {
    navigator.clipboard.writeText(resolvedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Mensagem copiada para a área de transferência!" });
  }

  function handleOpenWhatsApp() {
    if (!cleanPhone) {
      toast({
        variant: "destructive",
        title: "Telefone não cadastrado",
        description: "Este cliente não possui telefone com WhatsApp cadastrado.",
      });
      return;
    }
    const encoded = encodeURIComponent(resolvedMessage);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight flex items-center gap-2">
          <MessageCircle className="h-7 w-7 text-emerald-600" />
          Central de WhatsApp Oficial
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envio ágil de avisos de recarga, aprovação de orçamentos e notificações operacionais direto no WhatsApp do cliente.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Templates Disponíveis */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Modelos de Mensagem Prontos
              </CardTitle>
              <CardDescription>
                Selecione um modelo para carregar o texto padrão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
                      isSelected
                        ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300"
                        : "hover:bg-muted/50 border-border"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-md shrink-0 ${
                        isSelected ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {tmpl.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {tmpl.text}
                      </p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Simulador e Envio */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-emerald-200">
            <CardHeader className="bg-emerald-500/5 pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    Destinatário & Conteúdo
                  </CardTitle>
                  <CardDescription>
                    Selecione o cliente para personalizar automaticamente
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Cliente Destinatário</Label>
                  <Select
                    value={selectedClientId || selectedClient?.id}
                    onValueChange={(val) => {
                      setSelectedClientId(val);
                      const c = clients.find((x) => x.id === val);
                      if (c) {
                        setCustomMessage(activeTemplate.text.replaceAll("{cliente}", c.name));
                      }
                    }}
                  >
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
                  <Label>Telefone / WhatsApp</Label>
                  <Input
                    value={selectedClient?.phone1 || "Sem telefone cadastrado"}
                    disabled
                    className="font-mono text-sm bg-muted/30"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Texto da Mensagem (Editável)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-6 px-2 text-xs flex items-center gap-1"
                  >
                    {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
                <Textarea
                  rows={8}
                  value={resolvedMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="font-sans text-sm resize-none"
                />
              </div>

              {/* Botão de Disparo */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Abre a conversa oficial no WhatsApp Web com o texto pronto.
                </p>
                <Button
                  onClick={handleOpenWhatsApp}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Abrir WhatsApp Web
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
