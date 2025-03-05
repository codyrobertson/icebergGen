import { tavilySearch, RateLimitError } from "./tavily"
import { exaSearch } from "./exa"
import { googleSearch } from "./google-search"
import { generateServerSideCompletion } from "./ai-server"
import { searchConfig } from "./config"
import { withTimeout } from "@/lib/utils/async-utils"
import {
  recordProviderFailure,
  recordProviderSuccess,
  getAvailableProviders,
  isProviderDeprecated,
  mergeProviderResults,
  getAllProviderStatuses,
} from "./provider-router"

// Unified search result type
export type SearchResult = {
  title: string
  url: string
  content: string
  score: number
  image?: string
  provider: string
  knowledgeLevel?: number
}

// Search parameters
export type SearchParams = {
  query: string
  maxResults?: number
  searchDepth?: "basic" | "advanced"
  model?: string
  useLLM?: boolean
  skipTavily?: boolean
  signal?: AbortSignal
}

// Search response
export type SearchResponse = {
  results: SearchResult[]
  query: string
  providers: string[]
  searchId: string
  logs?: string[]
  providerStatuses?: Record<string, any>
}

// Custom logger function
const logEvent = (message: string, data?: any) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [SERVER] ${message}`
  console.log(logMessage)
  if (data) {
    console.log(JSON.stringify(data, null, 2))
  }
  return `[${timestamp}] ${message}`
}

/**
 * Fetches search results from Tavily
 */
async function fetchTavilyResults(params: SearchParams, signal?: AbortSignal): Promise<SearchResult[]> {
  try {
    const tavilyResults = await tavilySearch({
      query: params.query,
      search_depth: params.searchDepth,
      max_results: searchConfig.providers.resultsPerProvider,
      include_images: true,
      signal,
    })

    if (!tavilyResults.results || tavilyResults.results.length === 0) {
      return []
    }

    // Mark provider as successful
    recordProviderSuccess("tavily")

    return tavilyResults.results.map((result: any) => ({
      title: result.title || "Untitled",
      url: result.url || "#",
      content: result.content || "No content available",
      score: result.score || 0.5,
      image: result.images?.[0] || "/placeholder.svg?height=100&width=200",
      provider: "tavily",
    }))
  } catch (error: any) {
    // Check if it's a rate limit error
    const isRateLimit =
      error instanceof RateLimitError ||
      error.message?.includes("rate limit") ||
      error.message?.includes("quota exceeded")

    // Update provider status on failure
    recordProviderFailure("tavily", error, isRateLimit)

    // Rethrow for higher-level handling
    throw error
  }
}

/**
 * Fetches search results from EXA
 */
async function fetchExaResults(params: SearchParams, signal?: AbortSignal): Promise<SearchResult[]> {
  try {
    const exaResults = await exaSearch({
      query: params.query,
      numResults: searchConfig.providers.resultsPerProvider,
      signal,
    })

    if (!exaResults.results || exaResults.results.length === 0) {
      return []
    }

    // Mark provider as successful
    recordProviderSuccess("exa")

    return exaResults.results.map((result: any) => ({
      title: result.title || "Untitled",
      url: result.url || "#",
      content: result.text || "No content available",
      score: result.score || 0.5,
      image: result.image || "/placeholder.svg?height=100&width=200",
      provider: "exa",
    }))
  } catch (error: any) {
    // Check if it's a rate limit error
    const isRateLimit =
      error.message?.includes("rate limit") || error.message?.includes("quota exceeded") || error.status === 429

    // Update provider status on failure
    recordProviderFailure("exa", error, isRateLimit)

    // Rethrow for higher-level handling
    throw error
  }
}

/**
 * Fetches search results from Google
 */
async function fetchGoogleResults(params: SearchParams, signal?: AbortSignal): Promise<SearchResult[]> {
  try {
    const googleResults = await googleSearch({
      query: params.query,
      num: searchConfig.providers.resultsPerProvider,
      signal,
    })

    if (!googleResults.items || googleResults.items.length === 0) {
      return []
    }

    // Mark provider as successful
    recordProviderSuccess("google")

    return googleResults.items.map((item: any) => ({
      title: item.title || "Untitled",
      url: item.link || "#",
      content: item.snippet || "No content available",
      score: 0.8, // Default score as Google doesn't provide one
      image: item.image || "/placeholder.svg?height=100&width=200",
      provider: "google",
    }))
  } catch (error: any) {
    // Check if it's a rate limit error
    const isRateLimit =
      error.message?.includes("rate limit") || error.message?.includes("quota exceeded") || error.status === 429

    // Update provider status on failure
    recordProviderFailure("google", error, isRateLimit)

    // Rethrow for higher-level handling
    throw error
  }
}

/**
 * Comprehensive search function that combines results from multiple providers
 */
export async function comprehensiveSearch(params: SearchParams): Promise<SearchResponse> {
  const {
    query,
    maxResults = 10,
    searchDepth = "advanced",
    model = "openai/gpt-3.5-turbo",
    useLLM = true,
    skipTavily = false,
    signal,
  } = params

  const logs: string[] = []
  const addLog = (message: string, data?: any) => {
    const logMessage = logEvent(message, data)
    logs.push(logMessage)
  }

  addLog(`Starting comprehensive search for "${query}" with depth ${searchDepth}`)

  // Track which providers were used and overall results
  const providersUsed: string[] = []
  const resultsByProvider: Record<string, SearchResult[]> = {}
  let allResults: SearchResult[] = []

  // Set a timeout for the entire search process (30 seconds)
  const searchTimeout = setTimeout(() => {
    addLog("Search process timed out after 30 seconds, returning partial results")
    if (allResults.length === 0) {
      allResults = generateMockResults(query)
      providersUsed.push("mock")
    }
  }, 30000)

  // Get available providers
  let availableProviders = getAvailableProviders()

  // Skip Tavily if explicitly requested
  if (skipTavily && availableProviders.includes("tavily")) {
    addLog(`Skipping Tavily search as requested by skipTavily parameter`)
    availableProviders = availableProviders.filter((p) => p !== "tavily")
  }

  addLog(`Available providers: ${availableProviders.join(", ")}`)

  // Try each provider in order of weight
  for (const provider of availableProviders) {
    // Skip if we already have enough results
    if (allResults.length >= maxResults) {
      addLog(`Already have ${allResults.length} results, skipping remaining providers`)
      break
    }

    // Skip if this provider is not enabled in config
    if (!searchConfig.providers[provider]) {
      addLog(`Skipping ${provider} as it's disabled in config`)
      continue
    }

    try {
      addLog(`Attempting ${provider} search...`)
      const startTime = Date.now()

      let results: SearchResult[] = []

      // Call the appropriate provider function
      switch (provider) {
        case "tavily":
          results = await withTimeout(fetchTavilyResults(params, signal), 15000)
          break
        case "exa":
          results = await withTimeout(fetchExaResults(params, signal), 15000)
          break
        case "google":
          results = await withTimeout(fetchGoogleResults(params, signal), 15000)
          break
      }

      const duration = Date.now() - startTime
      addLog(`${provider} search completed in ${duration}ms`)

      if (results.length > 0) {
        providersUsed.push(provider)
        resultsByProvider[provider] = results
        allResults = [...allResults, ...results]
        addLog(`Received ${results.length} results from ${provider}`)
      } else {
        addLog(`No results from ${provider} search`)
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        addLog(`${provider} search aborted due to timeout`)
      } else if (error instanceof RateLimitError) {
        addLog(`${provider} rate limit exceeded: ${error.message}`)
      } else {
        console.error(`${provider} search failed:`, error)
        addLog(`${provider} search failed`, { error: error.message })
      }
    }
  }

  // --- Fallback: Mock Data ---
  if (allResults.length === 0) {
    addLog("No results from any provider, using mock data")
    const mockResults = generateMockResults(query)
    allResults = mockResults
    resultsByProvider.mock = mockResults
    providersUsed.push("mock")
  }

  // --- LLM Enhancement ---
  if (useLLM && allResults.length > 0) {
    try {
      // Skip LLM if it's deprecated
      if (isProviderDeprecated("openrouter")) {
        addLog("Skipping LLM enhancement due to OpenRouter deprecation")
        allResults = allResults.map((result, index) => ({
          ...result,
          knowledgeLevel: Math.min(5, Math.ceil((index + 1) / 3)),
        }))
      } else {
        try {
          addLog("Enhancing search results with LLM...")
          const startTime = Date.now()

          // Limit enhancement to a smaller subset to avoid large payloads
          const resultsToEnhance = allResults.slice(0, Math.min(allResults.length, 5))

          // Apply a timeout for the LLM enhancement process
          const enhancedResults = await withTimeout(enhanceResultsWithLLM(resultsToEnhance, query, model), 30000)

          const duration = Date.now() - startTime
          addLog(`LLM enhancement completed in ${duration}ms`)

          // Build a map for quick lookup of enhanced knowledge levels
          const enhancedMap = new Map<string, number>()
          enhancedResults.forEach((result) => {
            enhancedMap.set(result.title, result.knowledgeLevel ?? 0)
          })

          allResults = allResults.map((result, index) => {
            const knowledgeLevel = enhancedMap.get(result.title) || Math.min(5, Math.ceil((index + 1) / 3))
            return { ...result, knowledgeLevel }
          })

          // Record success for OpenRouter
          recordProviderSuccess("openrouter")
          addLog("Successfully enhanced results with LLM")
        } catch (error: any) {
          if (error.name === "AbortError" || error.name === "TimeoutError") {
            addLog("LLM enhancement aborted due to timeout")
          } else {
            console.error("Error enhancing results with LLM:", error)
            addLog("Error enhancing results with LLM", { error: error.message })

            // Record failure for OpenRouter
            recordProviderFailure("openrouter", error, error.message?.includes("rate limit"))
          }

          // Fallback to simple algorithmic assignment
          allResults = allResults.map((result, index) => ({
            ...result,
            knowledgeLevel: Math.min(5, Math.ceil((index + 1) / 3)),
          }))
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        addLog("LLM enhancement aborted due to timeout")
      } else {
        console.error("Error in LLM enhancement process:", error)
        addLog("Error in LLM enhancement process", { error: error.message })
      }

      allResults = allResults.map((result, index) => ({
        ...result,
        knowledgeLevel: Math.min(5, Math.ceil((index + 1) / 3)),
      }))
    }
  }

  // Clear timeout since search is complete
  clearTimeout(searchTimeout)

  // Use provider weights to merge and sort results
  if (Object.keys(resultsByProvider).length > 1) {
    allResults = mergeProviderResults(resultsByProvider)
    addLog("Merged results from multiple providers using provider weights")
  }

  // Limit results to maxResults
  const limitedResults = allResults.slice(0, maxResults)
  addLog(`Search completed, returning ${limitedResults.length} results from providers: ${providersUsed.join(", ")}`)

  return {
    results: limitedResults,
    query,
    providers: providersUsed,
    searchId: `search-${Date.now()}`,
    logs,
    providerStatuses: getAllProviderStatuses(),
  }
}

