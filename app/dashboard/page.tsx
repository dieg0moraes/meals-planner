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
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-primary/5">
      <div className="flex-1 p-8 md:p-12 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 animate-slide-up">
            <h1 className="text-5xl md:text-6xl font-bold gradient-text-primary mb-3 tracking-tight">
              Hello, {userProfile.displayName || "there"}
            </h1>
            <p className="text-xl text-muted-foreground font-light">What should we plan this week?</p>
          </div>

          <div className="space-y-12">
            <div className="animate-scale-in">
              <SetupProgress steps={setupSteps} />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                <span className="inline-block w-1.5 h-8 bg-gradient-to-b from-primary to-accent rounded-full"></span>
                Household
              </h2>
              <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                <Card className="glass-card border-2 hover:border-primary/50 hover-lift-subtle min-w-[320px] animate-scale-in shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 bg-gradient-to-br from-primary to-accent ring-4 ring-primary/20 hover-scale-subtle shadow-md">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold text-2xl">
                          {userProfile.displayName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-xl font-semibold">{userProfile.displayName}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {userProfile.dietaryRestrictions.map((restriction, index) => (
                          <Badge
                            key={restriction}
                            variant="secondary"
                            className="bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all hover-scale-subtle px-3 py-1 animate-scale-in shadow-sm"
                            style={{ animationDelay: `${index * 80}ms` }}
                          >
                            {restriction}
                          </Badge>
                        ))}
                        {userProfile.goals.map((goal, index) => (
                          <Badge
                            key={goal}
                            variant="secondary"
                            className="bg-primary/10 text-primary hover:bg-primary/20 transition-all hover-scale-subtle px-3 py-1 animate-scale-in shadow-sm"
                            style={{ animationDelay: `${(userProfile.dietaryRestrictions.length + index) * 80}ms` }}
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
                    className="glass-card border-2 hover:border-accent/50 hover-lift-subtle min-w-[320px] animate-scale-in shadow-lg"
                    style={{ animationDelay: `${(index + 1) * 120}ms` }}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 bg-gradient-to-br from-accent to-success ring-4 ring-accent/20 hover-scale-subtle shadow-md">
                          <AvatarFallback className="bg-gradient-to-br from-accent to-success text-white font-bold text-2xl">
                            {person.role[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-xl font-semibold capitalize">{person.role}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {person.estimatedAge && (
                          <div className="text-sm text-muted-foreground font-medium">Age: {person.estimatedAge}</div>
                        )}
                        {person.gender && (
                          <Badge
                            variant="secondary"
                            className="bg-accent/10 text-accent hover:bg-accent/20 transition-all px-3 py-1 shadow-sm"
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
                    className="glass-card border-2 hover:border-amber-400/50 hover-lift-subtle min-w-[320px] animate-scale-in shadow-lg"
                    style={{ animationDelay: `${(userProfile.household.people.length + index + 1) * 120}ms` }}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 bg-gradient-to-br from-amber-400 to-orange-500 ring-4 ring-amber-400/20 hover-scale-subtle shadow-md">
                          <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-2xl">
                            {pet.animal[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-xl font-semibold">{pet.name || `Pet ${pet.animal}`}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all hover-scale-subtle capitalize px-3 py-1 shadow-sm"
                      >
                        {pet.animal}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {userProfile.favoriteFoods && userProfile.favoriteFoods.length > 0 && (
              <div className="animate-slide-up">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <span className="inline-block w-1.5 h-8 bg-gradient-to-b from-success to-green-600 rounded-full"></span>
                  Favorite Foods
                </h2>
                <Card className="glass-card border-2 hover:border-success/50 hover-lift-subtle shadow-lg">
                  <CardContent className="pt-8">
                    <div className="flex flex-wrap gap-3">
                      {userProfile.favoriteFoods.map((food, index) => (
                        <Badge
                          key={food}
                          variant="secondary"
                          className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:from-green-100 hover:to-emerald-100 transition-all hover-scale-subtle text-base py-2 px-4 animate-scale-in shadow-sm"
                          style={{ animationDelay: `${index * 60}ms` }}
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
              <div className="animate-slide-up">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <span className="inline-block w-1.5 h-8 bg-gradient-to-b from-destructive to-red-600 rounded-full"></span>
                  Disliked Foods
                </h2>
                <Card className="glass-card border-2 hover:border-destructive/50 hover-lift-subtle shadow-lg">
                  <CardContent className="pt-8">
                    <div className="flex flex-wrap gap-3">
                      {userProfile.dislikedFoods.map((food, index) => (
                        <Badge
                          key={food}
                          variant="secondary"
                          className="bg-gradient-to-r from-red-50 to-rose-50 text-red-700 hover:from-red-100 hover:to-rose-100 transition-all hover-scale-subtle text-base py-2 px-4 animate-scale-in shadow-sm"
                          style={{ animationDelay: `${index * 60}ms` }}
                        >
                          ❌ {food}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex justify-center pt-8 animate-scale-in">
              <Link href="/meal-plan">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary via-accent to-primary hover:shadow-2xl hover:shadow-primary/30 text-white px-12 py-7 text-xl font-semibold hover-lift-subtle animate-glow-pulse rounded-xl"
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
