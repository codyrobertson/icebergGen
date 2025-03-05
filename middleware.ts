import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Check if the user is authenticated
    const isAuthenticated = !!session
    const isAuthRoute = req.nextUrl.pathname.startsWith("/auth")
    const isApiRoute = req.nextUrl.pathname.startsWith("/api")
    const isPublicRoute = req.nextUrl.pathname === "/" || req.nextUrl.pathname.startsWith("/_next")

    // If user is not authenticated and trying to access a protected route
    if (!isAuthenticated && !isAuthRoute && !isApiRoute && !isPublicRoute) {
      const redirectUrl = new URL("/auth/login", req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // If user is authenticated and trying to access auth routes
    if (isAuthenticated && isAuthRoute) {
      const redirectUrl = new URL("/", req.url)
      return NextResponse.redirect(redirectUrl)
    }

    return res
  } catch (error) {
    console.error("Middleware error:", error)
    // In case of error, allow the request to continue
    return NextResponse.next()
  }
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

