import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();

        // Get authenticated session user
        const { data: authData } = await supabase.auth.getUser();
        const sessionUser = authData?.user ?? null;

        if (!sessionUser) {
            return NextResponse.json({
                error: "Authentication required"
            }, { status: 401 });
        }

        const authUserId = sessionUser.id;

        // Check if profile exists before deleting
        const { data: existing, error: checkErr } = await supabase
            .from("profiles")
            .select("id, auth_user_id")
            .eq("auth_user_id", authUserId)
            .maybeSingle();

        if (checkErr) throw new Error(checkErr.message);

        if (!existing) {
            return NextResponse.json({
                success: true,
                message: "No profile to delete"
            });
        }

        // Delete the profile using the service role to bypass RLS
        const { count, error: deleteErr } = await supabase
            .from("profiles")
            .delete({ count: 'exact' })
            .eq("id", existing.id);

        if (deleteErr) throw new Error(deleteErr.message);

        return NextResponse.json({
            success: true,
            message: "Profile deleted successfully",
            deleted: count ?? 0
        });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message ?? "Profile reset failed" },
            { status: 400 }
        );
    }
}
