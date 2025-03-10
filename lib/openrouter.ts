type OpenRouterCompletionParams = {
  prompt: string
  model: string
  max_tokens?: number
  temperature?: number
}

type OpenRouterChatParams = {
  messages: any[]
  model: string
  max_tokens?: number
  temperature?: number
}

export function openrouter(model: string) {
  // Use the OpenRouter API key from environment variables
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.openrouter_API

  if (!apiKey) {
    console.warn("OpenRouter API key not found, using mock implementation")
    return mockOpenRouter()
  }

  return {
    createCompletion: async ({ prompt, max_tokens = 500, temperature = 0.7 }: OpenRouterCompletionParams) => {
      try {
        // Convert to chat format for OpenRouter
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://iceberg.ai", // Replace with your actual domain
            "X-Title": "Iceberg.AI Research",
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: max_tokens,
            temperature: temperature,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`OpenRouter API error: ${response.status} - ${errorText}`)

          // Check for credit/payment issues
          if (response.status === 402) {
            console.warn("OpenRouter API insufficient credits, using mock implementation")
            return mockOpenRouter().createCompletion({ prompt, max_tokens, temperature })
          }

          throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()

        return {
          choices: [
            {
              text: data.choices[0]?.message?.content || "",
            },
          ],
        }
      } catch (error) {
        console.error("OpenRouter API error:", error)
        // Use mock implementation as fallback
        return mockOpenRouter().createCompletion({ prompt, max_tokens, temperature })
      }
    },

    chat: async ({ messages, max_tokens = 500, temperature = 0.7 }: OpenRouterChatParams) => {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://iceberg.ai", // Replace with your actual domain
            "X-Title": "Iceberg.AI Research",
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: max_tokens,
            temperature: temperature,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`OpenRouter API error: ${response.status} - ${errorText}`)

          // Check for credit/payment issues
          if (response.status === 402) {
            console.warn("OpenRouter API insufficient credits, using mock implementation")
            return mockOpenRouter().chat(messages)
          }

          throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()

        return {
          choices: [
            {
              message: {
                content: data.choices[0]?.message?.content || "",
              },
            },
          ],
        }
      } catch (error) {
        console.error("OpenRouter API error:", error)
        // Use mock implementation as fallback
        return mockOpenRouter().chat(messages)
      }
    },
  }
}

function mockOpenRouter() {
  return {
    createCompletion: async ({ prompt }: OpenRouterCompletionParams) => {
      console.log("Mock OpenRouter call with prompt:", prompt.substring(0, 100) + "...")
      return {
        choices: [
          {
            text: JSON.stringify({
              summary: "This is a mock summary generated because no OpenRouter API key was provided.",
              keyInsights: [
                "Mock insight 1: No actual API call was made",
                "Mock insight 2: Add OPENROUTER_API_KEY to your environment variables",
                "Mock insight 3: This is placeholder content",
                "Mock insight 4: The actual content would be generated by AI",
                "Mock insight 5: Based on the article metadata",
              ],
              relatedTopics: ["Setting up API keys", "OpenRouter integration", "AI content generation"],
            }),
          },
        ],
      }
    },
    chat: async (messages: any) => {
      console.log("Mock OpenRouter chat call with messages:", JSON.stringify(messages).substring(0, 100) + "...")
      return {
        choices: [
          {
            message: {
              content: "This is a mock chat response generated because no OpenRouter API key was provided.",
            },
          },
        ],
      }
    },
  }
}

