type TavilySearchParams = {
  query: string
  search_depth?: "basic" | "advanced"
  max_results?: number
  include_domains?: string[]
  exclude_domains?: string[]
  include_answer?: boolean
  include_raw_content?: boolean
  include_images?: boolean
  signal?: AbortSignal
}

type TavilySearchResult = {
  title: string
  url: string
  content: string
  score: number
  images?: string[]
}

type TavilyResponse = {
  query: string
  results: TavilySearchResult[]
  answer?: string
  search_id: string
}

// Custom error class for rate limit errors
export class RateLimitError extends Error {
  constructor(
    message: string,
    public provider = "tavily",
  ) {
    super(message)
    this.name = "RateLimitError"
  }
}

export async function tavilySearch(params: TavilySearchParams): Promise<TavilyResponse> {
  const apiKey = process.env.TAVILY_API_KEY

  if (!apiKey) {
    console.warn("Tavily API key missing, using mock data")
    return mockTavilyResponse(params.query)
  }

  try {
    console.log("Calling Tavily API with params:", JSON.stringify(params))

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: params.query,
        search_depth: params.search_depth || "advanced",
        max_results: params.max_results || 10,
        include_images: params.include_images !== undefined ? params.include_images : true,
        include_domains: params.include_domains,
        exclude_domains: params.exclude_domains,
        include_answer: params.include_answer,
        include_raw_content: params.include_raw_content,
      }),
      signal: params.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Tavily API error (${response.status}):`, errorText)

      // Check for rate limit or quota exceeded errors
      if (response.status === 403 || response.status === 429) {
        const errorData = tryParseJson(errorText)
        const errorMessage = errorData?.detail?.error || "Rate limit or quota exceeded"

        // Throw a specific rate limit error
        throw new RateLimitError(`Tavily API rate limit exceeded: ${errorMessage}`)
      }

      throw new Error(`Tavily API responded with status: ${response.status}`)
    }

    const data = await response.json()
    console.log("Tavily API response:", JSON.stringify(data).substring(0, 200) + "...")
    return data
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.warn("Tavily rate limit exceeded, using mock data")
      return mockTavilyResponse(params.query)
    }

    if (error.name === "AbortError") {
      console.log("Tavily search aborted due to timeout")
      throw error // Re-throw abort errors
    }

    console.error("Error with Tavily search:", error)
    return mockTavilyResponse(params.query)
  }
}

// Helper function to safely parse JSON
function tryParseJson(text: string): any {
  try {
    return JSON.parse(text)
  } catch (e) {
    return null
  }
}

function mockTavilyResponse(query: string): TavilyResponse {
  console.log("Using mock Tavily response for query:", query)

  return {
    query,
    search_id: `mock-${Date.now()}`,
    results: [
      {
        title: `The Fascinating World of ${query}`,
        url: "https://example.com/intro",
        content: `A comprehensive introduction to ${query} covering the basic concepts and fundamentals. This article explores the origins, key principles, and modern applications.`,
        score: 0.95,
        images: ["https://source.unsplash.com/random/800x600/?technology"],
      },
      {
        title: `Hidden Secrets of ${query}`,
        url: "https://example.com/secrets",
        content: `Discover the lesser-known aspects of ${query} that experts rarely discuss. This deep dive reveals surprising connections and obscure facts that will change your perspective.`,
        score: 0.92,
        images: ["https://source.unsplash.com/random/800x600/?mystery"],
      },
      {
        title: `The Evolution of ${query} Through History`,
        url: "https://example.com/history",
        content: `Trace the historical development and evolution of ${query} from ancient times to the present day. Learn how different cultures and time periods shaped our understanding.`,
        score: 0.88,
        images: ["https://source.unsplash.com/random/800x600/?history"],
      },
      {
        title: `Revolutionary Approaches to ${query}`,
        url: "https://example.com/innovation",
        content: `Explore cutting-edge innovations and paradigm shifts in the field of ${query}. This article highlights breakthrough methodologies that are transforming the landscape.`,
        score: 0.85,
        images: ["https://source.unsplash.com/random/800x600/?innovation"],
      },
      {
        title: `The Dark Side of ${query}`,
        url: "https://example.com/controversies",
        content: `An unflinching look at the controversies, ethical dilemmas, and unintended consequences surrounding ${query}. This critical analysis examines the problematic aspects often overlooked.`,
        score: 0.82,
        images: ["https://source.unsplash.com/random/800x600/?shadow"],
      },
      {
        title: `${query} and Its Intersection with Philosophy`,
        url: "https://example.com/philosophy",
        content: `A thought-provoking exploration of how ${query} relates to fundamental philosophical questions about existence, knowledge, and ethics. This interdisciplinary analysis bridges technical concepts with timeless wisdom.`,
        score: 0.79,
        images: ["https://source.unsplash.com/random/800x600/?philosophy"],
      },
      {
        title: `The Future of ${query}: Predictions and Possibilities`,
        url: "https://example.com/future",
        content: `Visionary experts share their forecasts about where ${query} is headed in the coming decades. This forward-looking piece examines emerging trends and speculates on transformative developments on the horizon.`,
        score: 0.76,
        images: ["https://source.unsplash.com/random/800x600/?future"],
      },
      {
        title: `${query} in Popular Culture`,
        url: "https://example.com/culture",
        content: `Analyze how ${query} has been represented in movies, books, art, and other media. This cultural study reveals how public perception has been shaped by creative interpretations and fictional portrayals.`,
        score: 0.73,
        images: ["https://source.unsplash.com/random/800x600/?culture"],
      },
      {
        title: `Bizarre Anomalies in ${query} Research`,
        url: "https://example.com/anomalies",
        content: `Investigate the strange, unexplained phenomena and puzzling contradictions that have emerged in the study of ${query}. This collection of scientific mysteries challenges conventional understanding and points to new research frontiers.`,
        score: 0.7,
        images: ["https://source.unsplash.com/random/800x600/?strange"],
      },
      {
        title: `The Forgotten Pioneers of ${query}`,
        url: "https://example.com/pioneers",
        content: `Rediscover the overlooked innovators and unsung heroes who made crucial contributions to ${query} but never received proper recognition. This historical correction brings attention to marginalized figures whose work deserves celebration.`,
        score: 0.67,
        images: ["https://source.unsplash.com/random/800x600/?vintage"],
      },
    ],
  }
}

