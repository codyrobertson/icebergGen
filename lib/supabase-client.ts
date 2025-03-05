// This file provides a safe way to access Supabase from client components
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { UserProfile } from "./supabase"

// Create a Supabase client for use in client components
export const createClient = () => {
  return createClientComponentClient()
}

// Client-safe functions that don't rely on server-only APIs
export async function getClientUser() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    console.error("Error fetching user:", error)
    return null
  }

  return data.user
}

export async function getClientUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    const { data, error } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

    if (error) throw error
    return data as UserProfile
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return null
  }
}

