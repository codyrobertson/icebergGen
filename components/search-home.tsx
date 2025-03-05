"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Search, History, Lightbulb } from "lucide-react"
import { ModelSelector } from "@/components/model-selector"
import { ToneSelector } from "@/components/tone-selector"
import { useDebounce } from "@/lib/hooks"
import { createClient } from "@/lib/supabase-client"
import { searchConfig } from "@/lib/config"

export function SearchHome() {
  const [query, setQuery] = useState("")
  const [selectedModel, setSelectedModel] = useState(searchConfig.defaultModel)
  const [selectedTone, setSelectedTone] = useState(searchConfig.defaultTone)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isRecentSearches, setIsRecentSearches] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    // Fetch initial suggestions when component mounts
    fetchSuggestions("")

    // Check if user is logged in
    const checkUser = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }

    checkUser()
  }, [])

  useEffect(() => {
    // Fetch suggestions when query changes
    if (debouncedQuery !== undefined) {
      fetchSuggestions(debouncedQuery)
    }
  }, [debouncedQuery])

  useEffect(() => {
    // Handle clicks outside the suggestions dropdown
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const fetchSuggestions = async (searchQuery: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/suggestions?q=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) throw new Error("Failed to fetch suggestions")

      const data = await response.json()
      setSuggestions(data)

      // If query is empty, these are recent searches (if user is logged in)
      setIsRecentSearches(searchQuery === "" && user !== null)
    } catch (error) {
      console.error("Error fetching suggestions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return
    setShowSuggestions(false)
    router.push(`/research?q=${encodeURIComponent(searchQuery)}&model=${selectedModel}&tone=${selectedTone}`)
  }

  const handleModelChange = (model: string) => {
    setSelectedModel(model)
  }

  const handleToneChange = (tone: string) => {
    setSelectedTone(tone)
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center md:px-6 md:py-32">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">Iceberg.Ai</h1>
        <p className="text-xl text-muted-foreground">Dig deep in the rabbit hole on any topic</p>
        <div className="mx-auto max-w-lg space-y-4">
          <div className="grid grid-cols-1 gap-4 w-full">
            <div className="w-full relative" style={{ zIndex: 20 }}>
              <ModelSelector onModelChange={handleModelChange} />
            </div>
            <div className="w-full relative" style={{ zIndex: 10 }}>
              <ToneSelector onToneChange={handleToneChange} />
            </div>
          </div>
          <div className="relative" ref={suggestionsRef}>
            <div className="relative">
              <Input
                ref={inputRef}
                className="h-12 rounded-lg bg-muted px-4 py-2 pl-10 pr-12 text-base"
                placeholder="What would you like to research?"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch(query)
                  }
                }}
                style={{ width: "100%" }}
              />
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              <Button className="absolute right-1 top-1 h-10 w-10 rounded-md p-0" onClick={() => handleSearch(query)}>
                <Sparkles className="h-5 w-5" />
                <span className="sr-only">Research Anything</span>
              </Button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-30 mt-1 w-full rounded-md bg-background border shadow-lg">
                <ul className="py-1 text-left">
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className="px-4 py-2 hover:bg-muted cursor-pointer opacity-80 hover:opacity-100"
                      onClick={() => {
                        setQuery(suggestion)
                        handleSearch(suggestion)
                      }}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <h3 className="text-sm font-medium flex items-center">
              {isRecentSearches ? (
                <>
                  <History className="mr-2 h-4 w-4" />
                  Your Recent Searches
                </>
              ) : (
                <>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Suggested Rabbit Holes
                </>
              )}
            </h3>
            {suggestions.slice(0, searchConfig.suggestionsCount).map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                className="h-auto justify-start px-4 py-3 text-left text-sm opacity-70 hover:opacity-100"
                onClick={() => handleSearch(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

