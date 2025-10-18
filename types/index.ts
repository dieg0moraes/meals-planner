// Shared types for Meals Planner MVP
// Mirrors the definitions used during design for rapid prototyping
import { z } from "zod";

export type UUID = string;
export type ISODateString = string;

export interface Address {
    countryCode: string; // e.g. "UY"
    stateOrRegion?: string; // e.g. "Montevideo"
    city?: string; // e.g. "Pocitos"
}

export interface Person {
    id: UUID;
    gender?: string; // e.g. "male", "female", "non_binary" (free text)
    estimatedAge?: number; // years
    role: string; // e.g. "brother", "parent", "girlfriend", "roommate"
}

export interface Pet {
    id: UUID;
    animal: string; // e.g. "dog", "cat", "bird"
    name?: string | null;
}

export interface Household {
    people: Person[];
    pets: Pet[];
}

export interface UserProfile {
    id: UUID;
    authUserId: string;
    displayName: string;
    locale?: string;
    timeZone?: string;
    location: Address;
    household: Household;
    dietaryRestrictions: string[];
    favoriteFoods?: string[];
    dislikedFoods?: string[];
    goals: string[]; // e.g. ["save_money", "maximize_protein"]
    createdAt: ISODateString;
    updatedAt: ISODateString;
    rawOnboarding?: Record<string, unknown>;
}

export type Unit =
    | "unit"
    | "g"
    | "kg"
    | "ml"
    | "l"
    | "tbsp"
    | "tsp"
    | "cup"
    | "pack";

export interface IngredientQuantity {
    name: string;
    quantity: number;
    unit: Unit;
    isOptional?: boolean; // toppings/spices/sauces
    notes?: string;
}

export interface Meal {
    id: UUID;
    name: string;
    ingredients: IngredientQuantity[];
    tags?: string[]; // e.g. ["quick", "kid_friendly", "breakfast", "lunch_dinner"]
    notes?: string;
}

export interface WeeklyMeals {
    id: UUID;
    userId: UUID;
    weekStartDate: ISODateString;
    meals: Meal[]; // target ~10
    targetMealsCount?: number; // user-requested count to guide the agent/UI
    summary?: string;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

export interface ShoppingListItem {
    id: UUID;
    name: string;
    quantity: number;
    unit: Unit;
    category?: string;
    checked: boolean;
    source?: { mealId?: UUID };
    notes?: string;
}

export interface ShoppingList {
    id: UUID;
    userId: UUID;
    weekMealsId?: UUID;
    items: ShoppingListItem[];
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

export interface PantryItem {
    id: UUID;
    userId: UUID;
    name: string;
    quantity: number;
    unit: Unit;
    expiresOn?: ISODateString;
    notes?: string;
}

export interface PantrySnapshot {
    id: UUID;
    userId: UUID;
    capturedAt: ISODateString;
    items: PantryItem[];
}

export interface DemoState {
    profile?: UserProfile;
    weeklyMeals?: WeeklyMeals;
    shoppingList?: ShoppingList;
}

export const FIXED_LOCATION: Address = {
    countryCode: "UY",
    stateOrRegion: "Montevideo",
    city: "Pocitos",
};

export const FIXED_TIME_ZONE = "America/Montevideo";

export interface AgentOnboardingInput {
    displayName: string;
    household: {
        people: Array<Omit<Person, "id">>;
        pets: Array<Omit<Pet, "id">>;
    };
    dietaryRestrictions: string[];
    favoriteFoods?: string[];
    dislikedFoods?: string[];
    goals: string[];
    rawOnboarding?: Record<string, unknown>;
}

export const AgentOnboardingInputSchema = z.object({
    displayName: z.string().min(1),
    household: z.object({
        people: z
            .array(
                z.object({
                    gender: z.string().nullable(),
                    estimatedAge: z.number().int().min(0).max(120).nullable(),
                    role: z.string(),
                })
            )
            .default([]),
        pets: z
            .array(
                z.object({
                    animal: z.string(),
                    name: z.string().nullable(),
                })
            )
            .default([]),
    }),
    dietaryRestrictions: z.array(z.string()).default([]),
    favoriteFoods: z.array(z.string()).default([]),
    dislikedFoods: z.array(z.string()).default([]),
    goals: z.array(z.string()).default([]),
});

export type AgentOnboardingInputParsed = z.infer<typeof AgentOnboardingInputSchema>;
