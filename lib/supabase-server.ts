"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { cache } from "react"
import type { UserProfile, SearchLog } from "./supabase"

// Create a Supabase client for use in server components/actions
export const createServerClient = cache(() => {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  return supabase
})

// Functions to interact with Supabase from server components
export async function logSearch(searchData: Omit<SearchLog, "id" | "timestamp" | "user_id">): Promise<void> {
  try {
    console.log("[DB] Starting logSearch operation", { query: searchData.query })
    const supabase = createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn("[DB] User not authenticated, search not logged")
      return
    }

    console.log("[DB] Authenticated user found", { userId: user.id })

    // Check if search_logs table exists
    try {
      const { count, error: countError } = await supabase
        .from("search_logs")
        .select("*", { count: "exact", head: true })

      if (countError) {
        console.warn("[DB] search_logs table may not exist:", countError)

        // Try to create the table if it doesn't exist
        try {
          console.log("[DB] Attempting to create search_logs table")
          await supabase.rpc("create_search_logs_table_if_not_exists")
          console.log("[DB] Successfully created search_logs table")
        } catch (createTableError) {
          console.error("[DB] Failed to create search_logs table:", createTableError)
          return
        }
      } else {
        console.log("[DB] search_logs table exists, count:", count)
      }
    } catch (tableError) {
      console.warn("[DB] Error checking search_logs table:", tableError)
      return
    }

    console.log("[DB] Inserting search log")
    const { error } = await supabase.from("search_logs").insert({
      ...searchData,
      user_id: user.id,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error("[DB] Error inserting search log:", error)

      // Check if this is an RLS error
      if (error.code === "PGRST301" || error.message.includes("permission denied")) {
        console.error("[DB] This appears to be an RLS (Row Level Security) error. Check your Supabase RLS policies.")
      }

      return
    }

    console.log("[DB] Successfully inserted search log")

    // If user is on free plan, decrement their searches_remaining
    try {
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role, searches_remaining")
        .eq("id", user.id)
        .single()

      if (profileError) {
        console.warn("[DB] Error fetching user profile:", profileError)
        return
      }

      if (profile?.role === "free" && typeof profile.searches_remaining === "number") {
        console.log("[DB] Decrementing searches_remaining for free user")
        await supabase
          .from("user_profiles")
          .update({ searches_remaining: Math.max(0, profile.searches_remaining - 1) })
          .eq("id", user.id)
      }
    } catch (profileUpdateError) {
      console.warn("[DB] Error updating user profile:", profileUpdateError)
    }
  } catch (error) {
    console.error("[DB] Error logging search:", error)
  }
}

