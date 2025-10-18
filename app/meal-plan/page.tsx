import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import Image from "next/image"
import { getMealPlan, groupMealsByDay } from "@/lib/data/queries"

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default async function MealPlanPage() {
  const meals = await getMealPlan()
  const mealsByDay = groupMealsByDay(meals)

  return (
    <div className="p-6 md:p-8 overflow-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-2">Weekly Meal Plan</h1>
        <p className="text-muted-foreground">Your personalized meal schedule for the week</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {daysOfWeek.map((day) => {
          const dayMeals = mealsByDay[day] || []
          return (
            <Card key={day} className="border-2">
              <CardHeader className="bg-emerald-50 border-b">
                <CardTitle className="text-xl text-emerald-900">{day}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {dayMeals.map((meal) => (
                  <div key={meal.id} className="border rounded-lg p-3 hover:border-emerald-200 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                        <Image
                          src={`/.jpg?height=80&width=80&query=${encodeURIComponent(meal.image_query)}`}
                          alt={meal.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <p className="text-xs font-medium text-emerald-600 uppercase">{meal.meal_type}</p>
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
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
