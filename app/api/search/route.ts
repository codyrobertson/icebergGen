import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { comprehensiveSearch } from "@/lib/search-service"
import { processResultsIntoIcebergLevels } from "@/lib/ai-utils"

// Set maximum duration for Vercel serverless function (60 seconds is the max for hobby plan)
export const maxDuration = 60

export async function GET(request: Request) {
  console.log("[Search API] Request received")
  const startTime = Date.now()

  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const model = searchParams.get("model") || "gpt-4o"
  const tone = searchParams.get("tone") || "balanced"
  const skipAuth = searchParams.get("skipAuth") === "true"

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 })
  }

  console.log(`[Search API] Processing query: "${query}" with model: ${model}, tone: ${tone}`)

  try {
    // Create a Supabase client
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError && !skipAuth) {
      console.error("[Search API] User authentication error:", userError)
      return NextResponse.json(
        {
          error: "Authentication error",
          message: userError.message,
          hint: "Make sure you're logged in. If testing, you can use ?skipAuth=true to bypass authentication.",
        },
        { status: 401 },
      )
    }

    if (!user && !skipAuth) {
      console.error("[Search API] No authenticated user found")
      return NextResponse.json(
        {
          error: "Authentication required",
          message: "No authenticated user found",
          hint: "Make sure you're logged in. If testing, you can use ?skipAuth=true to bypass authentication.",
        },
        { status: 401 },
      )
    }

    // Set up an AbortController with a timeout slightly less than the maxDuration
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      console.error("[Search API] Search timed out after 55 seconds")
    }, 55000) // 55 seconds (slightly less than the 60 second maxDuration)

    try {
      // Perform the search with the abort signal
      console.log("[Search API] Starting comprehensive search")
      const searchResults = await comprehensiveSearch({
        query,
        model,
        tone,
        signal: controller.signal,
      })

      // Clear the timeout since the search completed
      clearTimeout(timeoutId)

      if (!searchResults || !searchResults.results) {
        throw new Error("Search returned no results")
      }

      console.log(`[Search API] Search completed with ${searchResults.results.length} results`)

      // Process the results into iceberg levels
      console.log("[Search API] Processing results into iceberg levels")
      const icebergLevels = processResultsIntoIcebergLevels(searchResults.results)

      // Log the search to the database if user is authenticated
      if (user && !skipAuth) {
        try {
          console.log("[Search API] Logging search to database")
          const { error: logError } = await supabase.from("search_logs").insert({
            user_id: user.id,
            query,
            model,
            tone,
            results_count: searchResults.results.length,
            duration_ms: Date.now() - startTime,
          })

          if (logError) {
            console.error("[Search API] Error logging search:", logError)
          }

          // Save the iceberg to the database
          console.log("[Search API] Saving iceberg to database")
          const { error: icebergError } = await supabase.from("icebergs").insert({
            user_id: user.id,
            query,
            data: icebergLevels,
          })

          if (icebergError) {
            console.error("[Search API] Error saving iceberg:", icebergError)
          }
        } catch (dbError) {
          console.error("[Search API] Database operation error:", dbError)
        }
      } else {
        console.log("[Search API] Skipping database logging (no authenticated user or skipAuth=true)")
      }

      // Return the results
      const duration = Date.now() - startTime
      console.log(`[Search API] Request completed in ${duration}ms`)

      return NextResponse.json({
        success: true,
        query,
        levels: icebergLevels,
        providers: searchResults.providers,
        levelCount: Object.keys(icebergLevels).length,
        fromCache: searchResults.fromCache || false,
        duration,
      })
    } catch (searchError: any) {
      // Clear the timeout if there was an error
      clearTimeout(timeoutId)

      if (searchError.name === "AbortError") {
        console.error("[Search API] Search was aborted due to timeout")
        return NextResponse.json({ error: "Search timed out" }, { status: 504 })
      }

      throw searchError
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[Search API] Error after ${duration}ms:`, error)

    return NextResponse.json(
      {
        error: error.message || "An unexpected error occurred",
        duration,
      },
      { status: 500 },
    )
  }
}

