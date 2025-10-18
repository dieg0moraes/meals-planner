import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw } from "lucide-react"
import Image from "next/image"
import { getMealPlan, groupMealsByDay } from "@/lib/data/queries"

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default async function MealPlanPage() {
  const meals = await getMealPlan()
  const mealsByDay = groupMealsByDay(meals)

  return (
    <div className="p-6 md:p-8 overflow-auto">
      <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
          Weekly Meal Plan
        </h1>
        <p className="text-lg text-muted-foreground">Your personalized meal schedule for the week</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {daysOfWeek.map((day, dayIndex) => {
          const dayMeals = mealsByDay[day] || []
          return (
            <Card
              key={day}
              className="border-2 hover:border-accent/40 hover-lift animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${dayIndex * 100}ms` }}
            >
              <CardHeader className="bg-gradient-to-r from-accent/10 to-emerald-100/50 border-b border-accent/20">
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-accent to-emerald-700 bg-clip-text text-transparent">
                  {day}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {dayMeals.map((meal, mealIndex) => (
                  <div
                    key={meal.id}
                    className="border-2 rounded-lg p-3 hover:border-accent/30 hover:shadow-md transition-all-smooth hover-lift bg-gradient-to-br from-card to-accent/5 animate-in fade-in zoom-in-95 duration-300"
                    style={{ animationDelay: `${dayIndex * 100 + mealIndex * 150}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-muted to-accent/10 ring-2 ring-accent/10">
                        <Image
                          src={`/.jpg?height=80&width=80&query=${encodeURIComponent(meal.name)}`}
                          alt={meal.name}
                          fill
                          className="object-cover hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <div className="flex flex-wrap gap-1 mb-1">
                              {meal.tags?.slice(0, 2).map((tag, tagIndex) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs bg-gradient-to-r from-accent/20 to-emerald-200/50 text-accent hover:from-accent/30 hover:to-emerald-300/50 transition-all-smooth hover-scale"
                                >
                                  {tag.replace("_", " ")}
                                </Badge>
                              ))}
                            </div>
                            <h3 className="font-semibold text-sm leading-tight">{meal.name}</h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0 hover:bg-accent/10 hover:text-accent transition-all-smooth hover:rotate-180"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span className="sr-only">Swap meal</span>
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-accent">{meal.ingredients.length}</span> ingredients
                          {meal.notes && ` • ${meal.notes}`}
                        </p>
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
