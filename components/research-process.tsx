"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/components/ui/use-toast"
import { IcebergChart } from "@/components/iceberg-chart"
import { Button } from "@/components/ui/button"

// Simple loading spinner component
function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }

  return (
    <div className="flex justify-center">
      <div className={`animate-spin rounded-full border-t-2 border-primary ${sizeClasses[size]}`}></div>
    </div>
  )
}

// Fallback values if stores aren't available
const DEFAULT_MODEL = "gpt-4o"
const DEFAULT_TONE = "balanced"

export function ResearchProcess() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get("q")
  const { toast } = useToast()

  // Handle potential missing stores with try/catch and fallbacks
  let selectedModel = DEFAULT_MODEL
  let selectedTone = DEFAULT_TONE

  try {
    // Dynamically import the stores to prevent build errors if they don't exist
    const { useModelStore } = require("@/lib/stores/model-store")
    const { useToneStore } = require("@/lib/stores/tone-store")

    // Use the stores if available
    selectedModel = useModelStore.getState().selectedModel || DEFAULT_MODEL
    selectedTone = useToneStore.getState().selectedTone || DEFAULT_TONE
  } catch (e) {
    console.warn("Store files not found, using default values:", e)
  }

  const supabase = createClientComponentClient()

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession()
        if (authError) {
          console.error("Auth error:", authError)
          setIsAuthenticated(false)
        } else {
          setIsAuthenticated(!!session)
        }
      } catch (error) {
        console.error("Error checking auth:", error)
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [supabase])

  useEffect(() => {
    if (!query) {
      router.push("/")
      return
    }

    const runResearchProcess = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Check authentication status first
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const isLoggedIn = !!session

        // Prepare the URL with authentication bypass if needed
        const authParam = isLoggedIn ? "" : "&skipAuth=true"
        const url = `/api/search?q=${encodeURIComponent(query)}&model=${selectedModel}&tone=${selectedTone}${authParam}`

        console.log(`Fetching from: ${url}`)

        // Set up an AbortController for the fetch
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 58000) // 58 second timeout

        try {
          const response = await fetch(url, {
            signal: controller.signal,
            credentials: "include", // Important for including cookies
            headers: {
              Accept: "application/json",
            },
          })

          // Clear the timeout
          clearTimeout(timeoutId)

          // Check if the response is JSON
          const contentType = response.headers.get("content-type")
          if (!contentType || !contentType.includes("application/json")) {
            console.error("Non-JSON response received:", contentType)
            throw new Error(`Expected JSON response but got ${contentType || "unknown content type"}`)
          }

          if (!response.ok) {
            // Try to parse error as JSON
            let errorData
            try {
              errorData = await response.json()
            } catch (parseError) {
              console.error("Failed to parse error response as JSON:", parseError)
              throw new Error(`Search API responded with status: ${response.status}`)
            }

            if (response.status === 401) {
              // Authentication error
              console.error("Authentication error:", errorData)

              // If not authenticated, show a toast and redirect to login
              if (!isLoggedIn) {
                toast({
                  title: "Authentication Required",
                  description: "Please log in to use this feature.",
                  variant: "destructive",
                })

                // Redirect to login page
                router.push("/login?returnUrl=" + encodeURIComponent(`/research?q=${query}`))
                return
              }

              throw new Error(errorData.message || "Authentication error")
            } else {
              // Other API errors
              throw new Error(errorData.error || `Search API responded with status: ${response.status}`)
            }
          }

          // Parse the JSON response
          const result = await response.json()
          setData(result)
        } catch (fetchError: any) {
          // Handle fetch errors
          if (fetchError.name === "SyntaxError" && fetchError.message.includes("Unexpected token")) {
            console.error("JSON parse error - likely received HTML instead of JSON:", fetchError)
            throw new Error("The server returned an invalid response. Please try again later.")
          }
          throw fetchError
        }
      } catch (err: any) {
        console.error("Error in research process:", err)

        if (err.name === "AbortError") {
          setError("The search took too long and was aborted. Please try again with a more specific query.")
        } else {
          setError(err.message || "An unexpected error occurred during the research process.")
        }

        toast({
          title: "Research Error",
          description: err.message || "An error occurred while processing your research query.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    runResearchProcess()
  }, [query, selectedModel, selectedTone, router, toast, supabase])

  if (!query) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <LoadingSpinner size="lg" />
        <h2 className="mt-4 text-xl font-semibold">Researching "{query}"...</h2>
        <p className="mt-2 text-muted-foreground">
          This may take up to a minute. We're searching multiple sources and analyzing the results.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="text-destructive text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold mb-2">Research Error</h2>
        <p className="text-center text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push("/")}>Try Another Search</Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="text-warning text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold mb-2">No Results Found</h2>
        <p className="text-center text-muted-foreground mb-4">
          We couldn't find any results for "{query}". Please try a different search term.
        </p>
        <Button onClick={() => router.push("/")}>Try Another Search</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Research Results for "{query}"</h1>

      {data.levels && Object.keys(data.levels).length > 0 ? (
        <IcebergChart levels={data.levels} query={query} />
      ) : (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-lg">No iceberg levels were generated for this query.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Try Another Search
          </Button>
        </div>
      )}

      <div className="mt-8 text-sm text-muted-foreground">
        <p>
          Search completed in {(data.duration / 1000).toFixed(2)} seconds using{" "}
          {data.providers?.join(", ") || "unknown providers"}.{data.fromCache && " (Results from cache)"}
        </p>
        {!isAuthenticated && (
          <p className="mt-2 text-warning">
            You are not logged in.{" "}
            <a href="/login" className="underline">
              Log in
            </a>{" "}
            to save your research and access more features.
          </p>
        )}
      </div>
    </div>
  )
}

