"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  User,
  Phone,
  MapPin,
  Mail,
  Shield,
  Lock,
  Building2,
  KeyRound,
  CheckCircle2,
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Profile, UserRole } from "@/lib/types";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  full_name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  phone: z.string().optional(),
  document: z.string().optional(),
  company_name: z.string().optional(),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

const passwordSchema = z
  .object({
    current_password: z
      .string()
      .min(6, { message: "Senha atual deve ter pelo menos 6 caracteres" }),
    new_password: z
      .string()
      .min(6, { message: "Nova senha deve ter pelo menos 6 caracteres" }),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "As senhas novas não coincidem",
    path: ["confirm_password"],
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

interface ProfilePageClientProps {
  profile: Profile | null;
  userEmail: string;
}

export function ProfilePageClient({ profile, userEmail }: ProfilePageClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const [profileValues, setProfileValues] = useState<ProfileValues>({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    document: profile?.document || "",
    company_name: profile?.company_name || "",
    cep: profile?.address?.cep || "",
    street: profile?.address?.street || "",
    number: profile?.address?.number || "",
    complement: profile?.address?.complement || "",
    neighborhood: profile?.address?.neighborhood || "",
    city: profile?.address?.city || "",
    state: profile?.address?.state || "",
  });

  const [passwordValues, setPasswordValues] = useState<PasswordValues>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  function setProfileField<K extends keyof ProfileValues>(
    key: K,
    value: ProfileValues[K]
  ) {
    setProfileValues((prev) => ({ ...prev, [key]: value }));
    if (profileErrors[key as string]) {
      setProfileErrors((prev) => {
        const n = { ...prev };
        delete n[key as string];
        return n;
      });
    }
  }

  function setPasswordField<K extends keyof PasswordValues>(
    key: K,
    value: PasswordValues[K]
  ) {
    setPasswordValues((prev) => ({ ...prev, [key]: value }));
    if (passwordErrors[key as string]) {
      setPasswordErrors((prev) => {
        const n = { ...prev };
        delete n[key as string];
        return n;
      });
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileErrors({});

    const parsed = profileSchema.safeParse(profileValues);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as string;
        if (!errs[k]) errs[k] = i.message;
      });
      setProfileErrors(errs);
      setIsSavingProfile(false);
      toast({
        variant: "destructive",
        title: "Verifique o formulário",
        description: "Alguns campos precisam ser corrigidos.",
      });
      return;
    }

    const address =
      profileValues.cep ||
      profileValues.street ||
      profileValues.city ||
      profileValues.state
        ? {
            cep: profileValues.cep || undefined,
            street: profileValues.street || undefined,
            number: profileValues.number || undefined,
            complement: profileValues.complement || undefined,
            neighborhood: profileValues.neighborhood || undefined,
            city: profileValues.city || undefined,
            state: profileValues.state || undefined,
          }
        : null;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const payload = {
        id: user.id,
        full_name: profileValues.full_name.trim(),
        phone: profileValues.phone
          ? profileValues.phone.replace(/\D/g, "")
          : null,
        document: profileValues.document
          ? profileValues.document.replace(/\D/g, "")
          : null,
        company_name: profileValues.company_name?.trim() || null,
        address,
      };

      if (profile) {
        const { id: _id, ...updatePayload } = payload;
        const { error } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({
          ...payload,
          role: "cliente" as UserRole,
          is_active: true,
        });
        if (error) throw error;
      }

      toast({
        variant: "success",
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
      router.refresh();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: err?.message || "Não foi possível salvar suas informações.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordErrors({});

    const parsed = passwordSchema.safeParse(passwordValues);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as string;
        if (!errs[k]) errs[k] = i.message;
      });
      setPasswordErrors(errs);
      setIsChangingPassword(false);
      toast({
        variant: "destructive",
        title: "Verifique as senhas",
        description: "Alguns campos precisam ser corrigidos.",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordValues.new_password,
      });
      if (error) throw error;

      setPasswordValues({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });

      toast({
        variant: "success",
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao alterar senha",
        description:
          err?.message ||
          "Não foi possível alterar a senha. Verifique a senha atual.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  const roleKey = (profile?.role || "cliente") as UserRole;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
          Minha Conta
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seus dados pessoais e preferências de acesso.
        </p>
      </div>

      <Card className="border-l-4 border-l-indigo-500 bg-indigo-50/30">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl font-bold font-display">
              {profile?.full_name?.charAt(0).toUpperCase() ||
                userEmail?.charAt(0).toUpperCase() ||
                "U"}
            </div>
            <div className="flex-1">
              <p className="text-xl font-semibold">
                {profile?.full_name || "Bem-vindo!"}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {userEmail}
                </p>
                <Badge variant="outline" className={ROLE_COLORS[roleKey]}>
                  <Shield className="mr-1 h-3 w-3" />
                  {ROLE_LABELS[roleKey]}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4" />
              Conta verificada
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base">Dados Pessoais</CardTitle>
              </div>
              <CardDescription>
                Atualize suas informações de contato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    value={profileValues.full_name}
                    onChange={(e) =>
                      setProfileField("full_name", e.target.value)
                    }
                    placeholder="Seu nome completo"
                  />
                  {profileErrors.full_name && (
                    <p className="text-xs text-red-600">
                      {profileErrors.full_name}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>
                    <Phone className="inline h-3.5 w-3.5 mr-1" />
                    Telefone
                  </Label>
                  <Input
                    value={profileValues.phone || ""}
                    onChange={(e) => setProfileField("phone", e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CPF / Documento</Label>
                  <Input
                    value={profileValues.document || ""}
                    onChange={(e) => setProfileField("document", e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>
                    <Building2 className="inline h-3.5 w-3.5 mr-1" />
                    Empresa / Setor
                  </Label>
                  <Input
                    value={profileValues.company_name || ""}
                    onChange={(e) =>
                      setProfileField("company_name", e.target.value)
                    }
                    placeholder="Nome da empresa onde trabalha"
                  />
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
                    value={profileValues.cep || ""}
                    onChange={(e) => setProfileField("cep", e.target.value)}
                    placeholder="00000-000"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Logradouro</Label>
                  <Input
                    value={profileValues.street || ""}
                    onChange={(e) => setProfileField("street", e.target.value)}
                    placeholder="Rua, Avenida..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Número</Label>
                  <Input
                    value={profileValues.number || ""}
                    onChange={(e) => setProfileField("number", e.target.value)}
                    placeholder="123"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Bairro</Label>
                  <Input
                    value={profileValues.neighborhood || ""}
                    onChange={(e) =>
                      setProfileField("neighborhood", e.target.value)
                    }
                    placeholder="Centro"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input
                    value={profileValues.city || ""}
                    onChange={(e) => setProfileField("city", e.target.value)}
                    placeholder="São Paulo"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>UF</Label>
                  <Input
                    value={profileValues.state || ""}
                    onChange={(e) => setProfileField("state", e.target.value.toUpperCase())}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Complemento</Label>
                <Input
                  value={profileValues.complement || ""}
                  onChange={(e) =>
                    setProfileField("complement", e.target.value)
                  }
                  placeholder="Sala, andar, referência..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSavingProfile}>
              <Save className="mr-2 h-4 w-4" />
              {isSavingProfile ? "Salvando..." : "Salvar Dados"}
            </Button>
          </div>
        </form>

        <form onSubmit={handleChangePassword} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base">Alterar Senha</CardTitle>
              </div>
              <CardDescription>
                Mantenha sua conta segura atualizando sua senha periodicamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  Senha Atual *
                </Label>
                <Input
                  type="password"
                  value={passwordValues.current_password}
                  onChange={(e) =>
                    setPasswordField("current_password", e.target.value)
                  }
                  placeholder="••••••••"
                />
                {passwordErrors.current_password && (
                  <p className="text-xs text-red-600">
                    {passwordErrors.current_password}
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label>Nova Senha *</Label>
                <Input
                  type="password"
                  value={passwordValues.new_password}
                  onChange={(e) =>
                    setPasswordField("new_password", e.target.value)
                  }
                  placeholder="Mínimo 6 caracteres"
                />
                {passwordErrors.new_password && (
                  <p className="text-xs text-red-600">
                    {passwordErrors.new_password}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar Nova Senha *</Label>
                <Input
                  type="password"
                  value={passwordValues.confirm_password}
                  onChange={(e) =>
                    setPasswordField("confirm_password", e.target.value)
                  }
                  placeholder="Repita a nova senha"
                />
                {passwordErrors.confirm_password && (
                  <p className="text-xs text-red-600">
                    {passwordErrors.confirm_password}
                  </p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-medium flex items-center gap-1.5">
                  <Lock className="h-4 w-4" />
                  Dicas de segurança
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-amber-700/90">
                  <li>• Use pelo menos 6 caracteres</li>
                  <li>• Misture letras maiúsculas, minúsculas e números</li>
                  <li>• Não reutilize senhas de outros sites</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isChangingPassword}>
              <KeyRound className="mr-2 h-4 w-4" />
              {isChangingPassword ? "Alterando..." : "Alterar Senha"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
