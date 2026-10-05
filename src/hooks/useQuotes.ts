import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listQuotes,
  getQuote,
  saveQuote,
  deleteQuote,
  updateQuoteStatus,
  convertQuoteToOS,
  type QuoteInput,
} from "@/services/quotes.service";
import type { Quote, QuoteStatus } from "@/types";

export const quoteKeys = {
  all: ["quotes"] as const,
  detail: (id: string) => ["quotes", id] as const,
};

export function useQuotes(initialData?: Quote[]) {
  return useQuery({
    queryKey: quoteKeys.all,
    queryFn: listQuotes,
    initialData,
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: quoteKeys.detail(id),
    queryFn: () => getQuote(id),
    enabled: Boolean(id),
  });
}

export function useSaveQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: QuoteInput; id?: string }) => saveQuote(input, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.all });
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) => updateQuoteStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.all });
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.all });
    },
  });
}

export function useConvertQuoteToOS() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: convertQuoteToOS,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.all });
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
    },
  });
}
