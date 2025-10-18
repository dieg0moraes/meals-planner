"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useProfileCompletionPolling } from "@/hooks/use-profile-completion-polling"
import { SetupProgress } from "@/components/setup-progress"
import { useEffect, useState } from "react"
import type { UserProfile } from "@/types"
import { mockUserProfile } from "@/lib/data/mock-data"
import type { Person, Pet } from "@/types"

export default function DashboardPage() {
  const [userProfile, setUserProfile] = useState<UserProfile>(mockUserProfile)
  const [setupSteps, setSetupSteps] = useState([
    { id: "profiles", label: "User profile created", completed: true, inProgress: false },
    { id: "household", label: "Household members added", completed: false, inProgress: false },
    { id: "dietary", label: "Dietary restrictions set", completed: false, inProgress: false },
    { id: "preferences", label: "Food preferences added", completed: false, inProgress: false },
    { id: "goals", label: "Goals configured", completed: false, inProgress: false },
  ])

  // Poll for onboarding status updates
  const { status } = useProfileCompletionPolling({
    userId: userProfile.id,
    intervalMs: 3000,
  })

  // Update profile and steps when polling status changes
  useEffect(() => {
    if (status?.onboardingData) {
      const data = status.onboardingData

      // Update setup steps
      setSetupSteps([
        {
          id: "profiles",
          label: "User profile created",
          completed: !!data.displayName,
          inProgress: false,
        },
        {
          id: "household",
          label: "Household members added",
          completed: !!(data.household && (data.household.people.length > 0 || data.household.pets.length > 0)),
          inProgress: false,
        },
        {
          id: "dietary",
          label: "Dietary restrictions set",
          completed: !!(data.dietaryRestrictions && data.dietaryRestrictions.length > 0),
          inProgress: false,
        },
        {
          id: "preferences",
          label: "Food preferences added",
          completed: !!(
            (data.favoriteFoods && data.favoriteFoods.length > 0) ||
            (data.dislikedFoods && data.dislikedFoods.length > 0)
          ),
          inProgress: false,
        },
        {
          id: "goals",
          label: "Goals configured",
          completed: !!(data.goals && data.goals.length > 0),
          inProgress: false,
        },
      ])

      // Update user profile with polling data
      setUserProfile((prev) => ({
        ...prev,
        displayName: data.displayName || prev.displayName,
        household: data.household
          ? {
              people: data.household.people.map((person, index) => ({
                id: `person-${index}`,
                ...person,
              })) as Person[],
              pets: data.household.pets.map((pet, index) => ({
                id: `pet-${index}`,
                ...pet,
              })) as Pet[],
            }
          : prev.household,
        dietaryRestrictions: data.dietaryRestrictions || prev.dietaryRestrictions,
        favoriteFoods: data.favoriteFoods || prev.favoriteFoods,
        dislikedFoods: data.dislikedFoods || prev.dislikedFoods,
        goals: data.goals || prev.goals,
      }))
    }
  }, [status])

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
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2 animate-shimmer">
              Hello, {userProfile.displayName || "there"}
            </h1>
            <p className="text-lg text-muted-foreground">What should we plan this week?</p>
          </div>

          <div className="space-y-8">
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <SetupProgress steps={setupSteps} />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="inline-block w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></span>
                Household
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                <Card className="border-2 hover:border-primary/40 hover-lift min-w-[280px] animate-in fade-in slide-in-from-left-5 duration-500 bg-gradient-to-br from-card to-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 bg-gradient-to-br from-primary to-accent ring-2 ring-primary/20 hover-scale">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold text-lg">
                          {userProfile.displayName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-lg">{userProfile.displayName}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {userProfile.dietaryRestrictions.map((restriction, index) => (
                          <Badge
                            key={restriction}
                            variant="secondary"
                            className="bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all-smooth hover-scale animate-in fade-in zoom-in-95 duration-300"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            {restriction}
                          </Badge>
                        ))}
                        {userProfile.goals.map((goal, index) => (
                          <Badge
                            key={goal}
                            variant="secondary"
                            className="bg-primary/15 text-primary hover:bg-primary/25 transition-all-smooth hover-scale animate-in fade-in zoom-in-95 duration-300"
                            style={{ animationDelay: `${(userProfile.dietaryRestrictions.length + index) * 100}ms` }}
                          >
                            {goal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {userProfile.household.people.map((person, index) => (
                  <Card
                    key={person.id}
                    className="border-2 hover:border-accent/40 hover-lift min-w-[280px] animate-in fade-in slide-in-from-right-5 duration-500 bg-gradient-to-br from-card to-accent/5"
                    style={{ animationDelay: `${(index + 1) * 150}ms` }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 bg-gradient-to-br from-accent to-blue-500 ring-2 ring-accent/20 hover-scale">
                          <AvatarFallback className="bg-gradient-to-br from-accent to-blue-500 text-white font-bold text-lg">
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
                          <Badge
                            variant="secondary"
                            className="bg-accent/15 text-accent hover:bg-accent/25 transition-all-smooth"
                          >
                            {person.gender}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {userProfile.household.pets.map((pet, index) => (
                  <Card
                    key={pet.id}
                    className="border-2 hover:border-amber-400/40 hover-lift min-w-[280px] animate-in fade-in slide-in-from-right-5 duration-500 bg-gradient-to-br from-card to-amber-50"
                    style={{ animationDelay: `${(userProfile.household.people.length + index + 1) * 150}ms` }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-amber-400/20 hover-scale">
                          <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-lg">
                            {pet.animal[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-lg">{pet.name || `Pet ${pet.animal}`}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all-smooth hover-scale capitalize"
                      >
                        {pet.animal}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {userProfile.favoriteFoods && userProfile.favoriteFoods.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="inline-block w-1 h-6 bg-gradient-to-b from-accent to-green-600 rounded-full"></span>
                  Favorite Foods
                </h2>
                <Card className="border-2 hover:border-accent/40 hover-lift bg-gradient-to-br from-card to-accent/5">
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-2">
                      {userProfile.favoriteFoods.map((food, index) => (
                        <Badge
                          key={food}
                          variant="secondary"
                          className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:from-green-100 hover:to-emerald-100 transition-all-smooth hover-scale animate-in fade-in zoom-in-95 duration-300 text-sm py-1.5 px-3"
                          style={{ animationDelay: `${index * 80}ms` }}
                        >
                          ❤️ {food}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {userProfile.dislikedFoods && userProfile.dislikedFoods.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="inline-block w-1 h-6 bg-gradient-to-b from-destructive to-red-600 rounded-full"></span>
                  Disliked Foods
                </h2>
                <Card className="border-2 hover:border-destructive/40 hover-lift bg-gradient-to-br from-card to-destructive/5">
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-2">
                      {userProfile.dislikedFoods.map((food, index) => (
                        <Badge
                          key={food}
                          variant="secondary"
                          className="bg-gradient-to-r from-red-50 to-rose-50 text-red-700 hover:from-red-100 hover:to-rose-100 transition-all-smooth hover-scale animate-in fade-in zoom-in-95 duration-300 text-sm py-1.5 px-3"
                          style={{ animationDelay: `${index * 80}ms` }}
                        >
                          ❌ {food}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex justify-center pt-6 animate-in fade-in zoom-in-95 duration-700 delay-300">
              <Link href="/meal-plan">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary via-accent to-primary hover:shadow-lg hover:shadow-primary/30 text-white px-10 py-6 text-lg font-semibold hover-lift animate-pulse-glow"
                >
                  Confirm Profile & View Meal Plan →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
