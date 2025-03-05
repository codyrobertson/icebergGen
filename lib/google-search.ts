type GoogleSearchParams = {
  query: string
  num?: number
}

type GoogleSearchResult = {
  title: string
  link: string
  snippet: string
  image?: string
}

type GoogleSearchResponse = {
  items: GoogleSearchResult[]
}

export async function googleSearch(params: GoogleSearchParams): Promise<GoogleSearchResponse> {
  const apiKey = process.env.GOOGLE_API_KEY
  const searchEngineId = process.env.GOOGLE_CSE_ID

  if (!apiKey || !searchEngineId) {
    console.warn("Google API key or Search Engine ID missing, using mock data")
    return mockGoogleResponse(params.query)
  }

  try {
    console.log("Calling Google Search API with params:", JSON.stringify(params))

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(params.query)}&num=${params.num || 10}`

    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Google Search API error (${response.status}):`, errorText)

      // Check for quota exceeded errors
      if (response.status === 429 || response.status === 403) {
        console.warn("Google Search API quota exceeded, using mock data instead")
        return mockGoogleResponse(params.query)
      }

      throw new Error(`Google Search API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Transform the response to our expected format
    const transformedResults = data.items.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      image: item.pagemap?.cse_image?.[0]?.src || "/placeholder.svg?height=100&width=200",
    }))

    return { items: transformedResults }
  } catch (error) {
    console.error("Error with Google search:", error)
    return mockGoogleResponse(params.query)
  }
}

function mockGoogleResponse(query: string): GoogleSearchResponse {
  console.log("Using mock Google response for query:", query)

  return {
    items: [
      {
        title: `The Fascinating World of ${query}`,
        link: "https://example.com/intro",
        snippet: `A comprehensive introduction to ${query} covering the basic concepts and fundamentals. This article explores the origins, key principles, and modern applications.`,
        image: "https://source.unsplash.com/random/800x600/?technology",
      },
      {
        title: `Hidden Secrets of ${query}`,
        link: "https://example.com/secrets",
        snippet: `Discover the lesser-known aspects of ${query} that experts rarely discuss. This deep dive reveals surprising connections and obscure facts that will change your perspective.`,
        image: "https://source.unsplash.com/random/800x600/?mystery",
      },
      {
        title: `The Evolution of ${query} Through History`,
        link: "https://example.com/history",
        snippet: `Trace the historical development and evolution of ${query} from ancient times to the present day. Learn how different cultures and time periods shaped our understanding.`,
        image: "https://source.unsplash.com/random/800x600/?history",
      },
      {
        title: `Revolutionary Approaches to ${query}`,
        link: "https://example.com/innovation",
        snippet: `Explore cutting-edge innovations and paradigm shifts in the field of ${query}. This article highlights breakthrough methodologies that are transforming the landscape.`,
        image: "https://source.unsplash.com/random/800x600/?innovation",
      },
      {
        title: `The Dark Side of ${query}`,
        link: "https://example.com/controversies",
        snippet: `An unflinching look at the controversies, ethical dilemmas, and unintended consequences surrounding ${query}. This critical analysis examines the problematic aspects often overlooked.`,
        image: "https://source.unsplash.com/random/800x600/?shadow",
      },
      {
        title: `${query} and Its Intersection with Philosophy`,
        link: "https://example.com/philosophy",
        snippet: `A thought-provoking exploration of how ${query} relates to fundamental philosophical questions about existence, knowledge, and ethics. This interdisciplinary analysis bridges technical concepts with timeless wisdom.`,
        image: "https://source.unsplash.com/random/800x600/?philosophy",
      },
      {
        title: `The Future of ${query}: Predictions and Possibilities`,
        link: "https://example.com/future",
        snippet: `Visionary experts share their forecasts about where ${query} is headed in the coming decades. This forward-looking piece examines emerging trends and speculates on transformative developments on the horizon.`,
        image: "https://source.unsplash.com/random/800x600/?future",
      },
      {
        title: `${query} in Popular Culture`,
        link: "https://example.com/culture",
        snippet: `Analyze how ${query} has been represented in movies, books, art, and other media. This cultural study reveals how public perception has been shaped by creative interpretations and fictional portrayals.`,
        image: "https://source.unsplash.com/random/800x600/?culture",
      },
      {
        title: `Bizarre Anomalies in ${query} Research`,
        link: "https://example.com/anomalies",
        snippet: `Investigate the strange, unexplained phenomena and puzzling contradictions that have emerged in the study of ${query}. This collection of scientific mysteries challenges conventional understanding and points to new research frontiers.`,
        image: "https://source.unsplash.com/random/800x600/?strange",
      },
      {
        title: `The Forgotten Pioneers of ${query}`,
        link: "https://example.com/pioneers",
        snippet: `Rediscover the overlooked innovators and unsung heroes who made crucial contributions to ${query} but never received proper recognition. This historical correction brings attention to marginalized figures whose work deserves celebration.`,
        image: "https://source.unsplash.com/random/800x600/?vintage",
      },
    ],
  }
}

