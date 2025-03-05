import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { initializeDatabase } from "@/lib/init-supabase"

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check if required tables exist by attempting to query them directly
    const requiredTables = ["icebergs", "search_logs", "user_profiles"]
    const tableStatus = {}
    const missingTables = []

    for (const table of requiredTables) {
      try {
        const { error } = await supabase.from(table).select("*", { count: "exact", head: true })

        if (error && error.code === "42P01") {
          // Table doesn't exist
          tableStatus[table] = { exists: false, error: error.message }
          missingTables.push(table)
        } else if (error) {
          tableStatus[table] = { exists: false, error: error.message }
          missingTables.push(table)
        } else {
          tableStatus[table] = { exists: true }
        }
      } catch (error) {
        console.error(`Error checking ${table} table:`, error)
        tableStatus[table] = { exists: false, error: String(error) }
        missingTables.push(table)
      }
    }

    // If any tables are missing, try to initialize the database
    if (missingTables.length > 0) {
      console.log("Missing tables detected:", missingTables)

      // Try to initialize the database
      const initResult = await initializeDatabase()

      if (!initResult.success) {
        return NextResponse.json(
          {
            healthy: false,
            tableStatus,
            missingTables,
            error: "Failed to initialize missing tables",
            message: "Database initialization failed",
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        healthy: true,
        initialized: true,
        previouslyMissingTables: missingTables,
        message: "Database tables were missing but have been initialized",
      })
    }

    // All tables exist, check if we can query them
    try {
      const { error: countError } = await supabase.from("icebergs").select("*", { count: "exact", head: true })

      if (countError) {
        return NextResponse.json(
          {
            healthy: false,
            error: countError.message,
            message: "Failed to query icebergs table",
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        healthy: true,
        tableStatus,
        message: "Database is healthy and all required tables exist",
      })
    } catch (queryError: any) {
      return NextResponse.json(
        {
          healthy: false,
          error: queryError.message || "Unknown error",
          message: "Failed to query database tables",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Database health check error:", error)
    return NextResponse.json(
      {
        healthy: false,
        error: error.message || "Unknown error",
        message: "Unexpected error during database health check",
      },
      { status: 500 },
    )
  }
}

