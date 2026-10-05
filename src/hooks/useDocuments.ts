import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listClientDocuments,
  uploadClientDocument,
  deleteClientDocument,
  type DocumentUploadInput,
} from "@/services/documents.service";
import type { Document } from "@/types";

export const documentKeys = {
  byClient: (clientId: string) => ["documents", "client", clientId] as const,
};

export function useClientDocuments(clientId: string) {
  return useQuery({
    queryKey: documentKeys.byClient(clientId),
    queryFn: () => listClientDocuments(clientId),
    enabled: Boolean(clientId),
  });
}

export function useUploadDocument(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, meta }: { file: File; meta: DocumentUploadInput }) =>
      uploadClientDocument(clientId, file, meta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.byClient(clientId) });
    },
  });
}

export function useDeleteDocument(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, storagePath }: { id: string; storagePath: string }) =>
      deleteClientDocument(id, storagePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.byClient(clientId) });
    },
  });
}
