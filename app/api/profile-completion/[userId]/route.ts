import { NextRequest, NextResponse } from 'next/server'
import type { OnboardingStatusResponse } from '@/lib/api/profile-completion-client'
import type { AgentOnboardingInput } from '@/types'

interface RouteParams {
  params: {
    userId: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = params

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // TODO: Replace with actual database query
    // Example:
    // const supabase = await getSupabaseServerClient()
    // const { data: profile, error } = await supabase
    //   .from('profiles')
    //   .select('*')
    //   .eq('id', userId)
    //   .single()
    //
    // const onboardingData: Partial<AgentOnboardingInput> = {
    //   displayName: profile.display_name,
    //   household: profile.household,
    //   dietaryRestrictions: profile.dietary_restrictions,
    //   favoriteFoods: profile.favorite_foods,
    //   dislikedFoods: profile.disliked_foods,
    //   goals: profile.goals,
    // }

    // Mock implementation - simulates gradual onboarding progress
    const random = Math.random()
    
    // Build household data progressively
    const household: { people: Array<any>, pets: Array<any> } = {
      people: [],
      pets: [],
    }
    
    // Add household members based on random probability
    if (random > 0.4) {
      household.people.push({ role: 'partner', estimatedAge: 30, gender: 'female' })
    }
    if (random > 0.6) {
      household.people.push({ role: 'son', estimatedAge: 8 })
    }
    if (random > 0.5) {
      household.pets.push({ animal: 'dog', name: 'Buddy' })
    }
    if (random > 0.8) {
      household.pets.push({ animal: 'cat', name: 'Whiskers' })
    }
    
    const mockOnboardingData: Partial<AgentOnboardingInput> = {
      displayName: 'Mock User',
      household,
      dietaryRestrictions: random > 0.3 ? ['vegetarian'] : [],
      favoriteFoods: random > 0.5 ? ['pasta', 'salad', 'pizza'] : undefined,
      dislikedFoods: random > 0.7 ? ['mushrooms', 'olives'] : undefined,
      goals: random > 0.2 ? ['save_money', 'eat_healthy'] : [],
    }

    const response: OnboardingStatusResponse = {
      userId,
      onboardingData: mockOnboardingData,
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error fetching onboarding status:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
