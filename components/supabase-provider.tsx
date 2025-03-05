"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase-singleton"

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize the Supabase client once at the app level
    if (!isInitialized) {
      try {
        getSupabaseClient()
        setIsInitialized(true)
      } catch (error) {
        console.error("Failed to initialize Supabase client:", error)
      }
    }
  }, [isInitialized])

  return <>{children}</>
}

