"use server"

import { createServerClient } from "@/lib/supabase-server"

export async function initializeDatabase() {
  console.log("Initializing database tables...")
  try {
    const supabase = createServerClient()

    // Create icebergs table if it doesn't exist
    try {
      // Check if the table exists by attempting to query it directly
      const { error: checkError } = await supabase.from("icebergs").select("id", { count: "exact", head: true })

      if (checkError && checkError.code === "42P01") {
        // Table doesn't exist error code
        console.log("Icebergs table doesn't exist, creating it...")

        // Create the table using SQL
        const { error: createError } = await supabase.rpc("exec_sql", {
          sql: `
            CREATE TABLE IF NOT EXISTS public.icebergs (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID NOT NULL,
              query TEXT NOT NULL,
              data JSONB NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
          `,
        })

        if (createError) {
          console.error("Error creating icebergs table:", createError)
          // Fallback method if RPC fails
          await createTableFallback(supabase, "icebergs")
        } else {
          console.log("Icebergs table created successfully")
        }
      } else if (checkError) {
        console.error("Error checking if icebergs table exists:", checkError)
      } else {
        console.log("Icebergs table already exists")
      }
    } catch (error) {
      console.error("Error checking/creating icebergs table:", error)
    }

    // Create search_logs table if it doesn't exist
    try {
      // Check if the table exists by attempting to query it directly
      const { error: checkError } = await supabase.from("search_logs").select("id", { count: "exact", head: true })

      if (checkError && checkError.code === "42P01") {
        // Table doesn't exist error code
        console.log("Search_logs table doesn't exist, creating it...")

        // Create the table using SQL
        const { error: createError } = await supabase.rpc("exec_sql", {
          sql: `
            CREATE TABLE IF NOT EXISTS public.search_logs (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID NOT NULL,
              query TEXT NOT NULL,
              model TEXT NOT NULL,
              tone TEXT NOT NULL,
              timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              results_count INTEGER NOT NULL,
              duration_ms INTEGER NOT NULL
            );
          `,
        })

        if (createError) {
          console.error("Error creating search_logs table:", createError)
          // Fallback method if RPC fails
          await createTableFallback(supabase, "search_logs")
        } else {
          console.log("Search_logs table created successfully")
        }
      } else if (checkError) {
        console.error("Error checking if search_logs table exists:", checkError)
      } else {
        console.log("Search_logs table already exists")
      }
    } catch (error) {
      console.error("Error checking/creating search_logs table:", error)
    }

    // Create user_profiles table if it doesn't exist
    try {
      // Check if the table exists by attempting to query it directly
      const { error: checkError } = await supabase.from("user_profiles").select("id", { count: "exact", head: true })

      if (checkError && checkError.code === "42P01") {
        // Table doesn't exist error code
        console.log("User_profiles table doesn't exist, creating it...")

        // Create the table using SQL
        const { error: createError } = await supabase.rpc("exec_sql", {
          sql: `
            CREATE TABLE IF NOT EXISTS public.user_profiles (
              id UUID PRIMARY KEY,
              email TEXT NOT NULL,
              role TEXT NOT NULL DEFAULT 'free',
              searches_remaining INTEGER DEFAULT 3,
              deep_dives_remaining INTEGER DEFAULT 3,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
          `,
        })

        if (createError) {
          console.error("Error creating user_profiles table:", createError)
          // Fallback method if RPC fails
          await createTableFallback(supabase, "user_profiles")
        } else {
          console.log("User_profiles table created successfully")
        }
      } else if (checkError) {
        console.error("Error checking if user_profiles table exists:", checkError)
      } else {
        console.log("User_profiles table already exists")
      }
    } catch (error) {
      console.error("Error checking/creating user_profiles table:", error)
    }

    console.log("Database tables initialization completed")
    return { success: true }
  } catch (error) {
    console.error("Error initializing database tables:", error)
    return { success: false, error }
  }
}

// Fallback method to create tables using insert
async function createTableFallback(supabase, tableName: string) {
  console.log(`Attempting fallback method to create ${tableName} table...`)

  try {
    if (tableName === "icebergs") {
      // Try to create the table by inserting a dummy record
      const { error } = await supabase.from("icebergs").insert({
        id: "00000000-0000-0000-0000-000000000000",
        user_id: "00000000-0000-0000-0000-000000000000",
        query: "initialization",
        data: {},
        created_at: new Date().toISOString(),
      })

      if (!error) {
        // Delete the initialization record
        await supabase.from("icebergs").delete().eq("id", "00000000-0000-0000-0000-000000000000")
        console.log("Icebergs table created successfully via fallback method")
      }
    } else if (tableName === "search_logs") {
      // Try to create the table by inserting a dummy record
      const { error } = await supabase.from("search_logs").insert({
        id: "00000000-0000-0000-0000-000000000000",
        user_id: "00000000-0000-0000-0000-000000000000",
        query: "initialization",
        model: "gpt-4o",
        tone: "balanced",
        timestamp: new Date().toISOString(),
        results_count: 0,
        duration_ms: 0,
      })

      if (!error) {
        // Delete the initialization record
        await supabase.from("search_logs").delete().eq("id", "00000000-0000-0000-0000-000000000000")
        console.log("Search_logs table created successfully via fallback method")
      }
    } else if (tableName === "user_profiles") {
      // Try to create the table by inserting a dummy record
      const { error } = await supabase.from("user_profiles").insert({
        id: "00000000-0000-0000-0000-000000000000",
        email: "initialization@example.com",
        role: "free",
        searches_remaining: 3,
        deep_dives_remaining: 3,
        created_at: new Date().toISOString(),
      })

      if (!error) {
        // Delete the initialization record
        await supabase.from("user_profiles").delete().eq("id", "00000000-0000-0000-0000-000000000000")
        console.log("User_profiles table created successfully via fallback method")
      }
    }
  } catch (error) {
    console.error(`Fallback method failed for ${tableName} table:`, error)
  }
}

