import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { convertLeadToClient, listLeads, saveLead, type LeadInput } from "@/services/leads.service";

export const leadKeys = { all: ["leads"] as const };

export function useLeads() {
  return useQuery({ queryKey: leadKeys.all, queryFn: listLeads });
}

export function useSaveLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: Partial<LeadInput>; id?: string }) => saveLead(input, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useConvertLeadToClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: convertLeadToClient,
    onSuccess: async (clientId) => Promise.all([
      queryClient.invalidateQueries({ queryKey: leadKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["clients"] }),
      queryClient.invalidateQueries({ queryKey: ["clients", clientId] }),
    ]),
  });
}