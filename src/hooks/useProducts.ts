import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteProduct, getProduct, listProducts, saveProduct, type ProductInput } from "@/services/products.service";
import type { Product } from "@/types";
import { hasPermission } from "@/types";
import { useAuth } from "@/hooks/useAuth";

export const productKeys = { all: ["products"] as const };

export function useProducts(initialData?: Product[]) {
  const { role } = useAuth();
  const includeCosts = hasPermission(role, "financial_costs");
  return useQuery({
    queryKey: [...productKeys.all, includeCosts ? "with-costs" : "without-costs"],
    queryFn: () => listProducts(includeCosts),
    initialData: includeCosts ? initialData : undefined,
  });
}

export function useSaveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: ProductInput; id?: string }) => saveProduct(input, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deleteProduct, onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }) });
}

export function useProduct(id: string) {
  const { role } = useAuth();
  const includeCosts = hasPermission(role, "financial_costs");
  return useQuery({ queryKey: [...productKeys.all, id, includeCosts], queryFn: () => getProduct(id, includeCosts), enabled: Boolean(id) });
}