import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"

// Global variable to store the client instance
let supabaseInstance: SupabaseClient | null = null
let initializationPromise: Promise<SupabaseClient> | null = null

/**
 * Creates a singleton Supabase client instance or returns the existing one.
 * This ensures only one GoTrueClient instance exists in the browser context.
 */
export function getSupabaseClient(): SupabaseClient {
  if (typeof window === "undefined") {
    // Server-side: Create a new instance each time to avoid sharing between requests
    return createClientComponentClient()
  }

  // Client-side: Use singleton pattern
  if (!supabaseInstance) {
    supabaseInstance = createClientComponentClient({
      // Setting a unique storage key helps ensure no conflicts
      storageKey: "iceberg-auth-token",
      // Use cookies for persistence to avoid multiple local storage entries
      cookieOptions: {
        name: "iceberg-auth-token",
        path: "/",
      },
    })
  }

  return supabaseInstance
}

/**
 * Asynchronous version of getSupabaseClient that allows waiting for initialization.
 * This is useful in scenarios where the client might be initializing elsewhere.
 */
export async function getSupabaseClientAsync(): Promise<SupabaseClient> {
  if (typeof window === "undefined") {
    // Server-side: Create a new instance each time
    return createClientComponentClient()
  }

  if (supabaseInstance) {
    return supabaseInstance
  }

  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = new Promise((resolve) => {
    const client = createClientComponentClient({
      storageKey: "iceberg-auth-token",
      cookieOptions: {
        name: "iceberg-auth-token",
        path: "/",
      },
    })

    supabaseInstance = client
    resolve(client)
  })

  return initializationPromise
}

/**
 * Reset the Supabase client instance.
 * Use with caution - mostly for testing purposes.
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null
  initializationPromise = null
}

