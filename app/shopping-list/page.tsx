"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Printer, Share2, FileDown } from "lucide-react"
import { getShoppingList, groupShoppingItemsByCategory } from "@/lib/data/queries"
import type { ShoppingListItem } from "@/types"

export default function ShoppingListPage() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [shoppingData, setShoppingData] = useState<Record<string, ShoppingListItem[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const items = await getShoppingList()
        const grouped = groupShoppingItemsByCategory(items)
        setShoppingData(grouped)
      } catch (error) {
        console.error("[v0] Error fetching shopping list:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const toggleItem = (category: string, itemName: string) => {
    const key = `${category}-${itemName}`
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const markAllInCategory = (category: string) => {
    const newChecked = { ...checkedItems }
    shoppingData[category]?.forEach((item) => {
      newChecked[`${category}-${item.name}`] = true
    })
    setCheckedItems(newChecked)
  }

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">Shopping List</h1>
          <p className="text-muted-foreground">Loading your shopping list...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 md:p-12 overflow-auto bg-gradient-to-br from-background via-background to-success/5">
      <div className="mb-12 animate-slide-up max-w-7xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-bold gradient-text-accent mb-3 tracking-tight">Shopping List</h1>
        <p className="text-xl text-muted-foreground mb-8 font-light">
          All ingredients needed for your weekly meal plan
        </p>

        <div className="flex flex-wrap gap-4">
          <Button
            variant="outline"
            className="gap-2 bg-white/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all hover-lift-subtle shadow-sm px-6 py-5 text-base"
          >
            <Printer className="h-5 w-5" />
            Print List
          </Button>
          <Button
            variant="outline"
            className="gap-2 bg-white/50 hover:bg-accent/10 hover:text-accent hover:border-accent/50 transition-all hover-lift-subtle shadow-sm px-6 py-5 text-base"
          >
            <Share2 className="h-5 w-5" />
            Share
          </Button>
          <Button
            variant="outline"
            className="gap-2 bg-white/50 hover:bg-success/10 hover:text-success hover:border-success/50 transition-all hover-lift-subtle shadow-sm px-6 py-5 text-base"
          >
            <FileDown className="h-5 w-5" />
            Export to PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        {Object.entries(shoppingData).map(([category, items], categoryIndex) => (
          <Card
            key={category}
            className="glass-card border-2 hover:border-success/50 hover-lift-subtle animate-scale-in shadow-lg overflow-hidden"
            style={{ animationDelay: `${categoryIndex * 80}ms` }}
          >
            <CardHeader className="bg-gradient-to-r from-success/15 to-accent/10 border-b-2 border-success/20 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold gradient-text-accent">{category}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllInCategory(category)}
                  className="text-success hover:text-success/80 hover:bg-success/10 transition-all hover-scale-subtle px-4 py-2"
                >
                  Mark all
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {items.map((item, itemIndex) => {
                  const key = `${category}-${item.name}`
                  const isChecked = checkedItems[key] || false
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 p-3 rounded-lg hover:bg-success/5 transition-all animate-slide-up"
                      style={{ animationDelay: `${categoryIndex * 80 + itemIndex * 40}ms` }}
                    >
                      <Checkbox
                        id={key}
                        checked={isChecked}
                        onCheckedChange={() => toggleItem(category, item.name)}
                        className="mt-1 data-[state=checked]:bg-success data-[state=checked]:border-success transition-all h-5 w-5"
                      />
                      <label htmlFor={key} className="flex-1 cursor-pointer select-none">
                        <div className="flex items-baseline justify-between gap-3">
                          <span
                            className={`font-medium text-base transition-all ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}
                          >
                            {item.name}
                          </span>
                          <span
                            className={`text-sm whitespace-nowrap font-semibold transition-all ${isChecked ? "text-muted-foreground" : "text-success"}`}
                          >
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                        {item.notes && <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>}
                      </label>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
