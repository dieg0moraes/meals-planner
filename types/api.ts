import type { ISODateString, Meal, UserProfile } from "@/types";

// Agent orchestration state shared by API, agent, and UI
// profile must be an EXISTING persisted profile; the agent plans for targetWeekStartDate
export interface PlannerState {
    profile: UserProfile;
    targetWeekStartDate: ISODateString;
    goals: string[];
    meals: Meal[]; // target ~10
    feedback?: string;
    done: boolean;
}
