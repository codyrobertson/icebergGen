import { createClient } from "@supabase/supabase-js"

/**
 * Utility functions for diagnosing and fixing database issues
 */

export async function checkDatabaseTables(
  supabaseUrl: string,
  supabaseKey: string,
): Promise<{ [tableName: string]: boolean }> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const tables = ["user_profiles", "search_logs", "icebergs", "search_history"]
  const results: { [tableName: string]: boolean } = {}

  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true })
      results[table] = !error
      console.log(`Table ${table} exists: ${!error}`)
      if (error) {
        console.error(`Error checking table ${table}:`, error)
      }
    } catch (err) {
      results[table] = false
      console.error(`Error checking table ${table}:`, err)
    }
  }

  return results
}

export async function createMissingTables(
  supabaseUrl: string,
  supabaseKey: string,
): Promise<{ [tableName: string]: boolean }> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const tableResults = await checkDatabaseTables(supabaseUrl, supabaseKey)
  const results: { [tableName: string]: boolean } = {}

  // Create user_profiles table if it doesn't exist
  if (!tableResults["user_profiles"]) {
    try {
      console.log("Creating user_profiles table...")
      const { error } = await supabase.rpc("exec_sql", {
        query: `
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
          
          CREATE TABLE IF NOT EXISTS public.user_profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'free',
            searches_remaining INTEGER DEFAULT 3,
            deep_dives_remaining INTEGER DEFAULT 3,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `,
      })
      results["user_profiles"] = !error
      if (error) {
        console.error("Error creating user_profiles table:", error)
      } else {
        console.log("Successfully created user_profiles table")
      }
    } catch (err) {
      results["user_profiles"] = false
      console.error("Error creating user_profiles table:", err)
    }
  } else {
    results["user_profiles"] = true
  }

  // Create search_logs table if it doesn't exist
  if (!tableResults["search_logs"]) {
    try {
      console.log("Creating search_logs table...")
      const { error } = await supabase.rpc("exec_sql", {
        query: `
          CREATE TABLE IF NOT EXISTS public.search_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            query TEXT NOT NULL,
            model TEXT NOT NULL,
            tone TEXT NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            results_count INTEGER NOT NULL,
            duration_ms INTEGER NOT NULL
          );
        `,
      })
      results["search_logs"] = !error
      if (error) {
        console.error("Error creating search_logs table:", error)
      } else {
        console.log("Successfully created search_logs table")
      }
    } catch (err) {
      results["search_logs"] = false
      console.error("Error creating search_logs table:", err)
    }
  } else {
    results["search_logs"] = true
  }

  // Create icebergs table if it doesn't exist
  if (!tableResults["icebergs"]) {
    try {
      console.log("Creating icebergs table...")
      const { error } = await supabase.rpc("exec_sql", {
        query: `
          CREATE TABLE IF NOT EXISTS public.icebergs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            query TEXT NOT NULL,
            data JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `,
      })
      results["icebergs"] = !error
      if (error) {
        console.error("Error creating icebergs table:", error)
      } else {
        console.log("Successfully created icebergs table")
      }
    } catch (err) {
      results["icebergs"] = false
      console.error("Error creating icebergs table:", err)
    }
  } else {
    results["icebergs"] = true
  }

  // Create search_history table if it doesn't exist
  if (!tableResults["search_history"]) {
    try {
      console.log("Creating search_history table...")
      const { error } = await supabase.rpc("exec_sql", {
        query: `
          CREATE TABLE IF NOT EXISTS public.search_history (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            query TEXT NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `,
      })
      results["search_history"] = !error
      if (error) {
        console.error("Error creating search_history table:", error)
      } else {
        console.log("Successfully created search_history table")
      }
    } catch (err) {
      results["search_history"] = false
      console.error("Error creating search_history table:", err)
    }
  } else {
    results["search_history"] = true
  }

  return results
}

export async function createTestUser(
  supabaseUrl: string,
  supabaseKey: string,
  email: string,
  password: string,
): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    console.log(`Creating test user with email: ${email}...`)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (error) {
      console.error("Error creating test user:", error)
      return false
    }

    console.log("Successfully created test user:", data.user.id)
    return true
  } catch (err) {
    console.error("Error creating test user:", err)
    return false
  }
}

export async function runDatabaseDiagnostics(
  supabaseUrl: string,
  supabaseKey: string,
): Promise<{
  tablesExist: { [tableName: string]: boolean }
  tablesCreated: { [tableName: string]: boolean }
  userCreated: boolean
}> {
  console.log("Running database diagnostics...")

  const tablesExist = await checkDatabaseTables(supabaseUrl, supabaseKey)
  const tablesCreated = await createMissingTables(supabaseUrl, supabaseKey)

  // Only create a test user if all tables exist or were created
  const allTablesExistOrCreated =
    Object.values(tablesExist).every((exists) => exists) || Object.values(tablesCreated).every((created) => created)

  let userCreated = false
  if (allTablesExistOrCreated) {
    userCreated = await createTestUser(
      supabaseUrl,
      supabaseKey,
      `test-${Date.now()}@example.com`,
      `password-${Date.now()}`,
    )
  }

  return {
    tablesExist,
    tablesCreated,
    userCreated,
  }
}

