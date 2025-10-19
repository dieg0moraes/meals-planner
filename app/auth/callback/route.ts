import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    // Default redirect after processing
    let response = NextResponse.redirect(new URL("/", req.url));

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return req.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    try {
        if (code) {
            await supabase.auth.exchangeCodeForSession(code);
        } else {
            // Fallback: try to hydrate user if cookies already set
            await supabase.auth.getUser();
        }
    } catch (e) {
        // Ignore and continue to redirect; the home page will handle unauthenticated state
        console.warn("[auth/callback] exchange error", e);
    }

    return response;
}


