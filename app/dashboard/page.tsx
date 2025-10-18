"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SetupProgress } from "@/components/setup-progress"
import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { UserProfile, FamilyPreferences, CookingHabits } from "@/lib/data/mock-data"
import { mockUserProfiles, mockFamilyPreferences, mockCookingHabits } from "@/lib/data/mock-data"

export default function DashboardPage() {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>(mockUserProfiles)
  const [familyPreferences, setFamilyPreferences] = useState<FamilyPreferences>(mockFamilyPreferences)
  const [cookingHabits, setCookingHabits] = useState<CookingHabits>(mockCookingHabits)
  const [setupSteps, setSetupSteps] = useState([
    { id: "profiles", label: "User profiles created", completed: true, inProgress: false },
    { id: "dietary", label: "Dietary preferences added", completed: false, inProgress: false },
    { id: "allergies", label: "Allergies documented", completed: false, inProgress: false },
    { id: "family", label: "Family preferences set", completed: false, inProgress: false },
    { id: "cooking", label: "Cooking habits configured", completed: false, inProgress: false },
  ])

  useEffect(() => {
    const supabase = createBrowserClient()

    // Subscribe to user profiles changes
    const profilesChannel = supabase
      .channel("user_profiles_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_profiles",
        },
        (payload) => {
          console.log("[v0] User profile updated:", payload)
          // Update local state with new data
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setUserProfiles((prev) => {
              const index = prev.findIndex((p) => p.id === payload.new.id)
              if (index >= 0) {
                const updated = [...prev]
                updated[index] = payload.new as UserProfile
                return updated
              }
              return [...prev, payload.new as UserProfile]
            })
            updateSetupProgress()
          }
        },
      )
      .subscribe()

    // Subscribe to family preferences changes
    const preferencesChannel = supabase
      .channel("family_preferences_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_preferences",
        },
        (payload) => {
          console.log("[v0] Family preferences updated:", payload)
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setFamilyPreferences(payload.new as FamilyPreferences)
            updateSetupProgress()
          }
        },
      )
      .subscribe()

    // Subscribe to cooking habits changes
    const habitsChannel = supabase
      .channel("cooking_habits_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cooking_habits",
        },
        (payload) => {
          console.log("[v0] Cooking habits updated:", payload)
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setCookingHabits(payload.new as CookingHabits)
            updateSetupProgress()
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(profilesChannel)
      supabase.removeChannel(preferencesChannel)
      supabase.removeChannel(habitsChannel)
    }
  }, [])

  const updateSetupProgress = () => {
    setSetupSteps((prev) => {
      const updated = [...prev]

      // Check if profiles exist
      updated[0].completed = userProfiles.length > 0

      // Check if dietary preferences are added
      updated[1].completed = userProfiles.some((p) => p.dietary_preferences.length > 0)

      // Check if allergies are documented
      updated[2].completed = userProfiles.some((p) => p.allergies.length > 0)

      // Check if family preferences are set
      updated[3].completed = familyPreferences.preferences.length > 0

      // Check if cooking habits are configured
      updated[4].completed = cookingHabits.habits.length > 0

      return updated
    })
  }

  useEffect(() => {
    updateSetupProgress()
  }, [userProfiles, familyPreferences, cookingHabits])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground mb-2">Hello, {userProfiles[0]?.name || "there"}</h1>
            <p className="text-lg text-muted-foreground">What should we plan this week?</p>
          </div>

          <div className="space-y-6">
            <SetupProgress steps={setupSteps} />

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
