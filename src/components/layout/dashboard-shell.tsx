import Link from "next/link";
import { Flame, LayoutDashboard, Users, UserCheck, Package, ClipboardList, Wallet, FireExtinguisher, Settings } from "lucide-react";
import type { NavItem } from "./nav-main";
import { NavMain, NavSectionTitle } from "./nav-main";
import { UserNav } from "./user-nav";
import type { Profile } from "@/lib/types";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Usuários",
    href: "/dashboard/usuarios",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Clientes",
    href: "/dashboard/clientes",
    icon: UserCheck,
    roles: ["admin", "comercial", "financeiro"],
  },
  {
    title: "Produtos & Serviços",
    href: "/dashboard/produtos",
    icon: Package,
    roles: ["admin", "comercial"],
  },
  {
    title: "Ordens de Serviço",
    href: "/dashboard/os",
    icon: ClipboardList,
  },
  {
    title: "Financeiro",
    href: "/dashboard/financeiro",
    icon: Wallet,
    roles: ["admin", "financeiro"],
  },
  {
    title: "Extintores",
    href: "/dashboard/extintores",
    icon: FireExtinguisher,
    roles: ["admin", "tecnico", "cliente"],
  },
];

interface DashboardShellProps {
  children: React.ReactNode;
  profile: Profile;
}

export async function DashboardShell({ children, profile }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-border/60 bg-white dark:bg-zinc-900 lg:flex lg:flex-col">
          <div className="h-16 flex items-center gap-2.5 px-6 border-b border-border/60">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-sm shadow-red-500/20">
              <Flame className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-lg tracking-tight">
                ExtinControl
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                CRM Prevenção Incêndio
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-3">
            <NavSectionTitle>Início</NavSectionTitle>
            <NavMain items={NAV_ITEMS} role={profile.role} />
          </div>

          <div className="border-t border-border/60 p-3">
            <Link
              href="/dashboard/perfil"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Configurações da Conta</span>
            </Link>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
          <header className="sticky top-0 z-40 h-16 border-b border-border/60 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-zinc-900/80 dark:supports-[backdrop-filter]:bg-zinc-900/60">
            <div className="flex h-full items-center justify-between px-4 lg:px-8">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 text-white">
                  <Flame className="h-5 w-5" />
                </div>
                <span className="font-display font-bold tracking-tight">ExtinControl</span>
              </div>
              <div className="hidden md:block flex-1" />
              <div className="flex items-center gap-4">
                <Badge className={ROLE_COLORS[profile.role]} variant="outline">
                  {ROLE_LABELS[profile.role]}
                </Badge>
                <UserNav profile={profile} />
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
