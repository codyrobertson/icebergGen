export type IcebergItem = {
  id: string
  title: string
  image: string
  url: string
  description: string
  knowledgeLevel?: number
}

export type IcebergLevel = {
  level: number
  title: string
  items: IcebergItem[]
}

// Default level titles
const DEFAULT_LEVEL_TITLES = [
  "Surface Knowledge",
  "Intermediate Knowledge",
  "Deep Knowledge",
  "Specialized Knowledge",
  "Obscure Knowledge",
]

// Helper function to process results into iceberg levels
export function processResultsIntoIcebergLevels(results: any[], customLevelTitles?: string[]): IcebergLevel[] {
  // Ensure results is an array
  if (!Array.isArray(results)) {
    console.error("Results to process is not an array:", results)
    return []
  }

  console.log(`Processing ${results.length} results into iceberg levels`)

  // Use custom titles if provided, otherwise use defaults
  const levelTitles = customLevelTitles || DEFAULT_LEVEL_TITLES

  // Group by knowledge level (1-5)
  const groupedByLevel: Record<number, IcebergLevel> = {
    1: { level: 1, title: levelTitles[0] || "Surface Knowledge", items: [] },
    2: { level: 2, title: levelTitles[1] || "Intermediate Knowledge", items: [] },
    3: { level: 3, title: levelTitles[2] || "Deep Knowledge", items: [] },
    4: { level: 4, title: levelTitles[3] || "Specialized Knowledge", items: [] },
    5: { level: 5, title: levelTitles[4] || "Obscure Knowledge", items: [] },
  }

  // Add each result to the appropriate level
  results.forEach((item: any) => {
    // Ensure each item has a knowledge level
    const level = item.knowledgeLevel || calculateDefaultKnowledgeLevel(item)
    const levelKey = Math.min(Math.max(Math.round(level), 1), 5)

    // Create the item with consistent structure
    const icebergItem: IcebergItem = {
      id: `${levelKey}-${item.id || Math.random().toString(36).substring(2, 9)}`,
      title: item.title || "Untitled",
      image: item.image || "/placeholder.svg?height=100&width=200",
      url: item.url || "#",
      description: item.content || item.description || "No description available",
      knowledgeLevel: levelKey,
    }

    // Add to the appropriate level
    groupedByLevel[levelKey].items.push(icebergItem)
  })

  // Convert to array and filter out empty levels
  const levels = Object.values(groupedByLevel).filter((level) => level.items.length > 0)

  console.log(
    `Generated ${levels.length} iceberg levels with distribution:`,
    levels.map((l) => `Level ${l.level}: ${l.items.length} items`).join(", "),
  )

  return levels
}

// Calculate a default knowledge level based on item properties
function calculateDefaultKnowledgeLevel(item: any): number {
  // Use score as a heuristic if available (higher score = more surface level)
  if (typeof item.score === "number") {
    // Convert score (typically 0-1) to level (1-5)
    // Higher scores are more relevant but typically more surface-level
    return Math.max(1, Math.min(5, Math.ceil(6 - item.score * 5)))
  }

  // Use content length as a heuristic (longer content = deeper knowledge)
  if (item.content && typeof item.content === "string") {
    const contentLength = item.content.length
    if (contentLength > 2000) return 5
    if (contentLength > 1500) return 4
    if (contentLength > 1000) return 3
    if (contentLength > 500) return 2
    return 1
  }

  // Default to level 1 if no heuristics available
  return 1
}

