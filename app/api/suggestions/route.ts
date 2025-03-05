import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { generateServerSideCompletion } from "@/lib/ai-server"
import { exaSearch } from "@/lib/exa"
import { icebergThemes, searchConfig } from "@/lib/config"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || ""
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // If query is empty, return recent searches or interesting iceberg topics
    if (!query.trim()) {
      try {
        // Try to get the current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          console.log("User not authenticated, returning random topics")
          const randomTopics = getRandomIcebergTopics(searchConfig.suggestionsCount)
          return NextResponse.json(randomTopics)
        }

        // Get recent searches from the database
        const { data: recentSearches, error: searchError } = await supabase
          .from("search_logs")
          .select("query")
          .eq("user_id", user.id)
          .order("timestamp", { ascending: false })
          .limit(searchConfig.suggestionsCount)

        if (searchError) {
          console.error("Error fetching recent searches:", searchError)
          const randomTopics = getRandomIcebergTopics(searchConfig.suggestionsCount)
          return NextResponse.json(randomTopics)
        }

        // If we have recent searches, return them
        if (recentSearches && recentSearches.length > 0) {
          const queries = recentSearches.map((item) => item.query)
          // Remove duplicates
          const uniqueQueries = [...new Set(queries)]
          return NextResponse.json(uniqueQueries)
        }
      } catch (error) {
        console.error("Error getting recent searches:", error)
      }

      // If we couldn't get recent searches or there are none, return random topics
      const randomTopics = getRandomIcebergTopics(searchConfig.suggestionsCount)
      return NextResponse.json(randomTopics)
    }

    // If query is not empty, generate suggestions based on the query
    const suggestions = await generateIcebergSuggestions(query)
    return NextResponse.json(suggestions)
  } catch (error) {
    console.error("Error generating suggestions:", error)
    // Fallback to a selection of interesting iceberg topics
    const randomTopics = getRandomIcebergTopics(searchConfig.suggestionsCount)
    return NextResponse.json(randomTopics)
  }
}

// Function to get random iceberg topics
function getRandomIcebergTopics(count: number): string[] {
  // Shuffle the array using Fisher-Yates algorithm
  const shuffled = [...icebergThemes]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // Return the first 'count' elements
  return shuffled.slice(0, count)
}

async function generateIcebergSuggestions(query: string): Promise<string[]> {
  try {
    // Try to get related iceberg topics from EXA first
    try {
      const exaResponse = await exaSearch({
        query: `${query} mysterious fascinating rabbit hole iceberg theory`,
        numResults: 8,
        type: "keyword",
      })

      if (exaResponse.results && exaResponse.results.length > 0) {
        // Extract interesting topics from EXA results
        const exaTopics = exaResponse.results
          .map((result) => {
            // Extract the most interesting part of the title
            const title = result.title || ""

            // Make it more intriguing by adding prefixes if they don't exist
            if (title.toLowerCase().includes(query.toLowerCase())) {
              // If query is already in the title, make it more mysterious
              return title.replace(
                /^(?!.*(Mystery|Secret|Hidden|Forbidden|Lost|Dark|Unexplained|Conspiracy|Unsolved))/i,
                "The Dark Truth About ",
              )
            } else {
              // Otherwise, connect it to the query
              return `${query}: ${title.replace(/^(The|A|An) /, "")}`
            }
          })
          .filter((topic) => topic.length > 10 && topic.length < 60) // Filter out too short or too long topics

        if (exaTopics.length >= searchConfig.suggestionsCount) {
          return exaTopics.slice(0, searchConfig.suggestionsCount)
        }

        // If we don't have enough topics, combine with AI-generated ones
        const aiTopics = await generateCreativeTopics(query, searchConfig.suggestionsCount - exaTopics.length)
        return [...exaTopics, ...aiTopics].slice(0, searchConfig.suggestionsCount)
      }
    } catch (error) {
      console.error("Error fetching from EXA:", error)
    }

    // Fallback to AI generation
    return await generateCreativeTopics(query, searchConfig.suggestionsCount)
  } catch (error) {
    console.error("Error generating iceberg suggestions:", error)
    // Create fallback suggestions based on the query
    return [
      `${query}: The Untold History That Will Shock You`,
      `The Dark Secrets Behind ${query} They Don't Want You to Know`,
      `${query} Conspiracy Theories That Might Actually Be True`,
      `Unexplained Phenomena Related to ${query} That Defy Logic`,
      `The ${query} Iceberg: What Lies in the Deepest Levels`,
    ]
  }
}

// Function to generate creative topics using AI
async function generateCreativeTopics(query: string, count: number): Promise<string[]> {
  const prompt = `
    You are an expert at creating fascinating, mysterious, and intriguing research topics related to the "iceberg theory" - where knowledge gets progressively deeper, stranger, and more obscure as you go down.
    
    Based on the search query "${query}", generate ${count} absolutely captivating iceberg research topics that would make someone immediately want to click and explore.
    
    These should:
    1. Sound mysterious, forbidden, or like they contain hidden knowledge
    2. Suggest there are layers of secrets or conspiracies to uncover
    3. Hint at mind-blowing revelations or paradigm-shifting information
    4. Use language that creates curiosity and a sense of discovery
    
    Format your response as a JSON array of strings ONLY, with no additional text.
    Example: ["The Forbidden History of Ancient Egypt's Lost Technology", "Consciousness Hacking: The CIA's Classified Research"]
  `

  const completion = await generateServerSideCompletion(prompt)

  // Ensure we're only parsing the JSON array part
  const jsonStart = completion.indexOf("[")
  const jsonEnd = completion.lastIndexOf("]") + 1

  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    const jsonStr = completion.substring(jsonStart, jsonEnd)
    try {
      const suggestions = JSON.parse(jsonStr)
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        return suggestions.slice(0, count)
      }
    } catch (error) {
      console.error("Error parsing AI suggestions:", error)
    }
  }

  // Fallback to template-based suggestions
  return [
    `${query}: The Forbidden Knowledge That Changes Everything`,
    `The Dark Truth Behind ${query} That History Books Won't Tell You`,
    `${query} Conspiracy: From Surface Facts to Deep State Secrets`,
    `The ${query} Paradox: When Reality Defies Scientific Explanation`,
    `Lost Civilizations and Their Connection to ${query}`,
  ].slice(0, count)
}

