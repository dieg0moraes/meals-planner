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
    <div className="p-6 md:p-8 overflow-auto">
      <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
          Shopping List
        </h1>
        <p className="text-lg text-muted-foreground mb-6">All ingredients needed for your weekly meal plan</p>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="gap-2 bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all-smooth hover-lift"
          >
            <Printer className="h-4 w-4" />
            Print List
          </Button>
          <Button
            variant="outline"
            className="gap-2 bg-transparent hover:bg-accent/10 hover:text-accent hover:border-accent/40 transition-all-smooth hover-lift"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            variant="outline"
            className="gap-2 bg-transparent hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/40 transition-all-smooth hover-lift"
          >
            <FileDown className="h-4 w-4" />
            Export to PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(shoppingData).map(([category, items], categoryIndex) => (
          <Card
            key={category}
            className="border-2 hover:border-accent/40 hover-lift animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${categoryIndex * 100}ms` }}
          >
            <CardHeader className="bg-gradient-to-r from-accent/10 to-emerald-100/50 border-b border-accent/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold bg-gradient-to-r from-accent to-emerald-700 bg-clip-text text-transparent">
                  {category}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllInCategory(category)}
                  className="text-accent hover:text-emerald-700 hover:bg-accent/10 transition-all-smooth hover-scale"
                >
                  Mark all
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {items.map((item, itemIndex) => {
                  const key = `${category}-${item.name}`
                  const isChecked = checkedItems[key] || false
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/5 transition-all-smooth animate-in fade-in slide-in-from-left-4 duration-300"
                      style={{ animationDelay: `${categoryIndex * 100 + itemIndex * 50}ms` }}
                    >
                      <Checkbox
                        id={key}
                        checked={isChecked}
                        onCheckedChange={() => toggleItem(category, item.name)}
                        className="mt-1 data-[state=checked]:bg-accent data-[state=checked]:border-accent transition-all-smooth"
                      />
                      <label htmlFor={key} className="flex-1 cursor-pointer select-none">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={`font-medium transition-all-smooth ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}
                          >
                            {item.name}
                          </span>
                          <span
                            className={`text-sm whitespace-nowrap transition-all-smooth ${isChecked ? "text-muted-foreground" : "text-accent font-semibold"}`}
                          >
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                        {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
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
