type ExaSearchParams = {
  query: string
  numResults?: number
  useAutoprompt?: boolean
  type?: "keyword" | "neural"
  signal?: AbortSignal
}

type ExaSearchResult = {
  id: string
  url: string
  title: string
  text: string
  score: number
  published?: string
  author?: string
  image?: string
}

type ExaResponse = {
  results: ExaSearchResult[]
  autopromptString?: string
}

export async function exaSearch(params: ExaSearchParams): Promise<ExaResponse> {
  const apiKey = process.env.EXA_API_KEY
  const { signal } = params

  if (!apiKey) {
    console.warn("EXA API key missing, using mock data")
    return mockExaResponse(params.query)
  }

  try {
    console.log(
      "Calling EXA API with params:",
      JSON.stringify({
        query: params.query,
        numResults: params.numResults || 10,
        useAutoprompt: params.useAutoprompt !== undefined ? params.useAutoprompt : true,
        type: params.type || "neural",
      }),
    )

    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query: params.query,
        numResults: params.numResults || 10,
        useAutoprompt: params.useAutoprompt !== undefined ? params.useAutoprompt : true,
        type: params.type || "neural",
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`EXA API error (${response.status}):`, errorText)
      throw new Error(`EXA API responded with status: ${response.status}`)
    }

    const data = await response.json()
    console.log("EXA API response received with", data.results?.length || 0, "results")

    // Validate the response structure
    if (!data.results || !Array.isArray(data.results)) {
      console.error("Invalid EXA API response format:", data)
      throw new Error("Invalid EXA API response format")
    }

    return data
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("EXA search aborted due to timeout")
      throw error
    }
    console.error("Error with EXA search:", error)
    return mockExaResponse(params.query)
  }
}

export async function exaFindSimilar(params: {
  url: string
  numResults?: number
}): Promise<ExaResponse> {
  const apiKey = process.env.EXA_API_KEY

  if (!apiKey) {
    console.warn("EXA API key missing, using mock data")
    return mockExaResponse(`Similar to ${params.url}`)
  }

  try {
    console.log("Calling EXA Find Similar API with params:", JSON.stringify(params))

    const response = await fetch("https://api.exa.ai/similar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        url: params.url,
        numResults: params.numResults || 5,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`EXA API error (${response.status}):`, errorText)
      throw new Error(`EXA API responded with status: ${response.status}`)
    }

    const data = await response.json()
    console.log("EXA Find Similar API response:", JSON.stringify(data).substring(0, 200) + "...")
    return data
  } catch (error) {
    console.error("Error with EXA Find Similar:", error)
    return mockExaResponse(`Similar to ${params.url}`)
  }
}

function mockExaResponse(query: string): ExaResponse {
  console.log("Using mock EXA response for query:", query)

  return {
    results: [
      {
        id: "mock-1",
        title: `The Fascinating World of ${query}`,
        url: "https://example.com/intro",
        text: `A comprehensive introduction to ${query} covering the basic concepts and fundamentals. This article explores the origins, key principles, and modern applications.`,
        score: 0.95,
        image: "https://source.unsplash.com/random/800x600/?technology",
      },
      {
        id: "mock-2",
        title: `Hidden Secrets of ${query}`,
        url: "https://example.com/secrets",
        text: `Discover the lesser-known aspects of ${query} that experts rarely discuss. This deep dive reveals surprising connections and obscure facts that will change your perspective.`,
        score: 0.92,
        image: "https://source.unsplash.com/random/800x600/?mystery",
      },
      {
        id: "mock-3",
        title: `The Evolution of ${query} Through History`,
        url: "https://example.com/history",
        text: `Trace the historical development and evolution of ${query} from ancient times to the present day. Learn how different cultures and time periods shaped our understanding.`,
        score: 0.88,
        image: "https://source.unsplash.com/random/800x600/?history",
      },
      {
        id: "mock-4",
        title: `Revolutionary Approaches to ${query}`,
        url: "https://example.com/innovation",
        text: `Explore cutting-edge innovations and paradigm shifts in the field of ${query}. This article highlights breakthrough methodologies that are transforming the landscape.`,
        score: 0.85,
        image: "https://source.unsplash.com/random/800x600/?innovation",
      },
      {
        id: "mock-5",
        title: `The Dark Side of ${query}`,
        url: "https://example.com/controversies",
        text: `An unflinching look at the controversies, ethical dilemmas, and unintended consequences surrounding ${query}. This critical analysis examines the problematic aspects often overlooked.`,
        score: 0.82,
        image: "https://source.unsplash.com/random/800x600/?shadow",
      },
      {
        id: "mock-6",
        title: `${query} and Its Intersection with Philosophy`,
        url: "https://example.com/philosophy",
        text: `A thought-provoking exploration of how ${query} relates to fundamental philosophical questions about existence, knowledge, and ethics. This interdisciplinary analysis bridges technical concepts with timeless wisdom.`,
        score: 0.79,
        image: "https://source.unsplash.com/random/800x600/?philosophy",
      },
      {
        id: "mock-7",
        title: `The Future of ${query}: Predictions and Possibilities`,
        url: "https://example.com/future",
        text: `Visionary experts share their forecasts about where ${query} is headed in the coming decades. This forward-looking piece examines emerging trends and speculates on transformative developments on the horizon.`,
        score: 0.76,
        image: "https://source.unsplash.com/random/800x600/?future",
      },
      {
        id: "mock-8",
        title: `${query} in Popular Culture`,
        url: "https://example.com/culture",
        text: `Analyze how ${query} has been represented in movies, books, art, and other media. This cultural study reveals how public perception has been shaped by creative interpretations and fictional portrayals.`,
        score: 0.73,
        image: "https://source.unsplash.com/random/800x600/?culture",
      },
      {
        id: "mock-9",
        title: `Bizarre Anomalies in ${query} Research`,
        url: "https://example.com/anomalies",
        text: `Investigate the strange, unexplained phenomena and puzzling contradictions that have emerged in the study of ${query}. This collection of scientific mysteries challenges conventional understanding and points to new research frontiers.`,
        score: 0.7,
        image: "https://source.unsplash.com/random/800x600/?strange",
      },
      {
        id: "mock-10",
        title: `The Forgotten Pioneers of ${query}`,
        url: "https://example.com/pioneers",
        text: `Rediscover the overlooked innovators and unsung heroes who made crucial contributions to ${query} but never received proper recognition. This historical correction brings attention to marginalized figures whose work deserves celebration.`,
        score: 0.67,
        image: "https://source.unsplash.com/random/800x600/?vintage",
      },
    ],
    autopromptString: `Information about ${query}`,
  }
}

