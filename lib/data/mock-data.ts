// Mock data types
export interface UserProfile {
  id: string
  name: string
  avatar_color: string
  dietary_preferences: string[]
  allergies: string[]
}

export interface FamilyPreferences {
  id: string
  preferences: string[]
}

export interface CookingHabits {
  id: string
  habits: string[]
}

export interface Meal {
  id: string
  name: string
  ingredients: string
  meal_type: "Breakfast" | "Lunch" | "Dinner"
  day: string
  image_query: string
}

export interface ShoppingItem {
  id: string
  name: string
  quantity: string
  category: string
  recipe: string
}

// Mock user profiles
export const mockUserProfiles: UserProfile[] = [
  {
    id: "1",
    name: "Ana",
    avatar_color: "primary",
    dietary_preferences: ["Low-Carb Diet", "Loves Spicy Food"],
    allergies: ["Allergic to Nuts"],
  },
  {
    id: "2",
    name: "John",
    avatar_color: "blue",
    dietary_preferences: ["High Protein", "No Seafood"],
    allergies: [],
  },
  {
    id: "3",
    name: "Emma",
    avatar_color: "purple",
    dietary_preferences: ["Vegetarian", "Loves Pasta"],
    allergies: [],
  },
]

// Mock family preferences
export const mockFamilyPreferences: FamilyPreferences = {
  id: "1",
  preferences: [
    "Kids are picky eaters",
    "Prefers chicken over beef",
    "Vegetarian options needed",
    "No spicy food for kids",
  ],
}

// Mock cooking habits
export const mockCookingHabits: CookingHabits = {
  id: "1",
  habits: ["30-minute meals preferred", "Meal prep on Sundays", "Loves one-pot dishes", "Batch cooking friendly"],
}

// Mock meal plan
export const mockMealPlan: Meal[] = [
  // Monday
  {
    id: "m1",
    name: "Greek Yogurt Bowl",
    ingredients: "200g Greek yogurt, Mixed berries",
    meal_type: "Breakfast",
    day: "Monday",
    image_query: "Greek Yogurt Bowl",
  },
  {
    id: "m2",
    name: "Grilled Chicken Salad",
    ingredients: "150g Chicken breast, Mixed greens",
    meal_type: "Lunch",
    day: "Monday",
    image_query: "Grilled Chicken Salad",
  },
  {
    id: "m3",
    name: "Grilled Salmon with Asparagus",
    ingredients: "200g Salmon, 1 bunch Asparagus",
    meal_type: "Dinner",
    day: "Monday",
    image_query: "Grilled Salmon with Asparagus",
  },
  // Tuesday
  {
    id: "m4",
    name: "Avocado Toast",
    ingredients: "2 slices bread, 1 Avocado",
    meal_type: "Breakfast",
    day: "Tuesday",
    image_query: "Avocado Toast",
  },
  {
    id: "m5",
    name: "Quinoa Buddha Bowl",
    ingredients: "1 cup Quinoa, Veggies",
    meal_type: "Lunch",
    day: "Tuesday",
    image_query: "Quinoa Buddha Bowl",
  },
  {
    id: "m6",
    name: "Chicken Stir-Fry",
    ingredients: "200g Chicken, Mixed vegetables",
    meal_type: "Dinner",
    day: "Tuesday",
    image_query: "Chicken Stir-Fry",
  },
  // Wednesday
  {
    id: "m7",
    name: "Protein Smoothie",
    ingredients: "Protein powder, Banana, Spinach",
    meal_type: "Breakfast",
    day: "Wednesday",
    image_query: "Protein Smoothie",
  },
  {
    id: "m8",
    name: "Turkey Wrap",
    ingredients: "100g Turkey, Whole wheat wrap",
    meal_type: "Lunch",
    day: "Wednesday",
    image_query: "Turkey Wrap",
  },
  {
    id: "m9",
    name: "Baked Cod with Broccoli",
    ingredients: "200g Cod, 1 head Broccoli",
    meal_type: "Dinner",
    day: "Wednesday",
    image_query: "Baked Cod with Broccoli",
  },
  // Thursday
  {
    id: "m10",
    name: "Scrambled Eggs",
    ingredients: "3 Eggs, Cherry tomatoes",
    meal_type: "Breakfast",
    day: "Thursday",
    image_query: "Scrambled Eggs",
  },
  {
    id: "m11",
    name: "Lentil Soup",
    ingredients: "1 cup Lentils, Vegetables",
    meal_type: "Lunch",
    day: "Thursday",
    image_query: "Lentil Soup",
  },
  {
    id: "m12",
    name: "Beef Tacos",
    ingredients: "200g Ground beef, Taco shells",
    meal_type: "Dinner",
    day: "Thursday",
    image_query: "Beef Tacos",
  },
  // Friday
  {
    id: "m13",
    name: "Oatmeal with Berries",
    ingredients: "1 cup Oats, Mixed berries",
    meal_type: "Breakfast",
    day: "Friday",
    image_query: "Oatmeal with Berries",
  },
  {
    id: "m14",
    name: "Caprese Sandwich",
    ingredients: "Mozzarella, Tomatoes, Basil",
    meal_type: "Lunch",
    day: "Friday",
    image_query: "Caprese Sandwich",
  },
  {
    id: "m15",
    name: "Shrimp Pasta",
    ingredients: "200g Shrimp, Whole wheat pasta",
    meal_type: "Dinner",
    day: "Friday",
    image_query: "Shrimp Pasta",
  },
  // Saturday
  {
    id: "m16",
    name: "Pancakes",
    ingredients: "Whole wheat flour, Eggs, Milk",
    meal_type: "Breakfast",
    day: "Saturday",
    image_query: "Pancakes",
  },
  {
    id: "m17",
    name: "Chicken Caesar Salad",
    ingredients: "150g Chicken, Romaine lettuce",
    meal_type: "Lunch",
    day: "Saturday",
    image_query: "Chicken Caesar Salad",
  },
  {
    id: "m18",
    name: "Grilled Steak",
    ingredients: "200g Steak, Sweet potato",
    meal_type: "Dinner",
    day: "Saturday",
    image_query: "Grilled Steak",
  },
  // Sunday
  {
    id: "m19",
    name: "French Toast",
    ingredients: "2 slices bread, Eggs, Cinnamon",
    meal_type: "Breakfast",
    day: "Sunday",
    image_query: "French Toast",
  },
  {
    id: "m20",
    name: "Veggie Pizza",
    ingredients: "Pizza dough, Vegetables",
    meal_type: "Lunch",
    day: "Sunday",
    image_query: "Veggie Pizza",
  },
  {
    id: "m21",
    name: "Roasted Chicken",
    ingredients: "1 whole Chicken, Root vegetables",
    meal_type: "Dinner",
    day: "Sunday",
    image_query: "Roasted Chicken",
  },
]

