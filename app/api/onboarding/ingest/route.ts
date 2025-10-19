import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { ChatOpenAI } from "@langchain/openai";
import {
    AgentOnboardingInputSchema,
    FIXED_LOCATION,
    FIXED_TIME_ZONE,
    type UserProfile,
    type Person,
    type Pet,
} from "@/types";

function generateId() {
    return (globalThis.crypto ?? require("crypto")).randomUUID();
}

function isProfileComplete(p: UserProfile): boolean {
    const hasDisplayName = (p.displayName?.trim()?.length ?? 0) > 0;
    const hasAtLeastOnePerson = (p.household?.people?.length ?? 0) > 0;
    const hasAtLeastOneGoal = (p.goals?.length ?? 0) > 0;
    const hasLocation = Boolean(p.location?.countryCode && p.location?.city);
    const hasFavorite = (p.favoriteFoods?.length ?? 0) > 0;
    const hasDisliked = (p.dislikedFoods?.length ?? 0) > 0;
    const hasDietaryRestrictions = (p.dietaryRestrictions?.length ?? 0) > 0; // "ninguna" cuenta como válido
    return (
        hasDisplayName &&
        hasAtLeastOnePerson &&
        hasAtLeastOneGoal &&
        hasLocation &&
        hasFavorite &&
        hasDisliked &&
        hasDietaryRestrictions
    );
}

const EXTRACTION_RULES = `
REGLAS DE EXTRACCIÓN:
1. El usuario SIEMPRE es parte del hogar (rol "usuario")
2. "Vivo solo" = 1 persona (el usuario). "Vivo con mi hermano" = 2 personas (usuario + hermano)
3. Solo agrega info cuando esté 100% clara. Si hay duda, omite
4. Mascotas: solo cuando digan "mi perro", "mi gato", etc. NO agregues nombres ambiguos

DIFERENCIA CRÍTICA - dietaryRestrictions vs goals:
• dietaryRestrictions = DIETAS, ALERGIAS, RESTRICCIONES ALIMENTARIAS
  Ejemplos: "vegetariano", "vegano", "sin gluten", "sin lactosa", "antiinflamatorio", "kosher", "halal", "sin azúcar"
  ⚠️ Si el usuario dice que NO tiene restricciones → usar ["ninguna"]
  
• goals = OBJETIVOS del planificador (NO son dietas)
  Ejemplos: "bajar de peso", "ahorrar dinero", "comer más saludable", "más variedad", "ahorrar tiempo"

⚠️ IMPORTANTE:
- "Soy vegetariano" → dietaryRestrictions (NO goals)
- "Quiero ser vegetariano" → dietaryRestrictions and goals 
- "Sigo dieta antiinflamatoria" → dietaryRestrictions (NO goals)
- "Quiero bajar de peso" → goals (NO dietaryRestrictions)
- "No tengo restricciones" → dietaryRestrictions: ["ninguna"]
- "Como de todo" → dietaryRestrictions: ["ninguna"]

CAMPO explanationOfChanges (un agente de voz leerá esto):
- Escribe en el idioma del usuario, natural y breve (1-2 oraciones)
- Ejemplo: "Perfecto, agregué a tu hermano al hogar"
- NO uses términos técnicos ni JSON
`;

