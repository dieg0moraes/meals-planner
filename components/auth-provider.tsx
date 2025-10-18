"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export type AuthUser = {
    id: string;
    email?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
};

type AuthContextValue = {
    user: AuthUser | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createBrowserClient();
        let mounted = true;
        (async () => {
            const { data } = await supabase.auth.getUser();
            if (!mounted) return;
            const u = data?.user;
            if (u) {
                setUser({
                    id: u.id,
                    email: u.email,
                    name: (u.user_metadata as any)?.full_name || (u.user_metadata as any)?.name || null,
                    avatarUrl: (u.user_metadata as any)?.avatar_url || null,
                });
            }
            setLoading(false);
        })();
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            const u = session?.user;
            if (u) {
                setUser({
                    id: u.id,
                    email: u.email,
                    name: (u.user_metadata as any)?.full_name || (u.user_metadata as any)?.name || null,
                    avatarUrl: (u.user_metadata as any)?.avatar_url || null,
                });
            } else {
                setUser(null);
            }
        });
        return () => {
            mounted = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    const value = useMemo(() => ({ user, loading }), [user, loading]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


