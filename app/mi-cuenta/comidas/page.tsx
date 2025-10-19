"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useEntities } from "@/components/entities-provider"
import { useFlashOnChange } from "@/hooks/use-flash-on-change"
import type { Meal } from "@/types"
import { ChevronDown } from "lucide-react"
import { useApplication } from "@/components/application-provider"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function MiComidasPage() {
    const router = useRouter()
    const { weeklyMeals, shoppingList } = useEntities()
    const meals = (weeklyMeals?.meals ?? []) as Meal[]
    const [open, setOpen] = useState<Record<string, boolean>>({})
    const toggle = (id: string) => setOpen((m) => ({ ...m, [id]: !m[id] }))
    const target = weeklyMeals?.targetMealsCount ?? meals.length
    const listFlash = useFlashOnChange(JSON.stringify(meals.map(m => ({ id: m.id, name: m.name, ingredients: m.ingredients }))))
    const kickoffDoneRef = useRef(false)
    const { setLoading } = useApplication()
    const isShoppingListEmpty = (shoppingList?.items?.length ?? 0) === 0

    useEffect(() => {
        if (kickoffDoneRef.current) return
        if (meals.length > 0) return
        kickoffDoneRef.current = true
            ; (async () => {
                try {
                    setLoading(true)
                    // Server resolves user from auth cookie; no userId needed
                    await fetch('/api/planner/kickoff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
                } catch { }
                finally { setLoading(false) }
            })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meals.length])
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Comidas</h1>
                <p className="text-sm text-muted-foreground">Plan semanal actual · {target} comidas</p>
            </div>
            {meals.length === 0 ? (
                <Card className="p-4 text-sm text-muted-foreground">No hay comidas todavía.</Card>
            ) : (
                <div className={`space-y-3 transition-all ${listFlash ? 'animate-slide-up' : ''}`}>
                    {meals.map((m, i) => {
                        const id = m.id || String(i)
                        const isOpen = !!open[id]
                        const ingredientCount = m.ingredients?.length ?? 0
                        return (
                            <Card key={id} className="p-0">
                                <button
                                    aria-expanded={isOpen}
                                    onClick={() => toggle(id)}
                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                                >
                                    <div>
                                        <div className="font-medium">{i + 1}. {m.name}</div>
                                        <div className="text-xs text-muted-foreground">{ingredientCount} ingredientes</div>
                                    </div>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isOpen ? (
                                    <div className="px-4 pb-4">
                                        <Separator className="my-2" />
                                        <ul className="space-y-2">
                                            {m.ingredients.map((ing, idx) => (
                                                <li key={`${id}-ing-${idx}`} className="flex items-start justify-between gap-3 rounded-md border p-2">
                                                    <div>
                                                        <div className="font-medium">
                                                            {ing.name}
                                                            {ing.isOptional ? <Badge variant="secondary" className="ml-2">Opcional</Badge> : null}
                                                        </div>
                                                        {ing.notes ? (
                                                            <div className="text-xs text-muted-foreground mt-0.5">{ing.notes}</div>
                                                        ) : null}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {ing.quantity} {ing.unit}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}
                            </Card>
                        )
                    })}
                    {isShoppingListEmpty ? (
                        <div className="pt-2">
                            <Separator className="my-4" />
                            <div className="flex items-center justify-center">
                                <Button
                                    aria-label="Aprobar comidas y crear lista"
                                    onClick={() => router.push('/mi-cuenta/compras')}
                                    className="px-6"
                                >
                                    Aprobar comidas y crear lista
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}


