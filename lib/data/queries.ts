import {
  mockUserProfiles,
  mockFamilyPreferences,
  mockCookingHabits,
  mockMealPlan,
  mockShoppingList,
  type UserProfile,
  type FamilyPreferences,
  type CookingHabits,
  type Meal,
  type ShoppingItem,
} from "./mock-data"

// Toggle this to switch between mock data and real Supabase queries
const USE_MOCK_DATA = true

// User Profiles
export async function getUserProfiles(): Promise<UserProfile[]> {
  if (USE_MOCK_DATA) {
    return mockUserProfiles
  }

  // TODO: Replace with real Supabase query when database is ready
  // const supabase = await getSupabaseServerClient()
  // const { data, error } = await supabase.from('user_profiles').select('*')
  // if (error) throw error
  // return data

  return mockUserProfiles
}

// Family Preferences
export async function getFamilyPreferences(): Promise<FamilyPreferences> {
  if (USE_MOCK_DATA) {
    return mockFamilyPreferences
  }

  // TODO: Replace with real Supabase query when database is ready
  // const supabase = await getSupabaseServerClient()
  // const { data, error } = await supabase.from('family_preferences').select('*').single()
  // if (error) throw error
  // return data

  return mockFamilyPreferences
}

// Cooking Habits
export async function getCookingHabits(): Promise<CookingHabits> {
  if (USE_MOCK_DATA) {
    return mockCookingHabits
  }

  // TODO: Replace with real Supabase query when database is ready
  // const supabase = await getSupabaseServerClient()
  // const { data, error } = await supabase.from('cooking_habits').select('*').single()
  // if (error) throw error
  // return data

  return mockCookingHabits
}

// Meal Plan
export async function getMealPlan(): Promise<Meal[]> {
  if (USE_MOCK_DATA) {
    return mockMealPlan
  }

  // TODO: Replace with real Supabase query when database is ready
  // const supabase = await getSupabaseServerClient()
  // const { data, error } = await supabase.from('meals').select('*').order('day')
  // if (error) throw error
  // return data

  return mockMealPlan
}

// Shopping List
export async function getShoppingList(): Promise<ShoppingItem[]> {
  if (USE_MOCK_DATA) {
    return mockShoppingList
  }

  // TODO: Replace with real Supabase query when database is ready
  // const supabase = await getSupabaseServerClient()
  // const { data, error } = await supabase.from('shopping_items').select('*').order('category')
  // if (error) throw error
  // return data

  return mockShoppingList
}

// Helper to group shopping items by category
export function groupShoppingItemsByCategory(items: ShoppingItem[]): Record<string, ShoppingItem[]> {
  return items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, ShoppingItem[]>,
  )
}

// Helper to group meals by day
export function groupMealsByDay(meals: Meal[]): Record<string, Meal[]> {
  return meals.reduce(
    (acc, meal) => {
      if (!acc[meal.day]) {
        acc[meal.day] = []
      }
      acc[meal.day].push(meal)
      return acc
    },
    {} as Record<string, Meal[]>,
  )
}
