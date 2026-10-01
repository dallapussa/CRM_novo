import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, getUserProfile, listUsers, saveOwnProfile, setUserActive, updateUser, type AdminCreateUserInput } from "@/services/users.service";
import type { Profile } from "@/types";

export const userKeys = { all: ["users"] as const };

export function useUsers(initialData?: Profile[]) {
  return useQuery({ queryKey: userKeys.all, queryFn: listUsers, initialData });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: AdminCreateUserInput) => createUser(input), onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }) });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Profile> }) => updateUser(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useSetUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => setUserActive(id, is_active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUserProfile(id: string) {
  return useQuery({ queryKey: [...userKeys.all, id], queryFn: () => getUserProfile(id), enabled: Boolean(id) });
}

export function useSaveOwnProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveOwnProfile,
    onSuccess: async (_data, profile) => Promise.all([
      queryClient.invalidateQueries({ queryKey: userKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["current-profile", profile.id] }),
    ]),
  });
}