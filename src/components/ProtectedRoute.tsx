import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const validate = async (sessionUser: User | null) => {
      if (cancelled) return;
      setUser(sessionUser);

      if (!sessionUser) {
        setAuthorized(null);
        setLoading(false);
        return;
      }

      if (!allowedRoles || allowedRoles.length === 0) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sessionUser.id)
        .in("role", allowedRoles);

      if (cancelled) return;
      setAuthorized(!!roles && roles.length > 0);
      setLoading(false);
    };

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      validate(session?.user ?? null);
    });

    // Re-validate on any auth state change
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      validate(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (authorized === false) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
