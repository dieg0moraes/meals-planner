import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import type { ShoppingList, UserProfile, WeeklyMeals } from "@/types";
import { runShoppingListStep } from "@/lib/agent/shopping-list-builder";

export async function POST(_req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Profile by auth user
    const { data: profileRow, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("auth_user_id", auth.user.id)
      .maybeSingle();
    if (pErr || !profileRow) throw new Error(pErr?.message || "Profile not found");
    const profile = profileRow as unknown as UserProfile;

    // Latest weekly meals (if any)
    const { data: weeklyRow } = await supabase
      .from("weekly_meals")
      .select("*")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const weekly = (weeklyRow as unknown as WeeklyMeals | null) ?? null;

    // Latest shopping list (if any)
    const { data: listRow } = await supabase
      .from("shopping_lists")
      .select("*")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const existing = (listRow as unknown as ShoppingList | null) ?? null;

    const out = await runShoppingListStep({
      profile,
      weeklyMeals: weekly ?? undefined,
      existingList: existing ?? undefined,
      query: undefined,
    });

    const upsertPayload = {
      id: existing?.id,
      user_id: profile.id,
      week_meals_id: weekly?.id ?? (existing as any)?.week_meals_id ?? null,
      items: out.items ?? [],
    } as any;

    const { error: upErr } = await supabase.from("shopping_lists").upsert(upsertPayload);
    if (upErr) throw new Error(upErr.message);

    const { data: saved, error: selErr } = await supabase
      .from("shopping_lists")
      .select("*")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();
    if (selErr) throw new Error(selErr.message);

    return NextResponse.json({ message: "Lista generada.", shoppingList: saved });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "Kickoff failed" }, { status: 400 });
  }
}


