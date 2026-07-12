import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "administrator" | "loan_officer" | "finance_officer";

interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function fetchRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error || !data) return [];
  return data.map((r) => r.role as AppRole);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        setRoles(await fetchRoles(data.session.user.id));
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      if (event === "SIGNED_OUT" || !sess?.user) {
        setRoles([]);
        return;
      }
      // Defer role fetch to avoid deadlock inside listener
      setTimeout(async () => {
        setRoles(await fetchRoles(sess.user.id));
      }, 0);
    });

    // Roles can change from elsewhere (an administrator granting you a role
    // in another tab/session). Refetch when the tab regains focus so that
    // takes effect without forcing a full logout/login.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          void fetchRoles(data.session.user.id).then((r) => {
            if (mounted) setRoles(r);
          });
        }
      });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      roles,
      loading,
      hasRole: (r) => roles.includes(r),
      hasAnyRole: (rs) => rs.some((r) => roles.includes(r)),
      isAdmin: roles.includes("administrator"),
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshRoles: async () => {
        if (session?.user) setRoles(await fetchRoles(session.user.id));
      },
    }),
    [session, roles, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  administrator: "Administrator",
  loan_officer: "Loan Officer",
  finance_officer: "Finance Officer",
};
