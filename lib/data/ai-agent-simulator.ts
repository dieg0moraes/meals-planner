// Utility to simulate AI agent updates for testing
// This can be called from your AI widget to update data in real-time

import { createBrowserClient } from "@/lib/supabase/client"

export async function simulateAIAgentUpdate(updateType: "profile" | "preferences" | "habits", data: any) {
  const supabase = createBrowserClient()

  switch (updateType) {
    case "profile":
      // Update user profile
      const { error: profileError } = await supabase.from("user_profiles").upsert(data)

      if (profileError) {
        console.error("[v0] Error updating profile:", profileError)
      }
      break

    case "preferences":
      // Update family preferences
      const { error: preferencesError } = await supabase.from("family_preferences").upsert(data)

      if (preferencesError) {
        console.error("[v0] Error updating preferences:", preferencesError)
      }
      break

    case "habits":
      // Update cooking habits
      const { error: habitsError } = await supabase.from("cooking_habits").upsert(data)

      if (habitsError) {
        console.error("[v0] Error updating habits:", habitsError)
      }
      break
  }
}

// Mock function to simulate gradual AI updates (for testing without database)
export function simulateGradualUpdates(onUpdate: (type: string, data: any) => void, intervalMs = 2000) {
  const updates = [
    { type: "profile", data: { dietary_preferences: ["Low-Carb Diet"] } },
    { type: "profile", data: { dietary_preferences: ["Low-Carb Diet", "Loves Spicy Food"] } },
    { type: "profile", data: { allergies: ["Allergic to Nuts"] } },
    { type: "preferences", data: { preferences: ["Kids are picky eaters"] } },
    { type: "preferences", data: { preferences: ["Kids are picky eaters", "Prefers chicken over beef"] } },
    { type: "habits", data: { habits: ["30-minute meals preferred"] } },
    { type: "habits", data: { habits: ["30-minute meals preferred", "Meal prep on Sundays"] } },
  ]

  let index = 0
  const interval = setInterval(() => {
    if (index < updates.length) {
      onUpdate(updates[index].type, updates[index].data)
      index++
    } else {
      clearInterval(interval)
    }
  }, intervalMs)

  return () => clearInterval(interval)
}
