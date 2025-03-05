import { NextResponse } from "next/server"
import { runDatabaseDiagnostics } from "@/lib/utils/db-diagnostics"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    // Check for a secret key in the headers
    const secretKey = request.headers.get("x-admin-key")

    // This is a simple security measure - in production, use a more secure approach
    if (secretKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.",
      )
    }

    // Run diagnostics
    const diagnosticResults = await runDatabaseDiagnostics(supabaseUrl, supabaseKey)

    // Return results
    return NextResponse.json({
      success: true,
      diagnostics: diagnosticResults,
      environment: {
        supabaseUrl: supabaseUrl ? "Set" : "Missing",
        supabaseKey: supabaseKey ? "Set" : "Missing",
        adminSecretKey: process.env.ADMIN_SECRET_KEY ? "Set" : "Missing",
        nodeEnv: process.env.NODE_ENV,
      },
    })
  } catch (error) {
    console.error("Error in diagnostics route:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        suggestion: "Check server logs for more details.",
      },
      { status: 500 },
    )
  }
}

