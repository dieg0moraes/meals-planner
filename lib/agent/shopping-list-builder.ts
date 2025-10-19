import { z } from "zod";
import type { ShoppingListItem, ShoppingList, UserProfile, WeeklyMeals, UUID } from "@/types";

// Very small, plain OpenAI helper using the Chat Completions REST API
async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set");
    }
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

    console.log("[shopping-agent] calling OpenAI", { model, systemPromptLen: systemPrompt.length, userPromptLen: userPrompt.length });
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            temperature: 0,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        }),
    });
    if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`OpenAI request failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    const data = (await resp.json()) as any;
    const content: string = data.choices?.[0]?.message?.content ?? "";
    console.log("[shopping-agent] OpenAI content", { length: content.length, preview: content.slice(0, 240) });
    return content;
}

function tryParseJson<T>(text: string): T {
    // Allow fenced code blocks and extra text; try to extract the first JSON object
    const fenced = text.match(/```(?:json)?\n([\s\S]*?)\n```/i);
    const candidate = fenced ? fenced[1] : text;
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    const jsonSlice = firstBrace >= 0 && lastBrace > firstBrace ? candidate.slice(firstBrace, lastBrace + 1) : candidate;
    try {
        return JSON.parse(jsonSlice) as T;
    } catch (e) {
        console.error("[shopping-agent] JSON parse error", { snippet: jsonSlice.slice(0, 240) }, e);
        throw e;
    }
}

const UnitSchema = z.string().min(1);

const ShoppingListItemSchema = z.object({
    name: z.string().min(1),
    quantity: z.number().positive(),
    unit: UnitSchema,
    category: z.string().optional(),
    checked: z.boolean().default(false),
    notes: z.string().optional(),
});

const ResponseSchema = z.object({
    message: z.string(),
    items: z.array(ShoppingListItemSchema).min(1),
});

function uuid(): UUID {
    return (globalThis.crypto ?? require("crypto")).randomUUID();
}

function serializeProfileSummary(profile: UserProfile): string {
    return JSON.stringify({
        locale: profile.locale ?? null,
        timeZone: profile.timeZone ?? null,
        householdSize: (profile.household?.people?.length ?? 0) + (profile.household?.pets?.length ?? 0),
        dietaryRestrictions: profile.dietaryRestrictions ?? [],
        favoriteFoods: profile.favoriteFoods ?? [],
        dislikedFoods: profile.dislikedFoods ?? [],
        goals: profile.goals ?? [],
        location: profile.location ?? null,
    });
}

function serializeWeeklyMealsSummary(weeklyMeals?: WeeklyMeals | null): string {
    if (!weeklyMeals) return "null";
    return JSON.stringify({
        weekStartDate: weeklyMeals.weekStartDate,
        meals: weeklyMeals.meals.map((m) => ({
            id: m.id,
            name: m.name,
            ingredients: m.ingredients,
        })),
        targetMealsCount: weeklyMeals.targetMealsCount ?? null,
    });
}

export interface ShoppingListStepInput {
    profile: UserProfile;
    weeklyMeals?: WeeklyMeals | null;
    existingList?: ShoppingList | null;
    query?: string | null;
}

export interface ShoppingListStepOutput {
    items: ShoppingListItem[];
    message: string;
}

async function generateInitialItems(profile: UserProfile, weeklyMeals?: WeeklyMeals | null): Promise<ShoppingListStepOutput> {
    const system = "Sos un asistente que crea listas de compras simples y claras para LATAM. Siempre respondé SOLO en JSON válido.";
    const baseUser = `Genera una lista inicial de compras para la semana.
