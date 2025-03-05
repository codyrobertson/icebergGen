"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get("returnUrl") || "/"
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        setIsAuthenticated(true)
        // Redirect to return URL if already authenticated
        router.push(returnUrl)
      }
    }

    checkAuth()
  }, [supabase, router, returnUrl])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      })

      // Redirect to the return URL
      router.push(returnUrl)
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "An error occurred during sign in.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        throw error
      }

      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link to complete your sign up.",
      })
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "An error occurred during sign up.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Already Signed In</CardTitle>
            <CardDescription>You are already signed in.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push(returnUrl)}>
              Continue to {returnUrl === "/" ? "Home" : "Previous Page"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? "Create an Account" : "Sign In"}</CardTitle>
          <CardDescription>
            {isSignUp
              ? "Create a new account to save your research and access more features."
              : "Sign in to your account to access your saved research."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Button variant="link" className="px-0 w-full justify-start" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

