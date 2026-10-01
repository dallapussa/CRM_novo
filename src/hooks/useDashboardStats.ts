import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/services/dashboard.service";
import type { UserRole } from "@/types";

export function useDashboardStats(role: UserRole) {
  return useQuery({ queryKey: ["dashboard-stats", role], queryFn: () => getDashboardStats(role) });
}