/**
 * Use LLM to enhance search results by assigning knowledge levels.
 */
async function enhanceResultsWithLLM(results: SearchResult[], query: string, model: string): Promise<SearchResult[]> {
  console.log("Enhancing search results with LLM...")

  // Limit the number of results to enhance
  const resultsToEnhance = results.slice(0, Math.min(results.length, 3))
  const simplifiedResults = resultsToEnhance.map((result) => ({
    title: result.title,
    content: result.content.substring(0, 150),
    provider: result.provider,
  }))

  const prompt = `
    You are an AI research assistant helping to organize search results into an "iceberg" of knowledge.
    
    The user is researching: "${query}"
    
    I have search results that I need you to enhance and organize by knowledge depth.
    Please assign a knowledge level (1-5) to each result, where:
    
    1 = Surface knowledge
    2 = Intermediate knowledge
    3 = Deep knowledge
    4 = Specialized knowledge
    5 = Obscure knowledge
    
    Here are the search results:
    ${JSON.stringify(simplifiedResults, null, 2)}
    
    Return the enhanced results as a JSON array with the same structure, including an added knowledgeLevel property.
    Only return the JSON array, no extra text.
  `

  try {
    const completion = await generateServerSideCompletion(prompt, model)

    // Extract JSON from the response
    const jsonStart = completion.indexOf("[")
    const jsonEnd = completion.lastIndexOf("]") + 1
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const jsonStr = completion.substring(jsonStart, jsonEnd)
      const enhancedResults = JSON.parse(jsonStr)
      if (Array.isArray(enhancedResults) && enhancedResults.length > 0) {
        console.log("Successfully enhanced results with LLM")
        // Map enhanced results by title to get the assigned knowledge level
        const enhancedMap = new Map<string, number>()
        enhancedResults.forEach((enhanced: any) => {
          enhancedMap.set(enhanced.title, enhanced.knowledgeLevel)
        })
        return results.map((result, index) => {
          const knowledgeLevel = enhancedMap.get(result.title) || Math.min(5, Math.ceil((index + 1) / 3))
          return { ...result, knowledgeLevel }
        })
      }
    }
    throw new Error("Could not extract valid JSON from LLM response")
  } catch (error: any) {
    console.error("Error in LLM enhancement:", error)
    // Fallback: assign knowledge levels algorithmically
    return results.map((result, index) => ({
      ...result,
      knowledgeLevel: Math.min(5, Math.ceil((index + 1) / 3)),
    }))
  }
}

