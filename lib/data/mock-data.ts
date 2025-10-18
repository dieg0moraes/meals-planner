// Mock data types
import type { UserProfile, Meal, WeeklyMeals, ShoppingList, ShoppingListItem } from "@/types"
import { FIXED_LOCATION, FIXED_TIME_ZONE } from "@/types"

export interface FamilyPreferences {
  id: string
  preferences: string[]
}

export interface CookingHabits {
  id: string
  habits: string[]
}

// Mock user profile
export const mockUserProfile: UserProfile = {
  id: "user-1",
  authUserId: "auth-user-1",
  displayName: "Ana García",
  locale: "es-UY",
  timeZone: FIXED_TIME_ZONE,
  location: FIXED_LOCATION,
  household: {
    people: [
      {
        id: "person-1",
        gender: "female",
        estimatedAge: 32,
        role: "self",
      },
      {
        id: "person-2",
        gender: "male",
        estimatedAge: 35,
        role: "partner",
      },
      {
        id: "person-3",
        gender: "female",
        estimatedAge: 8,
        role: "daughter",
      },
    ],
    pets: [
      {
        id: "pet-1",
        animal: "dog",
        name: "Luna",
      },
    ],
  },
  dietaryRestrictions: ["no_nuts", "low_carb"],
  favoriteFoods: ["chicken", "salmon", "avocado", "berries"],
  dislikedFoods: ["liver", "oysters"],
  goals: ["save_money", "maximize_protein", "kid_friendly"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  rawOnboarding: {},
}

// Mock meals
const mockMeals: Meal[] = [
  {
    id: "meal-1",
    name: "Greek Yogurt Bowl",
    ingredients: [
      { name: "Greek yogurt", quantity: 200, unit: "g" },
      { name: "Mixed berries", quantity: 100, unit: "g" },
      { name: "Honey", quantity: 1, unit: "tbsp", isOptional: true },
    ],
    tags: ["breakfast", "quick", "kid_friendly"],
    notes: "Perfect for busy mornings",
  },
  {
    id: "meal-2",
    name: "Grilled Chicken Salad",
    ingredients: [
      { name: "Chicken breast", quantity: 150, unit: "g" },
      { name: "Mixed greens", quantity: 100, unit: "g" },
      { name: "Cherry tomatoes", quantity: 50, unit: "g" },
      { name: "Olive oil", quantity: 1, unit: "tbsp" },
    ],
    tags: ["lunch_dinner", "high_protein"],
  },
  {
    id: "meal-3",
    name: "Grilled Salmon with Asparagus",
    ingredients: [
      { name: "Salmon fillet", quantity: 200, unit: "g" },
      { name: "Asparagus", quantity: 200, unit: "g" },
      { name: "Lemon", quantity: 0.5, unit: "unit" },
      { name: "Garlic", quantity: 2, unit: "unit" },
    ],
    tags: ["lunch_dinner", "high_protein"],
  },
  {
    id: "meal-4",
    name: "Avocado Toast",
    ingredients: [
      { name: "Whole wheat bread", quantity: 2, unit: "unit" },
      { name: "Avocado", quantity: 1, unit: "unit" },
      { name: "Eggs", quantity: 2, unit: "unit" },
      { name: "Cherry tomatoes", quantity: 50, unit: "g", isOptional: true },
    ],
    tags: ["breakfast", "quick"],
  },
  {
    id: "meal-5",
    name: "Chicken Stir-Fry",
    ingredients: [
      { name: "Chicken breast", quantity: 200, unit: "g" },
      { name: "Mixed vegetables", quantity: 300, unit: "g" },
      { name: "Soy sauce", quantity: 2, unit: "tbsp" },
      { name: "Ginger", quantity: 1, unit: "tsp" },
    ],
    tags: ["lunch_dinner", "quick", "kid_friendly"],
  },
  {
    id: "meal-6",
    name: "Quinoa Buddha Bowl",
    ingredients: [
      { name: "Quinoa", quantity: 100, unit: "g" },
      { name: "Chickpeas", quantity: 150, unit: "g" },
      { name: "Mixed vegetables", quantity: 200, unit: "g" },
      { name: "Tahini", quantity: 2, unit: "tbsp" },
    ],
    tags: ["lunch_dinner", "vegetarian"],
  },
  {
    id: "meal-7",
    name: "Baked Cod with Broccoli",
    ingredients: [
      { name: "Cod fillet", quantity: 200, unit: "g" },
      { name: "Broccoli", quantity: 200, unit: "g" },
      { name: "Lemon", quantity: 0.5, unit: "unit" },
      { name: "Olive oil", quantity: 1, unit: "tbsp" },
    ],
    tags: ["lunch_dinner", "high_protein"],
  },
  {
    id: "meal-8",
    name: "Scrambled Eggs with Veggies",
    ingredients: [
      { name: "Eggs", quantity: 3, unit: "unit" },
      { name: "Spinach", quantity: 50, unit: "g" },
      { name: "Cherry tomatoes", quantity: 50, unit: "g" },
      { name: "Cheese", quantity: 30, unit: "g", isOptional: true },
    ],
    tags: ["breakfast", "quick", "high_protein"],
  },
  {
    id: "meal-9",
    name: "Turkey Wrap",
    ingredients: [
      { name: "Turkey slices", quantity: 100, unit: "g" },
      { name: "Whole wheat tortilla", quantity: 1, unit: "unit" },
      { name: "Lettuce", quantity: 50, unit: "g" },
      { name: "Tomato", quantity: 1, unit: "unit" },
    ],
    tags: ["lunch_dinner", "quick"],
  },
  {
    id: "meal-10",
    name: "Beef Tacos",
    ingredients: [
      { name: "Ground beef", quantity: 200, unit: "g" },
      { name: "Taco shells", quantity: 4, unit: "unit" },
      { name: "Lettuce", quantity: 50, unit: "g" },
      { name: "Cheese", quantity: 50, unit: "g" },
      { name: "Salsa", quantity: 3, unit: "tbsp", isOptional: true },
    ],
    tags: ["lunch_dinner", "kid_friendly"],
  },
]

// Mock weekly meals
export const mockWeeklyMeals: WeeklyMeals = {
  id: "weekly-1",
  userId: "user-1",
  weekStartDate: new Date().toISOString(),
  meals: mockMeals,
  summary: "Balanced meal plan with high protein and kid-friendly options",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Mock shopping list items
const mockShoppingItems: ShoppingListItem[] = [
  // Produce
  { id: "s1", name: "Avocados", quantity: 2, unit: "unit", category: "Produce", checked: false },
  { id: "s2", name: "Mixed berries", quantity: 300, unit: "g", category: "Produce", checked: false },
  { id: "s3", name: "Asparagus", quantity: 400, unit: "g", category: "Produce", checked: false },
  { id: "s4", name: "Broccoli", quantity: 400, unit: "g", category: "Produce", checked: false },
  { id: "s5", name: "Cherry tomatoes", quantity: 300, unit: "g", category: "Produce", checked: false },
  { id: "s6", name: "Mixed greens", quantity: 200, unit: "g", category: "Produce", checked: false },
  { id: "s7", name: "Spinach", quantity: 100, unit: "g", category: "Produce", checked: false },
  { id: "s8", name: "Lettuce", quantity: 200, unit: "g", category: "Produce", checked: false },
  { id: "s9", name: "Lemon", quantity: 3, unit: "unit", category: "Produce", checked: false },
  { id: "s10", name: "Garlic", quantity: 1, unit: "pack", category: "Produce", checked: false },
  // Dairy & Eggs
  { id: "s11", name: "Greek yogurt", quantity: 500, unit: "g", category: "Dairy & Eggs", checked: false },
  { id: "s12", name: "Eggs", quantity: 12, unit: "unit", category: "Dairy & Eggs", checked: false },
  { id: "s13", name: "Cheese", quantity: 200, unit: "g", category: "Dairy & Eggs", checked: false },
  // Meat & Fish
  { id: "s14", name: "Salmon fillet", quantity: 400, unit: "g", category: "Meat & Fish", checked: false },
  { id: "s15", name: "Chicken breast", quantity: 800, unit: "g", category: "Meat & Fish", checked: false },
  { id: "s16", name: "Cod fillet", quantity: 400, unit: "g", category: "Meat & Fish", checked: false },
  { id: "s17", name: "Ground beef", quantity: 400, unit: "g", category: "Meat & Fish", checked: false },
  { id: "s18", name: "Turkey slices", quantity: 200, unit: "g", category: "Meat & Fish", checked: false },
  // Pantry
  { id: "s19", name: "Quinoa", quantity: 200, unit: "g", category: "Pantry", checked: false },
  { id: "s20", name: "Chickpeas", quantity: 300, unit: "g", category: "Pantry", checked: false },
  { id: "s21", name: "Whole wheat bread", quantity: 1, unit: "pack", category: "Pantry", checked: false },
  { id: "s22", name: "Whole wheat tortilla", quantity: 1, unit: "pack", category: "Pantry", checked: false },
  { id: "s23", name: "Taco shells", quantity: 1, unit: "pack", category: "Pantry", checked: false },
  { id: "s24", name: "Olive oil", quantity: 1, unit: "pack", category: "Pantry", checked: false },
  { id: "s25", name: "Soy sauce", quantity: 1, unit: "pack", category: "Pantry", checked: false },
  { id: "s26", name: "Tahini", quantity: 1, unit: "pack", category: "Pantry", checked: false },
]

// Mock shopping list
export const mockShoppingList: ShoppingList = {
  id: "shopping-1",
  userId: "user-1",
  weekMealsId: "weekly-1",
  items: mockShoppingItems,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}
