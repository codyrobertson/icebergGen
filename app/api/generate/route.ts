import { NextResponse } from "next/server"
import { generateAIResponse, logAIUsage } from "@/lib/ai-service"
import { createServerClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const { prompt, model = "openai/gpt-3.5-turbo", temperature = 0.7, max_tokens = 1500 } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Get the user ID for logging
    const supabase = createServerClient()
    let userId = "anonymous"

    if (supabase) {
      const { data } = await supabase.getUser()
      if (data.user) {
        userId = data.user.id
      }
    }

    // Generate the AI response
    const response = await generateAIResponse({
      prompt,
      model,
      temperature,
      max_tokens,
    })

    // Log usage (approximate token counts)
    const promptTokens = Math.ceil(prompt.length / 4)
    const completionTokens = Math.ceil(response.length / 4)
    await logAIUsage(userId, model, promptTokens, completionTokens)

    return NextResponse.json({ response })
  } catch (error) {
    console.error("Error in generate API:", error)
    return NextResponse.json(
      { error: "Failed to generate response", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

