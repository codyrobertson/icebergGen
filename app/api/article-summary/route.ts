import { NextResponse } from "next/server"
import { type ArticleSummaryDto, validateArticleSummaryDto } from "./dto"
import { articleSummaryService } from "@/lib/services/article-summary-service"

export const dynamic = "force-dynamic"
export const maxDuration = 30 // 30 seconds max duration

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json()

    // Validate request data
    const [isValid, errors] = validateArticleSummaryDto(body)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid request data", details: errors }, { status: 400 })
    }

    // Process the request using our service
    const dto: ArticleSummaryDto = {
      url: body.url,
      title: body.title,
      description: body.description,
      model: body.model || "openai/gpt-3.5-turbo",
    }

    const result = await articleSummaryService.generateSummary(dto)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in article summary route:", error)

    return NextResponse.json(
      {
        error: "Failed to generate article summary",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

