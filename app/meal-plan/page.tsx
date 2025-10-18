import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import Image from "next/image"

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const mealTypes = ["Breakfast", "Lunch", "Dinner"]

const sampleMeals = {
  Monday: {
    Breakfast: {
      name: "Greek Yogurt Bowl",
      ingredients: "200g Greek yogurt, Mixed berries",
    },
    Lunch: {
      name: "Grilled Chicken Salad",
      ingredients: "150g Chicken breast, Mixed greens",
    },
    Dinner: {
      name: "Grilled Salmon with Asparagus",
      ingredients: "200g Salmon, 1 bunch Asparagus",
    },
  },
  Tuesday: {
    Breakfast: {
      name: "Avocado Toast",
      ingredients: "2 slices bread, 1 Avocado",
    },
    Lunch: { name: "Quinoa Buddha Bowl", ingredients: "1 cup Quinoa, Veggies" },
    Dinner: {
      name: "Chicken Stir-Fry",
      ingredients: "200g Chicken, Mixed vegetables",
    },
  },
  Wednesday: {
    Breakfast: {
      name: "Protein Smoothie",
      ingredients: "Protein powder, Banana, Spinach",
    },
    Lunch: {
      name: "Turkey Wrap",
      ingredients: "100g Turkey, Whole wheat wrap",
    },
    Dinner: {
      name: "Baked Cod with Broccoli",
      ingredients: "200g Cod, 1 head Broccoli",
    },
  },
  Thursday: {
    Breakfast: {
      name: "Scrambled Eggs",
      ingredients: "3 Eggs, Cherry tomatoes",
    },
    Lunch: {
      name: "Lentil Soup",
      ingredients: "1 cup Lentils, Vegetables",
    },
    Dinner: {
      name: "Beef Tacos",
      ingredients: "200g Ground beef, Taco shells",
    },
  },
  Friday: {
    Breakfast: {
      name: "Oatmeal with Berries",
      ingredients: "1 cup Oats, Mixed berries",
    },
    Lunch: {
      name: "Caprese Sandwich",
      ingredients: "Mozzarella, Tomatoes, Basil",
    },
    Dinner: {
      name: "Shrimp Pasta",
      ingredients: "200g Shrimp, Whole wheat pasta",
    },
  },
  Saturday: {
    Breakfast: {
      name: "Pancakes",
      ingredients: "Whole wheat flour, Eggs, Milk",
    },
    Lunch: {
      name: "Chicken Caesar Salad",
      ingredients: "150g Chicken, Romaine lettuce",
    },
    Dinner: {
      name: "Grilled Steak",
      ingredients: "200g Steak, Sweet potato",
    },
  },
  Sunday: {
    Breakfast: {
      name: "French Toast",
      ingredients: "2 slices bread, Eggs, Cinnamon",
    },
    Lunch: { name: "Veggie Pizza", ingredients: "Pizza dough, Vegetables" },
    Dinner: {
      name: "Roasted Chicken",
      ingredients: "1 whole Chicken, Root vegetables",
    },
  },
}

export default function MealPlanPage() {
  return (
    <div className="p-6 md:p-8 overflow-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-2">Weekly Meal Plan</h1>
        <p className="text-muted-foreground">Your personalized meal schedule for the week</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {daysOfWeek.map((day) => (
          <Card key={day} className="border-2">
            <CardHeader className="bg-emerald-50 border-b">
              <CardTitle className="text-xl text-emerald-900">{day}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {mealTypes.map((mealType) => {
                const meal =
                  sampleMeals[day as keyof typeof sampleMeals][mealType as keyof (typeof sampleMeals)["Monday"]]
                return (
                  <div key={mealType} className="border rounded-lg p-3 hover:border-emerald-200 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                        <Image
                          src={`/.jpg?height=80&width=80&query=${encodeURIComponent(meal.name)}`}
                          alt={meal.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <p className="text-xs font-medium text-emerald-600 uppercase">{mealType}</p>
                            <h3 className="font-semibold text-sm leading-tight">{meal.name}</h3>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span className="sr-only">Swap meal</span>
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{meal.ingredients}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