Perfil: ${serializeProfileSummary(profile)}
Plan semanal (puede ser null): ${serializeWeeklyMealsSummary(weeklyMeals)}
Reglas:
- Devuelve un objeto JSON con campos {\"message\": string, \"items\": ShoppingListItem[]}
- Cada item: { name, quantity, unit, category?, checked=false, notes? }
- Si hay plan semanal, agregá los ingredientes necesarios, UNIFICANDO cantidades por nombre.
- IMPORTANTE: No copies las cantidades de receta tal cual. Convertí medidas de cocina (tsp/tbsp/cup) a unidades de COMPRA.
- Unidades permitidas para la lista: g, kg, ml, l, unit, pack. Evitá tsp/tbsp/cup en la salida.
- Redondeá a tamaños razonables de supermercado (ej.: 500 g, 1 kg, 1 l, 6/12 unidades) y si la suma es chica, elevá al paquete mínimo.
- Podés usar notes para aclarar variedad o formato (ej.: \"arroz largo fino\", \"lata\").
- Usá category cuando aplique (verduras, frutas, carnes, lácteos, granos, congelados, despensa, limpieza, otros).
- Considerá restricciones y objetivos, mantené la lista breve y útil.`;

    // Single retry with a stricter hint to avoid empty lists
    const attempts = [
        baseUser + "\n- Debes incluir AL MENOS 10 items relevantes.",
        baseUser + "\n- IMPORTANTE: Producí una lista con 12-20 items (no vacía) y NUNCA uses tsp/tbsp/cup en la salida.",
    ];

    for (let i = 0; i < attempts.length; i++) {
        const user = attempts[i];
        const content = await callOpenAI(system, user);
        let parsed = ResponseSchema.safeParse(null);
        try {
            parsed = ResponseSchema.safeParse(tryParseJson<any>(content));
        } catch (e) {
            // already logged in tryParseJson
        }
        if (parsed.success) {
            const itemsWithIds: ShoppingListItem[] = parsed.data.items.map((i) => ({
                id: uuid(),
                name: i.name,
                quantity: i.quantity,
                unit: i.unit,
                category: i.category,
                checked: i.checked ?? false,
                notes: i.notes,
            }));
            return { items: itemsWithIds, message: parsed.data.message };
        }
        console.warn("[shopping-agent] validation failed for initial items", { attempt: i + 1, errors: parsed.error?.errors });
    }
    // Final fallback
    return { items: [], message: "No pude generar la lista. Probá de nuevo." };
}

async function refineItems(
    profile: UserProfile,
    currentItems: ShoppingListItem[],
    weeklyMeals: WeeklyMeals | null | undefined,
    instruction: string
): Promise<ShoppingListStepOutput> {
    if (!instruction || instruction.trim().length === 0) {
        return { items: currentItems, message: "Sin cambios." };
    }

    const system = "Sos un asistente que actualiza listas de compras. Siempre devolvés SOLO JSON válido.";
    const user = `Te doy una lista actual y una instrucción del usuario. 
Perfil: ${serializeProfileSummary(profile)}
Plan semanal (puede ser null): ${serializeWeeklyMealsSummary(weeklyMeals)}
Lista actual: ${JSON.stringify(currentItems.map(({ id, ...rest }) => rest))}
Instrucción: ${instruction}
Tarea: Decidí si se requiere cambio. Devolvé SIEMPRE la lista COMPLETA actualizada (aplicando la instrucción si corresponde) y un mensaje corto al usuario.
Reglas:
- No copies cantidades de receta. Convertí unidades de cocina a unidades de COMPRA (g, kg, ml, l, unit, pack) y redondeá a tamaños razonables de supermercado.
- Unificá por nombre y unidad, elevando al paquete mínimo si corresponde.
Formato JSON: {\"message\": string, \"items\": ShoppingListItem[]}`;

    const content = await callOpenAI(system, user);
    let parsed = ResponseSchema.safeParse(null);
    try {
        parsed = ResponseSchema.safeParse(tryParseJson<any>(content));
    } catch (e) {
        // already logged in tryParseJson
    }
    if (!parsed.success) {
        console.warn("[shopping-agent] validation failed for refine", parsed.error?.errors);
        return { items: currentItems, message: "No entendí el pedido. Mantengo la lista igual." };
    }
    const itemsWithIds: ShoppingListItem[] = parsed.data.items.map((i) => ({
        id: uuid(),
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category,
        checked: i.checked ?? false,
        notes: i.notes,
    }));
    return { items: itemsWithIds, message: parsed.data.message };
}

export async function runShoppingListStep(input: ShoppingListStepInput): Promise<ShoppingListStepOutput> {
    const { profile, weeklyMeals, existingList, query } = input;
    if (!existingList) {
        console.log("[shopping-agent] mode: initial (no existing list)");
        return generateInitialItems(profile, weeklyMeals);
    }
    const currentItems = existingList.items ?? [];
    if (currentItems.length === 0) {
        console.log("[shopping-agent] mode: initial (existing list empty)");
        return generateInitialItems(profile, weeklyMeals);
    }
    console.log("[shopping-agent] mode: refine", { currentItems: currentItems.length, hasQuery: !!query });
    return refineItems(profile, currentItems, weeklyMeals, query ?? "");
}


