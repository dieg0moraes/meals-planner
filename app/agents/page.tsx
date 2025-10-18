"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { createBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import type { Meal, WeeklyMeals } from "@/types";

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
    const { user } = useAuth();
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
    const [weeklyMeals, setWeeklyMeals] = useState<WeeklyMeals | null>(null);

    // Hydrate from auth context
    useEffect(() => {
        if (user?.id) setAuthUserId(user.id);
    }, [user?.id]);

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
            if (json.weeklyMeals) {
                setWeeklyMeals(json.weeklyMeals as WeeklyMeals);
                if (!profileId && json.weeklyMeals.user_id) setProfileId(json.weeklyMeals.user_id as string);
            }
        } catch (err: any) {
            setPlannerMessages((m) => [
                ...m,
                { role: "system", text: err.message || "Error", at: Date.now() },
            ]);
        }
    }, [profileId, plannerInput, weekStartDate, authUserId]);

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

    // Subscribe to weekly_meals changes for the selected profile/week
    useEffect(() => {
        const supabase = createBrowserClient();
        let active = true;

        async function ensureProfileId(): Promise<string | null> {
            if (profileId) return profileId;
            if (!authUserId) return null;
            const { data } = await supabase
                .from("profiles")
                .select("id")
                .eq("auth_user_id", authUserId)
                .maybeSingle();
            if (data?.id && active) setProfileId(data.id as string);
            return (data?.id as string) ?? null;
        }

        async function run() {
            if (!weekStartDate) return;
            const pid = await ensureProfileId();
            if (!pid) return;

            const { data } = await supabase
                .from("weekly_meals")
                .select("*")
                .eq("user_id", pid)
                .eq("week_start_date", weekStartDate)
                .maybeSingle();
            if (active && data) setWeeklyMeals(data as unknown as WeeklyMeals);

            const channel = supabase
                .channel(`weekly_meals:${pid}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'weekly_meals', filter: `user_id=eq.${pid}` },
                    (payload) => {
                        const row = (payload.new ?? payload.old) as any;
                        if (!row) return;
                        if (row.week_start_date === weekStartDate) {
                            setWeeklyMeals(payload.new as unknown as WeeklyMeals);
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }

        let cleanup: (() => void) | undefined;
        run().then((fn) => {
            cleanup = fn as any;
        });
        return () => {
            active = false;
            if (cleanup) cleanup();
        };
    }, [profileId, authUserId, weekStartDate]);

    function WeeklyMealsView({ plan }: { plan: WeeklyMeals }) {
        const meals = (plan.meals ?? []) as Meal[];
        const target = plan.targetMealsCount ?? meals.length;
        return (
            <Card className="mt-4 p-4">
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Plan semanal</h3>
                    <span className="text-sm text-muted-foreground">
                        Objetivo: {target} · Actual: {meals.length}
                    </span>
                </div>
                {meals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin comidas todavía.</p>
                ) : (
                    <ul className="space-y-2 text-sm">
                        {meals.map((m, i) => (
                            <li key={m.id ?? i} className="rounded border p-2">
                                <div className="font-medium">{i + 1}. {m.name}</div>
                                <div className="text-xs text-muted-foreground">
                                    {m.ingredients?.length ?? 0} ingredientes · {m.tags?.join(', ') || 'sin tags'}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        );
    }

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
                <div className="md:col-span-2">
                    {weeklyMeals ? (
                        <WeeklyMealsView plan={weeklyMeals} />
                    ) : (
                        <Card className="mt-4 p-4 text-sm text-muted-foreground">
                            Conectando al plan semanal...
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}


