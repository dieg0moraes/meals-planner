import { NextRequest, NextResponse } from "next/server";
import { buildMealPlannerGraph, runPlannerStep } from "@/lib/agent/meal-planner";
import type { PlannerState } from "@/types/api";
import type { WeeklyMeals, UserProfile } from "@/types";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

// Graph is stateless on boot; state is persisted in DB between requests.
const runnable = buildMealPlannerGraph();

export async function POST(req: NextRequest) {
    try {
        const { userId, weekStartDate, query } = (await req.json()) as {
            userId: string;
            weekStartDate: string; // ISO date
            query?: string; // natural language user request/feedback
        };

        const supabase = await createSupabaseServerClient();

        // Load profile (required)
        const { data: profileRow, error: pErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
        if (pErr || !profileRow) throw new Error(pErr?.message || "Profile not found");

        const profile = profileRow as unknown as UserProfile;

        // Load existing weekly plan if any
        const { data: weeklyRow } = await supabase
            .from("weekly_meals")
            .select("*")
            .eq("user_id", userId)
            .eq("week_start_date", weekStartDate)
            .maybeSingle();

        const existing = weeklyRow as unknown as WeeklyMeals | null;

        // Build planner state
        const state: PlannerState = {
            profile,
            targetWeekStartDate: weekStartDate,
            goals: profile.goals ?? [],
            meals: existing?.meals ?? [],
            feedback: query,
            done: false,
        };

        const updated = await runPlannerStep(runnable, state);

        // Persist weekly plan
        const upsertPayload = {
            id: existing?.id,
            user_id: userId,
            week_start_date: weekStartDate,
            meals: updated.meals ?? [],
            summary: existing?.summary ?? null,
        } as any;

        const { error: upErr, data: saved } = await supabase
            .from("weekly_meals")
            .upsert(upsertPayload, { onConflict: "user_id,week_start_date" })
            .select()
            .single();
        if (upErr) throw new Error(upErr.message);

        // Simple user-facing message placeholder
        const message = updated.feedback
            ? "Entendido. Actualicé tu plan de comidas considerando tu pedido."
            : "Generé una propuesta inicial de 10 comidas para la semana.";

        return NextResponse.json({
            message,
            weeklyMeals: saved,
            state: updated,
        });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message ?? "Planner step failed" },
            { status: 400 }
        );
    }
}


