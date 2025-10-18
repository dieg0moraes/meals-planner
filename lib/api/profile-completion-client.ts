import type { AgentOnboardingInput } from '@/types'

export interface OnboardingStatusResponse {
  userId: string
  onboardingData: Partial<AgentOnboardingInput> | null
  lastUpdated: string
}

/**
 * Fetches the current onboarding data from the backend
 * 
 * @param userId - The ID of the user whose onboarding data to fetch
 * @returns Promise resolving to the onboarding status
 * @throws Error if the request fails
 */
export async function fetchProfileCompletionStatus(
  userId: string
): Promise<OnboardingStatusResponse> {
  const endpoint = `/api/profile-completion/${userId}`
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch onboarding status: ${response.status} ${response.statusText}`)
    }

    const data: OnboardingStatusResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching onboarding status:', error)
    throw error
  }
}
