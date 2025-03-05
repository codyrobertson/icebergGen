"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase" // Using our singleton implementation
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertCircle, Github } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [siteUrl, setSiteUrl] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")
  const redirectTo = searchParams.get("redirectTo") || "/"

  useEffect(() => {
    // Get the current site URL for redirects
    setSiteUrl(window.location.origin)

    // Check for error parameters
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        session_exchange_failed: "Failed to complete authentication. Please try again.",
        session_exchange_exception: "An error occurred during authentication. Please try again.",
        no_code: "Authentication code missing. Please try again.",
        unhandled: "An unexpected error occurred. Please try again.",
        oauth_error: errorDescription
          ? decodeURIComponent(errorDescription)
          : "OAuth authentication failed. Please try again.",
      }

      setError(errorMessages[errorParam] || "Authentication error. Please try again.")
    }
  }, [errorParam, errorDescription])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Use the singleton supabase client
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Redirect to the requested page or home
      router.push(redirectTo)
      router.refresh()
    } catch (error: any) {
      console.error("Sign in error:", error)
      setError(error.message || "An error occurred during sign in")
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const redirectUrl = new URL("/auth/callback", siteUrl)
      // Add the redirect parameter to the callback URL
      redirectUrl.searchParams.set("redirectTo", redirectTo)

      console.log("Signing up with redirect to:", redirectUrl.toString())

      // Use the singleton supabase client
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl.toString(),
        },
      })

      if (error) throw error

      // Show success message
      setSuccess("Check your email for the confirmation link!")
    } catch (error: any) {
      console.error("Sign up error:", error)
      setError(error.message || "An error occurred during sign up")
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const redirectUrl = new URL("/auth/callback", siteUrl)
      // Add the redirect parameter to the callback URL
      redirectUrl.searchParams.set("redirectTo", redirectTo)

      console.log("Sending magic link with redirect to:", redirectUrl.toString())

      // Use the singleton supabase client
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl.toString(),
        },
      })

      if (error) throw error

      // Show success message
      setSuccess("Check your email for the magic link!")
    } catch (error: any) {
      console.error("Magic link error:", error)
      setError(error.message || "An error occurred sending the magic link")
    } finally {
      setLoading(false)
    }
  }

  const handleGithubSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const redirectUrl = new URL("/auth/callback", siteUrl)
      // Add the redirect parameter to the callback URL
      redirectUrl.searchParams.set("redirectTo", redirectTo)

      console.log("GitHub sign in with redirect to:", redirectUrl.toString())

      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: redirectUrl.toString(),
          queryParams: {
            // Add additional scopes if needed
            // scope: 'repo gist',
          },
        },
      })

      if (error) throw error
    } catch (error: any) {
      console.error("GitHub sign in error:", error)
      setError(error.message || "An error occurred during GitHub sign in")
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Welcome to Iceberg.AI</CardTitle>
        <CardDescription>Sign in or create an account to start exploring</CardDescription>
      </CardHeader>

      {error && (
        <Alert variant="destructive" className="mx-6 mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mx-6 mb-2 bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="px-6 pb-4">
        <Button
          variant="outline"
          className="w-full flex items-center gap-2"
          onClick={handleGithubSignIn}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
          Continue with GitHub
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-2 text-xs text-muted-foreground">OR</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="signin">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
          <TabsTrigger value="magic">Magic Link</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <form onSubmit={handleSignIn}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign In
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
        <TabsContent value="signup">
          <form onSubmit={handleSignUp}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email-signup">Email</Label>
                <Input
                  id="email-signup"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Password</Label>
                <Input
                  id="password-signup"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign Up
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
        <TabsContent value="magic">
          <form onSubmit={handleMagicLink}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email-magic">Email</Label>
                <Input
                  id="email-magic"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Magic Link
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  )
}

