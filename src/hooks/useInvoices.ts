import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteInvoice, getInvoice, listInvoices, markInvoicePaid, saveInvoice, updateInvoice } from "@/services/invoices.service";
import type { Invoice } from "@/types";

export const invoiceKeys = { all: ["invoices"] as const };

export function useInvoices(initialData?: Invoice[]) {
  return useQuery({ queryKey: invoiceKeys.all, queryFn: listInvoices, initialData });
}

export function useSaveInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: Partial<Invoice>; id?: string }) => saveInvoice(input, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deleteInvoice, onSuccess: () => queryClient.invalidateQueries({ queryKey: invoiceKeys.all }) });
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: markInvoicePaid, onSuccess: () => queryClient.invalidateQueries({ queryKey: invoiceKeys.all }) });
}

export function useInvoice(id: string) {
  return useQuery({ queryKey: [...invoiceKeys.all, id], queryFn: () => getInvoice(id), enabled: Boolean(id) });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Invoice> }) => updateInvoice(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}