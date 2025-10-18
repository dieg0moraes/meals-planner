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

function uniqueStrings(arr: string[]) {
    return Array.from(new Set(arr.filter(Boolean)));
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
        const { authUserId, text } = (await req.json()) as {
            authUserId?: string;
            text: string;
        };

        if (!authUserId || !text) {
            return NextResponse.json({ error: "Missing authUserId or text" }, { status: 400 });
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

        // 2) Extract structured onboarding info from free text
        const model = new ChatOpenAI({ model: process.env.OPENAI_MODEL ?? "gpt-4o-mini", temperature: 0 });
        const extractor = model.withStructuredOutput(AgentOnboardingInputSchema);
        const parsed = await extractor.invoke([
            {
                role: "system",
                content:
                    "You extract user onboarding details for a weekly meal planner. Return only the structured fields. If unsure, omit.",
            },
            { role: "user", content: text },
        ] as any);

        // 3) Merge
        const nowIso = new Date().toISOString();

        const prev = (existing as any) as UserProfile | null;

        const newPeople: Person[] = (parsed.household?.people ?? []).map((p) => ({
            id: generateId(),
            gender: p.gender ?? undefined,
            estimatedAge: p.estimatedAge ?? undefined,
            role: p.role,
        }));
        const newPets: Pet[] = (parsed.household?.pets ?? []).map((p) => ({
            id: generateId(),
            animal: p.animal,
            name: p.name ?? null,
        }));

        const merged: UserProfile = {
            id: prev?.id ?? generateId(),
            authUserId: resolvedAuthUserId!,
            // Prefer auth identity for display name; fall back to previous or parsed
            displayName: displayNameFromAuth ?? prev?.displayName ?? parsed.displayName ?? "",
            locale: prev?.locale,
            timeZone: FIXED_TIME_ZONE,
            location: FIXED_LOCATION,
            household: {
                people: [...(prev?.household?.people ?? []), ...newPeople],
                pets: [...(prev?.household?.pets ?? []), ...newPets],
            },
            dietaryRestrictions: uniqueStrings([
                ...((prev?.dietaryRestrictions as string[]) ?? []),
                ...((parsed.dietaryRestrictions as string[]) ?? []),
            ]),
            favoriteFoods: uniqueStrings([
                ...((prev?.favoriteFoods as string[]) ?? []),
                ...((parsed.favoriteFoods as string[]) ?? []),
            ]),
            dislikedFoods: uniqueStrings([
                ...((prev?.dislikedFoods as string[]) ?? []),
                ...((parsed.dislikedFoods as string[]) ?? []),
            ]),
            goals: uniqueStrings([
                ...((prev?.goals as string[]) ?? []),
                ...((parsed.goals as string[]) ?? []),
            ]),
            createdAt: prev?.createdAt ?? nowIso,
            updatedAt: nowIso,
            rawOnboarding: { ...(prev?.rawOnboarding ?? {}), lastText: text },
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
