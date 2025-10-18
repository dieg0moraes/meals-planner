"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  fetchProfileCompletionStatus, 
  type OnboardingStatusResponse 
} from '@/lib/api/profile-completion-client'
import type { AgentOnboardingInput } from '@/types'

interface UseProfileCompletionPollingOptions {
  /** User ID to fetch completion status for */
  userId: string
  /** Polling interval in milliseconds (default: 3000ms / 3 seconds) */
  intervalMs?: number
  /** Whether to start polling immediately (default: true) */
  enabled?: boolean
  /** Maximum number of polling attempts (default: unlimited) */
  maxAttempts?: number
  /** Callback when polling completes (all steps done) */
  onComplete?: (status: OnboardingStatusResponse) => void
  /** Callback on each successful update */
  onUpdate?: (status: OnboardingStatusResponse) => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Stop polling when complete (default: false) */
  stopOnComplete?: boolean
}

interface UseProfileCompletionPollingReturn {
  /** Current onboarding status */
  status: OnboardingStatusResponse | null
  /** Whether polling is currently active */
  isPolling: boolean
  /** Whether data is being fetched */
  isLoading: boolean
  /** Last error encountered */
  error: Error | null
  /** Manually start polling */
  startPolling: () => void
  /** Manually stop polling */
  stopPolling: () => void
  /** Manually trigger a single fetch */
  refetch: () => Promise<void>
}

/**
 * Custom hook for polling profile completion status
 * 
 * This hook automatically fetches profile completion status at regular intervals
 * and stops polling once all steps are completed.
 * 
 * @example
 * ```tsx
 * const { status, isPolling, isLoading, error } = useProfileCompletionPolling({
 *   userId: 'user-123',
 *   intervalMs: 3000,
 *   onComplete: (status) => {
 *     console.log('Profile setup complete!', status)
 *   }
 * })
 * ```
 */
export function useProfileCompletionPolling(
  options: UseProfileCompletionPollingOptions
): UseProfileCompletionPollingReturn {
  const {
    userId,
    intervalMs = 3000,
    enabled = true,
    maxAttempts,
    onComplete,
    onUpdate,
    onError,
    stopOnComplete = false,
  } = options

  const [status, setStatus] = useState<OnboardingStatusResponse | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const attemptCountRef = useRef(0)
  const mountedRef = useRef(true)

  // Fetch function
  const fetchStatus = useCallback(async () => {
    if (!userId) {
      setError(new Error('userId is required'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const newStatus = await fetchProfileCompletionStatus(userId)
      
      // Only update if component is still mounted
      if (!mountedRef.current) return

      setStatus(newStatus)
      attemptCountRef.current++

      // Call update callback
      onUpdate?.(newStatus)

      // Check if onboarding is complete (all required fields present)
      const isComplete = checkOnboardingComplete(newStatus.onboardingData)
      if (isComplete) {
        onComplete?.(newStatus)
        if (stopOnComplete) {
          stopPolling()
        }
      }

      // Check if max attempts reached
      if (maxAttempts && attemptCountRef.current >= maxAttempts) {
        stopPolling()
      }
    } catch (err) {
      if (!mountedRef.current) return
      
      const error = err instanceof Error ? err : new Error('Unknown error occurred')
      setError(error)
      onError?.(error)
      
      // Optionally stop polling on error
      // stopPolling()
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [userId, maxAttempts, onComplete, onUpdate, onError])

  // Start polling
  const startPolling = useCallback(() => {
    if (isPolling) return

    setIsPolling(true)
    attemptCountRef.current = 0

    // Fetch immediately
    fetchStatus()

    // Set up interval
    intervalRef.current = setInterval(() => {
      fetchStatus()
    }, intervalMs)
  }, [isPolling, fetchStatus, intervalMs])

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false)
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Manual refetch
  const refetch = useCallback(async () => {
    await fetchStatus()
  }, [fetchStatus])

  // Auto-start polling if enabled
  useEffect(() => {
    if (enabled && userId) {
      startPolling()
    }

    return () => {
      stopPolling()
    }
  }, [enabled, userId]) // Only re-run if enabled or userId changes

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      stopPolling()
    }
  }, [stopPolling])

  return {
    status,
    isPolling,
    isLoading,
    error,
    startPolling,
    stopPolling,
    refetch,
  }
}

/**
 * Helper function to check if onboarding is complete
 */
function checkOnboardingComplete(data: Partial<AgentOnboardingInput> | null | undefined): boolean {
  if (!data) return false
  
  return !!(
    data.displayName &&
    data.household &&
    data.goals &&
    data.goals.length > 0
  )
}