/**
 * Generate mock search results when all providers fail.
 */
function generateMockResults(query: string): SearchResult[] {
  return [
    {
      title: `The Fascinating World of ${query}`,
      url: "https://example.com/intro",
      content: `A comprehensive introduction to ${query} covering basic concepts and fundamentals.`,
      score: 0.95,
      image: "https://source.unsplash.com/random/800x600/?technology",
      provider: "mock",
      knowledgeLevel: 1,
    },
    {
      title: `Hidden Secrets of ${query}`,
      url: "https://example.com/secrets",
      content: `Discover the lesser-known aspects of ${query} that experts rarely discuss.`,
      score: 0.92,
      image: "https://source.unsplash.com/random/800x600/?mystery",
      provider: "mock",
      knowledgeLevel: 2,
    },
    {
      title: `Deep Dive into ${query}`,
      url: "https://example.com/deep-dive",
      content: `An in-depth exploration of the complex mechanisms and theories behind ${query}.`,
      score: 0.89,
      image: "https://source.unsplash.com/random/800x600/?ocean",
      provider: "mock",
      knowledgeLevel: 3,
    },
    {
      title: `Expert Analysis of ${query}`,
      url: "https://example.com/expert",
      content: `Specialized knowledge and technical details about ${query} that only experts in the field understand.`,
      score: 0.85,
      image: "https://source.unsplash.com/random/800x600/?microscope",
      provider: "mock",
      knowledgeLevel: 4,
    },
    {
      title: `Obscure Facts About ${query}`,
      url: "https://example.com/obscure",
      content: `Rare and little-known information about ${query} that even most experts aren't aware of.`,
      score: 0.82,
      image: "https://source.unsplash.com/random/800x600/?ancient",
      provider: "mock",
      knowledgeLevel: 5,
    },
  ]
}

