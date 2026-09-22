import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type HostStatus = "none" | "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  host_status: HostStatus;
  host_bio: string | null;
  host_applied_at: string | null;
};

type AuthValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: string[];
  isAdmin: boolean;
  isHost: boolean;
  isApprovedHost: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user?.id ?? null;

  const { data } = useQuery({
    queryKey: ["me", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
      ]);
      return {
        profile: (profileRes.data as Profile | null) ?? null,
        roles: (rolesRes.data ?? []).map((r) => r.role as string),
      };
    },
  });

  const roles = data?.roles ?? [];

  const value: AuthValue = {
    session,
    user: session?.user ?? null,
    profile: data?.profile ?? null,
    roles,
    isAdmin: roles.includes("admin"),
    isHost: roles.includes("host"),
    isApprovedHost: data?.profile?.host_status === "approved",
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
      queryClient.clear();
    },
    refresh: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