// Mock shopping list
export const mockShoppingList: ShoppingItem[] = [
  // Produce
  { id: "s1", name: "Avocados", quantity: "2 units", category: "Produce", recipe: "Avocado Toast" },
  { id: "s2", name: "Mixed Berries", quantity: "300g", category: "Produce", recipe: "Greek Yogurt Bowl" },
  { id: "s3", name: "Asparagus", quantity: "1 bunch", category: "Produce", recipe: "Grilled Salmon" },
  { id: "s4", name: "Broccoli", quantity: "1 head", category: "Produce", recipe: "Baked Cod" },
  { id: "s5", name: "Cherry Tomatoes", quantity: "250g", category: "Produce", recipe: "Scrambled Eggs" },
  { id: "s6", name: "Mixed Greens", quantity: "200g", category: "Produce", recipe: "Chicken Salad" },
  { id: "s7", name: "Spinach", quantity: "100g", category: "Produce", recipe: "Protein Smoothie" },
  { id: "s8", name: "Romaine Lettuce", quantity: "1 head", category: "Produce", recipe: "Caesar Salad" },
  // Dairy & Eggs
  { id: "s9", name: "Greek Yogurt", quantity: "500g", category: "Dairy & Eggs", recipe: "Yogurt Bowl" },
  { id: "s10", name: "Eggs", quantity: "12 units", category: "Dairy & Eggs", recipe: "Multiple recipes" },
  { id: "s11", name: "Mozzarella", quantity: "200g", category: "Dairy & Eggs", recipe: "Caprese Sandwich" },
  { id: "s12", name: "Milk", quantity: "1L", category: "Dairy & Eggs", recipe: "Pancakes" },
  // Meat & Fish
  { id: "s13", name: "Salmon Fillets", quantity: "400g", category: "Meat & Fish", recipe: "Grilled Salmon" },
  { id: "s14", name: "Chicken Breast", quantity: "800g", category: "Meat & Fish", recipe: "Multiple recipes" },
  { id: "s15", name: "Cod Fillets", quantity: "400g", category: "Meat & Fish", recipe: "Baked Cod" },
  { id: "s16", name: "Ground Beef", quantity: "400g", category: "Meat & Fish", recipe: "Beef Tacos" },
  { id: "s17", name: "Shrimp", quantity: "400g", category: "Meat & Fish", recipe: "Shrimp Pasta" },
  { id: "s18", name: "Turkey Slices", quantity: "200g", category: "Meat & Fish", recipe: "Turkey Wrap" },
  { id: "s19", name: "Steak", quantity: "400g", category: "Meat & Fish", recipe: "Grilled Steak" },
  { id: "s20", name: "Whole Chicken", quantity: "1 unit", category: "Meat & Fish", recipe: "Roasted Chicken" },
  // Pantry
  { id: "s21", name: "Quinoa", quantity: "500g", category: "Pantry", recipe: "Buddha Bowl" },
  { id: "s22", name: "Lentils", quantity: "300g", category: "Pantry", recipe: "Lentil Soup" },
  { id: "s23", name: "Whole Wheat Bread", quantity: "1 loaf", category: "Pantry", recipe: "Multiple recipes" },
  { id: "s24", name: "Oats", quantity: "500g", category: "Pantry", recipe: "Oatmeal" },
  { id: "s25", name: "Whole Wheat Pasta", quantity: "500g", category: "Pantry", recipe: "Shrimp Pasta" },
  { id: "s26", name: "Taco Shells", quantity: "1 pack", category: "Pantry", recipe: "Beef Tacos" },
  { id: "s27", name: "Pizza Dough", quantity: "1 unit", category: "Pantry", recipe: "Veggie Pizza" },
]
