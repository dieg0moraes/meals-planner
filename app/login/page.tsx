"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
                options: { redirectTo: `${location.origin}/auth/callback` },
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
        <div className="min-h-screen w-full bg-black text-white flex items-center justify-center px-6">
            <Card className="w-full max-w-lg bg-neutral-950/60 border-white/10">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl text-white">Iniciá sesión</CardTitle>
                    <CardDescription className="text-neutral-300">con tu cuenta de Google</CardDescription>
                </CardHeader>
                <div className="px-6 pb-6">
                    {user ? (
                        <div className="mt-2 space-y-3 text-sm text-center">
                            <p className="text-neutral-300">Sesión iniciada como</p>
                            <p className="font-mono text-xs text-neutral-200">{user.email ?? user.id}</p>
                            <Button onClick={handleSignOut} variant="outline" className="w-full border-neutral-700 text-white hover:bg-neutral-800">
                                Cerrar sesión
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                variant="outline"
                                aria-label="Continuar con Google"
                                className="inline-flex w-full items-center justify-center gap-2 border border-neutral-700 bg-neutral-900 text-white cursor-pointer hover:bg-neutral-900 hover:border-neutral-600 hover:text-neutral-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                                </svg>
                                {loading ? "Redirigiendo..." : "Continuar con Google"}
                            </Button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
