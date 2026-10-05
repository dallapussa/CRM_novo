import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listBenchRecords,
  saveBenchRecord,
  updateBenchStage,
  deleteBenchRecord,
  type BenchRecordInput,
} from "@/services/bench.service";
import type { BenchRecord } from "@/types";

export function useBenchRecords(initialData?: BenchRecord[]) {
  return useQuery({
    queryKey: ["bench_records"],
    queryFn: listBenchRecords,
    initialData,
  });
}

export function useSaveBenchRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: Partial<BenchRecordInput>; id?: string }) =>
      saveBenchRecord(input, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bench_records"] });
    },
  });
}

export function useUpdateBenchStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      updateBenchStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bench_records"] });
    },
  });
}

export function useDeleteBenchRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBenchRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bench_records"] });
    },
  });
}
