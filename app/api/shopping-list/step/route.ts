import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import type { ShoppingList, UserProfile, WeeklyMeals } from "@/types";
import { runShoppingListStep } from "@/lib/agent/shopping-list-builder";

export async function POST(req: NextRequest) {
    try {
        const { userId, weekStartDate, query } = (await req.json()) as {
            userId: string; // profile.id or auth_user_id
            weekStartDate?: string | null; // ISO date, optional
            query?: string | null; // natural language
        };
        console.log("[shopping] input:", { userId, weekStartDate, hasQuery: !!query });
        if (!userId) throw new Error("userId is required");

        const supabase = await createSupabaseServerClient();

        // Load profile by id or auth_user_id - map fields correctly
        let profile: UserProfile | null = null;
        {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();
            if (data) {
                // Map snake_case DB fields to camelCase TypeScript fields
                const p = data as any;
                profile = {
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
            }
            if (!profile) {
                const { data: byAuth, error: errAuth } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("auth_user_id", userId)
                    .maybeSingle();
                if (byAuth) {
                    // Map snake_case DB fields to camelCase TypeScript fields
                    const p = byAuth as any;
                    profile = {
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
                }
                if (!profile) {
                    console.error("[shopping] load profile error:", error || errAuth);
                    throw new Error("Profile not found");
                }
            }
        }
        const profileId = profile.id;

        // Load latest weekly plan for this user (ignore weekStartDate)
        let weekly: WeeklyMeals | null = null;
        {
            const { data, error } = await supabase
                .from("weekly_meals")
                .select("*")
                .eq("user_id", profileId)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) console.warn("[shopping] load latest weekly_meals warn:", error);
            weekly = (data as unknown) as WeeklyMeals | null;
        }

        // Load existing shopping list; prefer the one tied to this week's plan if available; else latest
        let existing: ShoppingList | null = null;
        if (weekly?.id) {
            const { data, error } = await supabase
                .from("shopping_lists")
                .select("*")
                .eq("user_id", profileId)
                .eq("week_meals_id", weekly.id)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) console.warn("[shopping] load list by week warn:", error);
            existing = (data as unknown) as ShoppingList | null;
        }
        if (!existing) {
            const { data, error } = await supabase
                .from("shopping_lists")
                .select("*")
                .eq("user_id", profileId)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) console.warn("[shopping] load latest list warn:", error);
            existing = (data as unknown) as ShoppingList | null;
        }

        // If we still don't have a weekly plan but the list is linked to one, fetch it
        if (!weekly && (existing as any)?.week_meals_id) {
            const { data, error } = await supabase
                .from("weekly_meals")
                .select("*")
                .eq("id", (existing as any).week_meals_id)
                .maybeSingle();
            if (error) console.warn("[shopping] load weekly by list link warn:", error);
            weekly = (data as unknown) as WeeklyMeals | null;
        }

        // Run step
        console.log("[shopping] running step", {
            hasExisting: !!existing,
            existingItems: existing?.items ? (existing.items as any[]).length : 0,
            hasWeekly: !!weekly,
        });
        const out = await runShoppingListStep({
            profile,
            weeklyMeals: weekly ?? undefined,
            existingList: existing ?? undefined,
            query: query ?? undefined,
        });
        console.log("[shopping] step result", { items: out.items?.length, messageLen: out.message?.length });

        // Persist
        const upsertPayload = {
            id: existing?.id,
            user_id: profileId,
            week_meals_id: weekly?.id ?? (existing as any)?.week_meals_id ?? null,
            items: out.items ?? [],
        } as any;
        console.log("[shopping] upserting payload", { hasId: !!upsertPayload.id, items: (upsertPayload.items as any[]).length, weekMealsId: upsertPayload.week_meals_id });
        const { error: upErr } = await supabase.from("shopping_lists").upsert(upsertPayload);
        if (upErr) {
            console.error("[shopping] upsert error:", upErr);
            throw new Error(upErr.message);
        }

        // Fetch canonical latest row
        const { data: saved, error: selErr } = await supabase
            .from("shopping_lists")
            .select("*")
            .eq("user_id", profileId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .single();
        if (selErr) {
            console.error("[shopping] select error:", selErr);
            throw new Error(selErr.message);
        }
        console.log("[shopping] saved row", { id: (saved as any)?.id, items: ((saved as any)?.items || []).length });

        const message = out.message || (existing ? "Lista actualizada." : "Lista creada.");

        return NextResponse.json({
            message,
            shoppingList: saved,
        });
    } catch (err) {
        console.error("[shopping] fatal:", err);
        return NextResponse.json(
            { error: (err as Error).message ?? "Shopping step failed" },
            { status: 400 }
        );
    }
}


