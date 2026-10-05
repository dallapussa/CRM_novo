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
  UserPlus,
  Copy,
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
import type { Profile, UserRole } from "@/types";
import { ROLE_LABELS } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useCreateUser, useUpdateUser } from "@/hooks/useUsers";
import { applyMask, formatPhone } from "@/lib/utils";

const userSchema = z.object({
  full_name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  role: z.enum(["admin", "comercial", "tecnico", "financeiro", "cliente", "terceiro"]),
  phone: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof userSchema>;

interface UserFormProps {
  initialData?: Profile;
  mode: "create" | "edit";
}

export function UserForm({ initialData, mode }: UserFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const [values, setValues] = useState<FormValues>({
    full_name: initialData?.full_name || "",
    role: initialData?.role || "comercial",
    phone: formatPhone(initialData?.phone || ""),
    is_active: initialData?.is_active ?? true,
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
    const credentials = mode === "create"
      ? z.object({ email: z.string().email("Informe um e-mail válido") }).safeParse({ email })
      : null;
    if (!parsed.success || credentials?.success === false) {
      const errs: Record<string, string> = {};
      parsed.error?.issues.forEach((i) => {
        const k = i.path[0] as string;
        if (!errs[k]) errs[k] = i.message;
      });
      if (credentials && !credentials.success) credentials.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        errs[key] = issue.message;
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

    try {
      const payload = {
        full_name: values.full_name.trim(),
        role: values.role,
        phone: values.phone ? values.phone.replace(/\D/g, "") : null,
        is_active: values.is_active,
      };

      if (mode === "create") {
        const result = await createUserMutation.mutateAsync({
          email: credentials!.data.email,
          ...payload,
        });
        setGeneratedPassword(result.temporaryPassword);
        toast({
          variant: "success",
          title: "Usuário cadastrado!",
          description: `A conta de ${values.full_name} foi criada. Copie a senha temporária agora.`,
        });
      } else if (initialData) {
        await updateUserMutation.mutateAsync({ id: initialData.id, patch: payload });
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

      {generatedPassword && (
        <Card className="border-green-300 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-base text-green-900">Senha temporária gerada</CardTitle>
            <CardDescription>Copie e entregue ao usuário por um canal seguro. Ela não será exibida novamente.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Input readOnly value={generatedPassword} className="font-mono" aria-label="Senha temporária" />
            <Button type="button" variant="outline" onClick={async () => {
              try {
                await navigator.clipboard.writeText(generatedPassword);
                toast({ variant: "success", title: "Senha copiada" });
              } catch {
                toast({ variant: "destructive", title: "Não foi possível copiar", description: "Selecione e copie a senha manualmente." });
              }
            }}>
              <Copy className="mr-2 h-4 w-4" /> Copiar senha
            </Button>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-l-4 border-l-amber-500 bg-amber-50/20">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900">
                  Acesso à conta
                </p>
                <p className="text-sm text-amber-800/80 mt-1">
                  {mode === "create" ? (
                    <>
                      A conta será criada no Supabase Auth. Uma senha temporária será gerada e exibida após o cadastro.
                    </>
                  ) : (
                    <>O identificador de autenticação não pode ser alterado.</>
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
            <div className="grid gap-4 md:grid-cols-2">
              {mode === "create" ? (
                <>
                  <div className="space-y-1.5">
                    <Label>E-mail de acesso *</Label>
                    <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
                    {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <Label>ID do usuário</Label>
                  <Input value={initialData?.id || ""} disabled className="font-mono text-xs" />
                </div>
              )}
              <div className="space-y-1.5">
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
                  onChange={(e) => setField("phone", applyMask(e.target.value, "phone"))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
          <Button type="submit" disabled={isSubmitting || Boolean(generatedPassword)}>
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
