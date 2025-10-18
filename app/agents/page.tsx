"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { createBrowserClient } from "@/lib/supabase/client";

type ChatMessage = {
    role: "user" | "agent" | "system";
    text: string;
    at: number;
};

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString();
}

function computeNextMondayISO(): string {
    const d = new Date();
    const day = d.getDay(); // 0=Sun..6=Sat
    const daysToAdd = (8 - (day || 7)) % 7; // days until next Monday
    d.setDate(d.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
    return d.toISOString().slice(0, 10);
}

function ChatWindow(props: {
    title: string;
    description?: string;
    messages: ChatMessage[];
    input: string;
    onInputChange: (v: string) => void;
    onSend: () => void;
}) {
    const { title, description, messages, input, onInputChange, onSend } = props;
    return (
        <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-semibold">{title}</h2>
            </div>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            <Separator />
            <div className="min-h-[220px] max-h-[360px] overflow-y-auto rounded-md border p-3">
                {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {messages.map((m, idx) => (
                            <li key={idx} className="text-sm">
                                <span className="mr-2 rounded px-1 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    {m.role}
                                </span>
                                <span>{m.text}</span>
                                <span className="ml-2 text-[10px] text-muted-foreground">{formatTime(m.at)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="flex items-center gap-2">
                <Input
                    aria-label={`${title} message`}
                    placeholder="Escribe tu mensaje..."
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            onSend();
                        }
                    }}
                />
                <Button
                    aria-label={`Enviar a ${title}`}
                    tabIndex={0}
                    onClick={onSend}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") onSend();
                    }}
                >
                    Enviar
                </Button>
            </div>
        </Card>
    );
}

export default function AgentsPlaygroundPage() {
    const [authUserId, setAuthUserId] = useState<string>("demo-user-1");
    const [profileId, setProfileId] = useState<string | null>(null);
    const [weekStartDate, setWeekStartDate] = useState<string>(computeNextMondayISO());

    // Onboarding chat state
    const [onboardingMessages, setOnboardingMessages] = useState<ChatMessage[]>([]);
    const [onboardingInput, setOnboardingInput] = useState<string>("");
    const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);

    // Planner chat state
    const [plannerMessages, setPlannerMessages] = useState<ChatMessage[]>([]);
    const [plannerInput, setPlannerInput] = useState<string>("");

    // Try to hydrate authUserId from current session; fallback to demo value
    useEffect(() => {
        const supabase = createBrowserClient();
        let mounted = true;
        (async () => {
            const { data } = await supabase.auth.getUser();
            if (mounted) {
                if (data?.user?.id) {
                    console.log("[agents] session detected on mount", data.user.id);
                    setAuthUserId(data.user.id);
                } else {
                    console.log("[agents] no session on mount");
                }
            }
        })();
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user?.id) {
                console.log("[agents] auth state:", event, session.user.id);
                setAuthUserId(session.user.id);
            } else {
                console.log("[agents] auth state:", event, "no session");
            }
        });
        return () => {
            mounted = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    const handleSendOnboarding = useCallback(async () => {
        const text = onboardingInput.trim();
        if (!text) return;
        setOnboardingMessages((m) => [...m, { role: "user", text, at: Date.now() }]);
        setOnboardingInput("");
        try {
            const res = await fetch("/api/onboarding/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ authUserId, text }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Request failed");
            setOnboardingMessages((m) => [
                ...m,
                {
                    role: "agent",
                    text: json.completed
                        ? "Perfil actualizado y completo."
                        : "Perfil actualizado, aún faltan datos.",
                    at: Date.now(),
                },
            ]);
            if (json?.profile?.id) setProfileId(json.profile.id);
            if (typeof json?.completed === "boolean") setOnboardingCompleted(json.completed);
        } catch (err: any) {
            setOnboardingMessages((m) => [
                ...m,
                { role: "system", text: err.message || "Error", at: Date.now() },
            ]);
        }
    }, [authUserId, onboardingInput]);

    const handleSendPlanner = useCallback(async () => {
        const text = plannerInput.trim();
        if (!text) return;
        setPlannerMessages((m) => [...m, { role: "user", text, at: Date.now() }]);
        setPlannerInput("");
        try {
            const userId = profileId ?? authUserId; // fallback for early testing
            const res = await fetch("/api/planner/step", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, weekStartDate, query: text }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Request failed");
            setPlannerMessages((m) => [
                ...m,
                { role: "agent", text: json.message || "Plan actualizado.", at: Date.now() },
            ]);
        } catch (err: any) {
            setPlannerMessages((m) => [
                ...m,
                { role: "system", text: err.message || "Error", at: Date.now() },
            ]);
        }
    }, [profileId, plannerInput, weekStartDate]);

    const header = useMemo(
        () => (
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Agents Playground</h1>
                    <p className="text-sm text-muted-foreground">
                        Dos chats: Onboarding de perfil y Planificador semanal.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        className="w-[240px]"
                        aria-label="Auth User Id"
                        placeholder="authUserId"
                        value={authUserId}
                        onChange={(e) => setAuthUserId(e.target.value)}
                    />
                    <Input
                        className="w-[240px]"
                        aria-label="Profile Id (opcional)"
                        placeholder="profileId (opcional)"
                        value={profileId ?? ""}
                        onChange={(e) => setProfileId(e.target.value || null)}
                    />
                    <Input
                        className="w-[160px]"
                        aria-label="Week start date"
                        placeholder="YYYY-MM-DD"
                        value={weekStartDate}
                        onChange={(e) => setWeekStartDate(e.target.value)}
                    />
                </div>
            </div>
        ),
        [authUserId, profileId, weekStartDate]
    );

    return (
        <div className="mx-auto w-full max-w-6xl p-4">
            {header}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ChatWindow
                    title="Onboarding Agent"
                    description={onboardingCompleted ? "Perfil completo" : "Completar perfil"}
                    messages={onboardingMessages}
                    input={onboardingInput}
                    onInputChange={setOnboardingInput}
                    onSend={handleSendOnboarding}
                />
                <ChatWindow
                    title="Meal Planner"
                    description="Itera el plan semanal (10 comidas)."
                    messages={plannerMessages}
                    input={plannerInput}
                    onInputChange={setPlannerInput}
                    onSend={handleSendPlanner}
                />
            </div>
        </div>
    );
}
