// This file can be imported in _app.tsx or similar entry point to monitor for multiple GoTrueClient instances

let instanceCount = 0
const MAX_SAFE_INSTANCES = 1

/**
 * Checks for multiple GoTrueClient instances in development mode.
 * Call this function in your app's entry point to catch issues early.
 */
export function monitorGoTrueClientInstances() {
  // Only run in development
  if (process.env.NODE_ENV !== "development") return

  // Increment instance counter
  instanceCount++

  // Check if we have too many instances
  if (instanceCount > MAX_SAFE_INSTANCES) {
    console.warn(
      `⚠️ WARNING: Multiple GoTrueClient instances detected (${instanceCount}). This may lead to auth issues and undefined behavior.`,
      "\n",
      "Ensure you are using the singleton pattern from lib/supabase-singleton.ts to create Supabase clients.",
      "\n",
      "All components should import createClient from lib/supabase.ts which uses the singleton pattern.",
    )
  }
}

/**
 * Resets the instance counter (useful for testing).
 */
export function resetInstanceCounter() {
  instanceCount = 0
}

/**
 * Returns the current instance count.
 */
export function getInstanceCount() {
  return instanceCount
}

