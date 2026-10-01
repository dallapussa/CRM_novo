"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/hooks/useAuth";
import { getPermissionForPath, hasPermission } from "@/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, role, isLoading } = useAuth();

  // 1) Se não logado → login
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);

  // 2) Se logado mas SEM PERMISSÃO para a rota atual → volta pro dashboard
  useEffect(() => {
    if (isLoading || !profile || !role || !pathname) return;

    // Cliente/Terceiro: só pode ficar em /dashboard (portal do cliente) e /dashboard/perfil
    if (role === "cliente" || role === "terceiro") {
      if (pathname !== "/dashboard" && pathname !== "/dashboard/perfil") {
        router.replace("/dashboard");
        return;
      }
    }

    // Para os perfis internos: checa a matriz pelo pathname
    const required = getPermissionForPath(pathname);
    if (required && !hasPermission(role, required)) {
      router.replace("/dashboard");
    }
  }, [isLoading, profile, role, pathname, router]);

  if (isLoading || !user || !profile) return <div className="min-h-screen" />;

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
