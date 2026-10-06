"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  UserCheck,
  Building2,
  MapPin,
  FileText,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  Search,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { type Customer, PPCI_ENQUADRAMENTO_OPTIONS } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSaveClient } from "@/hooks/useClients";
import { applyMask, formatCEP, formatCNPJ, formatCPF, formatPhone, fetchAddressByCep } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { ClientDragDropUploader } from "@/components/clients/client-drag-drop-uploader";
import { CheckCircle2, Paperclip } from "lucide-react";

const customerSchema = z.object({
  type: z.enum(["pf", "pj"], { message: "Selecione o tipo de cliente" }),
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  document: z.string().min(11, { message: "Documento inválido" }),
  ie_rg: z.string().optional(),
  phone1: z.string().min(10, { message: "Telefone principal inválido" }),
  phone2: z.string().optional(),
  whatsapp: z.string().optional(),
  gov_password: z.string().optional(),
  ppci_isento: z.boolean().default(false),
  ppci_enquadramento: z.string().optional(),
  ppci_expires_at: z.string().optional(),
  ppci_number: z.string().optional(),
  metragem: z.string().optional(),
  cpf_responsavel: z.string().optional(),
  contato_responsavel: z.string().optional(),
  senha_gov: z.string().optional(),
  email: z.union([z.literal(""), z.string().email({ message: "E-mail inválido" })]).optional(),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

type FormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  initialData?: Customer;
  mode: "create" | "edit";
}

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function CustomerForm({ initialData, mode }: CustomerFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const saveClientMutation = useSaveClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showGovPassword, setShowGovPassword] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [copiedGovPassword, setCopiedGovPassword] = useState(false);
  const numberInputRef = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<FormValues>({
    type: initialData?.type || "pj",
    name: initialData?.name || "",
    document: (initialData?.type || "pj") === "pj"
      ? formatCNPJ(initialData?.document || "")
      : formatCPF(initialData?.document || ""),
    ie_rg: initialData?.ie_rg || "",
    phone1: formatPhone(initialData?.phone1 || ""),
    phone2: formatPhone(initialData?.phone2 || ""),
    whatsapp: formatPhone(initialData?.whatsapp || ""),
    gov_password: initialData?.gov_password || initialData?.senha_gov || "",
    ppci_isento: initialData?.ppci_isento ?? false,
    ppci_enquadramento: initialData?.ppci_enquadramento || "PSPCI (Plano Simplificado)",
    ppci_expires_at: initialData?.ppci_expires_at ? initialData.ppci_expires_at.split("T")[0] : "",
    ppci_number: initialData?.ppci_number || "",
    metragem: initialData?.metragem ? String(initialData.metragem) : "",
    cpf_responsavel: formatCPF(initialData?.cpf_responsavel || ""),
    contato_responsavel: formatPhone(initialData?.contato_responsavel || ""),
    senha_gov: initialData?.senha_gov || initialData?.gov_password || "",
    email: initialData?.email || "",
    is_active: initialData?.is_active ?? true,
    notes: initialData?.notes || "",
    cep: formatCEP(initialData?.address?.cep || ""),
    street: initialData?.address?.street || "",
    number: initialData?.address?.number || "",
    complement: initialData?.address?.complement || "",
    neighborhood: initialData?.address?.neighborhood || "",
    city: initialData?.address?.city || "",
    state: initialData?.address?.state || "",
  });

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[key as string];
        return n;
      });
    }
  }

  async function handleCepLookup(cepValue: string) {
    const clean = cepValue.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setIsSearchingCep(true);
    try {
      const result = await fetchAddressByCep(clean);
      if (result) {
        setValues((prev) => ({
          ...prev,
          cep: formatCEP(clean),
          street: result.street || prev.street,
          neighborhood: result.neighborhood || prev.neighborhood,
          city: result.city || prev.city,
          state: result.state || prev.state,
        }));
        toast({
          variant: "success",
          title: "Endereço localizado!",
          description: `${result.street ? result.street + ", " : ""}${result.neighborhood || result.city} (${result.state})`,
        });
        setTimeout(() => {
          numberInputRef.current?.focus();
        }, 150);
      } else {
        toast({
          variant: "default",
          title: "CEP não encontrado",
          description: "Não localizamos o endereço automaticamente. Preencha manualmente.",
        });
      }
    } catch {
      //
    } finally {
      setIsSearchingCep(false);
    }
  }

  function handleCopyGovPassword() {
    if (!values.gov_password) return;
    navigator.clipboard.writeText(values.gov_password);
    setCopiedGovPassword(true);
    toast({
      variant: "success",
      title: "Senha copiada!",
      description: "A senha do GOV.BR foi copiada para a área de transferência.",
    });
    setTimeout(() => setCopiedGovPassword(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const parsed = customerSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as string;
        if (!errs[k]) errs[k] = i.message;
      });
      setErrors(errs);
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        title: "Verifique o formulário",
        description: "Alguns campos precisam ser corrigidos.",
      });
      return;
    }

    const address =
      values.cep || values.street || values.city || values.state
        ? {
            cep: values.cep ? values.cep.replace(/\D/g, "") : undefined,
            street: values.street || undefined,
            number: values.number || undefined,
            complement: values.complement || undefined,
            neighborhood: values.neighborhood || undefined,
            city: values.city || undefined,
            state: values.state || undefined,
          }
        : null;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const payload = {
        type: values.type,
        name: values.name.trim(),
        document: values.document.replace(/\D/g, ""),
        ie_rg: values.ie_rg?.trim() || null,
        phone1: values.phone1.replace(/\D/g, ""),
        phone2: values.phone2 ? values.phone2.replace(/\D/g, "") : null,
        whatsapp: values.whatsapp ? values.whatsapp.replace(/\D/g, "") : null,
        gov_password: values.senha_gov?.trim() || values.gov_password?.trim() || null,
        senha_gov: values.senha_gov?.trim() || values.gov_password?.trim() || null,
        ppci_isento: values.ppci_isento,
        ppci_enquadramento: values.ppci_enquadramento?.trim() || null,
        ppci_expires_at: values.ppci_expires_at ? values.ppci_expires_at : null,
        ppci_number: values.ppci_number?.trim() || null,
        metragem: values.metragem ? parseFloat(values.metragem.replace(",", ".")) : null,
        cpf_responsavel: values.cpf_responsavel ? values.cpf_responsavel.replace(/\D/g, "") : null,
        contato_responsavel: values.contato_responsavel ? values.contato_responsavel.replace(/\D/g, "") : null,
        email: values.email?.trim() || null,
        address,
        notes: values.notes?.trim() || null,
        is_active: values.is_active,
      };

      if (mode === "create") {
        await saveClientMutation.mutateAsync({ input: {
          ...payload,
          created_by: user.id,
          owner_id: user.id,
        } });
        toast({
          variant: "success",
          title: "Cliente cadastrado!",
          description: `${values.name} foi adicionado com sucesso.`,
        });
        router.push("/dashboard/clientes");
      } else if (initialData) {
        await saveClientMutation.mutateAsync({ input: payload, id: initialData.id });
        toast({
          variant: "success",
          title: "Cliente atualizado!",
          description: "Alterações salvas com sucesso.",
        });
        router.push(`/dashboard/clientes/${initialData.id}`);
      }
      router.refresh();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: err?.message || "Não foi possível salvar as informações.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const labelDoc = values.type === "pj" ? "CNPJ" : "CPF";
  const labelIe = values.type === "pj" ? "Inscrição Estadual" : "RG";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <Link href="/dashboard/clientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
            {mode === "create" ? "Novo Cliente" : "Editar Cliente"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "create"
              ? "Preencha os dados para cadastrar um novo cliente."
              : "Atualize as informações do cliente."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {values.type === "pj" ? (
                <Building2 className="h-5 w-5 text-indigo-600" />
              ) : (
                <UserCheck className="h-5 w-5 text-sky-600" />
              )}
              <CardTitle className="text-base">Dados Principais</CardTitle>
            </div>
            <CardDescription>
              Informações básicas do cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Tipo de Cliente *</Label>
                <Select
                  value={values.type}
                  onValueChange={(v) => {
                    const tipo = v as "pf" | "pj";
                    setValues((prev) => {
                      const raw = prev.document.replace(/\D/g, "");
                      const mascarado = tipo === "pj" ? formatCNPJ(raw) : formatCPF(raw);
                      return { ...prev, type: tipo, document: mascarado };
                    });
                    if (errors.type) {
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.type;
                        return n;
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pj">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> Pessoa Jurídica
                      </div>
                    </SelectItem>
                    <SelectItem value="pf">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" /> Pessoa Física
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>
                  {values.type === "pj" ? "Razão Social *" : "Nome Completo *"}
                </Label>
                <Input
                  value={values.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder={
                    values.type === "pj"
                      ? "Ex: Empresa XYZ Ltda"
                      : "Ex: João da Silva"
                  }
                />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>{labelDoc} *</Label>
                <Input
                  value={values.document}
                  onChange={(e) =>
                    setField(
                      "document",
                      applyMask(e.target.value, values.type === "pj" ? "cnpj" : "cpf")
                    )
                  }
                  placeholder={
                    values.type === "pj" ? "00.000.000/0000-00" : "000.000.000-00"
                  }
                />
                {errors.document && (
                  <p className="text-xs text-red-600">{errors.document}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{labelIe}</Label>
                <Input
                  value={values.ie_rg || ""}
                  onChange={(e) => setField("ie_rg", e.target.value)}
                  placeholder={values.type === "pj" ? "Inscrição Estadual" : "RG"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={values.is_active ? "active" : "inactive"}
                  onValueChange={(v) =>
                    setField("is_active", v === "active")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        Ativo
                      </Badge>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <Badge
                        variant="outline"
                        className="bg-gray-100 text-gray-600 border-gray-200"
                      >
                        Inativo
                      </Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base">Contato & WhatsApp</CardTitle>
            </div>
            <CardDescription>Telefones, WhatsApp dedicado e e-mail de contato</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Telefone Principal *</Label>
                <Input
                  value={values.phone1}
                  onChange={(e) => setField("phone1", applyMask(e.target.value, "phone"))}
                  placeholder="(00) 00000-0000"
                />
                {errors.phone1 && (
                  <p className="text-xs text-red-600">{errors.phone1}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="whatsapp-input" className="flex items-center gap-1.5 font-medium">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    WhatsApp
                  </Label>
                  {values.phone1 && values.phone1.replace(/\D/g, "").length >= 10 && values.phone1 !== values.whatsapp && (
                    <button
                      type="button"
                      onClick={() => setField("whatsapp", values.phone1)}
                      className="text-xs text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      title="Copiar número do Telefone Principal"
                    >
                      Copiar do principal
                    </button>
                  )}
                </div>
                <Input
                  id="whatsapp-input"
                  value={values.whatsapp || ""}
                  onChange={(e) => setField("whatsapp", applyMask(e.target.value, "phone"))}
                  placeholder="(00) 00000-0000"
                />
                {values.whatsapp && values.whatsapp.replace(/\D/g, "").length >= 10 && (
                  <div className="pt-1">
                    <a
                      href={`https://wa.me/55${values.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      <MessageCircle className="h-3 w-3" />
                      Iniciar conversa no WhatsApp
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Telefone Secundário</Label>
                <Input
                  value={values.phone2 || ""}
                  onChange={(e) => setField("phone2", applyMask(e.target.value, "phone"))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label>
                  <Mail className="inline h-3.5 w-3.5 mr-1" />
                  E-mail
                </Label>
                <Input
                  type="email"
                  value={values.email || ""}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="cliente@email.com"
                />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-base">Endereço</CardTitle>
            </div>
            <CardDescription>
              Preenchimento automático do endereço ao digitar o CEP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>CEP</Label>
                  {isSearchingCep && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin text-orange-600" />
                      Buscando...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    value={values.cep || ""}
                    onChange={(e) => {
                      const masked = applyMask(e.target.value, "cep");
                      setField("cep", masked);
                      if (masked.replace(/\D/g, "").length === 8) {
                        handleCepLookup(masked);
                      }
                    }}
                    onBlur={() => {
                      if (values.cep && values.cep.replace(/\D/g, "").length === 8 && !values.street) {
                        handleCepLookup(values.cep);
                      }
                    }}
                    placeholder="00000-000"
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => values.cep && handleCepLookup(values.cep)}
                    disabled={isSearchingCep || !values.cep || values.cep.replace(/\D/g, "").length !== 8}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none p-1"
                    title="Buscar endereço por este CEP"
                  >
                    {isSearchingCep ? (
                      <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Logradouro (Rua / Avenida)</Label>
                <Input
                  value={values.street || ""}
                  onChange={(e) => setField("street", e.target.value)}
                  placeholder="Rua, Avenida..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Número</Label>
                <Input
                  ref={numberInputRef}
                  value={values.number || ""}
                  onChange={(e) => setField("number", e.target.value)}
                  placeholder="123"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Bairro</Label>
                <Input
                  value={values.neighborhood || ""}
                  onChange={(e) => setField("neighborhood", e.target.value)}
                  placeholder="Centro"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input
                  value={values.city || ""}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Select
                  value={values.state || ""}
                  onValueChange={(v) => setField("state", v || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {UF_LIST.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Complemento</Label>
              <Input
                value={values.complement || ""}
                onChange={(e) => setField("complement", e.target.value)}
                placeholder="Sala, andar, bloco, galpão..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Seção Dados do PPCI */}
        <Card className="border-amber-200/80 bg-amber-50/20 dark:bg-amber-950/10">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-base">Dados do PPCI</CardTitle>
              </div>
              {values.ppci_isento ? (
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold px-3 py-1">
                  Isento de PPCI
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-100/70 text-amber-800 border-amber-300 text-xs font-normal">
                  PPCI Obrigatório
                </Badge>
              )}
            </div>
            <CardDescription>
              Gestão de requisitos de Plano de Prevenção Contra Incêndio, alvará, metragem e credenciais oficiais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle Isento */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="ppci_isento" className="font-semibold text-sm cursor-pointer">
                  Cliente isento de PPCI?
                </Label>
                <p className="text-xs text-muted-foreground">
                  Marque caso o cliente possua isenção legal perante o Corpo de Bombeiros.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {values.ppci_isento && (
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                    Isento
                  </Badge>
                )}
                <Switch
                  id="ppci_isento"
                  checked={values.ppci_isento}
                  onCheckedChange={(checked) => setField("ppci_isento", checked)}
                />
              </div>
            </div>

            {values.ppci_isento ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    Cliente classificado como ISENTO de PPCI
                  </p>
                  <p className="text-xs text-emerald-700/90 dark:text-emerald-300/80">
                    Os campos de metragem, dados do responsável e senha do GOV estão dispensados para esta edificação.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {/* Enquadramento, Vencimento e Nº Alvará */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ppci_enquadramento">Tipo de Enquadramento</Label>
                    <Select
                      value={values.ppci_enquadramento || "PSPCI (Plano Simplificado)"}
                      onValueChange={(val) => setField("ppci_enquadramento", val)}
                    >
                      <SelectTrigger id="ppci_enquadramento" className="bg-white dark:bg-neutral-900">
                        <SelectValue placeholder="Selecione o enquadramento" />
                      </SelectTrigger>
                      <SelectContent>
                        {PPCI_ENQUADRAMENTO_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ppci_expires_at">Data de Vencimento do Alvará</Label>
                    <Input
                      id="ppci_expires_at"
                      type="date"
                      value={values.ppci_expires_at || ""}
                      onChange={(e) => setField("ppci_expires_at", e.target.value)}
                      className="bg-white dark:bg-neutral-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ppci_number">Nº Alvará / Protocolo</Label>
                    <Input
                      id="ppci_number"
                      value={values.ppci_number || ""}
                      onChange={(e) => setField("ppci_number", e.target.value)}
                      placeholder="Ex: CBMRS-2024-9988"
                      className="bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="metragem">Metragem da Edificação</Label>
                    <div className="relative">
                      <Input
                        id="metragem"
                        type="text"
                        value={values.metragem || ""}
                        onChange={(e) => setField("metragem", e.target.value)}
                        placeholder="Ex: 350.50"
                        className="pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                        m²
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cpf_responsavel">CPF do Responsável</Label>
                    <Input
                      id="cpf_responsavel"
                      value={values.cpf_responsavel || ""}
                      onChange={(e) => setField("cpf_responsavel", applyMask(e.target.value, "cpf"))}
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="contato_responsavel">Contato do Responsável</Label>
                    <Input
                      id="contato_responsavel"
                      value={values.contato_responsavel || ""}
                      onChange={(e) => setField("contato_responsavel", applyMask(e.target.value, "phone"))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 max-w-md pt-1">
                  <Label htmlFor="senha_gov">Senha .Gov</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="senha_gov"
                        type={showGovPassword ? "text" : "password"}
                        value={values.senha_gov || values.gov_password || ""}
                        onChange={(e) => {
                          setField("senha_gov", e.target.value);
                          setField("gov_password", e.target.value);
                        }}
                        placeholder="Digite ou cole a senha do GOV.BR..."
                        className="pr-10 font-mono"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGovPassword(!showGovPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                        title={showGovPassword ? "Ocultar senha" : "Exibir senha"}
                      >
                        {showGovPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {(values.senha_gov || values.gov_password) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(values.senha_gov || values.gov_password || "");
                          setCopiedGovPassword(true);
                          toast({ variant: "success", title: "Senha copiada!" });
                          setTimeout(() => setCopiedGovPassword(false), 2000);
                        }}
                        title="Copiar senha"
                        className="shrink-0 h-10 w-10"
                      >
                        {copiedGovPassword ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Utilizada pela engenharia e equipe técnica para protocolar vistorias e alvarás.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção de Anexos e Documentos Drag & Drop */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Documentos e Anexos (PPCI, NF, Fotos)</CardTitle>
            </div>
            <CardDescription>
              Upload direto para o Storage com tagueamento rápido de arquivos (&quot;PPCI&quot;, &quot;Anexo D&quot;, &quot;Nota Fiscal&quot;, &quot;Foto&quot;).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {initialData?.id ? (
              <ClientDragDropUploader clientId={initialData.id} />
            ) : (
              <div className="p-6 text-center border border-dashed rounded-xl bg-neutral-50/50 dark:bg-neutral-900/30 text-sm text-muted-foreground">
                <Paperclip className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Salve o cliente para habilitar o envio de documentos
                </p>
                <p className="text-xs mt-1">
                  Assim que o cadastro for criado, você poderá arrastar e soltar múltiplos arquivos para a nuvem.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Observações</CardTitle>
            </div>
            <CardDescription>Campo interno, opcional</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              value={values.notes || ""}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Observações adicionais sobre o cliente..."
            />
          </CardContent>
        </Card>

        <Separator />

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting
              ? "Salvando..."
              : mode === "create"
              ? "Cadastrar Cliente"
              : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
