import { generateServerSideCompletion } from "../ai-server"
import { exaSearch } from "../exa"
import type { ArticleSummaryDto } from "@/app/api/article-summary/dto"
import { withTimeout, withRetry } from "../utils/async-utils"

/**
 * Response structure for article summaries
 */
export interface ArticleSummaryResponse {
  summary: string
  keyInsights: string[]
  relatedTopics: string[]
}

/**
 * Service for generating article summaries and related information
 */
export class ArticleSummaryService {
  /**
   * Generates a summary for an article
   * @param dto The article summary request data
   * @returns A promise resolving to the article summary response
   */
  public async generateSummary(dto: ArticleSummaryDto): Promise<ArticleSummaryResponse> {
    try {
      // Get related topics first (non-blocking)
      const relatedTopicsPromise = this.getRelatedTopics(dto.title)

      // Generate the summary with the AI model
      const prompt = this.constructSummaryPrompt(dto)
      const summaryPromise = withTimeout(
        generateServerSideCompletion(prompt, dto.model || "openai/gpt-3.5-turbo"),
        30000, // 30 second timeout
      )

      // Wait for both operations to complete
      const [summaryText, relatedTopics] = await Promise.all([
        summaryPromise.catch((error) => {
          console.error("Error generating summary:", error)
          return `Failed to generate summary for "${dto.title}". ${error.message}`
        }),
        relatedTopicsPromise.catch(() => [`More about ${dto.title}`]),
      ])

      // Parse the summary response
      return this.parseSummaryResponse(summaryText, dto.title, relatedTopics)
    } catch (error) {
      console.error("Error in article summary service:", error)
      return this.createFallbackSummary(dto.title)
    }
  }

  /**
   * Constructs the prompt for the AI model
   */
  private constructSummaryPrompt(dto: ArticleSummaryDto): string {
    return `
      You are an AI research assistant helping to summarize articles.
      
      Please summarize the following article:
      Title: ${dto.title}
      URL: ${dto.url}
      ${dto.description ? `Description: ${dto.description}` : ""}
      
      Provide:
      1. A concise summary (3-4 sentences)
      2. 3-5 key insights from the article (bullet points)
      
      Format your response as:
      
      SUMMARY:
      [Your summary here]
      
      KEY INSIGHTS:
      - [First insight]
      - [Second insight]
      - [And so on...]
    `
  }

  /**
   * Gets related topics for an article
   */
  private async getRelatedTopics(title: string): Promise<string[]> {
    try {
      const results = await withRetry(
        () =>
          exaSearch({
            query: `topics related to ${title}`,
            numResults: 5,
          }),
        {
          maxRetries: 2,
          retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 5000),
        },
      )

      if (results.results && results.results.length > 0) {
        return results.results
          .map((result) => result.title)
          .filter(Boolean)
          .slice(0, 3)
      }

      return [`More about ${title}`]
    } catch (error) {
      console.error("Error fetching related topics:", error)
      return [`More about ${title}`]
    }
  }

  /**
   * Parses the AI response into a structured format
   */
  private parseSummaryResponse(text: string, title: string, relatedTopics: string[]): ArticleSummaryResponse {
    try {
      // Extract summary
      const summaryMatch = text.match(/SUMMARY:([\s\S]*?)(?=KEY INSIGHTS:|$)/i)
      const summary = summaryMatch ? summaryMatch[1].trim() : `Summary for "${title}" could not be generated.`

      // Extract key insights
      const insightsMatch = text.match(/KEY INSIGHTS:([\s\S]*?)(?=$)/i)
      let keyInsights: string[] = []

      if (insightsMatch) {
        keyInsights = insightsMatch[1]
          .split(/\n-|\n•/)
          .map((insight) => insight.trim())
          .filter(Boolean)
      }

      if (keyInsights.length === 0) {
        keyInsights = ["No key insights were extracted from the summary."]
      }

      return {
        summary,
        keyInsights,
        relatedTopics,
      }
    } catch (error) {
      console.error("Error parsing summary response:", error)
      return this.createFallbackSummary(title)
    }
  }

  /**
   * Creates a fallback summary when the AI generation fails
   */
  private createFallbackSummary(title: string): ArticleSummaryResponse {
    return {
      summary: `We couldn't generate a summary for "${title}" at this time.`,
      keyInsights: ["Summary generation failed", "Please try again later", "You can still view the original article"],
      relatedTopics: [`More about ${title}`],
    }
  }
}

// Export a singleton instance
export const articleSummaryService = new ArticleSummaryService()

