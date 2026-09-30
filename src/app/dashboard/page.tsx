import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardList,
  Users,
  UserCheck,
  Wallet,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/types";
import { OS_STATUS_COLORS, OS_STATUS_LABELS } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function getStats(role: UserRole) {
  const supabase = createClient();
  try {
    const [osQuery, customersQuery, usersQuery] = await Promise.all([
      supabase
        .from("service_orders")
        .select("id,status,total,created_at", { count: "exact" })
        .limit(5)
        .order("created_at", { ascending: false }),
      role !== "cliente" && role !== "terceiro"
        ? supabase.from("customers").select("id", { count: "exact" }).limit(1)
        : Promise.resolve({ data: [], count: 0 }),
      role === "admin"
        ? supabase.from("profiles").select("id", { count: "exact" }).limit(1)
        : Promise.resolve({ data: [], count: 0 }),
    ]);

    const osCount = (osQuery.count ?? 0) || 0;
    const customerCount = (customersQuery.count ?? 0) || 0;
    const userCount = (usersQuery.count ?? 0) || 0;
    const recentOs = osQuery.data || [];

    const totalRevenue = (osQuery.data || []).reduce(
      (acc, o) => acc + ((o.total as number) || 0),
      0
    );

    return { osCount, customerCount, userCount, recentOs, totalRevenue };
  } catch {
    return {
      osCount: 0,
      customerCount: 0,
      userCount: 0,
      recentOs: [],
      totalRevenue: 0,
    };
  }
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const role: UserRole =
    (userData?.user?.user_metadata?.role as UserRole) ||
    ("admin" as UserRole);

  const stats = await getStats(role);

  const statCards = [
    {
      title: "Ordens de Serviço",
      value: stats.osCount.toString(),
      hint: "Total de OS no sistema",
      icon: ClipboardList,
      color: "from-red-500 to-orange-500",
      href: "/dashboard/os",
      action: "Criar nova OS",
      showFor: ["admin", "comercial", "tecnico", "financeiro"] as UserRole[],
    },
    {
      title: "Clientes Ativos",
      value: stats.customerCount.toString(),
      hint: "Clientes cadastrados",
      icon: UserCheck,
      color: "from-blue-500 to-indigo-500",
      href: "/dashboard/clientes",
      action: "Novo cliente",
      showFor: ["admin", "comercial", "financeiro"] as UserRole[],
    },
    {
      title: "Equipe",
      value: stats.userCount.toString(),
      hint: "Usuários no sistema",
      icon: Users,
      color: "from-green-500 to-emerald-500",
      href: "/dashboard/usuarios",
      action: "Convidar usuário",
      showFor: ["admin"] as UserRole[],
    },
    {
      title: "Faturamento",
      value: formatCurrency(stats.totalRevenue),
      hint: "Total em OS (amostra)",
      icon: Wallet,
      color: "from-purple-500 to-fuchsia-500",
      href: "/dashboard/financeiro",
      action: "Ver financeiro",
      showFor: ["admin", "financeiro"] as UserRole[],
    },
  ].filter((c) => c.showFor.includes(role));

  const quickActions = [
    {
      title: "Criar OS",
      href: "/dashboard/os/nova",
      icon: ClipboardList,
      showFor: ["admin", "comercial"] as UserRole[],
    },
    {
      title: "Novo Cliente",
      href: "/dashboard/clientes/novo",
      icon: UserCheck,
      showFor: ["admin", "comercial", "financeiro"] as UserRole[],
    },
    {
      title: "Nova Fatura",
      href: "/dashboard/financeiro/nova",
      icon: Wallet,
      showFor: ["admin", "financeiro"] as UserRole[],
    },
    {
      title: "Extintores",
      href: "/dashboard/extintores",
      icon: ClipboardList,
      showFor: ["admin", "tecnico", "cliente"] as UserRole[],
    },
  ].filter((a) => a.showFor.includes(role));

  const statusExamples: Array<keyof typeof OS_STATUS_COLORS> = [
    "pendente",
    "andamento",
    "atrasada",
    "concluida",
  ];
  const statusIcons: Record<keyof typeof OS_STATUS_COLORS, typeof Clock> = {
    pendente: Clock,
    andamento: ArrowUpRight,
    atrasada: AlertTriangle,
    concluida: CheckCircle2,
    cancelada: Ban,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
            Olá, {userData?.user?.email?.split("@")[0] || "usuário"}! 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        {quickActions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <Button asChild key={a.href} size="sm" className="h-9">
                <Link href={a.href}>
                  <a.icon className="mr-1.5 h-4 w-4" />
                  {a.title}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${card.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {card.title}
                      </p>
                      <p className="text-2xl font-bold font-display tracking-tight">
                        {card.value}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {card.hint}
                      </p>
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-5 pt-4 border-t border-border/60">
                  <Link
                    href={card.href}
                    className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                  >
                    {card.action}
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Últimas Ordens de Serviço</CardTitle>
              <CardDescription>
                Acompanhe as OS mais recentes.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/os">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentOs.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/5 text-primary">
                  <ClipboardList className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">Nenhuma OS criada ainda</p>
                  <p className="text-sm text-muted-foreground">
                    Assim que você criar a primeira Ordem de Serviço, ela
                    aparecerá aqui.
                  </p>
                </div>
                {["admin", "comercial"].includes(role) && (
                  <Button asChild size="sm" className="mt-2">
                    <Link href="/dashboard/os/nova">
                      <Plus className="mr-1.5 h-4 w-4" />
                      Criar primeira OS
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentOs.map((os) => {
                  const statusEx =
                    (os.status as keyof typeof OS_STATUS_COLORS) ||
                    "pendente";
                  const StatusIcon = statusIcons[statusEx] || Clock;
                  return (
                    <div
                      key={os.id}
                      className="flex items-center gap-4 rounded-lg border border-border/60 p-4 hover:bg-accent/40 transition-colors"
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg border ${OS_STATUS_COLORS[statusEx]}`}
                      >
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 leading-tight">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            OS #{os.id.slice(0, 6).toUpperCase()}
                          </p>
                          <Badge
                            className={OS_STATUS_COLORS[statusEx]}
                            variant="outline"
                          >
                            {OS_STATUS_LABELS[statusEx]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Total: {formatCurrency(os.total as number)}
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/os/${os.id}`}>Abrir</Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Status das OS</CardTitle>
            <CardDescription>Um guia rápido dos status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusExamples.map((s) => {
              const Icon = statusIcons[s];
              return (
                <div key={s} className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${OS_STATUS_COLORS[s]}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold">
                      {OS_STATUS_LABELS[s]}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
