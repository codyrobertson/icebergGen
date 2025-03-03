"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ExternalLink, Share2, ChevronRight, Loader2 } from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { generateArticleSummary, type IcebergItem, type IcebergLevel } from "@/lib/ai-utils"
import { ModelSelector } from "@/components/model-selector"

type ArticleSummary = {
  summary: string
  keyInsights: string[]
  relatedTopics: string[]
}

type IcebergChartProps = {
  query: string
  data: IcebergLevel[]
}

export function IcebergChart({ query, data }: IcebergChartProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [selectedItem, setSelectedItem] = useState<IcebergItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [articleSummary, setArticleSummary] = useState<ArticleSummary | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState("gpt-4")

  // Handle model change
  const handleModelChange = (model: string) => {
    setSelectedModel(model)
  }

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
      if (navigator.share) {
        await navigator.share({
          title: `Iceberg Research: ${query}`,
          text: `Check out this knowledge iceberg about "${query}" I created with Iceberg.AI`,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        alert("Link copied to clipboard!")
      }
    } catch (error) {
      console.error("Error sharing:", error)
    }
  }

  // Handle item click and generate summary
  const handleItemClick = async (item: IcebergItem) => {
    setSelectedItem(item)
    setIsSheetOpen(true)
    setArticleSummary(null)
    setIsLoadingSummary(true)

    try {
      const summary = await generateArticleSummary(item.url, item.title, item.description)
      setArticleSummary(summary)
    } catch (error) {
      console.error("Error generating article summary:", error)
    } finally {
      setIsLoadingSummary(false)
    }
  }

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">{query}</h1>
        <p className="text-muted-foreground">Explore the depths of knowledge on this topic</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <ModelSelector onModelChange={handleModelChange} />
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
      {/* Increase min-h to ensure all levels fit. Adjust as needed. */}
      <div className="relative w-full rounded-xl shadow-2xl iceberg-gradient" style={{ minHeight: "1200px" }}>
        {data.map((level) => (
          <div
            key={level.level}
            className={`absolute left-0 right-0 transition-all duration-500 ease-in-out
              ${
                selectedLevel === null || selectedLevel === level.level ? "opacity-100" : "opacity-35 hover:opacity-75"
              }`}
            style={{
              top: getLevelPosition(level.level, data.length),
              zIndex: data.length - level.level + 1,
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
                    className="group cursor-pointer rounded-lg bg-white/10 backdrop-blur-sm 
                      transition-all duration-300 hover:bg-white/20 hover:-translate-y-1"
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
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-white mb-2">{item.title}</h4>
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
          {data.map((level) => (
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
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-xl overflow-y-auto p-0">
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
                    Level {selectedItem.id.split("-")[0]}
                  </span>
                </div>

                {/* Title overlay on image */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{selectedItem.title}</h2>
                </div>
              </div>

              {/* Content area with padding */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* Description with custom styling */}
                <div className="text-base text-muted-foreground mb-6 pt-2">{selectedItem.description}</div>

                {/* AI Summary Section with Loading State */}
                <div className="space-y-6">
                  {isLoadingSummary ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="mt-2 text-sm text-muted-foreground">Generating article insights...</p>
                    </div>
                  ) : articleSummary ? (
                    <>
                      {/* Article Summary */}
                      <div className="rounded-lg bg-muted/50 p-4 border border-border/50">
                        <h3 className="text-lg font-semibold mb-3">Article Summary</h3>
                        <p className="text-sm text-muted-foreground">{articleSummary.summary}</p>
                      </div>

                      {/* Key Insights */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Key Insights</h3>
                        <ul className="space-y-2">
                          {articleSummary.keyInsights.map((insight, index) => (
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
                          {articleSummary.relatedTopics.map((topic, index) => (
                            <div
                              key={index}
                              className="rounded-md p-3 bg-muted/30 hover:bg-muted/50 border border-border/50 cursor-pointer transition-colors"
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
              </div>

              {/* Footer with action buttons */}
              <div className="border-t p-4 flex justify-between items-center">
                <Button variant="outline" size="sm" className="gap-1" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>

                <a
                  href={selectedItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                >
                  Read full article
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

