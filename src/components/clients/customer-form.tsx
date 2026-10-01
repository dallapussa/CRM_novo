"use client";

import { useState } from "react";
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
import type { Customer } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSaveClient } from "@/hooks/useClients";

const customerSchema = z.object({
  type: z.enum(["pf", "pj"], { message: "Selecione o tipo de cliente" }),
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  document: z.string().min(11, { message: "Documento inválido" }),
  ie_rg: z.string().optional(),
  phone1: z.string().min(10, { message: "Telefone principal inválido" }),
  phone2: z.string().optional(),
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

  const [values, setValues] = useState<FormValues>({
    type: initialData?.type || "pj",
    name: initialData?.name || "",
    document: initialData?.document || "",
    ie_rg: initialData?.ie_rg || "",
    phone1: initialData?.phone1 || "",
    phone2: initialData?.phone2 || "",
    email: initialData?.email || "",
    is_active: initialData?.is_active ?? true,
    notes: initialData?.notes || "",
    cep: initialData?.address?.cep || "",
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
            cep: values.cep || undefined,
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
                  onValueChange={(v) => setField("type", v as "pf" | "pj")}
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
                  onChange={(e) => setField("document", e.target.value)}
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
              <Phone className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Contato</CardTitle>
            </div>
            <CardDescription>Telefones e e-mail</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Telefone Principal *</Label>
                <Input
                  value={values.phone1}
                  onChange={(e) => setField("phone1", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
                {errors.phone1 && (
                  <p className="text-xs text-red-600">{errors.phone1}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Telefone Secundário</Label>
                <Input
                  value={values.phone2 || ""}
                  onChange={(e) => setField("phone2", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-1.5">
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
            <CardDescription>Opcional</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input
                  value={values.cep || ""}
                  onChange={(e) => setField("cep", e.target.value)}
                  placeholder="00000-000"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Logradouro</Label>
                <Input
                  value={values.street || ""}
                  onChange={(e) => setField("street", e.target.value)}
                  placeholder="Rua, Avenida..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Número</Label>
                <Input
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
                placeholder="Sala, andar, referência..."
              />
            </div>
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
