import { openai } from "@/lib/openai"

export type IcebergItem = {
  id: string
  title: string
  image: string
  url: string
  description: string
}

export type IcebergLevel = {
  level: number
  title: string
  items: IcebergItem[]
}

export async function generateText({ model, prompt }: { model: any; prompt: string }) {
  try {
    const response = await model.createCompletion({
      prompt,
      max_tokens: 500,
      temperature: 0.7,
      n: 1,
      stop: null,
    })

    // Ensure we're getting valid JSON
    const text = response.choices[0]?.text?.trim() || ""

    // Try to parse as JSON first
    try {
      JSON.parse(text)
      return { text }
    } catch (e) {
      // If not valid JSON, wrap the text in a basic structure
      return {
        text: JSON.stringify({
          summary: text,
          keyInsights: ["Could not parse response as JSON"],
          relatedTopics: [],
        }),
      }
    }
  } catch (error) {
    console.error("Error generating text:", error)
    throw error
  }
}

export async function generateArticleSummary(url: string, title: string, description: string) {
  try {
    const { text } = await generateText({
      model: openai("openai/gpt-4"),
      prompt: `
        You are an advanced AI research assistant. Your task is to generate an **accurate and comprehensive summary** of an article based on the given metadata.

        **Article Details:**
        - **Title:** ${title}
        - **URL:** ${url}
        - **Snippet/Description:** ${description}

        **Your task is to infer the likely content of the article and provide:**
        1. **A concise yet information-rich summary (2-3 paragraphs)** that captures the article's core themes, arguments, and conclusions.
        2. **Five key insights or takeaways** that highlight the most important details a reader should know.
        3. **Three related topics** that logically extend from this article, helping readers explore deeper or adjacent ideas.

        Format your response as a JSON object with the following structure:
        {
          "summary": "Your 2-3 paragraph summary here",
          "keyInsights": ["Insight 1", "Insight 2", "Insight 3", "Insight 4", "Insight 5"],
          "relatedTopics": ["Topic 1", "Topic 2", "Topic 3"]
        }
      `,
    })

    return JSON.parse(text)
  } catch (error) {
    console.error("Error generating article summary:", error)
    return {
      summary: "Unable to generate a summary for this article.",
      keyInsights: ["Error processing article"],
      relatedTopics: ["Try exploring related search terms"],
    }
  }
}

export async function enhanceSearchResults(query: string, results: any[]) {
  if (results.length === 0) return results

  try {
    const { text } = await generateText({
      model: openai("openai/gpt-4o"),
      prompt: `
        You are an AI search enhancement engine. Given raw search results, your job is to refine and enrich them **for maximum clarity, accuracy, and usefulness.** 

        **Search Query:** "${query}"

        **Task Overview:**
        - Rewrite the **titles** to be more descriptive and attention-grabbing.
        - Expand and improve the **descriptions** for clarity and depth.
        - Assign a **knowledge level rating (1-5)** to indicate how complex the information is.
          - **1 = Basic knowledge (e.g., Wikipedia overview)**
          - **3 = Intermediate knowledge (e.g., technical blog, research-backed content)**
          - **5 = Advanced/specialized knowledge (e.g., academic papers, niche expertise)**

        **Raw Search Results (Process each one carefully):**
        ${results
          .map(
            (item: any, index: number) =>
              `- **Result ${index + 1}** 
            - **Title:** ${item.title}  
            - **URL:** ${item.link}  
            - **Snippet:** ${item.snippet || "No description available"}`,
          )
          .join("\n\n")}

        **Your Output Format (Valid JSON Array):**
        [
          {
            "id": "0", // Index-based ID
            "title": "Improved title that is clear and engaging",
            "url": "Original link",
            "description": "A refined, more detailed and helpful description",
            "knowledgeLevel": 3 // Number between 1-5 based on depth of information
          },
          ...
        ]

        **Guidelines for Optimization:**
        - **Avoid generic descriptions**; instead, infer what the article is likely about.
        - Use **precise and strong language** in the title to improve clarity and engagement.
        - Ensure **the JSON is valid**—do not include any extra text outside the array.

        **Expected Output Example:**
        [
          {
            "id": "0",
            "title": "Deep Dive into Quantum Computing: A Beginner's Guide",
            "url": "https://example.com/quantum-intro",
            "description": "This article explains quantum computing fundamentals, covering superposition, entanglement, and how quantum bits differ from classical computing.",
            "knowledgeLevel": 2
          },
          {
            "id": "1",
            "title": "The Rise of AI in Financial Markets: Trends & Insights",
            "url": "https://example.com/ai-finance",
            "description": "An exploration of how artificial intelligence is transforming stock trading, portfolio management, and algorithmic investing.",
            "knowledgeLevel": 3
          }
        ]

        **Your output MUST be in valid JSON format, with no additional commentary.**
      `,
    })

    return JSON.parse(text)
  } catch (error) {
    console.error("Error enhancing search results:", error)
    return results
  }
}

