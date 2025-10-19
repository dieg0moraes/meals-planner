"use client"

import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { useEntities } from "@/components/entities-provider"
import { useFlashOnChange } from "@/hooks/use-flash-on-change"
import { ShoppingCartModal } from "@/components/shopping-cart-modal"
import type { ShoppingListItem } from "@/types"
import type { ShoppingCart, SearchResponse, OptimizeResponse, OptimizeError } from "@/types/products"
import { ShoppingCart as ShoppingCartIcon, Loader2, RefreshCw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useApplication } from "@/components/application-provider"
import { createBrowserClient } from "@/lib/supabase/client"

export default function MiListaComprasPage() {
  const { shoppingList, weeklyMeals, profile } = useEntities()
  const items = (shoppingList?.items ?? []) as ShoppingListItem[]
  const listFlash = useFlashOnChange(JSON.stringify(items.map(it => ({ id: it.id, name: it.name, q: it.quantity, u: it.unit }))))
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loading] = useState(false)
  const [carts, setCarts] = useState<ShoppingCart[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFindProducts = async (forceRefresh = false) => {
    if (items.length === 0) {
      return
    }

    // Si ya tenemos carts y no es un refresh forzado, solo abrimos el modal
    if (carts.length > 0 && !forceRefresh) {
      setModalOpen(true)
      return
    }

    setLoading(true);
    setError(null)

    try {
      console.log('[compras] Buscando productos para', items.length, 'ingredientes')

      // 1. Buscar productos para cada ingrediente
      const searchPromises = items.map(async (item) => {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(item.name)}`)
        const data: SearchResponse = await response.json()

        return {
          ingredient: item.name,
          quantity: item.quantity,
          unit: item.unit,
          products: data.success ? data.products : []
        }
      })

      const ingredientsWithProducts = await Promise.all(searchPromises)
      console.log('[compras] Productos encontrados:', ingredientsWithProducts)

      // 2. Optimizar selección con LLM
      const optimizeResponse = await fetch('/api/shopping-list/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredientsWithProducts
        })
      })

      const optimizeData: OptimizeResponse | OptimizeError = await optimizeResponse.json()

      if (!optimizeData.success) {
        throw new Error('message' in optimizeData ? optimizeData.message : 'Error al optimizar')
      }

      console.log('[compras] Carritos optimizados:', optimizeData.carts)
      setCarts(optimizeData.carts)
      setModalOpen(true)

    } catch (err) {
      console.error('[compras] Error:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false);
    }
  }

  const kickoffDoneRef = useRef(false)
  const { setLoading } = useApplication()
  const [saving, setSaving] = useState<string | null>(null)

  const handleToggleChecked = async (itemId: string) => {
    if (!shoppingList?.id || !profile?.id) return
    const supabase = createBrowserClient()
    const newItems: ShoppingListItem[] = items.map((it) =>
      it.id === itemId ? { ...it, checked: !it.checked } : it
    )
    // Optimistic UI: mark as saving to disable checkbox
    setSaving(itemId)
    try {
      const { error } = await supabase
        .from("shopping_lists")
        .update({ items: newItems as any })
        .eq("id", shoppingList.id)
        .eq("user_id", profile.id)
      if (error) throw error
    } finally {
      setSaving(null)
    }
  }

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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lista de compras</h1>
          <p className="text-sm text-muted-foreground">Tus items actuales para esta semana</p>
        </div>
        {items.length > 0 && (
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={() => handleFindProducts(false)}
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : carts.length > 0 ? (
                <>
                  <ShoppingCartIcon className="mr-2 h-4 w-4" />
                  Ver Carritos
                </>
              ) : (
                <>
                  <ShoppingCartIcon className="mr-2 h-4 w-4" />
                  Cotizar Productos
                </>
              )}
            </Button>
            {carts.length > 0 && !loading && (
              <Button
                onClick={() => handleFindProducts(true)}
                disabled={loading}
                size="lg"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <Card className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 border-red-200">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {items.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">No hay items aún.</Card>
      ) : (
        <div className={`space-y-3 transition-all ${listFlash ? 'animate-slide-up' : ''}`}> 
          {items.map((it, i) => {
            const key = it.id || `${it.name}-${i}`
            const isChecked = !!it.checked
            return (
              <Card key={key} className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={key}
                    checked={isChecked}
                    onCheckedChange={() => it.id && handleToggleChecked(it.id)}
                    disabled={saving === it.id}
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

      <ShoppingCartModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        carts={carts}
      />
    </div>
  )
}


