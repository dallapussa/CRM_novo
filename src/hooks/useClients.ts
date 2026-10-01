import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteClient, getClient, getClientDashboardData, listClients, saveClient, type ClientInput } from "@/services/clients.service";
import type { Customer } from "@/types";

export const clientKeys = { all: ["clients"] as const, detail: (id: string) => ["clients", id] as const };

export function useClients(initialData?: Customer[]) {
  return useQuery({ queryKey: clientKeys.all, queryFn: listClients, initialData });
}

export function useClient(id: string) {
  return useQuery({ queryKey: clientKeys.detail(id), queryFn: () => getClient(id), enabled: Boolean(id) });
}

export function useSaveClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: Partial<ClientInput>; id?: string }) => saveClient(input, id),
    onSuccess: async (id) => Promise.all([
      queryClient.invalidateQueries({ queryKey: clientKeys.all }),
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(id) }),
    ]),
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deleteClient, onSuccess: () => queryClient.invalidateQueries({ queryKey: clientKeys.all }) });
}

export function useClientDashboardData(id: string) {
  return useQuery({ queryKey: [...clientKeys.detail(id), "dashboard"], queryFn: () => getClientDashboardData(id), enabled: Boolean(id) });
}