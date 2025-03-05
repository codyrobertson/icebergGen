"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase"

export function PricingCards() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      // In a real app, this would redirect to a payment processor
      // For now, we'll just simulate upgrading the user to pro
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Update the user's role to pro
      await supabase.from("user_profiles").update({ role: "pro" }).eq("id", user.id)

      // Redirect to the home page
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("Error upgrading:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {/* Free Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Free</CardTitle>
          <CardDescription>Get started with basic research capabilities</CardDescription>
          <div className="mt-4 text-4xl font-bold">$0</div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>3 searches per month</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>3 deep dives per month</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>Access to basic AI models</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>Standard research depth</span>
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">
            Current Plan
          </Button>
        </CardFooter>
      </Card>

      {/* Pro Plan */}
      <Card className="border-primary">
        <CardHeader>
          <div className="bg-primary text-primary-foreground px-3 py-1 text-xs rounded-full w-fit mb-2">
            RECOMMENDED
          </div>
          <CardTitle>Pro</CardTitle>
          <CardDescription>Advanced research for serious explorers</CardDescription>
          <div className="mt-4 text-4xl font-bold">
            $9.99<span className="text-sm font-normal">/month</span>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>Unlimited searches</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>Unlimited deep dives</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>Access to premium AI models</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>Enhanced research depth</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>Generate longer form content</span>
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleUpgrade} disabled={loading}>
            {loading ? "Processing..." : "Upgrade to Pro"}
          </Button>
        </CardFooter>
      </Card>

      {/* Enterprise Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Enterprise</CardTitle>
          <CardDescription>Custom solutions for organizations</CardDescription>
          <div className="mt-4 text-4xl font-bold">Custom</div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>Everything in Pro</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>Team collaboration features</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>Custom AI model training</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>Dedicated support</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>API access</span>
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">
            Contact Sales
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

