import { v4 as uuidv4 } from "uuid"
import type { SearchResult } from "@/lib/search-service-enhanced"

type ProviderWeights = {
  [provider: string]: number
}

/**
 * Merges search results from multiple providers, removing duplicates based on URL
 * and ensuring all required fields are present.
 */
export function mergeProviderResults(
  resultsByProvider: Record<string, SearchResult[]>,
  providerWeights: ProviderWeights = {
    tavily: 1.0,
    exa: 0.9,
    google: 0.8,
    mock: 0.5,
  },
): SearchResult[] {
  console.log(`Merging results from ${Object.keys(resultsByProvider).length} providers`)

  // Flatten all results into a single array with provider info
  const allResults: SearchResult[] = []

  for (const [provider, results] of Object.entries(resultsByProvider)) {
    if (!results || !Array.isArray(results)) {
      console.warn(`Invalid results for provider ${provider}:`, results)
      continue
    }

    console.log(`Processing ${results.length} results from ${provider}`)

    // Apply provider weight to each result's score
    const providerWeight = providerWeights[provider] || 0.5

    for (const result of results) {
      allResults.push({
        ...result,
        score: (result.score || 0.5) * providerWeight,
        provider,
      })
    }
  }

  console.log(`Total flattened results: ${allResults.length}`)

  // Track unique URLs to avoid duplicates
  const uniqueUrls = new Set<string>()
  const mergedResults: SearchResult[] = []

  // Process each result
  for (const result of allResults) {
    // Skip results without a URL
    if (!result.url) {
      console.warn("Skipping result without URL:", result.title)
      continue
    }

    // Normalize the URL to avoid duplicates with trailing slashes, etc.
    const normalizedUrl = normalizeUrl(result.url)

    // Skip duplicates
    if (uniqueUrls.has(normalizedUrl)) {
      continue
    }

    // Add to unique URLs set
    uniqueUrls.add(normalizedUrl)

    // Ensure all required fields are present
    const processedResult: SearchResult = {
      id: result.id || uuidv4(),
      title: result.title || "Untitled",
      url: result.url,
      content: result.content || result.description || "",
      description: result.description || result.content || "",
      score: result.score || 0,
      provider: result.provider || "unknown",
      knowledgeLevel: result.knowledgeLevel || 1,
      image:
        result.image || `/placeholder.svg?height=200&width=300&text=${encodeURIComponent(result.title || "Result")}`,
      ...result,
    }

    mergedResults.push(processedResult)
  }

  console.log(`Merged into ${mergedResults.length} unique results`)

  // Sort by score (descending)
  mergedResults.sort((a, b) => (b.score || 0) - (a.score || 0))

  // Ensure knowledge levels are assigned
  const resultsWithLevels = ensureKnowledgeLevels(mergedResults)

  console.log(`Final merged results: ${resultsWithLevels.length}`)

  return resultsWithLevels
}

/**
 * Ensures all results have knowledge levels assigned
 */
function ensureKnowledgeLevels(results: SearchResult[]): SearchResult[] {
  return results.map((result, index) => {
    if (result.knowledgeLevel !== undefined && result.knowledgeLevel > 0) {
      return result
    }

    // Assign knowledge level based on position in results
    // Top results are more surface level, later results are deeper
    const totalResults = results.length
    const position = index / totalResults

    // Calculate level (1-5) based on position
    // First 20% = level 1, next 20% = level 2, etc.
    const level = Math.min(5, Math.max(1, Math.ceil(position * 5)))

    return {
      ...result,
      knowledgeLevel: level,
    }
  })
}

/**
 * Normalizes a URL to avoid duplicates with trailing slashes, etc.
 */
function normalizeUrl(url: string): string {
  try {
    // Remove trailing slashes
    let normalized = url.trim().replace(/\/+$/, "")

    // Remove protocol
    normalized = normalized.replace(/^https?:\/\//, "")

    // Remove www.
    normalized = normalized.replace(/^www\./, "")

    return normalized.toLowerCase()
  } catch (error) {
    console.error("Error normalizing URL:", error)
    return url
  }
}

/**
 * Merges a group of similar results into a single result.
 */
function mergeResultGroup(group: SearchResult[]): SearchResult {
  // Sort by score (descending)
  const sortedGroup = [...group].sort((a, b) => (b.score || 0) - (a.score || 0))

  // Use the highest-scored result as the base
  const baseResult = sortedGroup[0]

  // Calculate the average score
  const totalScore = sortedGroup.reduce((sum, result) => sum + (result.score || 0), 0)
  const avgScore = totalScore / sortedGroup.length

  // Use the highest knowledge level if available
  const knowledgeLevel = Math.max(...sortedGroup.map((result) => result.knowledgeLevel || 0))

  // Combine providers
  const providers = Array.from(new Set(sortedGroup.map((result) => result.provider)))

  // Use the image from the highest-scored result or the first one with an image
  const image = sortedGroup.find((result) => result.image)?.image || baseResult.image

  // Return the merged result
  return {
    ...baseResult,
    score: avgScore,
    knowledgeLevel: knowledgeLevel || baseResult.knowledgeLevel,
    provider: providers.join("+"),
    image,
  }
}

/**
 * Utility function to check if two URLs are similar enough to be considered the same content
 */
function areSimilarUrls(url1: string, url2: string): boolean {
  const normalized1 = normalizeUrl(url1)
  const normalized2 = normalizeUrl(url2)

  return normalized1 === normalized2
}

