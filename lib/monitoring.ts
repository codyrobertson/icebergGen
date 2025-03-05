/**
 * Monitoring service for tracking performance metrics
 * and system health
 */

import { getProviderAnalytics } from "./provider-router-enhanced"
import { memoryCache } from "./utils/cache-utils"

// Types for metrics
export interface PerformanceMetrics {
  requestCount: number
  successCount: number
  failureCount: number
  avgResponseTime: number
  p95ResponseTime: number
  startTime: number
}

export interface EndpointMetrics {
  [endpoint: string]: {
    requestCount: number
    successCount: number
    failureCount: number
    responseTimes: number[]
    errors: Record<string, number>
    lastRequest: number
  }
}

export interface ProviderMetrics {
  [provider: string]: {
    requestCount: number
    successCount: number
    failureCount: number
    responseTimes: number[]
    avgResponseTime: number | null
    errors: Record<string, number>
    lastRequest: number
  }
}

// Global metrics storage
const metrics: {
  global: PerformanceMetrics
  endpoints: EndpointMetrics
  providers: ProviderMetrics
  errors: Record<string, number>
  requestsPerMinute: number[]
  timePoints: number[]
} = {
  global: {
    requestCount: 0,
    successCount: 0,
    failureCount: 0,
    avgResponseTime: 0,
    p95ResponseTime: 0,
    startTime: Date.now(),
  },
  endpoints: {},
  providers: {},
  errors: {},
  requestsPerMinute: Array(60).fill(0), // Last 60 minutes
  timePoints: Array(60).fill(0),
}

// Initialize monitoring
let initialized = false

/**
 * Initialize the monitoring system
 */
export function initMonitoring(): void {
  if (initialized) return

  // Set up a periodic task to rotate time-based metrics
  setInterval(() => {
    // Rotate requests per minute array
    metrics.requestsPerMinute.pop()
    metrics.requestsPerMinute.unshift(0)

    // Update time points
    metrics.timePoints.pop()
    metrics.timePoints.unshift(Date.now())

    // Log current stats every hour
    if (Date.now() % (60 * 60 * 1000) < 60000) {
      logCurrentStats()
    }
  }, 60 * 1000) // Every minute

  initialized = true
  console.log("Monitoring system initialized")
}

/**
 * Record the start of a request
 * @param endpoint The API endpoint
 * @returns A function to call when the request completes
 */
export function recordRequestStart(endpoint: string): (success: boolean, responseTime: number, error?: Error) => void {
  const startTime = Date.now()

  // Initialize endpoint metrics if not exists
  if (!metrics.endpoints[endpoint]) {
    metrics.endpoints[endpoint] = {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      responseTimes: [],
      errors: {},
      lastRequest: startTime,
    }
  }

  // Update request counts
  metrics.global.requestCount++
  metrics.endpoints[endpoint].requestCount++
  metrics.requestsPerMinute[0]++

  // Return a completion function
  return (success: boolean, responseTime: number, error?: Error): void => {
    // Update endpoint metrics
    metrics.endpoints[endpoint].lastRequest = Date.now()
    metrics.endpoints[endpoint].responseTimes.push(responseTime)

    // Limit array size to prevent memory issues
    if (metrics.endpoints[endpoint].responseTimes.length > 1000) {
      metrics.endpoints[endpoint].responseTimes = metrics.endpoints[endpoint].responseTimes.slice(-1000)
    }

    // Update success/failure counts
    if (success) {
      metrics.global.successCount++
      metrics.endpoints[endpoint].successCount++
    } else {
      metrics.global.failureCount++
      metrics.endpoints[endpoint].failureCount++

      // Track error type
      const errorType = error?.name || "Unknown"
      metrics.endpoints[endpoint].errors[errorType] = (metrics.endpoints[endpoint].errors[errorType] || 0) + 1
      metrics.errors[errorType] = (metrics.errors[errorType] || 0) + 1
    }

    // Update global response time metrics
    const allTimes = getAllResponseTimes()
    if (allTimes.length > 0) {
      metrics.global.avgResponseTime = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length

      // Calculate p95 (95th percentile)
      const sortedTimes = [...allTimes].sort((a, b) => a - b)
      const p95Index = Math.floor(sortedTimes.length * 0.95)
      metrics.global.p95ResponseTime = sortedTimes[p95Index] || 0
    }
  }
}

