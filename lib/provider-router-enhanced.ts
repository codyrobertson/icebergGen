import { withTimeout } from "./utils/async-utils"

/**
 * Enhanced Provider Router
 *
 * Adds sophisticated health checks, adaptive cooldown, and
 * improved provider status management.
 */

/**
 * Represents the status of a search provider.
 */
export interface ProviderStatus {
  failureCount: number
  lastFailureTime: number | null
  weight: number
  isDeprecated: boolean
  lastErrorMessage?: string
  responseTime?: number[]
  successCount: number
  healthCheckStatus: "passing" | "warning" | "failing" | "unknown"
  cooldownMultiplier: number
}

export type ProviderName = "tavily" | "exa" | "google" | "openrouter"

// Constants for threshold and cooldown (in milliseconds)
const FAILURE_THRESHOLD = 3
const BASE_COOLDOWN_PERIOD = 5 * 60 * 1000 // 5 minutes base cooldown
const RATE_LIMIT_COOLDOWN = 60 * 60 * 1000 // 1 hour for rate limit errors
const MAX_COOLDOWN = 24 * 60 * 60 * 1000 // 24 hours maximum cooldown
const MIN_COOLDOWN = 60 * 1000 // 1 minute minimum cooldown
const HEALTH_CHECK_INTERVAL = 15 * 60 * 1000 // 15 minutes

// Health check thresholds
const MAX_ACCEPTABLE_RESPONSE_TIME = 5000 // 5 seconds
const WARNING_RESPONSE_TIME = 3000 // 3 seconds

// Response time tracking
const MAX_RESPONSE_TIMES = 10 // Keep track of the last 10 response times

// In-memory status store for each provider
const providerStatuses: Record<ProviderName, ProviderStatus> = {
  tavily: {
    failureCount: 0,
    lastFailureTime: null,
    weight: 1,
    isDeprecated: false,
    responseTime: [],
    successCount: 0,
    healthCheckStatus: "unknown",
    cooldownMultiplier: 1,
  },
  exa: {
    failureCount: 0,
    lastFailureTime: null,
    weight: 1,
    isDeprecated: false,
    responseTime: [],
    successCount: 0,
    healthCheckStatus: "unknown",
    cooldownMultiplier: 1,
  },
  google: {
    failureCount: 0,
    lastFailureTime: null,
    weight: 1,
    isDeprecated: false,
    responseTime: [],
    successCount: 0,
    healthCheckStatus: "unknown",
    cooldownMultiplier: 1,
  },
  openrouter: {
    failureCount: 0,
    lastFailureTime: null,
    weight: 1,
    isDeprecated: false,
    responseTime: [],
    successCount: 0,
    healthCheckStatus: "unknown",
    cooldownMultiplier: 1,
  },
}

// Last health check timestamp
let lastHealthCheckTime = 0

/**
 * Records a failure for a given provider and reduces its routing weight.
 * @param provider The provider name
 * @param error The error that occurred
 * @param isRateLimit Whether the error is a rate limit error
 * @param responseTime Optional response time in milliseconds
 */
export function recordProviderFailure(
  provider: ProviderName,
  error?: Error,
  isRateLimit = false,
  responseTime?: number,
): void {
  const status = providerStatuses[provider]
  status.failureCount++
  status.lastFailureTime = Date.now()
  status.lastErrorMessage = error?.message || "Unknown error"

  // Track response time if provided
  if (responseTime) {
    trackResponseTime(provider, responseTime)
  }

  // Rate limit errors cause immediate deprecation with longer cooldown
  if (isRateLimit) {
    console.log(`Provider ${provider} rate limited, deprecating immediately`)
    status.isDeprecated = true
    status.weight = 0
    status.healthCheckStatus = "failing"
    status.cooldownMultiplier = 2 // Double the cooldown for rate limit errors
    return
  }

  // Calculate new weight based on failure pattern
  updateProviderWeight(provider)

  // Update health check status
  updateHealthStatus(provider)
}

