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
    <div className="p-8 md:p-12 overflow-auto bg-gradient-to-br from-background via-background to-accent/5">
      <div className="mb-12 animate-slide-up max-w-7xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-bold gradient-text-accent mb-3 tracking-tight">Weekly Meal Plan</h1>
        <p className="text-xl text-muted-foreground font-light">Your personalized meal schedule for the week</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {daysOfWeek.map((day, dayIndex) => {
          const dayMeals = mealsByDay[day] || []
          return (
            <Card
              key={day}
              className="glass-card border-2 hover:border-accent/50 hover-lift-subtle animate-scale-in shadow-lg overflow-hidden"
              style={{ animationDelay: `${dayIndex * 80}ms` }}
            >
              <CardHeader className="bg-gradient-to-r from-accent/15 to-success/10 border-b-2 border-accent/20 pb-4">
                <CardTitle className="text-2xl font-bold gradient-text-accent">{day}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {dayMeals.map((meal, mealIndex) => (
                  <div
                    key={meal.id}
                    className="glass-card border-2 rounded-xl p-4 hover:border-accent/40 hover:shadow-md transition-all hover-lift-subtle animate-scale-in"
                    style={{ animationDelay: `${dayIndex * 80 + mealIndex * 120}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-muted to-accent/10 ring-2 ring-accent/20 shadow-md">
                        <Image
                          src={`/.jpg?height=96&width=96&query=${encodeURIComponent(meal.name)}`}
                          alt={meal.name}
                          fill
                          className="object-cover hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {meal.tags?.slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs bg-gradient-to-r from-accent/15 to-success/15 text-accent hover:from-accent/25 hover:to-success/25 transition-all hover-scale-subtle px-2 py-0.5 shadow-sm"
                                >
                                  {tag.replace("_", " ")}
                                </Badge>
                              ))}
                            </div>
                            <h3 className="font-semibold text-base leading-tight">{meal.name}</h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0 hover:bg-accent/15 hover:text-accent transition-all hover:rotate-180 duration-300"
                          >
                            <RefreshCw className="h-4 w-4" />
                            <span className="sr-only">Swap meal</span>
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-accent">{meal.ingredients.length}</span> ingredients
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
