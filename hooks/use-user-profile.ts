import { useEffect, useState } from "react"
import type { UserProfile } from "@/types"
import { createBrowserClient } from "@/lib/supabase/client"

interface UseUserProfileReturn {
  profile: UserProfile | null
  isLoading: boolean
  error: Error | null
  isComplete: boolean
  refetch: () => Promise<void>
}

export function useUserProfile(): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createBrowserClient()

      // Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("No authenticated user found")
      }

      // Fetch the profile from the database
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (fetchError) {
        throw fetchError
      }

      if (data) {
        // Map snake_case DB fields to camelCase TypeScript fields
        const p = data as any;
        const userProfile: UserProfile = {
          id: p.id,
          authUserId: p.auth_user_id,
          displayName: p.display_name || "",
          locale: p.locale || undefined,
          timeZone: p.time_zone || undefined,
          location: p.location || undefined,
          household: p.household || { people: [], pets: [] },
          dietaryRestrictions: p.dietary_restrictions || [],
          favoriteFoods: p.favorite_foods || [],
          dislikedFoods: p.disliked_foods || [],
          goals: p.goals || [],
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          rawOnboarding: p.raw_onboarding || undefined,
        };
        setProfile(userProfile)

        // Check if profile is complete
        const hasDisplayName = (userProfile.displayName?.trim()?.length ?? 0) > 0
        const hasAtLeastOnePerson = (userProfile.household?.people?.length ?? 0) > 0
        const hasAtLeastOneGoal = (userProfile.goals?.length ?? 0) > 0
        const hasLocation = Boolean(userProfile.location?.countryCode && userProfile.location?.city)
        const hasFavorite = (userProfile.favoriteFoods?.length ?? 0) > 0
        const hasDisliked = (userProfile.dislikedFoods?.length ?? 0) > 0

        const complete =
          hasDisplayName &&
          hasLocation &&
          hasAtLeastOnePerson &&
          hasAtLeastOneGoal &&
          (hasFavorite || hasDisliked)

        setIsComplete(complete)
      } else {
        setProfile(null)
        setIsComplete(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch profile"))
      setProfile(null)
      setIsComplete(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  return {
    profile,
    isLoading,
    error,
    isComplete,
    refetch: fetchProfile,
  }
}
