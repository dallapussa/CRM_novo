"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Package,
  ClipboardList,
  Wallet,
  FireExtinguisher,
  ContactRound,
  FileSpreadsheet,
  CalendarDays,
  MessageCircle,
  Wrench,
  ShoppingCart,
  BarChart3,
  ReceiptText,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { hasPermission, type RolePermission, type UserRole } from "@/types";

// ============================================================
// 🔀 CONTROLE DE FASES DO PROJETO (workflow do manual)
// ============================================================
// 1 = Fase 1 (MVP)  → só aparece Login, Dashboard, Clientes, Usuários
// 2 = Fase 2 (Operações) → libera Extintores, OS, Bancada, Pedidos, Financeiro
// 3 = Fase 3 (Comercial) → libera tudo: Leads, Orçamentos, Agenda, WhatsApp, Relatórios, Custos
// Quando passar no checklist de aceite da Fase, basta trocar o número abaixo!
const CURRENT_PHASE: 1 | 2 | 3 = 1;

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  permission: RolePermission;
  /** Fase em que este item de menu é liberado (workflow do manual) */
  phase: 1 | 2 | 3;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  // ============ INÍCIO (FASE 1 — MVP) ============
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard",
    phase: 1,
  },
  {
    title: "Portal do Cliente",
    href: "/dashboard",
    icon: ShieldCheck,
    permission: "customer_portal",
    phase: 1,
  },

  // ============ EQUIPE (FASE 1 — MVP) ============
  {
    title: "Usuários",
    href: "/dashboard/usuarios",
    icon: Users,
    permission: "users",
    phase: 1,
  },

  // ============ COMERCIAL ============
  {
    title: "Leads",
    href: "/dashboard/leads",
    icon: ContactRound,
    permission: "leads",
    phase: 3, // Fase 3 — Comercial
  },
  {
    title: "Clientes",
    href: "/dashboard/clientes",
    icon: UserCheck,
    permission: "clients",
    phase: 1, // Fase 1 — MVP
  },
  {
    title: "Orçamentos",
    href: "/dashboard/orcamentos",
    icon: FileSpreadsheet,
    permission: "quotes",
    phase: 3, // Fase 3 — Comercial
  },
  {
    title: "Agenda",
    href: "/dashboard/agenda",
    icon: CalendarDays,
    permission: "agenda",
    phase: 3, // Fase 3 — Comercial
  },
  {
    title: "WhatsApp",
    href: "/dashboard/whatsapp",
    icon: MessageCircle,
    permission: "whatsapp",
    phase: 3, // Fase 3 — Comercial
  },

  // ============ CATÁLOGO ============
  {
    title: "Produtos & Serviços",
    href: "/dashboard/produtos",
    icon: Package,
    permission: "catalog",
    phase: 3, // Fase 3 — Comercial
  },

  // ============ TÉCNICO (FASE 2 — Operações) ============
  {
    title: "Extintores",
    href: "/dashboard/extintores",
    icon: FireExtinguisher,
    permission: "extinguishers",
    phase: 2,
  },
  {
    title: "Ordens de Serviço",
    href: "/dashboard/os",
    icon: ClipboardList,
    permission: "service_orders",
    phase: 2,
  },
  {
    title: "Bancada",
    href: "/dashboard/bancada",
    icon: Wrench,
    permission: "bench",
    phase: 2,
  },

  // ============ FINANCEIRO ============
  {
    title: "Pedidos",
    href: "/dashboard/pedidos",
    icon: ShoppingCart,
    permission: "orders",
    phase: 2, // Fase 2 — Operações
  },
  {
    title: "Financeiro",
    href: "/dashboard/financeiro",
    icon: ReceiptText,
    permission: "receipts",
    phase: 2, // Fase 2 — Operações
  },
  {
    title: "Relatórios",
    href: "/dashboard/relatorios",
    icon: BarChart3,
    permission: "reports",
    phase: 3, // Fase 3 — Comercial
  },
  {
    title: "Custos Financeiros",
    href: "/dashboard/custos",
    icon: DollarSign,
    permission: "financial_costs",
    phase: 3, // Fase 3 — Comercial
  },
];

