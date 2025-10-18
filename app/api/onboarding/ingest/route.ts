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

export async function POST(req: NextRequest) {
    try {
        const { authUserId, new_info } = (await req.json()) as {
            authUserId?: string;
            new_info: string;
        };

        if (!authUserId || !new_info) {
            return NextResponse.json({ error: "Missing authUserId or new_info" }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient();

        // Prefer the authenticated session user to identify and name the profile
        const { data: authData } = await supabase.auth.getUser();
        const sessionUser = authData?.user ?? null;
        const resolvedAuthUserId = sessionUser?.id ?? authUserId;
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
        const model = new ChatOpenAI({ model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini", temperature: 0 });
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

        const systemPrompt = existingData
            ? `You are updating user onboarding details for a weekly meal planner.
Current user data: ${JSON.stringify(existingData, null, 2)}

Incorporate the new information provided by the user and return the COMPLETE updated profile with all fields (existing + new).
If new info contradicts existing data, prefer the new information.
If new info adds to existing data (e.g., new favorite foods), merge both.
Always return ALL fields, not just the updated ones.`
            : "You extract user onboarding details for a weekly meal planner. Return only the structured fields. If unsure, omit.";

        const parsed = await extractor.invoke([
            {
                role: "system",
                content: systemPrompt,
            },
            { role: "user", content: new_info },
        ] as any);

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

        return NextResponse.json({ profile: merged, completed });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message ?? "Onboarding ingest failed" },
            { status: 400 }
        );
    }
}


