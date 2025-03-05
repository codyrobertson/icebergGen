"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient, getUserProfileClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogOut, CreditCard } from "lucide-react"
import type { UserProfile } from "@/lib/supabase"

export function UserProfileComponent() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  let supabase // Declare supabase variable

  useEffect(() => {
    async function loadProfile() {
      try {
        supabase = createClient() // Initialize supabase here
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/auth/login")
          return
        }

        const profile = await getUserProfileClient(supabase)
        if (!profile) throw new Error("Profile not found")

        setProfile(profile)
      } catch (error) {
        console.error("Error loading profile:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut() // Use the declared supabase variable
    router.push("/auth/login")
    router.refresh()
  }

  const handleUpgrade = () => {
    router.push("/pricing")
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <p className="text-center">Profile not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
        <CardDescription>Manage your account and subscription</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Email</span>
          <span className="text-sm">{profile.email}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Subscription</span>
          <Badge variant={profile.role === "free" ? "outline" : "default"}>
            {profile.role === "admin" ? "Admin" : profile.role === "pro" ? "Pro" : "Free"}
          </Badge>
        </div>
        {profile.role === "free" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Searches Remaining</span>
              <span className="text-sm">{profile.searches_remaining}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Deep Dives Remaining</span>
              <span className="text-sm">{profile.deep_dives_remaining}</span>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
        {profile.role === "free" && (
          <Button onClick={handleUpgrade}>
            <CreditCard className="mr-2 h-4 w-4" />
            Upgrade to Pro
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

