import { NextRequest, NextResponse } from "next/server";
import { buildMealPlannerGraph, runPlannerStep } from "@/lib/agent/meal-planner";
import type { PlannerState } from "@/types/api";
import type { WeeklyMeals, UserProfile } from "@/types";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

// Graph is stateless on boot; state is persisted in DB between requests.
const runnable = buildMealPlannerGraph();

export async function POST(req: NextRequest) {
    try {
        const { userId, weekStartDate, query, targetMealsCount } = (await req.json()) as {
            userId: string;
            weekStartDate: string; // ISO date
            query?: string; // natural language user request/feedback
            targetMealsCount?: number;
        };
        console.log("[planner] input:", { userId, weekStartDate, query, targetMealsCount });

        const supabase = await createSupabaseServerClient();

        // Load profile (required). Accept either profile.id or auth_user_id as input.
        let profile: UserProfile | null = null;
        {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();
            if (data) profile = (data as unknown) as UserProfile;
            if (!profile) {
                const { data: byAuth, error: errAuth } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("auth_user_id", userId)
                    .maybeSingle();
                if (byAuth) profile = (byAuth as unknown) as UserProfile;
                if (!profile) {
                    console.error("[planner] load profile error:", error || errAuth);
                    throw new Error("Profile not found");
                }
            }
        }
        const profileId = profile.id;

        // Load existing weekly plan if any
        const { data: weeklyRow, error: wErr } = await supabase
            .from("weekly_meals")
            .select("*")
            .eq("user_id", profileId)
            .eq("week_start_date", weekStartDate)
            .maybeSingle();
        if (wErr) console.warn("[planner] load weekly_meals warn:", wErr);

        const existing = weeklyRow as unknown as WeeklyMeals | null;

        // Build planner state
        const state: PlannerState = {
            profile,
            targetWeekStartDate: weekStartDate,
            goals: profile.goals ?? [],
            meals: existing?.meals ?? [],
            // Do NOT default to 10; ask the user first if undefined
            targetMealsCount:
                targetMealsCount !== undefined && targetMealsCount !== null
                    ? targetMealsCount
                    : existing?.targetMealsCount,
            feedback: query,
            done: false,
        };

        console.log("[planner] Starting graph execution...");
        const startTime = Date.now();
        const updated = await runPlannerStep(runnable, state);
        const endTime = Date.now();
        console.log(`[planner] Graph execution completed in ${endTime - startTime}ms`);
        console.log("[planner] updated state summary:", {
            meals: updated.meals?.length,
            phase: updated.phase,
            targetMealsCount: (updated as any).targetMealsCount,
        });

        // Persist weekly plan
        const upsertPayload = {
            id: existing?.id,
            user_id: profileId,
            week_start_date: weekStartDate,
            meals: updated.meals ?? [],
            target_meals_count: (updated as any).targetMealsCount ?? state.targetMealsCount ?? null,
            summary: existing?.summary ?? null,
        } as any;

        // Upsert without returning a row to avoid PostgREST single-object coercion errors
        const { error: upErr } = await supabase
            .from("weekly_meals")
            .upsert(upsertPayload, { onConflict: "user_id,week_start_date" });
        if (upErr) {
            console.error("[planner] upsert error:", upErr);
            throw new Error(upErr.message);
        }

        // Fetch the canonical single row for this user/week
        const { data: saved, error: selErr } = await supabase
            .from("weekly_meals")
            .select("*")
            .eq("user_id", profileId)
            .eq("week_start_date", weekStartDate)
            .order("updated_at", { ascending: false })
            .limit(1)
            .single();
        if (selErr) {
            console.error("[planner] select error:", selErr);
            throw new Error(selErr.message);
        }

        // Message handling based on phase
        let message = "Plan actualizado.";
        if (updated.phase === "ask_count") {
            message = "¿Cuántas comidas querés planificar para esta semana?";
        } else if (!existing?.meals?.length && (updated.meals?.length ?? 0) === 0) {
            message = "Estoy listo para proponer comidas cuando me indiques la cantidad.";
        } else if (state.feedback) {
            message = "Entendido. Actualicé tu plan considerando tu pedido.";
        }

        return NextResponse.json({
            message,
            weeklyMeals: saved,
            state: updated,
        });
    } catch (err) {
        console.error("[planner] fatal:", err);
        return NextResponse.json(
            { error: (err as Error).message ?? "Planner step failed" },
            { status: 400 }
        );
    }
}
