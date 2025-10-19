"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { createBrowserClient } from "@/lib/supabase/client";
import type { UserProfile, WeeklyMeals, ShoppingList } from "@/types";

type EntitiesContextValue = {
    profile: UserProfile | null;
    weeklyMeals: WeeklyMeals | null;
    shoppingList: ShoppingList | null;
    loading: boolean;
    refresh: () => Promise<void>;
};

const EntitiesContext = createContext<EntitiesContextValue>({
    profile: null,
    weeklyMeals: null,
    shoppingList: null,
    loading: true,
    refresh: async () => {},
});

export function useEntities() {
    return useContext(EntitiesContext);
}

export function EntitiesProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [weeklyMeals, setWeeklyMeals] = useState<WeeklyMeals | null>(null);
    const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchAll = useCallback(async () => {
        const supabase = createBrowserClient();
        if (!user?.id) {
            setProfile(null);
            setWeeklyMeals(null);
            setShoppingList(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // Profile by auth_user_id
            const { data: p } = await supabase
                .from("profiles")
                .select("*")
                .eq("auth_user_id", user.id)
                .maybeSingle();
            const profileRow = (p as unknown) as UserProfile | null;
            setProfile(profileRow ?? null);

            let weekly: WeeklyMeals | null = null;
            if (profileRow?.id) {
                const { data: w } = await supabase
                    .from("weekly_meals")
                    .select("*")
                    .eq("user_id", profileRow.id)
                    .order("updated_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                weekly = (w as unknown) as WeeklyMeals | null;
            }
            console.log("weekly", profileRow?.id, weekly);
            setWeeklyMeals(weekly ?? null);

            let list: ShoppingList | null = null;
            if (profileRow?.id) {
                const { data: l } = await supabase
                    .from("shopping_lists")
                    .select("*")
                    .eq("user_id", profileRow.id)
                    .order("updated_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                list = (l as unknown) as ShoppingList | null;
            }
            setShoppingList(list ?? null);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (authLoading) return;
        fetchAll();
    }, [authLoading, fetchAll]);

    // Realtime subscriptions
    useEffect(() => {
        const supabase = createBrowserClient();
        let active = true;
        if (!profile?.id) return;

        const weeklyChannel = supabase
            .channel(`weekly_meals:${profile.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'weekly_meals', filter: `user_id=eq.${profile.id}` },
                (payload) => {
                    if (!active) return;
                    const row = (payload.new ?? payload.old) as any;
                    if (payload.new) setWeeklyMeals(payload.new as WeeklyMeals);
                }
            )
            .subscribe();

        const listChannel = supabase
            .channel(`shopping_lists:${profile.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shopping_lists', filter: `user_id=eq.${profile.id}` },
                (payload) => {
                    if (!active) return;
                    if (payload.new) setShoppingList(payload.new as ShoppingList);
                }
            )
            .subscribe();

        return () => {
            active = false;
            supabase.removeChannel(weeklyChannel);
            supabase.removeChannel(listChannel);
        };
    }, [profile?.id]);

    const value = useMemo(
        () => ({ profile, weeklyMeals, shoppingList, loading, refresh: fetchAll }),
        [profile, weeklyMeals, shoppingList, loading, fetchAll]
    );

    return <EntitiesContext.Provider value={value}>{children}</EntitiesContext.Provider>;
}


