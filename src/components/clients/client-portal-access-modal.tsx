"use client";

import { useEffect, useState } from "react";
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  MessageCircle,
  Loader2,
  Sparkles,
  ExternalLink,
  Building2,
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
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase";
import { formatDocument } from "@/lib/utils";
import type { Customer } from "@/types";

interface ClientPortalAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  onSuccess?: () => void;
}

function generateRandomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let pass = "";
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export function ClientPortalAccessModal({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: ClientPortalAccessModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState(customer.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [existingUser, setExistingUser] = useState<{ email: string; nome: string } | null>(null);

  useEffect(() => {
    if (open && customer) {
      setEmail(customer.email || "");
      setPassword("");
      setSavedSuccess(false);

      // Busca se já existe um usuário vinculado a este cliente
      async function checkExistingUser() {
        try {
          const { data } = await createClient()
            .from("user_profiles")
            .select("email, nome")
            .eq("client_id", customer.id)
            .is("deleted_at", null)
            .maybeSingle();

          if (data?.email) {
            setExistingUser({ email: data.email, nome: data.nome || customer.name });
            setEmail(data.email);
          } else {
            setExistingUser(null);
          }
        } catch {
          // ignore
        }
      }

      checkExistingUser();
    }
  }, [open, customer]);

  function handleGeneratePassword() {
    setPassword(generateRandomPassword());
  }

  async function handleSaveAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast({ variant: "destructive", title: "Informe um e-mail válido" });
      return;
    }
    if (password.length < 6) {
      toast({ variant: "destructive", title: "A senha deve ter no mínimo 6 dígitos" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/client-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: customer.id,
          nome: customer.name,
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível definir o acesso.");
      }

      setSavedSuccess(true);
      toast({
        variant: "success",
        title: "Acesso Liberado!",
        description: `E-mail e senha definidos com sucesso para ${customer.name}.`,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao configurar acesso",
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "https://extincontrol.vercel.app/login";

  const messageText = `Olá, ${customer.name}! Seu acesso exclusivo ao Portal do Cliente da JC Extintores foi ativado.\n\n🔗 Link de Acesso: ${loginUrl}\n📧 Login: ${email}\n🔑 Senha: ${password}\n\nNo portal você pode:\n• Acompanhar a próxima recarga dos seus extintores\n• Consultar o Memorial Descritivo (Anexo D)\n• Visualizar o status do seu PPCI e vistorias\n• Aprovar e visualizar orçamentos online`;

  function handleCopyMessage() {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    toast({
      variant: "success",
      title: "Mensagem copiada!",
      description: "Cole no WhatsApp ou envie por e-mail para o cliente.",
    });
    setTimeout(() => setCopied(false), 2500);
  }

  function handleOpenWhatsApp() {
    const phone = (customer.whatsapp || customer.phone1 || "").replace(/\D/g, "");
    const encoded = encodeURIComponent(messageText);
    const url = phone ? `https://wa.me/55${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-700">
            <KeyRound className="h-5 w-5" />
            Acesso ao Portal do Cliente
          </DialogTitle>
          <DialogDescription>
            Defina o e-mail e a senha para <strong>{customer.name}</strong> acessar suas recargas, Anexo D, PPCI e orçamentos.
          </DialogDescription>
        </DialogHeader>

        {!savedSuccess ? (
          <form onSubmit={handleSaveAccess} className="space-y-4 py-2">
            {/* INFORMAÇÃO DE VINCULAÇÃO AUTOMÁTICA */}
            <div className="p-3 bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-200">
                <Building2 className="h-4 w-4 text-purple-600" />
                <span>Vinculação Automática de Empresa</span>
              </div>
              <p className="text-[11px] text-purple-700 dark:text-purple-300">
                Este usuário será vinculado automaticamente a <strong>{customer.name}</strong>
                {customer.document ? ` (${formatDocument(customer.document)})` : ""} com perfil Cliente.
              </p>
              {existingUser && (
                <div className="pt-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Conta existente vinculada: <strong>{existingUser.email}</strong>. Definir nova senha atualizará o acesso.</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">E-mail de Login do Cliente *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@empresa.com.br"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Senha de Acesso (mínimo 6 caracteres) *</Label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] text-purple-600 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" /> Gerar senha forte
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Defina a senha (ex: cliente123)"
                  className="h-9 text-xs pr-9 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg text-xs text-purple-900 border border-purple-200">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-purple-600" /> O que o cliente poderá acessar:
              </p>
              <ul className="list-disc pl-4 mt-1.5 space-y-0.5 text-[11px] text-purple-800">
                <li>Próximas recargas e inventário de extintores</li>
                <li>Ficha Técnica / Memorial Descritivo (Anexo D)</li>
                <li>Validade do PPCI e laudos de vistoria técnica</li>
                <li>Visualizar e aprovar orçamentos online</li>
              </ul>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar e Liberar Acesso"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-green-50 rounded-lg text-xs text-green-900 border border-green-200 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-green-800">
                <Check className="h-4 w-4 text-green-600" /> Acesso ativado com sucesso!
              </p>
              <p className="text-[11px] text-green-700">
                O cliente já pode fazer login com as credenciais abaixo:
              </p>
              <div className="p-2 bg-white rounded border border-green-200 font-mono text-[11px]">
                <p><strong>Login:</strong> {email}</p>
                <p><strong>Senha:</strong> {password}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-9 justify-center"
                onClick={handleCopyMessage}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-600" /> Mensagem Copiada!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" /> Copiar Dados para Envio
                  </>
                )}
              </Button>

              <Button
                type="button"
                className="w-full text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white justify-center"
                onClick={handleOpenWhatsApp}
              >
                <MessageCircle className="mr-2 h-4 w-4" /> Enviar Credenciais via WhatsApp
              </Button>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setSavedSuccess(false);
                  onOpenChange(false);
                }}
              >
                Concluir
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
