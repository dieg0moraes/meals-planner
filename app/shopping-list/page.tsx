"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Printer, Share2, FileDown } from "lucide-react"
import { getShoppingList, groupShoppingItemsByCategory } from "@/lib/data/queries"
import type { ShoppingItem } from "@/lib/data/mock-data"

export default function ShoppingListPage() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [shoppingData, setShoppingData] = useState<Record<string, ShoppingItem[]>>({})
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
    <div className="p-6 md:p-8 overflow-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-2">Shopping List</h1>
        <p className="text-muted-foreground mb-6">All ingredients needed for your weekly meal plan</p>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2 bg-transparent">
            <Printer className="h-4 w-4" />
            Print List
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent">
            <FileDown className="h-4 w-4" />
            Export to PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(shoppingData).map(([category, items]) => (
          <Card key={category} className="border-2">
            <CardHeader className="bg-emerald-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-emerald-900">{category}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllInCategory(category)}
                  className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100"
                >
                  Mark all as purchased
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {items.map((item) => {
                  const key = `${category}-${item.name}`
                  const isChecked = checkedItems[key] || false
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={key}
                        checked={isChecked}
                        onCheckedChange={() => toggleItem(category, item.name)}
                        className="mt-1"
                      />
                      <label htmlFor={key} className="flex-1 cursor-pointer select-none">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`font-medium ${isChecked ? "line-through text-muted-foreground" : ""}`}>
                            {item.name}
                          </span>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">{item.quantity}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">For {item.recipe}</p>
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
