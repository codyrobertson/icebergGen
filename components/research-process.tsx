"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { IcebergChart } from "@/components/iceberg-chart"
import { Search, Database, Link2, FileText, Sparkles } from "lucide-react"
import { enhanceSearchResults } from "@/lib/ai-utils"
import { openai } from "@/lib/openai"

type ResearchStep = {
  id: string
  name: string
  icon: React.ReactNode
  description: string
}

const RESEARCH_STEPS: ResearchStep[] = [
  {
    id: "search",
    name: "Searching the web",
    icon: <Search className="h-5 w-5" />,
    description: "Finding relevant sources across the internet",
  },
  {
    id: "extract",
    name: "Extracting information",
    icon: <Database className="h-5 w-5" />,
    description: "Gathering key facts and insights from sources",
  },
  {
    id: "connect",
    name: "Connecting concepts",
    icon: <Link2 className="h-5 w-5" />,
    description: "Identifying relationships between different pieces of information",
  },
  {
    id: "organize",
    name: "Organizing by depth",
    icon: <FileText className="h-5 w-5" />,
    description: "Structuring information from surface to deep knowledge",
  },
  {
    id: "generate",
    name: "Generating iceberg",
    icon: <Sparkles className="h-5 w-5" />,
    description: "Creating your personalized knowledge iceberg",
  },
]

// Mock data for the iceberg levels
const MOCK_ICEBERG_DATA = [
  {
    level: 1,
    title: "Surface Knowledge",
    items: [
      {
        id: "1",
        title: "Basic Concepts",
        image: "/placeholder.svg?height=100&width=200",
        url: "https://example.com/basic",
        description: "Fundamental ideas that most people are familiar with",
      },
      {
        id: "2",
        title: "Popular References",
        image: "/placeholder.svg?height=100&width=200",
        url: "https://example.com/popular",
        description: "Well-known examples and commonly cited sources",
      },
    ],
  },
  {
    level: 2,
    title: "Intermediate Knowledge",
    items: [
      {
        id: "3",
        title: "Historical Context",
        image: "/placeholder.svg?height=100&width=200",
        url: "https://example.com/history",
        description: "Background and development of key ideas over time",
      },
      {
        id: "4",
        title: "Technical Details",
        image: "/placeholder.svg?height=100&width=200",
        url: "https://example.com/technical",
        description: "More specific information requiring some background knowledge",
      },
    ],
  },
  {
    level: 3,
    title: "Deep Knowledge",
    items: [
      {
        id: "5",
        title: "Expert Theories",
        image: "/placeholder.svg?height=100&width=200",
        url: "https://example.com/expert",
        description: "Advanced concepts discussed primarily among specialists",
      },
      {
        id: "6",
        title: "Controversial Topics",
        image: "/placeholder.svg?height=100&width=200",
        url: "https://example.com/controversial",
        description: "Debated ideas with multiple competing viewpoints",
      },
    ],
  },
  {
    level: 4,
    title: "Specialized Knowledge",
    items: [
      {
        id: "7",
        title: "Academic Research",
        image: "/placeholder.svg?height=100&width=200",
        url: "https://example.com/academic",
        description: "Peer-reviewed studies and scholarly publications",
      },
      {
        id: "8",
        title: "Industry Insights",
        image: "/placeholder.svg?height=100&width=200",
        url: "https://example.com/industry",
        description: "Practical applications and professional knowledge",
      },
    ],
  },
  {
    level: 5,
    title: "Obscure Knowledge",
    items: [
      {
        id: "9",
        title: "Rare Documents",
        image: "/placeholder.svg?height=100&width=200",
        url: "https://example.com/rare",
        description: "Hard-to-find information from specialized sources",
      },
      {
        id: "10",
        title: "Emerging Research",
        image: "/placeholder.svg?height=100&width=200",
        url: "https://example.com/emerging",
        description: "Cutting-edge developments not yet widely known",
      },
    ],
  },
]

export function ResearchProcess({ query }: { query: string }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [icebergData, setIcebergData] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedModel = searchParams.get("model") || "gpt-4"

  useEffect(() => {
    if (!query) {
      router.push("/")
      return
    }

    let isMounted = true

    const generateIcebergData = async () => {
      try {
        // Step 1: Search
        setCurrentStep(0)
        setProgress(20)
        const searchResponse = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const searchResults = await searchResponse.json()

        if (!isMounted) return

        // Step 2: Extract Information
        setCurrentStep(1)
        setProgress(40)
        const model = openai(selectedModel)
        const enhancedResults = await enhanceSearchResults(query, searchResults)

        if (!isMounted) return

        // Step 3: Connect Concepts
        setCurrentStep(2)
        setProgress(60)

        // Step 4: Organize by Depth
        setCurrentStep(3)
        setProgress(80)

        if (!isMounted) return

        // Step 5: Generate Iceberg
        setCurrentStep(4)
        setProgress(100)

        setIcebergData(enhancedResults)
        setIsComplete(true)
      } catch (error) {
        console.error("Error generating iceberg data:", error)
        // Handle error appropriately
      }
    }

    generateIcebergData()

    return () => {
      isMounted = false
    }
  }, [query, router, selectedModel])

  if (!query) return null

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {!isComplete ? (
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Researching: {query}</h1>
            <p className="text-muted-foreground">Please wait while we explore the depths of this topic</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Research progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-4">
            {RESEARCH_STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-start gap-4 rounded-lg border p-4 ${
                  index < currentStep
                    ? "border-green-500 bg-green-500/10"
                    : index === currentStep
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-gray-200 bg-gray-100/10 dark:border-gray-700 dark:bg-gray-800/10"
                }`}
              >
                <div
                  className={`rounded-full p-2 ${
                    index < currentStep
                      ? "bg-green-500 text-white"
                      : index === currentStep
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-500 dark:bg-gray-700"
                  }`}
                >
                  {step.icon}
                </div>
                <div>
                  <h3 className="font-medium">{step.name}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <IcebergChart query={query} data={icebergData} />
      )}
    </div>
  )
}