function buildSystemPrompt(existingData: any | null): string {
    if (existingData) {
        return `Actualizas el perfil de un planificador de comidas.
Datos actuales: ${JSON.stringify(existingData, null, 2)}

${EXTRACTION_RULES}

ACTUALIZACIÓN DE DATOS - MUY IMPORTANTE:
⚠️ SIEMPRE retorna el perfil COMPLETO con TODOS los arrays existentes

REGLAS CRÍTICAS:
1. Si el usuario menciona comidas favoritas → Retorna favoriteFoods COMPLETO Y dislikedFoods COMPLETO Y dietaryRestrictions COMPLETO
2. Si el usuario menciona comidas que NO le gustan → Retorna dislikedFoods COMPLETO Y favoriteFoods COMPLETO Y dietaryRestrictions COMPLETO  
3. Si el usuario menciona restricciones → Retorna dietaryRestrictions COMPLETO Y favoriteFoods COMPLETO Y dislikedFoods COMPLETO
4. Si el usuario menciona personas/mascotas → Retorna household.people COMPLETO Y household.pets COMPLETO
5. Si el usuario menciona goals → Retorna goals COMPLETO Y todos los demás arrays COMPLETOS
6. NUNCA omitas arrays que no se mencionan - SIEMPRE inclúyelos completos

Ejemplos CORRECTOS:
Usuario: "Me gusta el pollo"
→ Retornar TODO: { 
    favoriteFoods: [...viejas, "pollo"], 
    dislikedFoods: [...viejas completas], 
    dietaryRestrictions: [...viejas completas],
    goals: [...viejas completas],
    household: { people: [...viejas], pets: [...viejas] }
}

Usuario: "No me gusta la cebolla"  
→ Retornar TODO: { 
    dislikedFoods: [...viejas, "cebolla"], 
    favoriteFoods: [...viejas completas],
    dietaryRestrictions: [...viejas completas], 
    goals: [...viejas completas],
    household: { people: [...viejas], pets: [...viejas] }
}

⚠️ ERRORES CRÍTICOS A EVITAR:
❌ Retornar solo el campo mencionado → DEBES retornar TODOS los campos
❌ Retornar arrays vacíos [] cuando hay datos viejos → DEBES preservar datos viejos`;
    }

    return `Extraes datos de onboarding para un planificador de comidas.

${EXTRACTION_RULES}

Retorna solo campos estructurados. Si hay duda, omite.`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { authUserId, new_info } = body as {
            authUserId?: string;
            new_info: string;
        };

        if (!new_info) {
            return NextResponse.json({ error: "Missing new_info" }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient();

        // Check if this is an agent request (has API key) or a user request (has session)
        const apiKey = req.headers.get("x-agent-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
        const isAgentRequest = apiKey === process.env.AGENT_API_KEY;

        // Get authUserId from header (set by ElevenLabs widget) or body
        const headerAuthUserId = req.headers.get("x-user-id");
        const finalAuthUserId = headerAuthUserId || authUserId;

        // Get authenticated session user
        const { data: authData } = await supabase.auth.getUser();
        const sessionUser = authData?.user ?? null;

        // Determine the auth user ID
        let resolvedAuthUserId: string | null = null;

        if (isAgentRequest) {
            // Agent request: use header or body authUserId
            resolvedAuthUserId = finalAuthUserId || null;
            if (!resolvedAuthUserId) {
                return NextResponse.json({ error: "Agent requests must provide authUserId (via header x-user-id or body)" }, { status: 400 });
            }
        } else {
            // User request: prefer session user, fallback to provided authUserId
            resolvedAuthUserId = sessionUser?.id ?? finalAuthUserId ?? null;
        }

        if (!resolvedAuthUserId) {
            return NextResponse.json({
                error: "Authentication required. Provide a valid session or API key with authUserId"
            }, { status: 401 });
        }
        const displayNameFromAuth =
            (sessionUser?.user_metadata as any)?.full_name ||
            (sessionUser?.user_metadata as any)?.name ||
            sessionUser?.email ||
            null;

        // 1) Load existing profile (if any)
        const { data: existing, error: pErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("auth_user_id", resolvedAuthUserId!)
            .maybeSingle();
        if (pErr) throw new Error(pErr.message);

        // Map snake_case to camelCase
        const prev: UserProfile | null = existing ? {
            id: existing.id,
            authUserId: existing.auth_user_id,
            displayName: existing.display_name || "",
            locale: existing.locale,
            timeZone: existing.time_zone,
            location: existing.location,
            household: existing.household || { people: [], pets: [] },
            dietaryRestrictions: existing.dietary_restrictions || [],
            favoriteFoods: existing.favorite_foods || [],
            dislikedFoods: existing.disliked_foods || [],
            goals: existing.goals || [],
            createdAt: existing.created_at,
            updatedAt: existing.updated_at,
            rawOnboarding: existing.raw_onboarding,
        } : null;

        // 2) Extract and merge new info with existing data using LLM
        const model = new ChatOpenAI({
            model: "gpt-4.1",
            temperature: 0
        });
        const extractor = model.withStructuredOutput(AgentOnboardingInputSchema);

        // Prepare context with existing data
        // Only treat as existing if we actually have some meaningful data
        const existingData = prev && (
            prev.household?.people?.length ||
            prev.household?.pets?.length ||
            prev.dietaryRestrictions?.length ||
            prev.favoriteFoods?.length ||
            prev.dislikedFoods?.length ||
            prev.goals?.length
        ) ? {
            displayName: prev.displayName || "",
            household: {
                people: prev.household?.people || [],
                pets: prev.household?.pets || []
            },
            dietaryRestrictions: prev.dietaryRestrictions || [],
            favoriteFoods: prev.favoriteFoods || [],
            dislikedFoods: prev.dislikedFoods || [],
            goals: prev.goals || [],
        } : null;

        const systemPrompt = buildSystemPrompt(existingData);

        // Invoke with LangSmith tracing metadata
        const parsed = await extractor.invoke(
            [
                {
                    role: "system",
                    content: systemPrompt,
                },
                { role: "user", content: new_info },
            ] as any,
            {
                metadata: {
                    userId: resolvedAuthUserId,
                    endpoint: "onboarding-ingest",
                    hasExistingProfile: !!prev,
                },
                tags: ["onboarding", "profile-extraction"],
                runName: "extract-onboarding-data",
            }
        );

        // 3) Build final profile from LLM output
        const nowIso = new Date().toISOString();

        // Add IDs to people and pets
        const peopleWithIds: Person[] = (parsed.household?.people || []).map((p: any) => ({
            id: generateId(),
            gender: p.gender ?? undefined,
            estimatedAge: p.estimatedAge ?? undefined,
            role: p.role,
        }));

        const petsWithIds: Pet[] = (parsed.household?.pets || []).map((p: any) => ({
            id: generateId(),
            animal: p.animal,
            name: p.name ?? null,
        }));

        const merged: UserProfile = {
            id: prev?.id ?? generateId(),
            authUserId: resolvedAuthUserId!,
            displayName: displayNameFromAuth ?? parsed.displayName ?? prev?.displayName ?? "usuario",
            locale: prev?.locale,
            timeZone: FIXED_TIME_ZONE,
            location: FIXED_LOCATION,
            household: {
                people: peopleWithIds,
                pets: petsWithIds,
            },
            dietaryRestrictions: parsed.dietaryRestrictions || [],
            favoriteFoods: parsed.favoriteFoods || [],
            dislikedFoods: parsed.dislikedFoods || [],
            goals: parsed.goals || [],
            createdAt: prev?.createdAt ?? nowIso,
            updatedAt: nowIso,
            rawOnboarding: { ...(prev?.rawOnboarding ?? {}), lastNewInfo: new_info },
        };

        // 4) Persist (upsert by auth_user_id)
        const upsertPayload: any = {
            id: existing?.id ?? merged.id,
            auth_user_id: resolvedAuthUserId!,
            display_name: merged.displayName,
            locale: merged.locale,
            time_zone: merged.timeZone,
            location: merged.location,
            household: merged.household,
            dietary_restrictions: merged.dietaryRestrictions,
            favorite_foods: merged.favoriteFoods,
            disliked_foods: merged.dislikedFoods,
            goals: merged.goals,
            raw_onboarding: merged.rawOnboarding,
            created_at: existing?.created_at ?? merged.createdAt,
            updated_at: merged.updatedAt,
        };

        const { data: saved, error: upErr } = await supabase
            .from("profiles")
            .upsert(upsertPayload, { onConflict: "auth_user_id" })
            .select()
            .single();
        if (upErr) throw new Error(upErr.message);

        const profile = (saved as any) as UserProfile;
        const completed = isProfileComplete(merged);

        // Build manual response string with XML tags for voice agent
        const responseText = `<tool_response>${JSON.stringify({
            hasRequiredInfo: completed,
            message: parsed.explanationOfChanges
        })}</tool_response>`;

        return NextResponse.json({
            response: responseText
        });
    } catch (err) {
        const errorResponse = `<tool_response>${JSON.stringify({
            hasRequiredInfo: false,
            message: "Lo siento, hubo un error al procesar tu información. ¿Podrías intentarlo de nuevo?"
        })}</tool_response>`;

        return NextResponse.json(
            {
                error: (err as Error).message ?? "Onboarding ingest failed",
                response: errorResponse
            },
            { status: 500 }
        );
    }
}
