import { NextResponse } from "next/server"
import { evaluateIcebergDepth } from "@/lib/ai-service"
import { createServerClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const { items } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Items array is required" }, { status: 400 })
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

    // Evaluate the depth of each item
    const evaluatedItems = await evaluateIcebergDepth(items)

    return NextResponse.json({ items: evaluatedItems })
  } catch (error) {
    console.error("Error in evaluate-depth API:", error)
    return NextResponse.json(
      { error: "Failed to evaluate depth", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