export async function saveIceberg(query: string, data: any): Promise<string | null> {
  try {
    console.log("[DB] Starting saveIceberg operation", { query })
    const supabase = createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn("[DB] User not authenticated, iceberg not saved")
      return null
    }

    console.log("[DB] Authenticated user found", { userId: user.id })

    // Check if icebergs table exists
    try {
      const { count, error: countError } = await supabase.from("icebergs").select("*", { count: "exact", head: true })

      if (countError) {
        console.warn("[DB] icebergs table may not exist:", countError)

        // Try to create the table if it doesn't exist
        try {
          console.log("[DB] Attempting to create icebergs table")
          await supabase.rpc("create_icebergs_table_if_not_exists")
          console.log("[DB] Successfully created icebergs table")
        } catch (createTableError) {
          console.error("[DB] Failed to create icebergs table:", createTableError)
          return null
        }
      } else {
        console.log("[DB] icebergs table exists, count:", count)
      }
    } catch (tableError) {
      console.warn("[DB] Error checking icebergs table:", tableError)
      return null
    }

    console.log("[DB] Inserting iceberg data")
    const { data: insertedData, error } = await supabase
      .from("icebergs")
      .insert({
        query,
        data,
        user_id: user.id,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (error) {
      console.error("[DB] Error inserting iceberg:", error)

      // Check if this is an RLS error
      if (error.code === "PGRST301" || error.message.includes("permission denied")) {
        console.error("[DB] This appears to be an RLS (Row Level Security) error. Check your Supabase RLS policies.")
      }

      return null
    }

    console.log("[DB] Successfully inserted iceberg", { id: insertedData?.id })
    return insertedData?.id || null
  } catch (error) {
    console.error("[DB] Error saving iceberg:", error)
    return null
  }
}

export async function getRecentSearches(limit = 5): Promise<string[]> {
  try {
    const supabase = createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn("User not authenticated, returning empty recent searches")
      return []
    }

    // Check if search_logs table exists
    try {
      const { count, error: countError } = await supabase
        .from("search_logs")
        .select("*", { count: "exact", head: true })

      if (countError) {
        console.warn("search_logs table may not exist:", countError)
        return []
      }
    } catch (tableError) {
      console.warn("Error checking search_logs table:", tableError)
      return []
    }

    const { data, error } = await supabase
      .from("search_logs")
      .select("query")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching recent searches:", error)
      return []
    }

    // Get unique queries
    const uniqueQueries = Array.from(new Set((data || []).map((item) => item.query)))
    return uniqueQueries.slice(0, limit)
  } catch (error) {
    console.error("Error fetching recent searches:", error)
    return []
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // Check if user_profiles table exists
    try {
      const { count, error: countError } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })

      if (countError) {
        console.warn("user_profiles table may not exist:", countError)
        return null
      }
    } catch (tableError) {
      console.warn("Error checking user_profiles table:", tableError)
      return null
    }

    const { data, error } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

    if (error) {
      console.error("Error fetching user profile:", error)

      // If the error is because the profile doesn't exist, try to create a default one
      if (error.code === "PGRST116") {
        try {
          const { data: insertedData, error: insertError } = await supabase
            .from("user_profiles")
            .insert({
              id: user.id,
              email: user.email || "",
              role: "free",
              searches_remaining: 3,
              deep_dives_remaining: 3,
              created_at: new Date().toISOString(),
            })
            .select("*")
            .single()

          if (insertError) {
            console.error("Error creating default user profile:", insertError)
            return null
          }

          return insertedData as UserProfile
        } catch (insertCatchError) {
          console.error("Error in profile creation catch block:", insertCatchError)
          return null
        }
      }

      return null
    }

    return data as UserProfile
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return null
  }
}

export async function decrementDeepDive(userId: string): Promise<void> {
  try {
    const supabase = createServerClient()

    // Check if user_profiles table exists
    try {
      const { count, error: countError } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })

      if (countError) {
        console.warn("user_profiles table may not exist:", countError)
        return
      }
    } catch (tableError) {
      console.warn("Error checking user_profiles table:", tableError)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role, deep_dives_remaining")
      .eq("id", userId)
      .single()

    if (profileError) {
      console.error("Error fetching user profile for deep dive decrement:", profileError)
      return
    }

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

export async function canUserSearch(): Promise<boolean> {
  try {
    const profile = await getUserProfile()

    if (!profile) return true // Allow searching if profile can't be loaded
    if (profile.role === "admin" || profile.role === "pro") return true
    if (profile.role === "free" && (profile.searches_remaining || 0) > 0) return true

    return false
  } catch (error) {
    console.error("Error checking if user can search:", error)
    return true // Allow searching if check fails
  }
}

export async function canUserDeepDive(): Promise<boolean> {
  try {
    const profile = await getUserProfile()

    if (!profile) return true // Allow deep dives if profile can't be loaded
    if (profile.role === "admin" || profile.role === "pro") return true
    if (profile.role === "free" && (profile.deep_dives_remaining || 0) > 0) return true

    return false
  } catch (error) {
    console.error("Error checking if user can deep dive:", error)
    return true // Allow deep dives if check fails
  }
}

