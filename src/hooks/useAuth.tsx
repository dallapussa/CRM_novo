"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/types";
import { getUserProfile } from "@/services/users.service";

type AuthState = {
  isLoading: boolean;
  user: { id: string; email?: string | null } | null;
  profile: Profile | null;
  role: UserRole | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const defaultProfile = (user: { id: string; email?: string | null }): Profile => ({
  id: user.id,
  role: "cliente",
  full_name: (user.email as string) || "Usuário",
  is_active: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const profileQuery = useQuery({
    queryKey: ["current-profile", user?.id],
    queryFn: () => getUserProfile(user!.id),
    enabled: Boolean(user?.id),
  });
  const profile = profileQuery.data ?? (user ? defaultProfile(user) : null);
  const role: UserRole | null = profile?.role ?? null;

  async function refreshProfile() {
    if (!user?.id) return;
    await queryClient.invalidateQueries({ queryKey: ["current-profile", user.id] });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  useEffect(() => {
    (async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (u) {
        setUser({ id: u.id, email: u.email });
      }
      setIsLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_evt, sess) => {
      const u = sess?.user;
      if (u) {
        setUser({ id: u.id, email: u.email });
      } else {
        setUser(null);
      }
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthState = {
    isLoading: isLoading || profileQuery.isLoading,
    user,
    profile,
    role,
    refreshProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
