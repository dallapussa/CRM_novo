import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAgendaEvents,
  saveAgendaEvent,
  deleteAgendaEvent,
  type AgendaEventInput,
} from "@/services/agenda.service";
import type { AgendaEvent } from "@/types";

export const agendaKeys = {
  all: ["agenda_events"] as const,
};

export function useAgendaEvents(initialData?: AgendaEvent[]) {
  return useQuery({
    queryKey: agendaKeys.all,
    queryFn: listAgendaEvents,
    initialData,
  });
}

export function useSaveAgendaEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: AgendaEventInput; id?: string }) => saveAgendaEvent(input, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
    },
  });
}

export function useDeleteAgendaEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAgendaEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
    },
  });
}
