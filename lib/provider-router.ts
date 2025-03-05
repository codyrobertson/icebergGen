/**
 * Provider Router
 *
 * Manages search provider health, routing, and gradual deprecation.
 * Tracks provider failures and automatically adjusts routing weights.
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
}

export type ProviderName = "tavily" | "exa" | "google" | "openrouter"

// Constants for threshold and cooldown (in milliseconds)
const FAILURE_THRESHOLD = 3
const COOLDOWN_PERIOD = 5 * 60 * 1000 // 5 minutes
const RATE_LIMIT_COOLDOWN = 60 * 60 * 1000 // 1 hour for rate limit errors

// In-memory status store for each provider
const providerStatuses: Record<ProviderName, ProviderStatus> = {
  tavily: { failureCount: 0, lastFailureTime: null, weight: 1, isDeprecated: false },
  exa: { failureCount: 0, lastFailureTime: null, weight: 1, isDeprecated: false },
  google: { failureCount: 0, lastFailureTime: null, weight: 1, isDeprecated: false },
  openrouter: { failureCount: 0, lastFailureTime: null, weight: 1, isDeprecated: false },
}

/**
 * Records a failure for a given provider and reduces its routing weight.
 * @param provider The provider name
 * @param error The error that occurred
 * @param isRateLimit Whether the error is a rate limit error
 */
export function recordProviderFailure(provider: ProviderName, error?: Error, isRateLimit = false): void {
  const status = providerStatuses[provider]
  status.failureCount++
  status.lastFailureTime = Date.now()
  status.lastErrorMessage = error?.message || "Unknown error"

  // Rate limit errors cause immediate deprecation
  if (isRateLimit) {
    console.log(`Provider ${provider} rate limited, deprecating immediately`)
    status.isDeprecated = true
    status.weight = 0
    return
  }

  // Gradually reduce weight: if threshold reached, deprecate
  if (status.failureCount >= FAILURE_THRESHOLD) {
    console.log(`Provider ${provider} reached failure threshold, deprecating`)
    status.isDeprecated = true
    status.weight = 0
  } else {
    // Exponential backoff for weight reduction
    status.weight = Math.max(0.1, status.weight * 0.5)
    console.log(`Provider ${provider} weight reduced to ${status.weight}`)
  }
}

/**
 * Resets the provider status after a successful call or cooldown.
 * @param provider The provider name
 */
export function resetProviderStatus(provider: ProviderName): void {
  console.log(`Resetting status for provider ${provider}`)
  providerStatuses[provider] = {
    failureCount: 0,
    lastFailureTime: null,
    weight: 1,
    isDeprecated: false,
  }
}

/**
 * Records a successful call to a provider.
 * @param provider The provider name
 */
export function recordProviderSuccess(provider: ProviderName): void {
  const status = providerStatuses[provider]

  // If the provider was previously failing but not fully deprecated,
  // gradually increase its weight
  if (status.failureCount > 0 && !status.isDeprecated) {
    status.failureCount = Math.max(0, status.failureCount - 1)
    status.weight = Math.min(1, status.weight + 0.2)
    console.log(`Provider ${provider} weight increased to ${status.weight}`)
  } else if (status.isDeprecated) {
    // If it was deprecated, reset it completely
    resetProviderStatus(provider)
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

  // Use a longer cooldown for rate limit errors
  const cooldown = status.lastErrorMessage?.toLowerCase().includes("rate limit") ? RATE_LIMIT_COOLDOWN : COOLDOWN_PERIOD

  if (Date.now() - status.lastFailureTime > cooldown) {
    console.log(`Cooldown period passed for ${provider}, resetting status`)
    // Reset with a probation weight - will be increased on success
    providerStatuses[provider] = {
      failureCount: 0,
      lastFailureTime: null,
      weight: 0.5, // Start with reduced weight after recovery
      isDeprecated: false,
    }
  }
}

/**
 * Returns a list of providers that are currently available.
 * @param includeDeprecated Whether to include deprecated providers
 */
export function getAvailableProviders(includeDeprecated = false): ProviderName[] {
  const available: ProviderName[] = []

  for (const provider in providerStatuses) {
    const p = provider as ProviderName
    checkProviderRecovery(p)

    if (!providerStatuses[p].isDeprecated || includeDeprecated) {
      available.push(p)
    }
  }

  return available
}

/**
 * Gets the current status of all providers.
 */
export function getAllProviderStatuses(): Record<ProviderName, ProviderStatus> {
  // Check for recovery before returning
  for (const provider in providerStatuses) {
    checkProviderRecovery(provider as ProviderName)
  }

  return { ...providerStatuses }
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

