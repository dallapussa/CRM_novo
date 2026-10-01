import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteServiceOrder, getServiceOrder, listServiceOrderItems, listServiceOrderPhotos, listServiceOrders, saveServiceOrder, updateServiceOrder, uploadServiceOrderPhoto, type ServiceOrderInput, type ServiceOrderItemInput } from "@/services/service-orders.service";
import type { ServiceOrder } from "@/types";

export const serviceOrderKeys = { all: ["service-orders"] as const };

export function useServiceOrders(initialData?: ServiceOrder[]) {
  return useQuery({ queryKey: serviceOrderKeys.all, queryFn: listServiceOrders, initialData });
}

export function useSaveServiceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, items, id }: { input: Partial<ServiceOrderInput>; items: ServiceOrderItemInput[]; id?: string }) => saveServiceOrder(input, items, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: serviceOrderKeys.all }),
  });
}

export function useUpdateServiceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ServiceOrder> }) => updateServiceOrder(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: serviceOrderKeys.all }),
  });
}

export function useDeleteServiceOrder() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deleteServiceOrder, onSuccess: () => queryClient.invalidateQueries({ queryKey: serviceOrderKeys.all }) });
}

export function useServiceOrder(id: string) {
  return useQuery({ queryKey: [...serviceOrderKeys.all, id], queryFn: () => getServiceOrder(id), enabled: Boolean(id) });
}

export function useServiceOrderItems(id: string) {
  return useQuery({ queryKey: [...serviceOrderKeys.all, id, "items"], queryFn: () => listServiceOrderItems(id), enabled: Boolean(id) });
}

export function useServiceOrderPhotos(id: string) {
  return useQuery({ queryKey: [...serviceOrderKeys.all, id, "photos"], queryFn: () => listServiceOrderPhotos(id), enabled: Boolean(id) });
}

export function useUploadServiceOrderPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadServiceOrderPhoto(id, file),
    onSuccess: (_photo, variables) => queryClient.invalidateQueries({ queryKey: [...serviceOrderKeys.all, variables.id, "photos"] }),
  });
}