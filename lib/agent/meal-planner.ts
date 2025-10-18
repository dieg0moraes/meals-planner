import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { Meal, UserProfile, ISODateString } from "@/types";
import type { PlannerState } from "@/types/api";

// Minimal state for the planning loop.
// IMPORTANT: `profile` MUST be an existing persisted user profile loaded from the DB.
// The agent iterates on the plan for `targetWeekStartDate` only (usually next Monday).
// PlannerState is imported from types/api

// LangGraph state definition (annotations) to satisfy types
const PlannerStateDef = Annotation.Root({
    profile: Annotation<UserProfile>(),
    targetWeekStartDate: Annotation<ISODateString>(),
    goals: Annotation<string[]>(),
    meals: Annotation<Meal[]>(),
    feedback: Annotation<string | undefined>(),
    done: Annotation<boolean>(),
});

// Node: propose initial meals (placeholder)
async function proposeMeals(state: PlannerState): Promise<Partial<PlannerState>> {
    // NOTE: placeholder – actual LLM/tool logic to be added later
    const meals = state.meals && state.meals.length > 0 ? state.meals : [];
    return { meals };
}

// Node: critique/adjust to ensure constraints (placeholder)
async function critiqueAndFix(_state: PlannerState): Promise<Partial<PlannerState>> {
    // NOTE: placeholder – ensure variety, dedupe, respect restrictions
    return {};
}

// Node: incorporate user feedback (placeholder)
async function incorporateFeedback(_state: PlannerState): Promise<Partial<PlannerState>> {
    // NOTE: placeholder – apply feedback like replacing or adjusting meals
    return {};
}

// Node: finalize
async function finalize(_state: PlannerState): Promise<Partial<PlannerState>> {
    return { done: true };
}

// Conditional edges based on state
function shouldAskFeedback(state: PlannerState): "need_feedback" | "finalize" {
    return state.feedback ? "need_feedback" : "finalize";
}

// Build the graph once and export a runner factory
export function buildMealPlannerGraph() {
    const graph = new StateGraph(PlannerStateDef)
        .addNode("proposeMeals", proposeMeals)
        .addNode("critiqueAndFix", critiqueAndFix)
        .addNode("incorporateFeedback", incorporateFeedback)
        .addNode("finalize", finalize)
        .addEdge(START, "proposeMeals")
        .addEdge("proposeMeals", "critiqueAndFix")
        .addConditionalEdges("critiqueAndFix", shouldAskFeedback, {
            need_feedback: "incorporateFeedback",
            finalize: "finalize",
        })
        .addEdge("incorporateFeedback", "critiqueAndFix")
        .addEdge("finalize", END);

    return graph.compile();
}

export type MealPlannerRunnable = ReturnType<typeof buildMealPlannerGraph>;

// Helper to step the graph – useful for API route
export async function runPlannerStep(
    runnable: MealPlannerRunnable,
    state: PlannerState,
    config?: RunnableConfig
) {
    return runnable.invoke(state, config);
}
