import { NextRequest, NextResponse } from "next/server";
import { buildMealPlannerGraph, runPlannerStep } from "@/lib/agent/meal-planner";
import type { PlannerState } from "@/types/api";
import type { WeeklyMeals, UserProfile } from "@/types";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

const runnable = buildMealPlannerGraph();

export async function POST(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user?.id) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }
        const authUserId = auth.user.id;
        const { targetMealsCount } = (await req.json().catch(() => ({}))) as { targetMealsCount?: number };

        // Load profile by auth_user_id
        let profile: UserProfile | null = null;
        {
            const { data: byAuth } = await supabase
                .from("profiles")
                .select("*")
                .eq("auth_user_id", authUserId)
                .maybeSingle();
            if (byAuth) profile = (byAuth as unknown) as UserProfile;
            if (!profile) throw new Error("Profile not found");
        }
        const profileId = profile.id;

        // Load latest weekly plan
        const { data: weeklyRow } = await supabase
            .from("weekly_meals")
            .select("*")
            .eq("user_id", profileId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        const existing = (weeklyRow as unknown as WeeklyMeals | null) ?? null;

        const desiredCount = targetMealsCount ?? existing?.targetMealsCount ?? 10;

        const state: PlannerState = {
            profile,
            goals: profile.goals ?? [],
            meals: existing?.meals ?? [],
            targetMealsCount: desiredCount,
            feedback: undefined,
            done: false,
        };

        const updated = await runPlannerStep(runnable, state);

        // Persist
        const upsertPayload = {
            id: existing?.id,
            user_id: profileId,
            week_start_date: (existing as any)?.week_start_date ?? new Date().toISOString().slice(0, 10),
            meals: updated.meals ?? [],
            target_meals_count: (updated as any).targetMealsCount ?? state.targetMealsCount ?? null,
            summary: existing?.summary ?? null,
        } as any;
        const { error: upErr } = await supabase.from("weekly_meals").upsert(upsertPayload, { onConflict: "user_id,week_start_date" });
        if (upErr) throw new Error(upErr.message);

        // Return latest row
        const { data: saved, error: selErr } = await supabase
            .from("weekly_meals")
            .select("*")
            .eq("user_id", profileId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .single();
        if (selErr) throw new Error(selErr.message);

        return NextResponse.json({
            message: "Plan inicial generado.",
            weeklyMeals: saved,
        });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message || "Kickoff failed" }, { status: 400 });
    }
}


