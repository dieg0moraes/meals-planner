"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SetupProgress } from "@/components/setup-progress"
import { useEffect, useState } from "react"
import type { UserProfile } from "@/types"
import { mockUserProfile } from "@/lib/data/mock-data"

export default function DashboardPage() {
  const [userProfile, setUserProfile] = useState<UserProfile>(mockUserProfile)
  const [setupSteps, setSetupSteps] = useState([
    { id: "profiles", label: "User profile created", completed: true, inProgress: false },
    { id: "household", label: "Household members added", completed: false, inProgress: false },
    { id: "dietary", label: "Dietary restrictions set", completed: false, inProgress: false },
    { id: "preferences", label: "Food preferences added", completed: false, inProgress: false },
    { id: "goals", label: "Goals configured", completed: false, inProgress: false },
  ])

  const updateSetupProgress = (profile: UserProfile) => {
    setSetupSteps((prev) => {
      const updated = [...prev]

      // Check if profile exists
      updated[0].completed = !!profile.id

      // Check if household members are added
      updated[1].completed = profile.household.people.length > 0 || profile.household.pets.length > 0

      // Check if dietary restrictions are set
      updated[2].completed = profile.dietaryRestrictions.length > 0

      // Check if food preferences are added
      updated[3].completed = (profile.favoriteFoods?.length ?? 0) > 0 || (profile.dislikedFoods?.length ?? 0) > 0

      // Check if goals are configured
      updated[4].completed = profile.goals.length > 0

      return updated
    })
  }

  useEffect(() => {
    updateSetupProgress(userProfile)
  }, [userProfile])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground mb-2">Hello, {userProfile.displayName || "there"}</h1>
            <p className="text-lg text-muted-foreground">What should we plan this week?</p>
          </div>

          <div className="space-y-6">
            <SetupProgress steps={setupSteps} />

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Household</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {/* Main user card */}
                <Card className="border-2 hover:border-primary/20 transition-colors min-w-[280px]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-primary/10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {userProfile.displayName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-lg">{userProfile.displayName}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        📍 {userProfile.location.city}, {userProfile.location.stateOrRegion}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {userProfile.dietaryRestrictions.map((restriction) => (
                          <Badge key={restriction} variant="secondary" className="bg-destructive/10 text-destructive">
                            {restriction}
                          </Badge>
                        ))}
                        {userProfile.goals.map((goal) => (
                          <Badge key={goal} variant="secondary" className="bg-primary/10 text-primary">
                            {goal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Household members */}
                {userProfile.household.people.map((person) => (
                  <Card key={person.id} className="border-2 hover:border-primary/20 transition-colors min-w-[280px]">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 bg-blue-100">
                          <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                            {person.role[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-lg capitalize">{person.role}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {person.estimatedAge && (
                          <div className="text-sm text-muted-foreground">Age: {person.estimatedAge}</div>
                        )}
                        {person.gender && (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                            {person.gender}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Pets */}
                {userProfile.household.pets.map((pet) => (
                  <Card key={pet.id} className="border-2 hover:border-primary/20 transition-colors min-w-[280px]">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 bg-amber-100">
                          <AvatarFallback className="bg-amber-100 text-amber-700 font-semibold">
                            {pet.animal[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-lg">{pet.name || `Pet ${pet.animal}`}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="secondary" className="bg-amber-50 text-amber-700 capitalize">
                        {pet.animal}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {userProfile.favoriteFoods && userProfile.favoriteFoods.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Favorite Foods</h2>
                <Card className="border-2 hover:border-primary/20 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-2">
                      {userProfile.favoriteFoods.map((food) => (
                        <Badge key={food} variant="secondary" className="bg-green-50 text-green-700">
                          ❤️ {food}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {userProfile.dislikedFoods && userProfile.dislikedFoods.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Disliked Foods</h2>
                <Card className="border-2 hover:border-primary/20 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-2">
                      {userProfile.dislikedFoods.map((food) => (
                        <Badge key={food} variant="secondary" className="bg-red-50 text-red-700">
                          ❌ {food}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

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
