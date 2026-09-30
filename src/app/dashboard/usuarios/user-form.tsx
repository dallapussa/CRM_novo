"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  UserCog,
  Shield,
  Phone,
  Mail,
  MapPin,
  UserPlus,
  Building2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Profile, UserRole } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

const userSchema = z.object({
  id: z.string().min(10, { message: "Informe o ID do usuário (Auth UUID)" }),
  full_name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  role: z.enum(["admin", "comercial", "tecnico", "financeiro", "cliente", "terceiro"]),
  phone: z.string().optional(),
  document: z.string().optional(),
  company_name: z.string().optional(),
  is_active: z.boolean().default(true),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

type FormValues = z.infer<typeof userSchema>;

interface UserFormProps {
  initialData?: Profile;
  mode: "create" | "edit";
}

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function UserForm({ initialData, mode }: UserFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [values, setValues] = useState<FormValues>({
    id: initialData?.id || "",
    full_name: initialData?.full_name || "",
    role: initialData?.role || "comercial",
    phone: initialData?.phone || "",
    document: initialData?.document || "",
    company_name: initialData?.company_name || "",
    is_active: initialData?.is_active ?? true,
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

    const parsed = userSchema.safeParse(values);
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
      const payload = {
        id: values.id.trim(),
        full_name: values.full_name.trim(),
        role: values.role,
        phone: values.phone ? values.phone.replace(/\D/g, "") : null,
        document: values.document ? values.document.replace(/\D/g, "") : null,
        company_name: values.company_name?.trim() || null,
        is_active: values.is_active,
        address,
      };

      if (mode === "create") {
        const { error } = await supabase.from("profiles").insert(payload);
        if (error) throw error;
        toast({
          variant: "success",
          title: "Usuário cadastrado!",
          description: `${values.full_name} foi adicionado com sucesso.`,
        });
        router.push("/dashboard/usuarios");
      } else if (initialData) {
        const { id: _id, ...updatePayload } = payload;
        const { error } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", initialData.id);
        if (error) throw error;
        toast({
          variant: "success",
          title: "Usuário atualizado!",
          description: "Alterações salvas com sucesso.",
        });
        router.push("/dashboard/usuarios");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <Link href="/dashboard/usuarios">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
            {mode === "create" ? "Novo Usuário" : "Editar Usuário"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "create"
              ? "Cadastre um perfil após criar o usuário no Supabase Auth."
              : "Atualize as informações do usuário."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-l-4 border-l-amber-500 bg-amber-50/20">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900">
                  ID do Usuário (Auth UUID)
                </p>
                <p className="text-sm text-amber-800/80 mt-1">
                  {mode === "create" ? (
                    <>
                      Este usuário deve existir previamente no Supabase Auth
                      (Authentication → Users → Add user). Copie o UUID do usuário
                      criado e cole abaixo.
                    </>
                  ) : (
                    <>O ID de usuário Auth não pode ser alterado.</>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base">Dados do Usuário</CardTitle>
            </div>
            <CardDescription>Informações pessoais e perfil de acesso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-1">
                <Label>ID do Usuário *</Label>
                <Input
                  value={values.id}
                  onChange={(e) => setField("id", e.target.value)}
                  placeholder="UUID do Supabase Auth"
                  disabled={mode === "edit"}
                  className="font-mono text-xs"
                />
                {errors.id && <p className="text-xs text-red-600">{errors.id}</p>}
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={values.full_name}
                  onChange={(e) => setField("full_name", e.target.value)}
                  placeholder="Ex: João da Silva"
                />
                {errors.full_name && (
                  <p className="text-xs text-red-600">{errors.full_name}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Perfil de Acesso *</Label>
                <Select
                  value={values.role}
                  onValueChange={(v) => setField("role", v as UserRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" /> {l}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  <Phone className="inline h-3.5 w-3.5 mr-1" />
                  Telefone
                </Label>
                <Input
                  value={values.phone || ""}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>CPF / Documento</Label>
                <Input
                  value={values.document || ""}
                  onChange={(e) => setField("document", e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  <Building2 className="inline h-3.5 w-3.5 mr-1" />
                  Empresa (opcional)
                </Label>
                <Input
                  value={values.company_name || ""}
                  onChange={(e) => setField("company_name", e.target.value)}
                  placeholder="Nome da empresa ou setor"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={values.is_active ? "active" : "inactive"}
                  onValueChange={(v) => setField("is_active", v === "active")}
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
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
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
              ? "Cadastrar Usuário"
              : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
