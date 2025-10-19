import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
                },
            },
        }
    );

    const { data } = await supabase.auth.getUser();
    const hasSession = !!data?.user;

    const { pathname, searchParams } = request.nextUrl;
    const isPublicPath = pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/auth/callback");
    // Allow OAuth callback hits to land (Supabase appends ?code=...&state=...)
    const isOAuthCallback = searchParams.has("code") || searchParams.has("state") || searchParams.has("access_token");

    if (!hasSession && !isPublicPath) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        // If OAuth params are present, preserve them so Home can complete the flow
        if (!isOAuthCallback) {
            url.search = "";
        }
        const redirectRes = NextResponse.redirect(url);
        // Copy cookies that may have been set during code exchange onto the redirect response
        response.cookies.getAll().forEach((cookie) => {
            redirectRes.cookies.set(cookie);
        });
        return redirectRes;
    }

    return response;
}

export const config = {
    // Exclude Next internals, static files and API routes from middleware
    matcher: ["/((?!_next|static|.*\\..*|api).*)"],
};


