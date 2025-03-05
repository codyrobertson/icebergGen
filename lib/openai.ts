import { OpenAI } from "openai"

export function openai(model: string) {
  // Use the actual OpenAI API key from environment variables
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.warn("OpenAI API key not found, using mock implementation")
    return mockOpenAI()
  }

  const openaiClient = new OpenAI({
    apiKey: apiKey,
  })

  return {
    createCompletion: async ({ prompt, max_tokens = 500, temperature = 0.7 }: any) => {
      try {
        // Use the OpenAI API to generate completions
        const response = await openaiClient.completions.create({
          model: model || "text-davinci-003",
          prompt: prompt,
          max_tokens,
          temperature,
        })

        return {
          choices: [
            {
              text: response.choices[0]?.text || "",
            },
          ],
        }
      } catch (error) {
        console.error("OpenAI API error:", error)
        throw error
      }
    },

    chat: async (messages: any) => {
      try {
        // Use the OpenAI API for chat completions
        const response = await openaiClient.chat.completions.create({
          model: model || "gpt-3.5-turbo",
          messages,
        })

        return {
          choices: [
            {
              message: {
                content: response.choices[0]?.message?.content || "",
              },
            },
          ],
        }
      } catch (error) {
        console.error("OpenAI API error:", error)
        throw error
      }
    },
  }
}

function mockOpenAI() {
  return {
    createCompletion: async ({ prompt }: any) => {
      console.log("Mock OpenAI call with prompt:", prompt.substring(0, 100) + "...")
      return {
        choices: [
          {
            text: JSON.stringify({
              summary: "This is a mock summary generated because no OpenAI API key was provided.",
              keyInsights: [
                "Mock insight 1: No actual API call was made",
                "Mock insight 2: Add OPENAI_API_KEY to your environment variables",
                "Mock insight 3: This is placeholder content",
                "Mock insight 4: The actual content would be generated by AI",
                "Mock insight 5: Based on the article metadata",
              ],
              relatedTopics: ["Setting up API keys", "OpenAI integration", "AI content generation"],
            }),
          },
        ],
      }
    },
    chat: async (messages: any) => {
      console.log("Mock OpenAI chat call with messages:", JSON.stringify(messages).substring(0, 100) + "...")
      return {
        choices: [
          {
            message: {
              content: "This is a mock chat response generated because no OpenAI API key was provided.",
            },
          },
        ],
      }
    },
  }
}

