import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listOrders,
  saveOrder,
  deleteOrder,
  type OrderInput,
} from "@/services/orders.service";
import type { Order } from "@/types";

export function useOrders(initialData?: Order[]) {
  return useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
    initialData,
  });
}

export function useSaveOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: Partial<OrderInput>; id?: string }) =>
      saveOrder(input, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
