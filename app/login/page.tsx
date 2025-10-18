"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

    useEffect(() => {
        const supabase = createBrowserClient();
        let mounted = true;
        (async () => {
            const { data } = await supabase.auth.getUser();
            if (mounted && data?.user) setUser({ id: data.user.id, email: data.user.email ?? undefined });
        })();
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            if (session?.user) setUser({ id: session.user.id, email: session.user.email ?? undefined });
            else setUser(null);
        });
        return () => {
            mounted = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const supabase = createBrowserClient();
            await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${location.origin}/agents` },
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        const supabase = createBrowserClient();
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center p-6">
            <Card className="flex w-full flex-col gap-4 p-6 text-center">
                <h1 className="text-xl font-semibold">Sign in</h1>
                {user ? (
                    <div className="space-y-2 text-sm">
                        <p>Signed in as</p>
                        <p className="font-mono text-xs">{user.email ?? user.id}</p>
                        <Button onClick={handleSignOut} variant="secondary">
                            Sign out
                        </Button>
                    </div>
                ) : (
                    <Button onClick={handleGoogleSignIn} disabled={loading} aria-label="Sign in with Google">
                        {loading ? "Redirecting..." : "Continue with Google"}
                    </Button>
                )}
            </Card>
        </div>
    );
}