/**
 * Records a successful call to a provider.
 * @param provider The provider name
 * @param responseTime Response time in milliseconds
 */
export function recordProviderSuccess(provider: ProviderName, responseTime?: number): void {
  const status = providerStatuses[provider]
  status.successCount++

  // Track response time if provided
  if (responseTime) {
    trackResponseTime(provider, responseTime)
  }

  // If the provider was previously failing but not fully deprecated,
  // gradually increase its weight
  if (status.failureCount > 0 && !status.isDeprecated) {
    status.failureCount = Math.max(0, status.failureCount - 1)

    // Update weight with improved algorithm
    updateProviderWeight(provider)

    console.log(`Provider ${provider} weight increased to ${status.weight}`)
  } else if (status.isDeprecated) {
    // If it was deprecated, reset it with probational weight
    resetProviderStatus(provider, 0.5)
  } else if (status.weight < 1) {
    // If weight is less than 1, gradually increase it
    status.weight = Math.min(1, status.weight + 0.1)
  }

  // Update health check status
  updateHealthStatus(provider)
}

/**
 * Track response time for a provider
 * @param provider The provider name
 * @param responseTime Response time in milliseconds
 */
function trackResponseTime(provider: ProviderName, responseTime: number): void {
  const status = providerStatuses[provider]

  // Add the new response time
  status.responseTime = [responseTime, ...(status.responseTime || [])].slice(0, MAX_RESPONSE_TIMES)
}

/**
 * Calculate the average response time for a provider
 * @param provider The provider name
 */
function getAverageResponseTime(provider: ProviderName): number | null {
  const times = providerStatuses[provider].responseTime
  if (!times || times.length === 0) return null

  const sum = times.reduce((total, time) => total + time, 0)
  return sum / times.length
}

/**
 * Update the weight of a provider based on its performance
 * @param provider The provider name
 */
function updateProviderWeight(provider: ProviderName): void {
  const status = providerStatuses[provider]

  // Calculate a performance score based on failures and response time
  const failureRatio = status.failureCount / (status.failureCount + status.successCount || 1)

  // Response time factor (1.0 for fast, 0.5 for slow)
  const avgResponseTime = getAverageResponseTime(provider)
  const responseTimeFactor = avgResponseTime ? Math.max(0.5, 1 - avgResponseTime / MAX_ACCEPTABLE_RESPONSE_TIME) : 1

  // Calculate new weight
  const newWeight = Math.max(0.1, (1 - failureRatio) * responseTimeFactor)

  // Gradually deprecate if failures exceed threshold
  if (status.failureCount >= FAILURE_THRESHOLD) {
    console.log(`Provider ${provider} reached failure threshold, deprecating`)
    status.isDeprecated = true
    status.weight = 0
    status.healthCheckStatus = "failing"
  } else {
    // Update weight with a dampening factor to avoid wild swings
    const dampening = 0.7 // 30% change maximum per update
    status.weight = status.weight * dampening + newWeight * (1 - dampening)
    console.log(`Provider ${provider} weight updated to ${status.weight.toFixed(2)}`)
  }
}

/**
 * Update the health status of a provider
 * @param provider The provider name
 */
function updateHealthStatus(provider: ProviderName): void {
  const status = providerStatuses[provider]

  if (status.isDeprecated) {
    status.healthCheckStatus = "failing"
    return
  }

  // Check failure count
  if (status.failureCount >= FAILURE_THRESHOLD - 1) {
    status.healthCheckStatus = "failing"
    return
  }

  if (status.failureCount > 0) {
    status.healthCheckStatus = "warning"
    return
  }

  // Check response time
  const avgResponseTime = getAverageResponseTime(provider)
  if (avgResponseTime) {
    if (avgResponseTime > MAX_ACCEPTABLE_RESPONSE_TIME) {
      status.healthCheckStatus = "warning"
      return
    }

    if (avgResponseTime > WARNING_RESPONSE_TIME) {
      status.healthCheckStatus = "warning"
      return
    }
  }

  status.healthCheckStatus = "passing"
}

