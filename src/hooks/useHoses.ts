import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listHoses,
  getHose,
  saveHose,
  deleteHose,
  type HoseInput,
} from "@/services/hoses.service";
import type { Hose } from "@/types";

export function useHoses(initialData?: Hose[]) {
  return useQuery({
    queryKey: ["hoses"],
    queryFn: listHoses,
    initialData,
  });
}

export function useHose(id: string) {
  return useQuery({
    queryKey: ["hoses", id],
    queryFn: () => getHose(id),
    enabled: Boolean(id),
  });
}

export function useSaveHose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: Partial<HoseInput>; id?: string }) =>
      saveHose(input, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hoses"] });
    },
  });
}

export function useDeleteHose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHose(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hoses"] });
    },
  });
}
