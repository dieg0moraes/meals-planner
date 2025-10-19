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
    refresh: async () => { },
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

    // Realtime subscriptions - subscribe early using user.id, then filter by profile.id when available
    useEffect(() => {
        const supabase = createBrowserClient();
        let active = true;
        if (!user?.id) return;

        console.log('[entities-provider] Setting up realtime subscriptions for user:', user.id);

        // Subscribe to profiles table to catch updates
        const profileChannel = supabase
            .channel(`profiles:${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles', filter: `auth_user_id=eq.${user.id}` },
                (payload) => {
                    console.log('[entities-provider] Profile update received:', payload);
                    if (!active) return;
                    if (payload.new) {
                        const p = payload.new as any;
                        const updatedProfile: UserProfile = {
                            id: p.id,
                            authUserId: p.auth_user_id,
                            displayName: p.display_name || "",
                            locale: p.locale || undefined,
                            timeZone: p.time_zone || undefined,
                            location: p.location || undefined,
                            household: p.household || { people: [], pets: [] },
                            dietaryRestrictions: p.dietary_restrictions || [],
                            favoriteFoods: p.favorite_foods || [],
                            dislikedFoods: p.disliked_foods || [],
                            goals: p.goals || [],
                            createdAt: p.created_at,
                            updatedAt: p.updated_at,
                            rawOnboarding: p.raw_onboarding || undefined,
                        };
                        setProfile(updatedProfile);
                    }
                }
            )
            .subscribe();

        // Subscribe to weekly_meals - initially no filter, then filter by profile.id in callback
        const weeklyChannel = supabase
            .channel(`weekly_meals:${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'weekly_meals' },
                async (payload) => {
                    console.log('[entities-provider] Weekly meals update received:', payload);
                    if (!active) return;

                    // Get current profile to check if this update is for us
                    const { data: currentProfile } = await supabase
                        .from("profiles")
                        .select("id")
                        .eq("auth_user_id", user.id)
                        .maybeSingle();

                    if (!currentProfile) return;

                    const row = payload.new as any;
                    if (row && row.user_id === currentProfile.id) {
                        setWeeklyMeals(row as WeeklyMeals);
                    }
                }
            )
            .subscribe();

        // Subscribe to shopping_lists - initially no filter, then filter by profile.id in callback
        const listChannel = supabase
            .channel(`shopping_lists:${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shopping_lists' },
                async (payload) => {
                    console.log('[entities-provider] Shopping list update received:', payload);
                    if (!active) return;

                    // Get current profile to check if this update is for us
                    const { data: currentProfile } = await supabase
                        .from("profiles")
                        .select("id")
                        .eq("auth_user_id", user.id)
                        .maybeSingle();

                    if (!currentProfile) return;

                    const row = payload.new as any;
                    if (row && row.user_id === currentProfile.id) {
                        setShoppingList(row as ShoppingList);
                    }
                }
            )
            .subscribe();

        return () => {
            active = false;
            supabase.removeChannel(profileChannel);
            supabase.removeChannel(weeklyChannel);
            supabase.removeChannel(listChannel);
        };
    }, [user?.id]);

    const value = useMemo(
        () => ({ profile, weeklyMeals, shoppingList, loading, refresh: fetchAll }),
        [profile, weeklyMeals, shoppingList, loading, fetchAll]
    );

    return <EntitiesContext.Provider value={value}>{children}</EntitiesContext.Provider>;
}


