import type { Meal, UserProfile } from "@/types";

// Agent orchestration state shared by API, agent, and UI
// profile must be an EXISTING persisted profile; the agent plans for targetWeekStartDate
export interface PlannerState {
    profile: UserProfile;
    goals: string[];
    meals: Meal[]; // target ~10
    targetMealsCount?: number; // desired number of meals for the plan
    feedback?: string;
    history?: Array<{ role: "user" | "agent"; text: string; at: number }>;
    phase?: "ask_count" | "plan" | "revise" | "final";
    done: boolean;
}