/**
 * Resets the provider status after a successful call or cooldown.
 * @param provider The provider name
 * @param initialWeight Initial weight after reset (default: 1)
 */
export function resetProviderStatus(provider: ProviderName, initialWeight = 1): void {
  console.log(`Resetting status for provider ${provider}`)
  providerStatuses[provider] = {
    ...providerStatuses[provider],
    failureCount: 0,
    lastFailureTime: null,
    weight: initialWeight,
    isDeprecated: false,
    healthCheckStatus: "unknown",
    cooldownMultiplier: 1,
  }
}

/**
 * Checks whether a provider should be considered recovered based on the cooldown period.
 * If the cooldown has passed, it resets the provider's status.
 * @param provider The provider name
 */
export function checkProviderRecovery(provider: ProviderName): void {
  const status = providerStatuses[provider]
  if (!status.isDeprecated || !status.lastFailureTime) {
    return
  }

  // Calculate adaptive cooldown based on error type and failure history
  let cooldown = BASE_COOLDOWN_PERIOD

  // Use a longer cooldown for rate limit errors
  if (status.lastErrorMessage?.toLowerCase().includes("rate limit")) {
    cooldown = RATE_LIMIT_COOLDOWN
  }

  // Apply the cooldown multiplier (increases with repeated failures)
  cooldown *= status.cooldownMultiplier

  // Cap the cooldown between min and max values
  cooldown = Math.min(MAX_COOLDOWN, Math.max(MIN_COOLDOWN, cooldown))

  if (Date.now() - status.lastFailureTime > cooldown) {
    console.log(`Cooldown period of ${cooldown / 1000}s passed for ${provider}, resetting status with probation`)

    // Reset with a probation weight - will be increased on success
    providerStatuses[provider] = {
      ...status,
      failureCount: 0,
      lastFailureTime: null,
      weight: 0.3, // Start with reduced weight after recovery
      isDeprecated: false,
      healthCheckStatus: "warning",
    }
  }
}

/**
 * Performs a lightweight health check on a provider.
 * This is a stub function - in a real implementation, you'd make a
 * lightweight call to the provider API to check its status.
 * @param provider The provider name
 */
async function performHealthCheck(provider: ProviderName): Promise<boolean> {
  try {
    // This is a stub - in a real implementation you would
    // make a lightweight API call to check the provider's health
    console.log(`Performing health check for ${provider}...`)

    // Simulate a health check with a 90% success rate
    const isHealthy = Math.random() < 0.9

    if (isHealthy) {
      console.log(`Health check for ${provider} passed`)
    } else {
      console.log(`Health check for ${provider} failed`)
    }

    return isHealthy
  } catch (error) {
    console.error(`Health check for ${provider} failed with error:`, error)
    return false
  }
}

/**
 * Run health checks on all providers that haven't been checked recently
 */
export async function runHealthChecks(): Promise<void> {
  const now = Date.now()

  // Only run health checks periodically
  if (now - lastHealthCheckTime < HEALTH_CHECK_INTERVAL) {
    return
  }

  lastHealthCheckTime = now
  console.log("Running health checks on all providers...")

  const checkPromises = Object.keys(providerStatuses).map(async (providerName) => {
    const provider = providerName as ProviderName
    const status = providerStatuses[provider]

    // Skip health check for providers that are working fine
    if (status.healthCheckStatus === "passing" && !status.isDeprecated) {
      return
    }

    // Skip very recently failed providers
    if (status.lastFailureTime && now - status.lastFailureTime < MIN_COOLDOWN) {
      return
    }

    try {
      // Add a timeout to the health check
      const isHealthy = await withTimeout(performHealthCheck(provider), 5000)

      if (isHealthy && status.isDeprecated) {
        // If the provider was deprecated but is now healthy, reset with probation
        resetProviderStatus(provider, 0.3)
      } else if (isHealthy) {
        // Just update the health status
        status.healthCheckStatus = "passing"
      } else if (!status.isDeprecated) {
        // Mark as warning if not already deprecated
        status.healthCheckStatus = "warning"
      }
    } catch (error) {
      console.error(`Health check for ${provider} timed out`)
      // Don't change status on timeout, as this might be a temporary issue
    }
  })

  await Promise.all(checkPromises)
  console.log("Health checks completed")
}

