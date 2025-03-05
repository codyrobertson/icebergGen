"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { PlusCircle, User, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase" // Using our singleton implementation
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import type { UserProfile } from "@/lib/supabase"

export function Header() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient() // Singleton instance

  useEffect(() => {
    async function getUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const { data } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

          setProfile(data as UserProfile)
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [supabase.auth.getUser, supabase.from]) // Added dependencies for supabase functions

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const handleNewIceberg = () => {
    router.push("/")
  }

  const handleProfile = () => {
    router.push("/profile")
  }

  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">Iceberg AI</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Button variant="default" size="sm" className="gap-1" onClick={handleNewIceberg}>
                <PlusCircle className="h-4 w-4" />
                New Iceberg
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                    <AvatarFallback>{user.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user.email}</span>
                      {profile && (
                        <Badge variant={profile.role === "free" ? "outline" : "default"} className="mt-1">
                          {profile.role === "admin" ? "Admin" : profile.role === "pro" ? "Pro" : "Free"}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleProfile}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button variant="default" size="sm" onClick={() => router.push("/auth/login")}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

