import { mockUserProfile, mockWeeklyMeals, mockShoppingList } from "./mock-data"
import type { UserProfile, Meal, WeeklyMeals, ShoppingListItem } from "@/types"

// Toggle this to switch between mock data and real Supabase queries
const USE_MOCK_DATA = true

// User Profile
export async function getUserProfile(): Promise<UserProfile> {
  if (USE_MOCK_DATA) {
    return mockUserProfile
  }

  // TODO: Replace with real Supabase query when database is ready
  // const supabase = await getSupabaseServerClient()
  // const { data, error } = await supabase.from('profiles').select('*').single()
  // if (error) throw error
  // return data

  return mockUserProfile
}

// Weekly Meals
export async function getWeeklyMeals(): Promise<WeeklyMeals> {
  if (USE_MOCK_DATA) {
    return mockWeeklyMeals
  }

  // TODO: Replace with real Supabase query when database is ready
  // const supabase = await getSupabaseServerClient()
  // const { data, error } = await supabase.from('weekly_meals').select('*').single()
  // if (error) throw error
  // return data

  return mockWeeklyMeals
}

// Meal Plan (just the meals array)
export async function getMealPlan(): Promise<Meal[]> {
  const weeklyMeals = await getWeeklyMeals()
  return weeklyMeals.meals
}

// Shopping List
export async function getShoppingList(): Promise<ShoppingListItem[]> {
  if (USE_MOCK_DATA) {
    return mockShoppingList.items
  }

  // TODO: Replace with real Supabase query when database is ready
  // const supabase = await getSupabaseServerClient()
  // const { data, error } = await supabase.from('shopping_lists').select('*').single()
  // if (error) throw error
  // return data.items

  return mockShoppingList.items
}

// Helper to group shopping items by category
export function groupShoppingItemsByCategory(items: ShoppingListItem[]): Record<string, ShoppingListItem[]> {
  return items.reduce(
    (acc, item) => {
      const category = item.category || "Other"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(item)
      return acc
    },
    {} as Record<string, ShoppingListItem[]>,
  )
}

// We'll organize by meal tags (breakfast, lunch_dinner) for now
export function groupMealsByDay(meals: Meal[]): Record<string, Meal[]> {
  // For now, distribute meals across the week
  // In a real implementation, meals would have day assignments
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const grouped: Record<string, Meal[]> = {}

  daysOfWeek.forEach((day, index) => {
    grouped[day] = []
  })

  // Distribute meals evenly across the week (simplified logic)
  meals.forEach((meal, index) => {
    const dayIndex = index % 7
    grouped[daysOfWeek[dayIndex]].push(meal)
  })

  return grouped
}