/**
 * Returns a list of providers that are currently available.
 * @param includeDeprecated Whether to include deprecated providers
 * @param minWeight Minimum weight threshold (default: 0)
 */
export function getAvailableProviders(includeDeprecated = false, minWeight = 0): ProviderName[] {
  // Run health checks if needed
  const now = Date.now()
  if (now - lastHealthCheckTime > HEALTH_CHECK_INTERVAL) {
    // Don't await to avoid blocking
    runHealthChecks().catch((err) => console.error("Health check error:", err))
  }

  const available: ProviderName[] = []

  for (const provider in providerStatuses) {
    const p = provider as ProviderName
    checkProviderRecovery(p)

    const status = providerStatuses[p]
    if ((includeDeprecated || !status.isDeprecated) && status.weight >= minWeight) {
      available.push(p)
    }
  }

  // Sort by weight (highest first) for optimal routing
  return available.sort((a, b) => providerStatuses[b].weight - providerStatuses[a].weight)
}

/**
 * Gets the current status of all providers.
 */
export function getAllProviderStatuses(): Record<ProviderName, ProviderStatus> {
  // Check for recovery before returning
  for (const provider in providerStatuses) {
    checkProviderRecovery(provider as ProviderName)
  }

  // Make a deep copy to avoid external modification
  return JSON.parse(JSON.stringify(providerStatuses))
}

/**
 * Gets the weight of a specific provider.
 * @param provider The provider name
 */
export function getProviderWeight(provider: ProviderName): number {
  checkProviderRecovery(provider)
  return providerStatuses[provider].weight
}

/**
 * Checks if a provider is currently deprecated.
 * @param provider The provider name
 */
export function isProviderDeprecated(provider: ProviderName): boolean {
  checkProviderRecovery(provider)
  return providerStatuses[provider].isDeprecated
}

/**
 * Merge results from providers using their weight.
 * Providers with lower weight will contribute less to the final ranking.
 */
export function mergeProviderResults<T extends { score: number; provider: string }>(
  resultsByProvider: Record<string, T[]>,
): T[] {
  const merged: T[] = []

  for (const provider in resultsByProvider) {
    if (resultsByProvider[provider]?.length) {
      const p = provider as ProviderName
      const weight = providerStatuses[p]?.weight || 1

      // Multiply score by weight
      const weightedResults = resultsByProvider[provider].map((result) => ({
        ...result,
        score: result.score * weight,
      }))

      merged.push(...weightedResults)
    }
  }

  // Sort by weighted score
  return merged.sort((a, b) => b.score - a.score)
}

/**
 * Get provider analytics for monitoring
 */
export function getProviderAnalytics(): Record<
  ProviderName,
  {
    successRate: number
    avgResponseTime: number | null
    lastUsed: number | null
    status: string
    weight: number
  }
> {
  const analytics: Record<string, any> = {}

  for (const provider in providerStatuses) {
    const p = provider as ProviderName
    const status = providerStatuses[p]

    const total = status.successCount + status.failureCount
    const successRate = total > 0 ? status.successCount / total : 1

    analytics[p] = {
      successRate,
      avgResponseTime: getAverageResponseTime(p),
      lastUsed: status.lastFailureTime,
      status: status.isDeprecated ? "deprecated" : status.healthCheckStatus,
      weight: status.weight,
    }
  }

  return analytics as any
}