// Agrupa os itens por seção para exibir títulos no sidebar.
// A ordem abaixo é a ordem visual que aparece no painel.
export const NAV_SECTIONS: { title: string; startHref: string }[] = [
  { title: "Início", startHref: "/dashboard" },
  { title: "Equipe", startHref: "/dashboard/usuarios" },
  { title: "Comercial", startHref: "/dashboard/leads" },
  { title: "Catálogo", startHref: "/dashboard/produtos" },
  { title: "Operações", startHref: "/dashboard/extintores" },
  { title: "Financeiro", startHref: "/dashboard/pedidos" },
];

/** Retorna os itens de navegação já filtrados por permissão + fase e organizados por seção */
export function getNavItemsByRole(role: UserRole) {
  return NAV_ITEMS.filter((item) => {
    // 1) Filtro por fase do projeto (workflow do manual — CURRENT_PHASE)
    if (item.phase > CURRENT_PHASE) return false;
    // 2) Filtro por permissão do cargo (ROLE_PERMISSIONS)
    if (!hasPermission(role, item.permission)) return false;
    // 3) "Portal do Cliente" e "Dashboard" usam a mesma rota (/dashboard):
    //    o portal é a home exclusiva de Cliente/Terceiro; os demais perfis veem "Dashboard".
    if (item.permission === "customer_portal" && hasPermission(role, "dashboard")) return false;
    return true;
  });
}

interface NavMainProps {
  role: string;
}

function NavItemLink({ item, pathname, role }: { item: NavItem; pathname: string; role: UserRole }) {
  const Icon = item.icon;
  const isActive = item.href === "/dashboard"
    ? pathname === "/dashboard" && item.permission === (role === "cliente" || role === "terceiro" ? "customer_portal" : "dashboard")
    : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
        isActive
          ? "bg-primary text-white shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          isActive ? "text-white" : "text-muted-foreground"
        )}
      />
      <span className="flex-1">{item.title}</span>
      {item.badge && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function NavMain({ role }: NavMainProps) {
  const pathname = usePathname();
  const normalizedRole = role as UserRole;
  const filtered = getNavItemsByRole(normalizedRole);

  // Mapeamento fixo por href
  const hrefToSection: Record<string, string> = {
    "/dashboard": "Início",
    "/dashboard/usuarios": "Equipe",
    "/dashboard/leads": "Comercial",
    "/dashboard/clientes": "Comercial",
    "/dashboard/orcamentos": "Comercial",
    "/dashboard/agenda": "Comercial",
    "/dashboard/whatsapp": "Comercial",
    "/dashboard/produtos": "Catálogo",
    "/dashboard/extintores": "Operações",
    "/dashboard/os": "Operações",
    "/dashboard/bancada": "Operações",
    "/dashboard/pedidos": "Financeiro",
    "/dashboard/financeiro": "Financeiro",
    "/dashboard/relatorios": "Financeiro",
    "/dashboard/custos": "Financeiro",
  };

  const sectionOrder = ["Início", "Equipe", "Comercial", "Catálogo", "Operações", "Financeiro"];
  const bySection = new Map<string, NavItem[]>();
  for (const item of filtered) {
    const sec = hrefToSection[item.href];
    if (!sec) continue;
    if (!bySection.has(sec)) bySection.set(sec, []);
    bySection.get(sec)!.push(item);
  }

  return (
    <nav className="flex flex-col gap-1 px-2">
      {sectionOrder.map((secTitle) => {
        const items = bySection.get(secTitle);
        if (!items || items.length === 0) return null;
        return (
          <div key={secTitle} className="flex flex-col">
            <NavSectionTitle>{secTitle}</NavSectionTitle>
            <div className="flex flex-col gap-1">
              {items.map((it) => (
                <NavItemLink key={it.permission} item={it} pathname={pathname} role={normalizedRole} />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function NavSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
      {children}
    </div>
  );
}
