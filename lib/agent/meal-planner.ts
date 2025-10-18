import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { Meal, UserProfile, ISODateString } from "@/types";
import type { PlannerState } from "@/types/api";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";

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
    targetMealsCount: Annotation<number | undefined>(),
    history: Annotation<Array<{ role: "user" | "agent"; text: string; at: number }> | undefined>(),
    phase: Annotation<"ask_count" | "plan" | "revise" | "final" | undefined>(),
    done: Annotation<boolean>(),
});

// Node: propose initial meals (placeholder)
async function proposeMeals(state: PlannerState): Promise<Partial<PlannerState>> {
    // If we don't know how many meals to plan, but we already have a list,
    // infer the target from the current list length and continue planning.
    if ((!state.targetMealsCount || state.targetMealsCount <= 0) && (state.meals?.length ?? 0) > 0) {
        return { targetMealsCount: state.meals.length, phase: "plan" };
    }

    // If we don't know how many meals to plan and we have no list yet, ask first
    if (!state.targetMealsCount || state.targetMealsCount <= 0) {
        const prompt = "¿Cuántas comidas querés planificar para esta semana?";
        const history: Array<{ role: "user" | "agent"; text: string; at: number }> = [
            ...(state.history ?? []),
            { role: "agent", text: prompt, at: Date.now() },
        ];
        return { history, phase: "ask_count" };
    }

    // If we already have meals, do nothing (remain in plan phase)
    if (state.meals && state.meals.length > 0) {
        return { phase: "plan" };
    }

    // Generate meals using structured output
    const generated = await generateMealsFromProfile(
        state.profile,
        state.targetMealsCount ?? 10
    );
    const history = [
        ...(state.history ?? []),
        {
            role: "agent" as const,
            text: `Propuesta inicial con ${generated.length} comidas lista.`,
            at: Date.now(),
        },
    ];
    return { meals: generated, history, phase: "plan" };
}

// Node: critique/adjust to ensure constraints (placeholder)
async function critiqueAndFix(state: PlannerState): Promise<Partial<PlannerState>> {
    // If we were waiting for count and now have it but no meals, generate now
    if (
        state.phase === "ask_count" &&
        (state.targetMealsCount ?? 0) > 0 &&
        (!state.meals || state.meals.length === 0)
    ) {
        const generated = await generateMealsFromProfile(
            state.profile,
            state.targetMealsCount ?? 10
        );
        return { meals: generated, phase: "plan", feedback: undefined };
    }
    // TODO: future: dedupe/validate
    return {};
}

// Node: incorporate user feedback (parse count or rewrite full list)
async function incorporateFeedback(state: PlannerState): Promise<Partial<PlannerState>> {
    // If we asked for count, try to parse an integer from feedback
    if (state.phase === "ask_count" && state.feedback) {
        const m = state.feedback.match(/\d+/);
        if (m) {
            const count = Math.max(1, Math.min(30, parseInt(m[0], 10)));
            const history = [
                ...(state.history ?? []),
                { role: "agent" as const, text: `Perfecto, planifico ${count}.`, at: Date.now() },
            ];
            return { targetMealsCount: count, history, feedback: undefined };
        }
    }
    // While planning: rewrite full list according to instruction
    if (state.phase === "plan" && state.feedback) {
        const requiredCount = state.targetMealsCount ?? (state.meals?.length ?? 10);
        const beforeNames = (state.meals ?? []).map((m) => m.name);
        const updatedMeals = await rewriteMealsFromInstruction(
            state.profile,
            requiredCount,
            state.meals ?? [],
            state.feedback
        );
        const afterNames = updatedMeals.map((m) => m.name);
        console.log("[planner] rewrite meals", { before: beforeNames, after: afterNames });
        const history = [
            ...(state.history ?? []),
            { role: "agent" as const, text: "Actualicé la lista completa.", at: Date.now() },
        ];
        return { meals: updatedMeals, history, feedback: undefined };
    }
    return {};
}

// Node: finalize
async function finalize(_state: PlannerState): Promise<Partial<PlannerState>> {
    return { done: true };
}

