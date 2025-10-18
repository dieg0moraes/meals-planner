"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Printer, Share2, FileDown } from "lucide-react"

const shoppingListData = {
  Produce: [
    { name: "Avocados", quantity: "2 units", recipe: "Avocado Toast" },
    { name: "Mixed Berries", quantity: "300g", recipe: "Greek Yogurt Bowl" },
    { name: "Asparagus", quantity: "1 bunch", recipe: "Grilled Salmon" },
    { name: "Broccoli", quantity: "1 head", recipe: "Baked Cod" },
    { name: "Cherry Tomatoes", quantity: "250g", recipe: "Scrambled Eggs" },
    { name: "Mixed Greens", quantity: "200g", recipe: "Chicken Salad" },
    { name: "Spinach", quantity: "100g", recipe: "Protein Smoothie" },
    { name: "Romaine Lettuce", quantity: "1 head", recipe: "Caesar Salad" },
  ],
  "Dairy & Eggs": [
    { name: "Greek Yogurt", quantity: "500g", recipe: "Yogurt Bowl" },
    { name: "Eggs", quantity: "12 units", recipe: "Multiple recipes" },
    { name: "Mozzarella", quantity: "200g", recipe: "Caprese Sandwich" },
    { name: "Milk", quantity: "1L", recipe: "Pancakes" },
  ],
  "Meat & Fish": [
    { name: "Salmon Fillets", quantity: "400g", recipe: "Grilled Salmon" },
    { name: "Chicken Breast", quantity: "800g", recipe: "Multiple recipes" },
    { name: "Cod Fillets", quantity: "400g", recipe: "Baked Cod" },
    { name: "Ground Beef", quantity: "400g", recipe: "Beef Tacos" },
    { name: "Shrimp", quantity: "400g", recipe: "Shrimp Pasta" },
    { name: "Turkey Slices", quantity: "200g", recipe: "Turkey Wrap" },
    { name: "Steak", quantity: "400g", recipe: "Grilled Steak" },
    { name: "Whole Chicken", quantity: "1 unit", recipe: "Roasted Chicken" },
  ],
  Pantry: [
    { name: "Quinoa", quantity: "500g", recipe: "Buddha Bowl" },
    { name: "Lentils", quantity: "300g", recipe: "Lentil Soup" },
    { name: "Whole Wheat Bread", quantity: "1 loaf", recipe: "Multiple recipes" },
    { name: "Oats", quantity: "500g", recipe: "Oatmeal" },
    { name: "Whole Wheat Pasta", quantity: "500g", recipe: "Shrimp Pasta" },
    { name: "Taco Shells", quantity: "1 pack", recipe: "Beef Tacos" },
    { name: "Pizza Dough", quantity: "1 unit", recipe: "Veggie Pizza" },
  ],
}

export default function ShoppingListPage() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  const toggleItem = (category: string, itemName: string) => {
    const key = `${category}-${itemName}`
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const markAllInCategory = (category: string) => {
    const newChecked = { ...checkedItems }
    shoppingListData[category as keyof typeof shoppingListData].forEach((item) => {
      newChecked[`${category}-${item.name}`] = true
    })
    setCheckedItems(newChecked)
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
        {Object.entries(shoppingListData).map(([category, items]) => (
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
                      key={item.name}
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
