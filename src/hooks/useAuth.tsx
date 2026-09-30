"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/lib/types";

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
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error || !data) {
        return defaultProfile({ id: userId });
      }
      return data as Profile;
    } catch {
      return defaultProfile({ id: userId });
    }
  }

  async function refreshProfile() {
    if (!user?.id) return;
    const p = await loadProfile(user.id);
    setProfile(p);
    setRole(p.role);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
  }

  useEffect(() => {
    (async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (u) {
        setUser({ id: u.id, email: u.email });
        const p = await loadProfile(u.id);
        setProfile(p);
        setRole(p.role);
      }
      setIsLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      const u = sess?.user;
      if (u) {
        setUser({ id: u.id, email: u.email });
        const p = await loadProfile(u.id);
        setProfile(p);
        setRole(p.role);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthState>(
    () => ({ isLoading, user, profile, role, refreshProfile, signOut }),
    [isLoading, user, profile, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
