import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import {
  Flame,
  ShieldCheck,
  ClipboardList,
  Wallet,
  FireExtinguisher,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data?.user) {
    redirect("/dashboard");
  }

  const features = [
    {
      icon: ClipboardList,
      title: "Ordens de Serviço",
      desc: "Gestão completa de OS com status em tempo real e assinatura digital.",
    },
    {
      icon: FireExtinguisher,
      title: "Controle de Extintores",
      desc: "Acompanhe validades, recargas e inspeções de cada equipamento.",
    },
    {
      icon: Wallet,
      title: "Financeiro Organizado",
      desc: "Boletos, contas a receber/pagar, relatórios claros e precisos.",
    },
    {
      icon: ShieldCheck,
      title: "6 Perfis de Acesso",
      desc: "Admin, Comercial, Técnico, Financeiro, Cliente e Terceiro.",
    },
  ];

  return (
    <div className="flex min-h-screen bg-white dark:bg-zinc-950">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-red-600 via-red-500 to-orange-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(0,0,0,0.15),transparent_40%)]" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-orange-300/20 blur-3xl" />
        <div className="relative z-10 flex w-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur border border-white/20">
              <Flame className="h-7 w-7" />
            </div>
            <div className="leading-tight">
              <div className="text-2xl font-bold font-display tracking-tight">
                ExtinControl
              </div>
              <div className="text-sm text-white/80 font-medium">
                CRM para Prevenção Contra Incêndio
              </div>
            </div>
          </div>

          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl font-bold font-display leading-tight tracking-tight">
              Sistema completo para a sua empresa de prevenção.
            </h1>
            <p className="text-lg text-white/90 leading-relaxed">
              Desde a ordem de serviço até o recebimento. Deixe as planilhas de
              lado e foque no que importa: salvar vidas e crescer seu negócio.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex gap-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <div className="font-semibold">{f.title}</div>
                  <div className="text-sm text-white/80 mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-sm text-white/70">
            © {new Date().getFullYear()} ExtinControl CRM. Todos os direitos
            reservados.
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20">
        <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[400px]">
          <div className="flex lg:hidden items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 text-white">
              <Flame className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-xl font-bold font-display tracking-tight">
                ExtinControl
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                CRM Prevenção Incêndio
              </div>
            </div>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold font-display tracking-tight">
              Entrar na sua conta
            </h1>
            <p className="text-sm text-muted-foreground">
              Insira seu e-mail e senha para acessar o painel.
            </p>
          </div>

          <LoginForm redirectTo={redirectTo} />

          <div className="flex flex-col gap-4 text-sm text-muted-foreground">
            <a
              href="/recuperar-senha"
              className="text-center lg:text-right text-primary hover:underline font-medium"
            >
              Esqueci minha senha
            </a>
            <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-xs leading-relaxed">
              <strong className="text-foreground">Primeiro acesso?</strong>{" "}
              Peça ao seu administrador para criar seu usuário ou entre em
              contato com o suporte da sua empresa.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
