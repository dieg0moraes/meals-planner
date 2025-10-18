import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground mb-2">Hello, Ana</h1>
            <p className="text-lg text-muted-foreground">What should we plan this week?</p>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">User Profiles</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                <Card className="border-2 hover:border-primary/20 transition-colors min-w-[280px]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-primary/10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">A</AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-lg">Ana</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        Low-Carb Diet
                      </Badge>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        Loves Spicy Food
                      </Badge>
                      <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                        Allergic to Nuts
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:border-primary/20 transition-colors min-w-[280px]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-blue-100">
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">J</AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-lg">John</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        High Protein
                      </Badge>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        No Seafood
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:border-primary/20 transition-colors min-w-[280px]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-purple-100">
                        <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold">E</AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-lg">Emma</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        Vegetarian
                      </Badge>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        Loves Pasta
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Family Preferences</h2>
              <Card className="border-2 hover:border-primary/20 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                      Kids are picky eaters
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                      Prefers chicken over beef
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                      Vegetarian options needed
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                      No spicy food for kids
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Cooking Habits</h2>
              <Card className="border-2 hover:border-primary/20 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                      30-minute meals preferred
                    </Badge>
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                      Meal prep on Sundays
                    </Badge>
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                      Loves one-pot dishes
                    </Badge>
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                      Batch cooking friendly
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center pt-6">
              <Link href="/meal-plan">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                  Confirm Profile & View Meal Plan
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
