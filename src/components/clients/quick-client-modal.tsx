"use client";

import { useState } from "react";
import { Plus, Building2, User, MapPin, Phone, Mail, Loader2, Search } from "lucide-react";
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
import { useSaveClient } from "@/hooks/useClients";
import { formatCEP, formatCNPJ, formatCPF, formatPhone, fetchAddressByCep } from "@/lib/utils";

interface QuickClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (client: { id: string; name: string; document: string; phone?: string; address?: string }) => void;
}

export function QuickClientModal({ open, onOpenChange, onClientCreated }: QuickClientModalProps) {
  const { toast } = useToast();
  const saveMutation = useSaveClient();

  const [type, setType] = useState<"pj" | "pf">("pj");
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("RS");
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  function resetForm() {
    setName("");
    setDocument("");
    setPhone("");
    setEmail("");
    setCep("");
    setStreet("");
    setNumber("");
    setNeighborhood("");
    setCity("");
    setState("RS");
  }

  async function handleCepBlur() {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      setIsLoadingCep(true);
      try {
        const addr = await fetchAddressByCep(cleanCep);
        if (addr) {
          setStreet(addr.street || "");
          setNeighborhood(addr.neighborhood || "");
          setCity(addr.city || "");
          setState(addr.state || "RS");
        }
      } catch {
        // Ignora erro de busca
      } finally {
        setIsLoadingCep(false);
      }
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Informe o nome ou razão social" });
      return;
    }

    try {
      const addressData = (street || city) ? {
        street,
        number,
        neighborhood,
        city,
        state,
        cep,
      } : undefined;

      const createdId = await saveMutation.mutateAsync({
        input: {
          type,
          name: name.trim(),
          document: document.trim(),
          phone1: phone.trim(),
          email: email.trim() || undefined,
          address: addressData,
          is_active: true,
        },
      });

      const formattedAddr = [street, number, neighborhood, city, state].filter(Boolean).join(", ");

      toast({
        variant: "success",
        title: "Cliente cadastrado!",
        description: `${name} já foi selecionado para este orçamento.`,
      });

      onClientCreated({
        id: createdId,
        name: name.trim(),
        document: document.trim(),
        phone: phone.trim(),
        address: formattedAddr,
      });

      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar cliente",
        description: err?.message || "Tente novamente.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Cadastro Rápido de Cliente
            </DialogTitle>
            <DialogDescription>
              Cadastre o cliente diretamente no orçamento sem perder os itens já digitados.
            </DialogDescription>
          </DialogHeader>

          {/* Tipo PJ / PF */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === "pj" ? "default" : "outline"}
              size="sm"
              onClick={() => setType("pj")}
              className="flex-1"
            >
              <Building2 className="mr-1.5 h-4 w-4" /> Pessoa Jurídica (PJ)
            </Button>
            <Button
              type="button"
              variant={type === "pf" ? "default" : "outline"}
              size="sm"
              onClick={() => setType("pf")}
              className="flex-1"
            >
              <User className="mr-1.5 h-4 w-4" /> Pessoa Física (PF)
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">
                {type === "pj" ? "Razão Social / Nome Fantasia *" : "Nome Completo *"}
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === "pj" ? "Ex: Indústria e Comércio Silva Ltda" : "Ex: João da Silva"}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{type === "pj" ? "CNPJ" : "CPF"}</Label>
              <Input
                value={document}
                onChange={(e) => setDocument(type === "pj" ? formatCNPJ(e.target.value) : formatCPF(e.target.value))}
                placeholder={type === "pj" ? "00.000.000/0000-00" : "000.000.000-00"}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Telefone / WhatsApp *</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">E-mail Comercial</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@empresa.com.br"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Endereço de Obra / Localização */}
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Endereço do Estabelecimento / Local da Obra
            </p>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-[11px]">CEP</Label>
                <div className="relative">
                  <Input
                    value={cep}
                    onChange={(e) => setCep(formatCEP(e.target.value))}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    className="h-8 text-xs font-mono pr-7"
                  />
                  {isLoadingCep && (
                    <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-[11px]">Rua / Logradouro</Label>
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Av. Principal"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Número</Label>
                <Input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="123"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Bairro</Label>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Centro"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Cidade / UF</Label>
                <Input
                  value={city ? `${city} - ${state}` : ""}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Cruz Alta - RS"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Cadastrar e Usar no Orçamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
