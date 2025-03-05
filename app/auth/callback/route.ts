import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  // Check for error parameters from OAuth providers
  const error = requestUrl.searchParams.get("error")
  const errorCode = requestUrl.searchParams.get("error_code")
  const errorDescription = requestUrl.searchParams.get("error_description")

  // If there's an error, redirect to login with error parameters
  if (error || errorCode || errorDescription) {
    console.error("Auth callback error:", { error, errorCode, errorDescription })
    const loginUrl = new URL("/auth/login", requestUrl.origin)
    loginUrl.searchParams.set("error", "oauth_error")
    loginUrl.searchParams.set("error_description", errorDescription || "Authentication failed")
    return NextResponse.redirect(loginUrl)
  }

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  } else {
    console.warn("No code parameter found in callback URL")
    // If no code and no error, this might be a successful OAuth redirect
    // Try to get the session anyway before redirecting
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data } = await supabase.auth.getSession()

    // If no session, redirect to login with error
    if (!data.session) {
      const loginUrl = new URL("/auth/login", requestUrl.origin)
      loginUrl.searchParams.set("error", "no_code")
      return NextResponse.redirect(loginUrl)
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL("/", requestUrl.origin))
}

