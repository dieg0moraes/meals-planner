import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getUserProfiles, getFamilyPreferences, getCookingHabits } from "@/lib/data/queries"

export default async function DashboardPage() {
  const userProfiles = await getUserProfiles()
  const familyPreferences = await getFamilyPreferences()
  const cookingHabits = await getCookingHabits()

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground mb-2">Hello, {userProfiles[0]?.name || "there"}</h1>
            <p className="text-lg text-muted-foreground">What should we plan this week?</p>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">User Profiles</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {userProfiles.map((profile) => (
                  <Card key={profile.id} className="border-2 hover:border-primary/20 transition-colors min-w-[280px]">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          className={`h-10 w-10 ${profile.avatar_color === "primary" ? "bg-primary/10" : profile.avatar_color === "blue" ? "bg-blue-100" : "bg-purple-100"}`}
                        >
                          <AvatarFallback
                            className={`${profile.avatar_color === "primary" ? "bg-primary/10 text-primary" : profile.avatar_color === "blue" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"} font-semibold`}
                          >
                            {profile.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-lg">{profile.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {profile.dietary_preferences.map((pref) => (
                          <Badge key={pref} variant="secondary" className="bg-primary/10 text-primary">
                            {pref}
                          </Badge>
                        ))}
                        {profile.allergies.map((allergy) => (
                          <Badge key={allergy} variant="secondary" className="bg-destructive/10 text-destructive">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Family Preferences</h2>
              <Card className="border-2 hover:border-primary/20 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    {familyPreferences.preferences.map((pref) => (
                      <Badge key={pref} variant="secondary" className="bg-blue-50 text-blue-700">
                        {pref}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Cooking Habits</h2>
              <Card className="border-2 hover:border-primary/20 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    {cookingHabits.habits.map((habit) => (
                      <Badge key={habit} variant="secondary" className="bg-amber-50 text-amber-700">
                        {habit}
                      </Badge>
                    ))}
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
