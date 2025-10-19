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
    return (
        hasDisplayName &&
        hasAtLeastOnePerson &&
        hasAtLeastOneGoal &&
        hasLocation &&
        hasFavorite &&
        hasDisliked
    );
}

const COMMON_EXTRACTION_RULES = `
IMPORTANT CONTEXT:
- The person speaking is ALWAYS the user themselves
- When the user says "I live alone", "it's just me", "solo yo", etc., add ONE person to the household (the user)
- The user is always part of the household - include them in the people array with role "self" or "user"
- When counting household members, the user counts as one person
- If the user says "I live with my brother", that's TWO people total: the user + brother
- If the user says "we are 3 in the house", that includes the user, so add 3 people total

STRICT RULES - ONLY add information when COMPLETELY CLEAR:
- If it's ambiguous whether someone is a person or pet (e.g., "Brunito", "Luna"), DO NOT add them at all
- Only add pets when explicitly stated (e.g., "my dog", "mi gato", "my cat Brunito")
- Only add people when the relationship is clear (e.g., "my brother", "mi novia", "my wife")
- If you're not 100% sure about any field value, OMIT it completely
- Better to collect less information than to collect wrong information
- Do NOT guess or infer - only extract what is explicitly stated

IMPORTANT - explanationOfChanges field:
You MUST provide a clear, conversational explanation in the "explanationOfChanges" field that describes:
- What information was successfully extracted and added/updated
- What information was omitted and WHY (ambiguous, unclear, not enough context)
- Any contradictions found and how they were resolved
- Use the SAME LANGUAGE as the user's input (if they speak Spanish, respond in Spanish)
- Be specific with examples (e.g., "Omití 'Brunito' porque no está claro si es una persona o mascota")
- Keep it concise but informative (1-2 sentences max)
`;

const INITIAL_EXTRACTION_EXAMPLES = `
Examples of CORRECT extraction:
- "I live alone" → 1 person with role "self"
- "I live with my girlfriend" → 2 people: role "self" + role "girlfriend"
- "We are 4: me, my wife and two kids" → 4 people total
- "Just me and my dog" → 1 person (role "self") + 1 pet (animal "dog")
- "I have a dog named Bruno" → 1 pet (animal "dog", name "Bruno")

Examples of cases to OMIT (ambiguous):
- "I live with Brunito" → OMIT Brunito (unclear if person or pet)
- "Luna is with me" → OMIT Luna (unclear if person or pet)
- "I like pasta" → Add to favoriteFoods ONLY if context is about food preferences
`;

function buildSystemPrompt(existingData: any | null): string {
    if (existingData) {
        return `You are updating user onboarding details for a weekly meal planner.
Current user data: ${JSON.stringify(existingData, null, 2)}

${COMMON_EXTRACTION_RULES}

${INITIAL_EXTRACTION_EXAMPLES}

UPDATING EXISTING DATA:
- Incorporate the new information provided by the user and return the COMPLETE updated profile with all fields (existing + new)
- If new info contradicts existing data, prefer the new information
- If new info adds to existing data (e.g., new favorite foods), merge both. THIS IS CRITICAL, DONT LOSE ANY INFORMATION
- Always return ALL fields, not just the updated ones
- Maintain the user in household.people with role "self" unless they explicitly say otherwise`;
    }

    return `You extract user onboarding details for a weekly meal planner.

${COMMON_EXTRACTION_RULES}

${INITIAL_EXTRACTION_EXAMPLES}

Return only the structured fields. If unsure, omit.`;
}

export async function POST(req: NextRequest) {
    try {
        const { authUserId, new_info } = (await req.json()) as {
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

        const prev = (existing as any) as UserProfile | null;

        // 2) Extract and merge new info with existing data using LLM
        const model = new ChatOpenAI({
            model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
            temperature: 0
        });
        const extractor = model.withStructuredOutput(AgentOnboardingInputSchema);

        // Prepare context with existing data
        const existingData = prev ? {
            displayName: prev.displayName,
            household: prev.household,
            dietaryRestrictions: prev.dietaryRestrictions,
            favoriteFoods: prev.favoriteFoods,
            dislikedFoods: prev.dislikedFoods,
            goals: prev.goals,
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

        // 3) Build final profile from LLM output (LLM already merged everything)
        const nowIso = new Date().toISOString();

        // Add IDs to people and pets from LLM response
        const peopleWithIds: Person[] = (parsed.household?.people ?? []).map((p) => ({
            id: generateId(),
            gender: p.gender ?? undefined,
            estimatedAge: p.estimatedAge ?? undefined,
            role: p.role,
        }));
        const petsWithIds: Pet[] = (parsed.household?.pets ?? []).map((p) => ({
            id: generateId(),
            animal: p.animal,
            name: p.name ?? null,
        }));

        const merged: UserProfile = {
            id: prev?.id ?? generateId(),
            authUserId: resolvedAuthUserId!,
            displayName: displayNameFromAuth ?? parsed.displayName ?? "",
            locale: prev?.locale,
            timeZone: FIXED_TIME_ZONE,
            location: FIXED_LOCATION,
            household: {
                people: peopleWithIds,
                pets: petsWithIds,
            },
            dietaryRestrictions: parsed.dietaryRestrictions ?? [],
            favoriteFoods: parsed.favoriteFoods ?? [],
            dislikedFoods: parsed.dislikedFoods ?? [],
            goals: parsed.goals ?? [],
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

        return NextResponse.json({
            profile: merged,
            completed,
            explanation: parsed.explanationOfChanges
        });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message ?? "Onboarding ingest failed" },
            { status: 400 }
        );
    }
}
