import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseClient, getSupabaseClientAsync } from "./supabase-singleton"
import { userConfig, canUserSearch, canUserDeepDive } from "./config"

// Types for our database
export type UserRole = "admin" | "pro" | "free"

export type UserProfile = {
  id: string
  email: string
  role: UserRole
  searches_remaining?: number
  deep_dives_remaining?: number
  created_at: string
}

export type SearchLog = {
  id?: string
  user_id: string
  query: string
  model: string
  tone: string
  timestamp: string
  results_count: number
  duration_ms: number
}

export type IcebergSave = {
  id?: string
  user_id: string
  query: string
  data: any
  created_at?: string
}

// Export the createClient function that uses our singleton pattern
export const createClient = () => {
  try {
    return getSupabaseClient()
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    return createMockClient()
  }
}

// Async version for components that need to wait for initialization
export const createClientAsync = async () => {
  try {
    return await getSupabaseClientAsync()
  } catch (error) {
    console.error("Error creating Supabase client asynchronously:", error)
    return createMockClient()
  }
}

// Mock client for development when credentials are missing
function createMockClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ data: null, error: new Error("Mock auth not available") }),
      signUp: async () => ({ data: null, error: new Error("Mock auth not available") }),
      signOut: async () => ({ error: null }),
      signInWithOtp: async () => ({ data: null, error: new Error("Mock auth not available") }),
      exchangeCodeForSession: async () => ({ data: null, error: new Error("Mock auth not available") }),
    },
    from: (table: string) => ({
      select: () => ({
        order: () => ({
          limit: () => ({
            then: async () => ({ data: [], error: null }),
          }),
        }),
        eq: () => ({
          single: () => ({
            then: async () => ({ data: null, error: null }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => ({
            then: async () => ({ data: null, error: null }),
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          then: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  }
}

// Helper functions for client-side operations
export async function getRecentSearchesClient(supabase: SupabaseClient, limit = 5): Promise<string[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn("User not authenticated, returning empty recent searches")
      return []
    }

    const { data, error } = await supabase
      .from("search_logs")
      .select("query")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false })
      .limit(limit)

    if (error) throw error

    // Get unique queries
    const uniqueQueries = Array.from(new Set((data || []).map((item) => item.query)))
    return uniqueQueries.slice(0, limit)
  } catch (error) {
    console.error("Error fetching recent searches:", error)
    return []
  }
}

export async function getUserProfileClient(supabase: SupabaseClient): Promise<UserProfile | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // First try to get the profile from the database
    try {
      const { data, error } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

      if (error) {
        console.warn("Error fetching user profile from database:", error)

        // If the table doesn't exist or there's no profile, create a default profile
        if (error.code === "42P01" || error.code === "PGRST116") {
          console.log("Creating default profile since table does not exist or profile not found")

          // Try to create the profile
          try {
            const { error: insertError } = await supabase.from("user_profiles").insert({
              id: user.id,
              email: user.email || "",
              role: userConfig.defaultRole,
              searches_remaining: 999,
              deep_dives_remaining: 999,
            })

            if (insertError && insertError.code !== "42P01") {
              console.error("Error creating default profile:", insertError)
            }
          } catch (insertErr) {
            console.error("Exception creating default profile:", insertErr)
          }
        }

        // Return a default profile
        return {
          id: user.id,
          email: user.email || "",
          role: userConfig.defaultRole as UserRole,
          searches_remaining: 999,
          deep_dives_remaining: 999,
          created_at: new Date().toISOString(),
        }
      }

      // If we have a profile but want to override the role based on config
      if (data) {
        const configRole = userConfig.roleOverrides[data.email] || userConfig.defaultRole

        // If the role from config is different from the database, update the profile
        if (configRole !== data.role) {
          const updatedProfile = {
            ...data,
            role: configRole as UserRole,
          }

          // Try to update the database (but don't wait for it)
          supabase
            .from("user_profiles")
            .update({ role: configRole })
            .eq("id", user.id)
            .then(() => {
              console.log(`Updated user ${data.email} role to ${configRole}`)
            })
            .catch((error) => {
              console.error("Error updating user role:", error)
            })

          return updatedProfile as UserProfile
        }

        return data as UserProfile
      }
    } catch (dbError) {
      console.error("Database error in getUserProfileClient:", dbError)
    }

    // If we get here, return a default profile
    return {
      id: user.id,
      email: user.email || "",
      role: userConfig.defaultRole as UserRole,
      searches_remaining: 999,
      deep_dives_remaining: 999,
      created_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error in getUserProfileClient:", error)
    return null
  }
}

export async function canUserSearchClient(supabase: SupabaseClient): Promise<boolean> {
  // Use the config function which always returns true for now
  return canUserSearch()
}

export async function canUserDeepDiveClient(supabase: SupabaseClient): Promise<boolean> {
  // Use the config function which always returns true for now
  return canUserDeepDive()
}

export async function decrementDeepDiveClient(supabase: SupabaseClient, userId: string): Promise<void> {
  // Skip decrementing if we're not enforcing limits
  if (!userConfig.enforceSearchLimits) {
    return
  }

  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, deep_dives_remaining")
      .eq("id", userId)
      .single()

    if (profile?.role === "free" && typeof profile.deep_dives_remaining === "number") {
      await supabase
        .from("user_profiles")
        .update({ deep_dives_remaining: Math.max(0, profile.deep_dives_remaining - 1) })
        .eq("id", userId)
    }
  } catch (error) {
    console.error("Error decrementing deep dives:", error)
  }
}

