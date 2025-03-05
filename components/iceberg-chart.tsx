"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ExternalLink, Share2, ChevronRight, Loader2, Lock, Sparkles } from "lucide-react"
import { CustomSheet as Sheet, CustomSheetContent as SheetContent } from "@/components/ui/custom-sheet"
import { createClient, decrementDeepDiveClient, canUserDeepDiveClient } from "@/lib/supabase"
import type { IcebergItem, IcebergLevel } from "@/lib/ai-utils"

type ArticleSummary = {
  summary: string
  keyInsights: string[]
  relatedTopics: string[]
}

type IcebergChartProps = {
  query: string
  data: IcebergLevel[]
  articleSummaries?: Record<string, ArticleSummary>
  userProfile?: any
}

export function IcebergChart({ query, data, articleSummaries = {}, userProfile }: IcebergChartProps) {
  // Ensure data is an array to prevent "data.map is not a function" error
  const safeData = Array.isArray(data) ? data : []
  const router = useRouter()

  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [selectedItem, setSelectedItem] = useState<IcebergItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [canDeepDive, setCanDeepDive] = useState<boolean | null>(null)
  const [animateIceberg, setAnimateIceberg] = useState(false)

  // Trigger animation on mount
  useEffect(() => {
    setAnimateIceberg(true)
  }, [])

  // Improved spacing function to distribute levels from ~5% to ~95%
  const getLevelPosition = (level: number, totalLevels: number) => {
    if (totalLevels <= 1) return "50%" // Fallback if only one level
    const spacing = 90 / (totalLevels - 1)
    // Start at 5%, go to 95%
    return `${(level - 1) * spacing + 5}%`
  }

  // Handle sharing
  const handleShare = async () => {
    try {
      // Create the share URL with proper encoding
      const shareUrl = window.location.href
      const shareText = `Check out this knowledge iceberg about "${query}" I created with Iceberg.AI`

      // Check if Web Share API is available
      if (navigator.share) {
        await navigator.share({
          title: `Iceberg Research: ${query}`,
          text: shareText,
          url: shareUrl,
        })
      } else {
        // If Twitter sharing is requested, open Twitter intent
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&via=mackody`
        window.open(twitterUrl, "_blank")
      }
    } catch (error) {
      console.error("Error sharing:", error)
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert("Link copied to clipboard!")
      } catch (clipboardError) {
        console.error("Clipboard error:", clipboardError)
      }
    }
  }

  // Handle item click
  const handleItemClick = async (item: IcebergItem) => {
    // Skip permission check for hidden gems
    if (item.id.startsWith("hidden-")) {
      setSelectedItem(item)
      setIsSheetOpen(true)
      return
    }

    // Check if user can deep dive
    const supabase = createClient()
    const canDive = await canUserDeepDiveClient(supabase)
    setCanDeepDive(canDive)

    if (!canDive) {
      // If user can't deep dive, show upgrade prompt
      setSelectedItem(item)
      setIsSheetOpen(true)
      return
    }

    // If user can deep dive, proceed
    setSelectedItem(item)
    setIsSheetOpen(true)
    setIsLoadingSummary(true)

    try {
      // If we don't have a pre-generated summary for this item, fetch it
      if (!articleSummaries[item.id]) {
        const response = await fetch("/api/article-summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: item.url,
            title: item.title,
            description: item.description,
            model: userProfile?.role === "free" ? "gpt-3.5-turbo" : "gpt-4",
          }),
        })

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`)
        }
      }

      // Decrement deep dive count for free users
      if (userProfile?.role === "free") {
        await decrementDeepDiveClient(supabase, userProfile.id)
      }
    } catch (error) {
      console.error("Error generating article summary:", error)
    } finally {
      setIsLoadingSummary(false)
    }
  }

  // Handle related topic click
  const handleRelatedTopicClick = async (topic: string) => {
    // Check if user can deep dive
    const supabase = createClient()
    const canDive = await canUserDeepDiveClient(supabase)

    if (!canDive) {
      // If user can't deep dive, show upgrade prompt
      router.push("/pricing")
      return
    }

    // If user can deep dive, proceed
    setIsSheetOpen(false)

    // Decrement deep dive count for free users
    if (userProfile?.role === "free") {
      await decrementDeepDiveClient(supabase, userProfile.id)
    }

    // Clean up the topic if it contains a URL or is too long
    let cleanTopic = topic

    // If it looks like a URL, extract the domain or path
    if (topic.includes("http") || topic.includes("www.")) {
      try {
        const url = new URL(topic.startsWith("http") ? topic : `https://${topic}`)
        cleanTopic = url.hostname.replace("www.", "") + url.pathname
      } catch (e) {
        // If URL parsing fails, just use the original topic
        cleanTopic = topic
      }
    }

    // Limit length for better search results
    if (cleanTopic.length > 50) {
      cleanTopic = cleanTopic.substring(0, 50)
    }

    router.push(`/research?q=${encodeURIComponent(cleanTopic)}`)
  }

  const handleUpgrade = () => {
    router.push("/pricing")
  }

  // Check if an item is a hidden gem
  const isHiddenGem = (item: IcebergItem) => {
    return item.id.startsWith("hidden-")
  }

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">{query}</h1>
        <p className="text-muted-foreground">Explore the depths of knowledge on this topic</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            variant={selectedLevel === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedLevel(null)}
          >
            View All Levels
          </Button>
        </div>
      </div>

      {/* Iceberg container */}
      <div
        className={`relative w-full rounded-xl shadow-2xl iceberg-gradient transition-all duration-1000 ease-in-out ${animateIceberg ? "opacity-100" : "opacity-0"}`}
        style={{ minHeight: "1200px" }}
      >
        {safeData.map((level) => (
          <div
            key={level.level}
            className={`absolute left-0 right-0 transition-all duration-500 ease-in-out
              ${
                selectedLevel === null || selectedLevel === level.level ? "opacity-100" : "opacity-35 hover:opacity-75"
              }`}
            style={{
              top: getLevelPosition(level.level, safeData.length),
              zIndex: safeData.length - level.level + 1,
              transform: `translateY(${animateIceberg ? "0" : "50px"})`,
              transition: `opacity 500ms ease-in-out, transform ${500 + level.level * 200}ms ease-in-out`,
            }}
          >
            {/* Level container */}
            <div className="rounded-lg bg-black/40 backdrop-blur-sm mx-auto max-w-5xl">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-semibold text-white text-lg">{level.title}</h3>
                <span className="rounded-full bg-white/20 px-3 py-1 text-sm text-white">Level {level.level}</span>
              </div>

              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
                {level.items.map((item) => (
                  <div
                    key={item.id}
                    className={`group cursor-pointer rounded-lg ${isHiddenGem(item) ? "bg-primary/20" : "bg-white/10"} backdrop-blur-sm 
                      transition-all duration-300 hover:bg-white/20 hover:-translate-y-1 ${isHiddenGem(item) ? "border border-primary/30" : ""}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                      {/* Hidden gem indicator */}
                      {isHiddenGem(item) && (
                        <div className="absolute top-2 right-2 bg-primary/80 rounded-full p-1">
                          <Sparkles className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-white mb-2">
                        {isHiddenGem(item) && <span className="text-primary mr-1">✧</span>}
                        {item.title}
                      </h4>
                      <p className="text-sm text-white/80 line-clamp-2">{item.description}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full justify-between text-white/70 hover:text-white hover:bg-white/10"
                      >
                        View Details
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Quick navigation */}
        <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-50">
          {safeData.map((level) => (
            <Button
              key={level.level}
              variant={selectedLevel === level.level ? "default" : "outline"}
              size="sm"
              className="w-10 h-10 rounded-full p-0"
              onClick={() => setSelectedLevel(level.level === selectedLevel ? null : level.level)}
            >
              {level.level}
            </Button>
          ))}
        </div>
      </div>

      {/* Article details sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md md:max-w-xl overflow-y-auto p-0"
          description={selectedItem ? `Details for ${selectedItem.title}` : "Article details"}
        >
          {selectedItem && (
            <div className="h-full flex flex-col">
              {/* Header with image and gradient overlay */}
              <div className="relative h-64 w-full overflow-hidden">
                <Image
                  src={selectedItem.image || "/placeholder.svg"}
                  alt={selectedItem.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>

                {/* Level indicator and back button */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 bg-black/40 hover:bg-black/60 text-white rounded-full"
                    onClick={() => setIsSheetOpen(false)}
                  >
                    ← Back
                  </Button>
                  <span className="rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-sm font-medium text-white">
                    {isHiddenGem(selectedItem) ? (
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Hidden Gem
                      </span>
                    ) : (
                      `Level ${selectedItem.id.split("-")[0]}`
                    )}
                  </span>
                </div>

                {/* Title overlay on image */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {isHiddenGem(selectedItem) && <span className="text-primary mr-1">✧</span>}
                    {selectedItem.title}
                  </h2>
                </div>
              </div>

              {/* Content area with padding */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* Description with custom styling */}
                <div className="text-base text-muted-foreground mb-6 pt-2">{selectedItem.description}</div>

                {/* For hidden gems, show a special message */}
                {isHiddenGem(selectedItem) ? (
                  <div className="space-y-6">
                    <div className="rounded-lg bg-primary/10 p-6 border border-primary/20">
                      <div className="flex justify-center mb-4">
                        <Sparkles className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-3 text-center">Hidden Knowledge Gem</h3>
                      <p className="text-sm text-center">
                        You've discovered a hidden gem of knowledge! These rare insights are specially curated to
                        provide unexpected perspectives and fascinating connections that most resources won't tell you
                        about.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">Related Topics</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          `Unexpected aspects of ${query}`,
                          `${query} misconceptions`,
                          `Future of ${query}`,
                          `${query} controversies`,
                        ].map((topic, index) => (
                          <div
                            key={index}
                            className="rounded-md p-3 bg-muted/30 hover:bg-muted/50 border border-border/50 cursor-pointer transition-colors"
                            onClick={() => handleRelatedTopicClick(topic)}
                          >
                            <h4 className="font-medium text-sm">{topic}</h4>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : canDeepDive === false ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <div className="bg-muted/30 p-8 rounded-full">
                      <Lock className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold">Deep Dive Limit Reached</h3>
                    <p className="text-center text-muted-foreground">
                      You've reached your monthly deep dive limit on the free plan. Upgrade to Pro for unlimited deep
                      dives and premium features.
                    </p>
                    <Button onClick={handleUpgrade} className="mt-4">
                      Upgrade to Pro
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* AI Summary Section with Loading State */}
                    <div className="space-y-6">
                      {isLoadingSummary ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="mt-2 text-sm text-muted-foreground">Generating article insights...</p>
                        </div>
                      ) : articleSummaries[selectedItem.id] ? (
                        <>
                          {/* Article Summary */}
                          <div className="rounded-lg bg-muted/50 p-4 border border-border/50">
                            <h3 className="text-lg font-semibold mb-3">Article Summary</h3>
                            <p className="text-sm text-muted-foreground">{articleSummaries[selectedItem.id].summary}</p>
                          </div>

                          {/* Key Insights */}
                          <div>
                            <h3 className="text-lg font-semibold mb-3">Key Insights</h3>
                            <ul className="space-y-2">
                              {articleSummaries[selectedItem.id].keyInsights.map((insight, index) => (
                                <li key={index} className="flex items-start">
                                  <div className="bg-primary/10 text-primary rounded-full p-1 mr-2 mt-0.5">
                                    <span className="block h-3 w-3 text-xs font-bold">{index + 1}</span>
                                  </div>
                                  <p className="text-sm">{insight}</p>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Related Topics Grid */}
                          <div>
                            <h3 className="text-lg font-semibold mb-3">Related Topics</h3>
                            <div className="grid grid-cols-2 gap-3">
                              {articleSummaries[selectedItem.id].relatedTopics.map((topic, index) => (
                                <div
                                  key={index}
                                  className="rounded-md p-3 bg-muted/30 hover:bg-muted/50 border border-border/50 cursor-pointer transition-colors"
                                  onClick={() => handleRelatedTopicClick(topic)}
                                >
                                  <h4 className="font-medium text-sm">{topic}</h4>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-lg bg-muted/50 p-4 border border-border/50">
                          <p className="text-sm text-muted-foreground">Loading article information...</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Footer with action buttons */}
              <div className="border-t p-4 flex justify-between items-center">
                <Button variant="outline" size="sm" className="gap-1" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>

                {!isHiddenGem(selectedItem) && selectedItem.url !== "#hidden-gem" && (
                  <a
                    href={selectedItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                  >
                    Read full article
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

