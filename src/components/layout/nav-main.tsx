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
} from "lucide-react";
import { usePathname } from "next/navigation";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
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

interface NavMainProps {
  role: string;
}

export function NavMain({ role }: NavMainProps) {
  const pathname = usePathname();
  const filtered = NAV_ITEMS.filter(
    (i) => !i.roles || i.roles.length === 0 || i.roles.includes(role)
  );

  return (
    <nav className="flex flex-col gap-1 px-2">
      {filtered.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
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
