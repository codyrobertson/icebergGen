import { createClient } from "@supabase/supabase-js"
import { generateText, streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

// Type definitions
type AIModelProvider = "openai" | "openrouter" | "anthropic" | "google" | "mistral" | "meta" | "cohere"

type AIModelRequest = {
  prompt: string
  model: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
  onProgress?: (chunk: string) => void
}

// Constants for AI service
const AI_CONSTANTS = {
  DEFAULT_MAX_TOKENS: 1500,
  DEFAULT_TEMPERATURE: 0.7,
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 2,
}

// Provider mapping for model identification
const PROVIDER_MAP: Record<string, AIModelProvider> = {
  openai: "openai",
  gpt: "openai",
  claude: "anthropic",
  gemini: "google",
  mistral: "mistral",
  llama: "meta",
  command: "cohere",
}

/**
 * Determines the AI provider from the model string
 * @param model The model identifier string
 * @returns The provider for the given model
 */
function getProviderFromModel(model: string): AIModelProvider {
  if (model.includes("/")) {
    return model.split("/")[0] as AIModelProvider
  }

  // Check for known model prefixes
  for (const [prefix, provider] of Object.entries(PROVIDER_MAP)) {
    if (model.toLowerCase().startsWith(prefix)) {
      return provider
    }
  }

  // Default to OpenRouter for unknown models
  return "openrouter"
}

// Main AI service function
export async function generateAIResponse({
  prompt,
  model = "openai/gpt-3.5-turbo",
  temperature = 0.7,
  max_tokens = 1500,
  stream = false,
  onProgress,
}: AIModelRequest): Promise<string> {
  try {
    // Get API key
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.openrouter_API
    if (!apiKey) {
      throw new Error("OpenRouter API key not found")
    }

    // Determine which provider to use
    const provider = getProviderFromModel(model)

    // Use the AI SDK for text generation
    if (stream && onProgress) {
      // For streaming responses
      let fullText = ""

      // Use the appropriate provider
      const aiModel =
        provider === "openai" ? openai(model.replace("openai/", "")) : createOpenRouter({ apiKey }).chatModel(model)

      const result = await streamText({
        model: aiModel,
        prompt: prompt,
        temperature: temperature,
        maxTokens: max_tokens,
      })

      for await (const chunk of result.textStream) {
        fullText += chunk
        onProgress(chunk)
      }
      return fullText
    } else {
      // For non-streaming responses
      const aiModel =
        provider === "openai" ? openai(model.replace("openai/", "")) : createOpenRouter({ apiKey }).chatModel(model)

      const { text } = await generateText({
        model: aiModel,
        prompt: prompt,
        temperature: temperature,
        maxTokens: max_tokens,
      })

      return text
    }
  } catch (error) {
    console.error("Error generating AI response:", error)
    throw new Error(`Failed to generate AI response: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Function to log AI usage to Supabase
export async function logAIUsage(userId: string, model: string, promptTokens: number, completionTokens: number) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase credentials missing, skipping usage logging")
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    await supabase.from("ai_usage_logs").insert({
      user_id: userId,
      model: model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error logging AI usage:", error)
    // Don't throw here to prevent breaking the main flow
  }
}

// Function to evaluate iceberg depth using AI
export async function evaluateIcebergDepth(items: any[]): Promise<any[]> {
  try {
    // Use a lightweight model for initial scoring to save costs
    const scoringModel = "openai/gpt-3.5-turbo"

    // Calculate depth scores for each item
    const itemsWithScores = await Promise.all(
      items.map(async (item, index) => {
        try {
          // For performance reasons, only evaluate a subset of items with AI
          // Use algorithmic scoring for the rest
          if (index < 10) {
            // Evaluate top 10 items with AI
            const depthScore = await evaluateDepthWithAI(item.title, item.description, scoringModel)
            const knowledgeLevel = Math.min(5, Math.max(1, Math.ceil(depthScore / 20)))

            return {
              ...item,
              depthScore,
              knowledgeLevel,
            }
          } else {
            // Use algorithmic scoring for the rest
            const obscurityScore = calculateObscurityScore(item.title, item.description)
            const surpriseFactor = calculateSurpriseFactor(item.title, item.description)
            const nicheFactor = calculateNicheFactor(item.title)

            const depthScore = obscurityScore + surpriseFactor + nicheFactor
            const knowledgeLevel = Math.min(5, Math.max(1, Math.ceil(depthScore / 10)))

            return {
              ...item,
              depthScore,
              knowledgeLevel,
            }
          }
        } catch (error) {
          console.error(`Error evaluating depth for item "${item.title}":`, error)
          // Fallback to algorithmic scoring
          const depthScore =
            calculateObscurityScore(item.title, item.description) +
            calculateSurpriseFactor(item.title, item.description) +
            calculateNicheFactor(item.title)

          return {
            ...item,
            depthScore,
            knowledgeLevel: Math.min(5, Math.max(1, Math.ceil(depthScore / 10))),
          }
        }
      }),
    )

    // Sort by depth score (highest first)
    return itemsWithScores.sort((a, b) => b.depthScore - a.depthScore)
  } catch (error) {
    console.error("Error evaluating iceberg depth:", error)
    // If evaluation fails, return original items with estimated knowledge levels
    return items.map((item, index) => ({
      ...item,
      knowledgeLevel: Math.min(5, Math.ceil((index + 1) / 2)),
    }))
  }
}

// Evaluate depth using AI
async function evaluateDepthWithAI(title: string, description: string, model: string): Promise<number> {
  try {
    const prompt = `
      You are an expert at evaluating how obscure, surprising, and niche a piece of information is.
      
      Please evaluate the following information and assign scores from 0-100 for:
      
      1. Obscurity Score (O): How well-known is this fact? (0 = common knowledge, 100 = almost nobody knows this)
      2. Surprise Factor (S): How unexpected or mind-blowing is this information? (0 = expected, 100 = completely shocking)
      3. Niche Factor (N): How specialized or domain-specific is this knowledge? (0 = general knowledge, 100 = highly specialized)
      
      Title: ${title}
      Description: ${description}
      
      Return ONLY a JSON object with the scores and a brief explanation for each:
      {
        "obscurityScore": number,
        "obscurityReason": "brief explanation",
        "surpriseFactor": number,
        "surpriseReason": "brief explanation",
        "nicheFactor": number,
        "nicheReason": "brief explanation",
        "totalDepthScore": number
      }
    `

    const response = await generateAIResponse({
      prompt,
      model,
      temperature: 0.3, // Lower temperature for more consistent scoring
      max_tokens: 500,
    })

    try {
      // Extract JSON from the response
      const jsonStart = response.indexOf("{")
      const jsonEnd = response.lastIndexOf("}") + 1

      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonStr = response.substring(jsonStart, jsonEnd)
        const result = JSON.parse(jsonStr)

        // Calculate total depth score (weighted average)
        const totalScore =
          result.totalDepthScore || result.obscurityScore * 0.4 + result.surpriseFactor * 0.4 + result.nicheFactor * 0.2

        return totalScore
      }

      throw new Error("Could not extract JSON from response")
    } catch (error) {
      console.error("Error parsing AI depth evaluation:", error)
      // Fallback to algorithmic scoring
      return (
        calculateObscurityScore(title, description) +
        calculateSurpriseFactor(title, description) +
        calculateNicheFactor(title)
      )
    }
  } catch (error) {
    console.error("Error in AI depth evaluation:", error)
    // Fallback to algorithmic scoring
    return (
      calculateObscurityScore(title, description) +
      calculateSurpriseFactor(title, description) +
      calculateNicheFactor(title)
    )
  }
}

// Algorithmic scoring functions for fallback and efficiency
function calculateObscurityScore(title: string, description: string): number {
  const combinedText = `${title} ${description}`
  const wordCount = combinedText.split(/\s+/).length
  const avgWordLength = combinedText.length / wordCount

  // Check for rare words and technical terms
  const technicalTerms = /algorithm|quantum|neural|genome|theorem|paradigm|synthesis|methodology|framework|hypothesis/gi
  const technicalMatches = combinedText.match(technicalTerms) || []
  const technicalScore = Math.min(5, technicalMatches.length)

  // Longer descriptions with more complex words tend to be more obscure
  const lengthScore = Math.min(5, wordCount / 50 + avgWordLength / 2)

  return technicalScore + lengthScore
}

function calculateSurpriseFactor(title: string, description: string): number {
  const combinedText = `${title} ${description}`

  // Check for phrases indicating surprising content
  const unexpectedPhrases =
    /unexpected|surprising|unknown|rare|secret|hidden|mysterious|strange|unusual|contrary to popular belief|myth|misconception|paradox/i
  const counterIntuitivePhrases =
    /contrary to|opposite of|unlike|defies|contradicts|challenges|overturns|revolutionary|breakthrough/i

  const hasUnexpectedPhrases = unexpectedPhrases.test(combinedText)
  const hasCounterIntuitive = counterIntuitivePhrases.test(combinedText)

  // Check for question-challenging phrases
  const mythBusting = /actually|in reality|truth is|fact is|research shows|studies indicate|evidence suggests/i.test(
    combinedText,
  )

  let score = 5 // Base score
  if (hasUnexpectedPhrases) score += 2
  if (hasCounterIntuitive) score += 3
  if (mythBusting) score += 2

  return Math.min(10, score)
}

function calculateNicheFactor(title: string): number {
  const wordCount = title.split(/\s+/).length

  // Check for specialized terminology
  const specializedTerms = /specific|specialized|advanced|technical|professional|expert|niche|domain|field|discipline/i
  const hasSpecializedTerms = specializedTerms.test(title)

  // Longer, more specific titles tend to be more niche
  const lengthScore = Math.min(7, wordCount / 2)
  const specializedScore = hasSpecializedTerms ? 3 : 0

  return Math.min(10, lengthScore + specializedScore)
}