/**
 * Record provider metrics
 * @param provider The provider name
 * @param success Whether the request was successful
 * @param responseTime Response time in ms
 * @param error Optional error object
 */
export function recordProviderMetrics(provider: string, success: boolean, responseTime: number, error?: Error): void {
  // Initialize provider metrics if not exists
  if (!metrics.providers[provider]) {
    metrics.providers[provider] = {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      responseTimes: [],
      avgResponseTime: null,
      errors: {},
      lastRequest: Date.now(),
    }
  }

  const providerMetrics = metrics.providers[provider]

  // Update metrics
  providerMetrics.requestCount++
  providerMetrics.lastRequest = Date.now()
  providerMetrics.responseTimes.push(responseTime)

  // Limit array size
  if (providerMetrics.responseTimes.length > 100) {
    providerMetrics.responseTimes = providerMetrics.responseTimes.slice(-100)
  }

  // Calculate average
  providerMetrics.avgResponseTime =
    providerMetrics.responseTimes.reduce((sum, time) => sum + time, 0) / providerMetrics.responseTimes.length

  if (success) {
    providerMetrics.successCount++
  } else {
    providerMetrics.failureCount++

    // Track error type
    const errorType = error?.name || "Unknown"
    providerMetrics.errors[errorType] = (providerMetrics.errors[errorType] || 0) + 1
  }
}

/**
 * Get all response times across all endpoints
 */
function getAllResponseTimes(): number[] {
  const allTimes: number[] = []

  for (const endpoint in metrics.endpoints) {
    allTimes.push(...metrics.endpoints[endpoint].responseTimes)
  }

  return allTimes
}

/**
 * Log current statistics to console
 */
function logCurrentStats(): void {
  const uptime = Math.floor((Date.now() - metrics.global.startTime) / 1000)

  console.log(`===== Monitoring Stats (Uptime: ${uptime}s) =====`)
  console.log(`Total Requests: ${metrics.global.requestCount}`)
  console.log(
    `Success Rate: ${((metrics.global.successCount / Math.max(1, metrics.global.requestCount)) * 100).toFixed(2)}%`,
  )
  console.log(`Avg Response Time: ${metrics.global.avgResponseTime.toFixed(2)}ms`)
  console.log(`P95 Response Time: ${metrics.global.p95ResponseTime.toFixed(2)}ms`)
  console.log(`Requests in last minute: ${metrics.requestsPerMinute[0]}`)
  console.log(`Cache stats: ${JSON.stringify(memoryCache.stats())}`)
  console.log(`Provider analytics: ${JSON.stringify(getProviderAnalytics())}`)
  console.log("=================================")
}

/**
 * Get the current monitoring metrics
 */
export function getMetrics(): typeof metrics {
  return { ...metrics }
}

/**
 * Get a summary of the system health
 */
export function getSystemHealth(): {
  status: "healthy" | "degraded" | "failing"
  issues: string[]
  providers: Record<string, string>
  cacheHealth: string
  lastUpdated: string
} {
  const issues: string[] = []
  const providerStatuses: Record<string, string> = {}

  // Check overall success rate
  const successRate = metrics.global.requestCount > 0 ? metrics.global.successCount / metrics.global.requestCount : 1

  if (successRate < 0.8) {
    issues.push(`Low success rate: ${(successRate * 100).toFixed(1)}%`)
  }

  // Check provider health
  const analytics = getProviderAnalytics()
  let failingProviders = 0

  for (const provider in analytics) {
    const status = analytics[provider].status
    providerStatuses[provider] = status

    if (status === "deprecated" || status === "failing") {
      failingProviders++
      issues.push(`Provider ${provider} is ${status}`)
    }
  }

  // Check cache health
  const cacheStats = memoryCache.stats()
  const cacheHealth = cacheStats.size > 1000 ? "High cache usage" : "Normal"

  // Determine overall status
  let status: "healthy" | "degraded" | "failing" = "healthy"

  if (failingProviders >= 2 || successRate < 0.6) {
    status = "failing"
  } else if (failingProviders > 0 || successRate < 0.9) {
    status = "degraded"
  }

  return {
    status,
    issues,
    providers: providerStatuses,
    cacheHealth,
    lastUpdated: new Date().toISOString(),
  }
}

// Initialize monitoring on module load
initMonitoring()

