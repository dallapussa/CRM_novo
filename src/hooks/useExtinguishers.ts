import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteExtinguisher, getExtinguisher, listExtinguishers, saveExtinguisher, type ExtinguisherInput } from "@/services/extinguishers.service";
import type { Extinguisher } from "@/types";

export const extinguisherKeys = { all: ["extinguishers"] as const };

export function useExtinguishers(initialData?: Extinguisher[]) {
  return useQuery({ queryKey: extinguisherKeys.all, queryFn: listExtinguishers, initialData });
}

export function useSaveExtinguisher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: ExtinguisherInput; id?: string }) => saveExtinguisher(input, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: extinguisherKeys.all }),
  });
}

export function useDeleteExtinguisher() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deleteExtinguisher, onSuccess: () => queryClient.invalidateQueries({ queryKey: extinguisherKeys.all }) });
}

export function useExtinguisher(id: string) {
  return useQuery({ queryKey: [...extinguisherKeys.all, id], queryFn: () => getExtinguisher(id), enabled: Boolean(id) });
}