// Conditional edges based on state
function shouldAskFeedback(state: PlannerState): "need_feedback" | "finalize" {
    // If we're waiting for the count: only branch to feedback if user sent a number; otherwise end this turn
    if (state.phase === "ask_count") {
        if (state.feedback && /\d+/.test(state.feedback)) return "need_feedback";
        return "finalize";
    }
    // When in planning phase, treat any feedback as an edit request and handle once
    if (state.phase === "plan" && state.feedback && state.feedback.trim().length > 0) {
        return "need_feedback";
    }
    return "finalize";
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

// ===== Helpers =====

const UnitSchema = z.enum(["unit", "g", "kg", "ml", "l", "tbsp", "tsp", "cup", "pack"]);

const IngredientSchema = z.object({
    name: z.string().min(1),
    quantity: z.number().positive(),
    unit: UnitSchema,
    isOptional: z.boolean(),
    notes: z.string().nullable().optional(),
});

const MealSchema = z.object({
    name: z.string().min(1),
    ingredients: z.array(IngredientSchema).min(1),
    tags: z.array(z.string()).default([]),
    notes: z.string().nullable().optional(),
});

function uuid(): string {
    return (globalThis.crypto ?? require("crypto")).randomUUID();
}

async function generateMealsFromProfile(profile: UserProfile, count: number): Promise<Meal[]> {
    const model = new ChatOpenAI({ model: process.env.OPENAI_MODEL ?? "gpt-4o-mini", temperature: 0 });
    // OpenAI Structured Outputs requires top-level object, not array
    const schema = z.object({ meals: z.array(MealSchema).min(1).max(Math.max(10, count + 5)) });
    const extract = model.withStructuredOutput(schema);

    const householdSize = (profile.household?.people?.length ?? 0) + (profile.household?.pets?.length ?? 0);
    const sys = `Sos un planificador de comidas para una familia en LATAM.
Reglas:
- Devuelve exactamente ${count} comidas.
- Simple, accesible y variadas.
- Respeta restricciones: ${JSON.stringify(profile.dietaryRestrictions || [])}.
- Evita: ${JSON.stringify(profile.dislikedFoods || [])}.
- Considera favoritos: ${JSON.stringify(profile.favoriteFoods || [])}.
- Cada ingrediente debe marcar isOptional=false salvo salsas/toppings/especias que pueden ser true.`;

    const mealsObj = await extract.invoke([
        { role: "system", content: sys },
        {
            role: "user",
            content: `Hogar: ${householdSize} integrantes. Objetivos: ${JSON.stringify(profile.goals || [])}. Genera la lista.`,
        },
    ] as any);
    const meals = mealsObj.meals;
    const mapped: Meal[] = (meals as Array<z.infer<typeof MealSchema>>).map((m) => ({
        id: uuid(),
        name: m.name,
        ingredients: m.ingredients.map((ing: z.infer<typeof IngredientSchema>) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            isOptional: ing.isOptional,
            notes: ing.notes ?? undefined,
        })),
        tags: m.tags ?? [],
        notes: m.notes ?? undefined,
    }));
    return mapped.slice(0, count);
}

async function rewriteMealsFromInstruction(
    profile: UserProfile,
    count: number,
    currentMeals: Meal[],
    instruction: string
): Promise<Meal[]> {
    const model = new ChatOpenAI({ model: process.env.OPENAI_MODEL ?? "gpt-4o-mini", temperature: 0 });
    const schema = z.object({ meals: z.array(MealSchema).length(count) });
    const extract = model.withStructuredOutput(schema);

    const sys = `Sos un planificador de comidas para LATAM. Te daré una lista de comidas actual y una instrucción.
Responde SOLO con la lista completa actualizada (exactamente ${count} elementos), respetando restricciones: ${JSON.stringify(
        profile.dietaryRestrictions || []
    )}, evitando: ${JSON.stringify(profile.dislikedFoods || [])}, y considerando favoritos: ${JSON.stringify(
        profile.favoriteFoods || []
    )}.`;

    const mealsObj = await extract.invoke([
        { role: "system", content: sys },
        {
            role: "user",
            content: `Lista actual (${currentMeals.length}): ${JSON.stringify(
                currentMeals.map((m) => ({ name: m.name, ingredients: m.ingredients, tags: m.tags || [] }))
            )}\nInstrucción del usuario: ${instruction}`,
        },
    ] as any);

    const meals = mealsObj.meals as Array<z.infer<typeof MealSchema>>;
    return meals.map((m) => ({
        id: uuid(),
        name: m.name,
        ingredients: m.ingredients.map((ing: z.infer<typeof IngredientSchema>) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            isOptional: ing.isOptional,
            notes: ing.notes ?? undefined,
        })),
        tags: m.tags ?? [],
        notes: m.notes ?? undefined,
    }));
}


