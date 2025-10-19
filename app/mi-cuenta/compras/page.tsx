"use client"

import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useEntities } from "@/components/entities-provider"
import { useFlashOnChange } from "@/hooks/use-flash-on-change"
import type { ShoppingListItem } from "@/types"
import { useEffect, useRef, useState } from "react"
import { useApplication } from "@/components/application-provider"

export default function MiListaComprasPage() {
  const { shoppingList, weeklyMeals } = useEntities()
  const items = (shoppingList?.items ?? []) as ShoppingListItem[]
  const listFlash = useFlashOnChange(JSON.stringify(items.map(it => ({ id: it.id, name: it.name, q: it.quantity, u: it.unit }))))
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const kickoffDoneRef = useRef(false)
  const { setLoading } = useApplication()

  useEffect(() => {
    if (kickoffDoneRef.current) return
    const hasMeals = (weeklyMeals?.meals?.length ?? 0) > 0
    const isListEmpty = (shoppingList?.items?.length ?? 0) === 0
    if (hasMeals && isListEmpty) {
      kickoffDoneRef.current = true
      ;(async () => {
        try {
          setLoading(true)
          await fetch('/api/shopping-list/kickoff', { method: 'POST' })
        } catch {}
        finally { setLoading(false) }
      })()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shoppingList?.items?.length, weeklyMeals?.meals?.length])
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Lista de compras</h1>
        <p className="text-sm text-muted-foreground">Tus items actuales para esta semana</p>
      </div>
      {items.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">No hay items aún.</Card>
      ) : (
        <div className={`space-y-3 transition-all ${listFlash ? 'animate-slide-up' : ''}`}> 
          {items.map((it, i) => {
            const key = it.id || `${it.name}-${i}`
            const isChecked = !!checked[key]
            return (
              <Card key={key} className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={key}
                    checked={isChecked}
                    onCheckedChange={() => setChecked((c) => ({ ...c, [key]: !c[key] }))}
                    className="mt-0.5"
                  />
                  <label htmlFor={key} className="flex-1 cursor-pointer select-none">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={`font-medium ${isChecked ? 'line-through text-muted-foreground' : ''}`}>{it.name}</span>
                      <span className="text-sm text-muted-foreground">{it.quantity} {it.unit}</span>
                    </div>
                    {it.notes && <p className="text-xs text-muted-foreground mt-1">{it.notes}</p>}
                  </label>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}


