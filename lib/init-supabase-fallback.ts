"use server"

import { createServerClient } from "@/lib/supabase-server"

export async function initializeDatabaseFallback() {
  console.log("Initializing database tables using fallback method...")
  try {
    const supabase = createServerClient()

    // Check if tables exist first
    try {
      const { data: tablesData, error: tablesError } = await supabase
        .from("pg_catalog.pg_tables")
        .select("tablename")
        .eq("schemaname", "public")

      if (tablesError) {
        console.error("Error checking tables:", tablesError)
        return { success: false, error: tablesError }
      }

      const existingTables = tablesData.map((row) => row.tablename)
      console.log("Existing tables:", existingTables)

      // Create icebergs table if it doesn't exist
      if (!existingTables.includes("icebergs")) {
        try {
          const { error } = await supabase
            .from("icebergs")
            .insert({
              id: "00000000-0000-0000-0000-000000000000",
              user_id: "00000000-0000-0000-0000-000000000000",
              query: "initialization",
              data: {},
              created_at: new Date().toISOString(),
            })
            .select()

          if (error && error.code !== "23505") {
            // Ignore duplicate key errors
            console.error("Error creating icebergs table:", error)
          } else {
            console.log("Icebergs table created or already exists")
          }
        } catch (error) {
          console.error("Error creating icebergs table:", error)
        }
      }

      // Create search_logs table if it doesn't exist
      if (!existingTables.includes("search_logs")) {
        try {
          const { error } = await supabase
            .from("search_logs")
            .insert({
              id: "00000000-0000-0000-0000-000000000000",
              user_id: "00000000-0000-0000-0000-000000000000",
              query: "initialization",
              model: "test",
              tone: "test",
              timestamp: new Date().toISOString(),
              results_count: 0,
              duration_ms: 0,
            })
            .select()

          if (error && error.code !== "23505") {
            // Ignore duplicate key errors
            console.error("Error creating search_logs table:", error)
          } else {
            console.log("Search_logs table created or already exists")
          }
        } catch (error) {
          console.error("Error creating search_logs table:", error)
        }
      }

      // Create user_profiles table if it doesn't exist
      if (!existingTables.includes("user_profiles")) {
        try {
          const { error } = await supabase
            .from("user_profiles")
            .insert({
              id: "00000000-0000-0000-0000-000000000000",
              email: "test@example.com",
              role: "free",
              searches_remaining: 3,
              deep_dives_remaining: 3,
              created_at: new Date().toISOString(),
            })
            .select()

          if (error && error.code !== "23505") {
            // Ignore duplicate key errors
            console.error("Error creating user_profiles table:", error)
          } else {
            console.log("User_profiles table created or already exists")
          }
        } catch (error) {
          console.error("Error creating user_profiles table:", error)
        }
      }

      console.log("Database tables initialization completed")
      return { success: true }
    } catch (error) {
      console.error("Error checking tables:", error)
      return { success: false, error }
    }
  } catch (error) {
    console.error("Error initializing database tables:", error)
    return { success: false, error }
  }
}

