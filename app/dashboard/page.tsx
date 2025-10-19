"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { SetupProgress } from "@/components/setup-progress"
import { useEffect, useState, memo } from "react"
import Script from "next/script"
import type { UserProfile } from "@/types"
import { createBrowserClient } from "@/lib/supabase/client"

// Memoized widget component to prevent re-renders
const ElevenLabsWidget = memo(() => {
  return (
    <>
      <div dangerouslySetInnerHTML={{
        __html: '<elevenlabs-convai agent-id="agent_9301k7w8zfbtfb1tvjq6aw1bf4eh"></elevenlabs-convai>'
      }} />
      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        async
        type="text/javascript"
        strategy="lazyOnload"
      />
    </>
  )
})

ElevenLabsWidget.displayName = 'ElevenLabsWidget'

export default function DashboardPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false)
  const [setupSteps, setSetupSteps] = useState([
    { id: "profiles", label: "User profile created", completed: false, inProgress: false },
    { id: "household", label: "Household members added", completed: false, inProgress: false },
    { id: "dietary", label: "Dietary restrictions set", completed: false, inProgress: false },
    { id: "preferences", label: "Food preferences added", completed: false, inProgress: false },
    { id: "goals", label: "Goals configured", completed: false, inProgress: false },
  ])

  // Get the authenticated user ID on mount
  useEffect(() => {
    const supabase = createBrowserClient()
    console.log("supabase", supabase)
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setAuthUserId(data.user.id)
      }
    })
  }, [])

  // Check if onboarding is complete
  const checkOnboardingComplete = (profile: UserProfile): boolean => {
    console.log("profile", profile)
    return !!(
      profile.displayName &&
      ((profile.household?.people?.length ?? 0) > 0 || (profile.household?.pets?.length ?? 0) > 0) &&
      (profile.dietaryRestrictions?.length ?? 0) > 0 &&
      ((profile.favoriteFoods?.length ?? 0) > 0 || (profile.dislikedFoods?.length ?? 0) > 0) &&
      (profile.goals?.length ?? 0) > 0
    )
  }

  const updateSetupProgress = (profile: UserProfile) => {
    setSetupSteps((prev) => {
      const updated = [...prev]

      // Check if profile exists
      updated[0].completed = !!profile.id

      // Check if household members are added
      updated[1].completed = ((profile.household?.people?.length ?? 0) > 0) || ((profile.household?.pets?.length ?? 0) > 0)

      // Check if dietary restrictions are set
      updated[2].completed = (profile.dietaryRestrictions?.length ?? 0) > 0

      // Check if food preferences are added
      updated[3].completed = (profile.favoriteFoods?.length ?? 0) > 0 || (profile.dislikedFoods?.length ?? 0) > 0

      // Check if goals are configured
      updated[4].completed = (profile.goals?.length ?? 0) > 0

      return updated
    })
  
  }

  useEffect(() => {
    console.log("userProfile", userProfile)
    if (userProfile) {
      updateSetupProgress(userProfile)
      // Check if onboarding is complete
      const isComplete = checkOnboardingComplete(userProfile)
      setIsOnboardingComplete(isComplete)
    }
  }, [userProfile])

  // Subscribe to profiles table changes in Supabase (only when onboarding is not complete)
  useEffect(() => {
    // If onboarding is already complete, don't subscribe
    if (isOnboardingComplete) {
      return
    }

    const supabase = createBrowserClient()
    let active = true
    let channelRef: ReturnType<typeof supabase.channel> | null = null


    async function run() {
      const pid = "941e2e67-fab6-4a14-90a5-da36fb6e63d1";
      console.log("pid", pid)
      if (!pid) {
        // If no profile found, stop loading
        setIsLoading(false)
        return
      }

      // Fetch initial profile data
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", pid)
        .maybeSingle()

      if (active && data) {
        const profile = {
          id: data.id,
          authUserId: data.auth_user_id,
          displayName: data.display_name || "",
          locale: data.locale || undefined,
          timeZone: data.time_zone || undefined,
          location: data.location || undefined,
          household: data.household || { people: [], pets: [] },
          dietaryRestrictions: data.dietary_restrictions || [],
          favoriteFoods: data.favorite_foods || [],
          dislikedFoods: data.disliked_foods || [],
          goals: data.goals || [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          rawOnboarding: data.raw_onboarding || undefined,
        }
        
        setUserProfile(profile)
        setIsLoading(false)

        // Check if onboarding is complete - if so, don't subscribe
        if (checkOnboardingComplete(profile)) {
          setIsOnboardingComplete(true)
          return
        }
      }
      console.log("channelRef", data)

      // Subscribe to real-time updates only if onboarding is not complete
      channelRef = supabase
        .channel(`profiles:${pid}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${pid}` },
          (payload) => {
            if (!payload.new) return
            const data = payload.new as any

            if (active) {
              const updatedProfile = {
                id: data.id,
                authUserId: data.auth_user_id,
                displayName: data.display_name || "",
                locale: data.locale || undefined,
                timeZone: data.time_zone || undefined,
                location: data.location || undefined,
                household: data.household || { people: [], pets: [] },
                dietaryRestrictions: data.dietary_restrictions || [],
                favoriteFoods: data.favorite_foods || [],
                dislikedFoods: data.disliked_foods || [],
                goals: data.goals || [],
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                rawOnboarding: data.raw_onboarding || undefined,
              }
              
              setUserProfile(updatedProfile)

              // Check if onboarding just completed and unsubscribe
              if (checkOnboardingComplete(updatedProfile)) {
                setIsOnboardingComplete(true)
                if (channelRef) {
                  supabase.removeChannel(channelRef)
                  channelRef = null
                }
              }
            }
          }
        )
        .subscribe()
    }

    run()

    return () => {
      active = false
      if (channelRef) {
        supabase.removeChannel(channelRef)
      }
    }
  }, [profileId, authUserId, isOnboardingComplete])

  // Loading state or no profile
  if (isLoading || !userProfile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 p-6 md:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <Skeleton className="h-9 w-64 mb-2" />
              <Skeleton className="h-7 w-80" />
            </div>

            <div className="space-y-6">
              <Skeleton className="h-24 w-full" />
              
              <div>
                <Skeleton className="h-7 w-32 mb-4" />
                <div className="flex gap-4 overflow-x-auto pb-2">
                  <Skeleton className="h-40 min-w-[280px]" />
                  <Skeleton className="h-40 min-w-[280px]" />
                  <Skeleton className="h-40 min-w-[280px]" />
                </div>
              </div>

              <div>
                <Skeleton className="h-7 w-40 mb-4" />
                <Skeleton className="h-32 w-full" />
              </div>

              <div className="flex justify-center pt-6">
                <Skeleton className="h-12 w-80" />
              </div>
            </div>
          </div>
        </div>

        {/* ElevenLabs ConvAI Widget - Always visible */}
        <ElevenLabsWidget />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground mb-2">Hello, {userProfile.displayName || "there"}</h1>
            <p className="text-lg text-muted-foreground">What should we plan this week?</p>
          </div>

          <div className="space-y-6">
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <SetupProgress steps={setupSteps} />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Household</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {/* Main user card */}
                <Card className="border-2 hover:border-primary/20 transition-colors min-w-[280px] animate-in fade-in slide-in-from-left-5 duration-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-primary/10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {userProfile.displayName?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-lg">{userProfile.displayName || "User"}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {(userProfile.dietaryRestrictions || []).map((restriction, index) => (
                          <Badge
                            key={restriction}
                            variant="secondary"
                            className="bg-destructive/10 text-destructive animate-in fade-in zoom-in-95 duration-300"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            {restriction}
                          </Badge>
                        ))}
                        {(userProfile.goals || []).map((goal, index) => (
                          <Badge
                            key={goal}
                            variant="secondary"
                            className="bg-primary/10 text-primary animate-in fade-in zoom-in-95 duration-300"
                            style={{ animationDelay: `${((userProfile.dietaryRestrictions || []).length + index) * 100}ms` }}
                          >
                            {goal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Household members */}
                {(userProfile.household?.people || []).map((person, index) => (
                  <Card
                    key={person.id}
                    className="border-2 hover:border-primary/20 transition-colors min-w-[280px] animate-in fade-in slide-in-from-right-5 duration-500"
                    style={{ animationDelay: `${(index + 1) * 150}ms` }}
                  >
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
                {(userProfile.household?.pets || []).map((pet, index) => (
                  <Card
                    key={pet.id}
                    className="border-2 hover:border-primary/20 transition-colors min-w-[280px] animate-in fade-in slide-in-from-right-5 duration-500"
                    style={{ animationDelay: `${((userProfile.household?.people || []).length + index + 1) * 150}ms` }}
                  >
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
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-xl font-semibold text-foreground mb-4">Favorite Foods</h2>
                <Card className="border-2 hover:border-primary/20 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-2">
                      {userProfile.favoriteFoods.map((food, index) => (
                        <Badge
                          key={food}
                          variant="secondary"
                          className="bg-green-50 text-green-700 animate-in fade-in zoom-in-95 duration-300"
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
                <h2 className="text-xl font-semibold text-foreground mb-4">Disliked Foods</h2>
                <Card className="border-2 hover:border-primary/20 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-2">
                      {userProfile.dislikedFoods.map((food, index) => (
                        <Badge
                          key={food}
                          variant="secondary"
                          className="bg-red-50 text-red-700 animate-in fade-in zoom-in-95 duration-300"
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

      {/* ElevenLabs ConvAI Widget - Memoized to prevent re-renders */}
      <ElevenLabsWidget />
    </div>
  )
}
