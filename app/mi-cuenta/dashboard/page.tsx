"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { useEffect, useState, memo } from "react"
import Script from "next/script"
import type { UserProfile } from "@/types"
import { createBrowserClient } from "@/lib/supabase/client"
import {
  User,
  Users,
  Heart,
  X,
  Target,
  ChefHat,
  CheckCircle2,
  Circle,
  Sparkles,
  Calendar,
  TrendingUp,
  PawPrint
} from "lucide-react"

// Memoized widget component to prevent re-renders
const ElevenLabsWidget = memo(({ authUserId }: { authUserId: string | null }) => {
  if (!authUserId) {
    return null
  }

  // Pass authUserId as a dynamic variable to ElevenLabs
  const dynamicVariables = JSON.stringify({ authUserId });

  return (
    <>
      <div dangerouslySetInnerHTML={{
        __html: `<elevenlabs-convai
          agent-id="agent_9301k7w8zfbtfb1tvjq6aw1bf4eh"
          dynamic-variables='${dynamicVariables}'
        ></elevenlabs-convai>`
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

  // Subscribe to profiles table changes in Supabase
  useEffect(() => {
    const supabase = createBrowserClient()
    let active = true

    async function run() {
      const pid = authUserId;
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
        .eq("auth_user_id", pid)
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

        // Check if onboarding is complete
        const isComplete = checkOnboardingComplete(profile)
        setIsOnboardingComplete(isComplete)
      }

      // Subscribe to real-time updates (always, not just when onboarding is incomplete)
      const channel = supabase
        .channel(`profiles:${pid}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `auth_user_id=eq.${pid}` },
          (payload) => {
            console.log("Real-time update received:", payload)
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

              // Check if onboarding status changed
              const isComplete = checkOnboardingComplete(updatedProfile)
              setIsOnboardingComplete(isComplete)
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    let cleanup: (() => void) | undefined
    run().then((fn) => {
      cleanup = fn
    })

    return () => {
      active = false
      if (cleanup) cleanup()
    }
  }, [authUserId])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex-1 p-8 md:p-12 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-12 w-96" />
              <Skeleton className="h-6 w-[600px]" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>

            <Skeleton className="h-48 w-full" />

            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        </div>

        {/* ElevenLabs ConvAI Widget - Always visible */}
        <ElevenLabsWidget authUserId={authUserId} />
      </div>
    )
  }

  // No profile found - show friendly empty state
  if (!userProfile) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex-1 p-8 md:p-12 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <ChefHat className="w-24 h-24 text-primary relative" strokeWidth={1.5} />
              </div>

              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent mb-4">
                Welcome to MealPlanner
              </h1>

              <p className="text-xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
                Your AI-powered culinary companion is ready to help you plan delicious,
                personalized meals tailored just for you.
              </p>

              <Card className="max-w-2xl w-full bg-card/50 backdrop-blur border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Let's Get Started
                  </CardTitle>
                  <CardDescription>
                    Chat with our AI assistant below to set up your profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-left">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Share your household details</p>
                      <p className="text-sm text-muted-foreground">Tell us who you're cooking for</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Set dietary preferences</p>
                      <p className="text-sm text-muted-foreground">Any restrictions or favorite foods?</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Define your goals</p>
                      <p className="text-sm text-muted-foreground">Health, budget, variety, or time-saving?</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <p className="mt-8 text-muted-foreground flex items-center gap-2">
                <span className="text-2xl">👇</span>
                Start chatting below to begin your culinary journey
              </p>
            </div>
          </div>
        </div>

        {/* ElevenLabs ConvAI Widget - Always visible */}
        <ElevenLabsWidget authUserId={authUserId} />
      </div>
    )
  }

  const completedCount = setupSteps.filter((s) => s.completed).length
  const totalCount = setupSteps.length
  const progressPercentage = (completedCount / totalCount) * 100

  const householdCount = (userProfile.household?.people?.length || 0) + (userProfile.household?.pets?.length || 0)
  const preferencesCount = (userProfile.favoriteFoods?.length || 0) + (userProfile.dislikedFoods?.length || 0)

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-primary/5">
      <div className="flex-1 p-8 md:p-12 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header Section */}
          <div className="space-y-6">

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Setup Progress</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold">{completedCount}</span>
                      <span className="text-muted-foreground mb-1">/ {totalCount}</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {isOnboardingComplete ? "Profile complete!" : "Almost there!"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Household Size</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">{householdCount + 1}</div>
                    <p className="text-xs text-muted-foreground">
                      {householdCount > 0 ? "members total" : "Just you for now"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Food Preferences</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">{preferencesCount}</div>
                    <p className="text-xs text-muted-foreground">
                      {preferencesCount > 0 ? "preferences set" : "No preferences yet"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Setup Progress Card - Only show if not complete */}
          {!isOnboardingComplete && (
            <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Complete Your Profile
                </CardTitle>
                <CardDescription>
                  Let's finish setting up to unlock personalized meal plans
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progressPercentage} className="h-2" />
                <div className="grid gap-2 md:grid-cols-2">
                  {setupSteps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      {step.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={step.completed ? "text-foreground font-medium" : "text-muted-foreground"}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs Section */}
          <Tabs defaultValue="household" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="household" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Household
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Preferences
              </TabsTrigger>
              <TabsTrigger value="goals" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Goals
              </TabsTrigger>
            </TabsList>

            {/* Household Tab */}
            <TabsContent value="household" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Main user card */}
                <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-primary/20 group-hover:border-primary transition-colors">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg">
                            {userProfile.displayName?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                          <User className="w-3 h-3" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="truncate">{userProfile.displayName || "User"}</CardTitle>
                        <CardDescription>You (Primary)</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(userProfile.dietaryRestrictions || []).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Dietary Restrictions</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(userProfile.dietaryRestrictions || []).map((restriction) => (
                            <Badge key={restriction} variant="outline" className="text-xs border-destructive/50 text-destructive">
                              {restriction}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {(userProfile.goals || []).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Goals</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(userProfile.goals || []).map((goal) => (
                            <Badge key={goal} variant="outline" className="text-xs border-primary/50 text-primary">
                              {goal}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Household members */}
                {(userProfile.household?.people || []).map((person) => (
                  <Card key={person.id} className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-blue-200 group-hover:border-blue-400 transition-colors">
                          <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 font-bold text-lg">
                            {person.role[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="capitalize truncate">{person.role}</CardTitle>
                          <CardDescription>Family Member</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {person.estimatedAge && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Age:</span>
                          <span className="font-medium">{person.estimatedAge}</span>
                        </div>
                      )}
                      {person.gender && (
                        <Badge variant="secondary" className="capitalize">
                          {person.gender}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Pets */}
                {(userProfile.household?.pets || []).map((pet) => (
                  <Card key={pet.id} className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-amber-200 group-hover:border-amber-400 transition-colors">
                          <AvatarFallback className="bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700">
                            <PawPrint className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="truncate">{pet.name || `Our ${pet.animal}`}</CardTitle>
                          <CardDescription>Pet</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="secondary" className="capitalize bg-amber-50 text-amber-700 border-amber-200">
                        {pet.animal}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-2 hover:border-primary/50 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Heart className="w-5 h-5 text-green-600" />
                      Favorite Foods
                    </CardTitle>
                    <CardDescription>
                      Foods you love and want to see more often
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userProfile.favoriteFoods && userProfile.favoriteFoods.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {userProfile.favoriteFoods.map((food) => (
                          <Badge key={food} className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                            <Heart className="w-3 h-3 mr-1 fill-current" />
                            {food}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No favorite foods yet</p>
                        <p className="text-xs mt-1">Chat with us to add your favorites!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2 hover:border-primary/50 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <X className="w-5 h-5 text-red-600" />
                      Disliked Foods
                    </CardTitle>
                    <CardDescription>
                      Foods to avoid in your meal plans
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userProfile.dislikedFoods && userProfile.dislikedFoods.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {userProfile.dislikedFoods.map((food) => (
                          <Badge key={food} className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100">
                            <X className="w-3 h-3 mr-1" />
                            {food}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <X className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No disliked foods</p>
                        <p className="text-xs mt-1">You're easy to please!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Goals Tab */}
            <TabsContent value="goals" className="space-y-4">
              <Card className="border-2 hover:border-primary/50 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Target className="w-5 h-5 text-primary" />
                    Your Meal Planning Goals
                  </CardTitle>
                  <CardDescription>
                    What you want to achieve with your meal planning
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {userProfile.goals && userProfile.goals.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {userProfile.goals.map((goal) => (
                        <div key={goal} className="flex items-center gap-3 p-4 rounded-lg border-2 hover:border-primary/50 transition-colors bg-card">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-primary" />
                          </div>
                          <span className="font-medium">{goal}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Target className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-sm">No goals set yet</p>
                      <p className="text-xs mt-1">Tell us what you want to achieve!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* CTA Section */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent mb-24">
            <CardContent className="flex flex-col items-center justify-center gap-6 pt-6 text-center">
              <div>
                <h3 className="text-2xl font-bold mb-2">Ready to start planning?</h3>
                <p className="text-muted-foreground">
                  {isOnboardingComplete
                    ? "Your profile is complete! Generate your personalized meal plan now."
                    : "Complete your profile setup to unlock personalized meal planning."}
                </p>
              </div>
              <Link href="/meal-plan">
                <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                  <ChefHat className="w-5 h-5 mr-2" />
                  View Meal Plan
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ElevenLabs ConvAI Widget - Memoized to prevent re-renders */}
      <ElevenLabsWidget authUserId={authUserId} />
    </div>
  )
}
