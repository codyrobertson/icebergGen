import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip Supabase initialization if credentials are missing
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials are missing. Authentication will not work.');
    return res;
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get: (name) => request.cookies.get(name)?.value,
          set: (name, value, options) => {
            res.cookies.set({ name, value, ...options });
          },
          remove: (name, options) => {
            res.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Refresh session if it exists
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Define protected routes
    const protectedRoutes = ['/dashboard', '/profile', '/research/create'];
    const isProtectedRoute = protectedRoutes.some((route) => 
      request.nextUrl.pathname.startsWith(route)
    );

    // Define auth routes
    const authRoutes = ['/login', '/signup', '/forgot-password'];
    const isAuthRoute = authRoutes.some((route) => 
      request.nextUrl.pathname.startsWith(route)
    );

    // Redirect if accessing protected route without session
    if (isProtectedRoute && !session) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect if accessing auth route with session
    if (isAuthRoute && session) {
      const redirectUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('Middleware error:', error);
  }

  return res;
}

// Apply middleware to matching routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}; 