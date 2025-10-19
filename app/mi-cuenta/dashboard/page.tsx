"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { useEffect, useState, memo } from "react"
import Script from "next/script"
import type { UserProfile } from "@/types"
import { createBrowserClient } from "@/lib/supabase/client"
import { useEntities } from "@/components/entities-provider"
import {
  User,
  Users,
  Heart,
  X,
  Target,
  ShoppingCart,
  CheckCircle2,
  Circle,
  Sparkles,
  TrendingUp,
  PawPrint,
  Trash2,
  AlertTriangle
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
  const { profile: userProfile, loading: entitiesLoading } = useEntities()
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [setupSteps, setSetupSteps] = useState([
    { id: "profiles", label: "Perfil de usuario creado", completed: false, inProgress: false },
    { id: "household", label: "Miembros del hogar agregados", completed: false, inProgress: false },
    { id: "dietary", label: "Restricciones dietéticas establecidas", completed: false, inProgress: false },
    { id: "preferences", label: "Preferencias de comida agregadas", completed: false, inProgress: false },
    { id: "goals", label: "Objetivos configurados", completed: false, inProgress: false },
  ])

  // Reset profile handler
  const handleResetProfile = async () => {
    setIsResetting(true)
    try {
      const response = await fetch('/api/onboarding/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset profile')
      }

      // Refresh the page to reset state
      window.location.reload()
    } catch (error) {
      console.error('Error resetting profile:', error)
      alert(`Error al resetear el perfil: ${(error as Error).message}`)
      setIsResetting(false)
      setShowResetConfirm(false)
    }
  }

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

  // Loading state
  if (entitiesLoading) {
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
                <ShoppingCart className="w-24 h-24 text-primary relative" strokeWidth={1.5} />
              </div>

              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent mb-4">
                Bienvenido a Carritoo
              </h1>

              <p className="text-xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
                Tu asistente culinario con IA está listo para ayudarte a planificar comidas
                deliciosas y personalizadas diseñadas especialmente para ti.
              </p>

              <Card className="max-w-2xl w-full bg-card/50 backdrop-blur border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Comencemos
                  </CardTitle>
                  <CardDescription>
                    Chatea con nuestro asistente de IA abajo para configurar tu perfil
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-left">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Comparte los detalles de tu hogar</p>
                      <p className="text-sm text-muted-foreground">Cuéntanos para quién estás cocinando</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />

                    <div>
                      <p className="font-medium">Establece tus preferencias dietéticas</p>
                      <p className="text-sm text-muted-foreground">¿Alguna restricción o comida favorita?</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Define tus objetivos</p>
                      <p className="text-sm text-muted-foreground">¿Salud, presupuesto, variedad o ahorro de tiempo?</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <p className="mt-8 text-muted-foreground flex items-center gap-2">
                <span className="text-2xl">👇</span>
                Comienza a chatear abajo para iniciar tu viaje culinario
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
      <div className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Mi Perfil</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {householdCount} miembros • {preferencesCount} preferencias • {completedCount}/{totalCount} completado
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Reset Confirmation Dialog */}
          {showResetConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="max-w-md w-full border-2 border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Resetear Perfil
                  </CardTitle>
                  <CardDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente los datos de tu perfil.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Toda la información de tu hogar, preferencias de comida, restricciones dietéticas y objetivos serán eliminados.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowResetConfirm(false)}
                      disabled={isResetting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleResetProfile}
                      disabled={isResetting}
                    >
                      {isResetting ? "Reseteando..." : "Sí, Resetear Perfil"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Setup Progress Banner - Only if incomplete */}
          {!isOnboardingComplete && (
            <Card className="border-l-4 border-l-primary bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Complete tu perfil para desbloquear planes personalizados</p>
                    <Progress value={progressPercentage} className="h-1.5 mt-2" />
                  </div>
                  <span className="text-sm font-semibold text-primary">{completedCount}/{totalCount}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Household Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Hogar</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {/* Household members - all from LLM data */}
                {(userProfile.household?.people || []).map((person) => {
                  const isPrimary = person.role === "self" || person.role === "user";

                  return (
                    <Card key={person.id} className="border hover:border-primary/50 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className={`h-10 w-10 border ${isPrimary ? 'border-primary/20' : 'border-blue-200'}`}>
                            <AvatarFallback className={isPrimary
                              ? "bg-primary/10 text-primary font-bold"
                              : "bg-blue-50 text-blue-700 font-bold"
                            }>
                              {isPrimary && userProfile.displayName
                                ? userProfile.displayName[0]?.toUpperCase()
                                : person.role[0].toUpperCase()
                              }
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm capitalize truncate">
                              {isPrimary ? (userProfile.displayName || "Tú") : person.role}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isPrimary ? "Principal" : "Miembro"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {person.estimatedAge && (
                            <Badge variant="secondary" className="text-xs">{person.estimatedAge} años</Badge>
                          )}
                          {person.gender && (
                            <Badge variant="secondary" className="text-xs capitalize">{person.gender}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Pets */}
                {(userProfile.household?.pets || []).map((pet) => (
                  <Card key={pet.id} className="border hover:border-primary/50 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-10 w-10 border border-amber-200">
                          <AvatarFallback className="bg-amber-50 text-amber-700">
                            <PawPrint className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{pet.name || `${pet.animal}`}</p>
                          <p className="text-xs text-muted-foreground">Mascota</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs capitalize bg-amber-50 text-amber-700 border-amber-200">
                        {pet.animal}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Preferences Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Preferencias de Comida</h2>
              </div>
              <div className="space-y-3">
                <Card className="border hover:border-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="w-4 h-4 text-green-600" />
                      <h3 className="font-semibold text-sm">Favoritos</h3>
                    </div>
                    {userProfile.favoriteFoods && userProfile.favoriteFoods.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {userProfile.favoriteFoods.map((food) => (
                          <Badge key={food} className="bg-green-50 text-green-700 border-green-200 text-xs">
                            {food}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No hay favoritos aún</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border hover:border-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <X className="w-4 h-4 text-red-600" />
                      <h3 className="font-semibold text-sm">No me gusta</h3>
                    </div>
                    {userProfile.dislikedFoods && userProfile.dislikedFoods.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {userProfile.dislikedFoods.map((food) => (
                          <Badge key={food} className="bg-red-50 text-red-700 border-red-200 text-xs">
                            {food}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No hay alimentos que no te gusten</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border hover:border-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <h3 className="font-semibold text-sm">Restricciones</h3>
                    </div>
                    {(() => {
                      const restrictions = userProfile.dietaryRestrictions?.filter(r => r.toLowerCase() !== 'ninguna') || [];
                      const hasNone = userProfile.dietaryRestrictions?.some(r => r.toLowerCase() === 'ninguna');

                      if (restrictions.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-1.5">
                            {restrictions.map((restriction) => (
                              <Badge key={restriction} className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                                {restriction}
                              </Badge>
                            ))}
                          </div>
                        );
                      } else if (hasNone) {
                        return <p className="text-xs text-muted-foreground">Sin restricciones</p>;
                      } else {
                        return <p className="text-xs text-muted-foreground">Sin restricciones</p>;
                      }
                    })()}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Goals Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Objetivos</h2>
            </div>
            <Card className="border hover:border-primary/50 transition-all">
              <CardContent className="p-4">
                {userProfile.goals && userProfile.goals.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userProfile.goals.map((goal) => (
                      <Badge key={goal} variant="outline" className="border-primary/50 text-primary text-xs">
                        <Target className="w-3 h-3 mr-1" />
                        {goal}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No hay objetivos establecidos aún</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent mb-20">
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div>
                  <h3 className="font-semibold mb-1">¿Listo para planificar?</h3>
                  <p className="text-sm text-muted-foreground">
                    {isOnboardingComplete
                      ? "Tu perfil está completo. Genera tu plan personalizado."
                      : "Completa tu perfil para desbloquear planes personalizados."}
                  </p>
                </div>
                <Link href="/mi-cuenta/comidas">
                  <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Ver Plan de Comidas
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ElevenLabs ConvAI Widget - Memoized to prevent re-renders */}
      <ElevenLabsWidget authUserId={authUserId} />
    </div>
  )
}
