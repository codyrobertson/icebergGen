"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { getUserRole, searchConfig } from "@/lib/config"

// Updated models list with more OpenAI and Anthropic models
const models = [
  // OpenAI models
  {
    value: "openai/gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
    premium: true,
    category: "OpenAI",
  },
  {
    value: "openai/gpt-4-turbo",
    label: "GPT-4 Turbo",
    provider: "OpenAI",
    premium: true,
    category: "OpenAI",
  },
  {
    value: "openai/gpt-4",
    label: "GPT-4",
    provider: "OpenAI",
    premium: true,
    category: "OpenAI",
  },
  {
    value: "openai/gpt-3.5-turbo",
    label: "GPT-3.5 Turbo",
    provider: "OpenAI",
    premium: false,
    category: "OpenAI",
  },
  {
    value: "openai/gpt-3.5-turbo-16k",
    label: "GPT-3.5 Turbo 16K",
    provider: "OpenAI",
    premium: false,
    category: "OpenAI",
  },

  // Anthropic models
  {
    value: "anthropic/claude-3-opus",
    label: "Claude 3 Opus",
    provider: "Anthropic",
    premium: true,
    category: "Anthropic",
  },
  {
    value: "anthropic/claude-3-sonnet",
    label: "Claude 3 Sonnet",
    provider: "Anthropic",
    premium: true,
    category: "Anthropic",
  },
  {
    value: "anthropic/claude-3-haiku",
    label: "Claude 3 Haiku",
    provider: "Anthropic",
    premium: false,
    category: "Anthropic",
  },
  {
    value: "anthropic/claude-2",
    label: "Claude 2",
    provider: "Anthropic",
    premium: false,
    category: "Anthropic",
  },
  {
    value: "anthropic/claude-instant",
    label: "Claude Instant",
    provider: "Anthropic",
    premium: false,
    category: "Anthropic",
  },

  // Google models
  {
    value: "google/gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    provider: "Google",
    premium: true,
    category: "Google",
  },
  {
    value: "google/gemini-1.0-pro",
    label: "Gemini 1.0 Pro",
    provider: "Google",
    premium: false,
    category: "Google",
  },

  // Mistral models
  {
    value: "mistral/mistral-large",
    label: "Mistral Large",
    provider: "Mistral",
    premium: true,
    category: "Mistral",
  },
  {
    value: "mistral/mistral-medium",
    label: "Mistral Medium",
    provider: "Mistral",
    premium: true,
    category: "Mistral",
  },
  {
    value: "mistral/mistral-small",
    label: "Mistral Small",
    provider: "Mistral",
    premium: false,
    category: "Mistral",
  },

  // Meta models
  {
    value: "meta/llama-3-70b-instruct",
    label: "Llama 3 70B",
    provider: "Meta",
    premium: true,
    category: "Meta",
  },
  {
    value: "meta/llama-3-8b-instruct",
    label: "Llama 3 8B",
    provider: "Meta",
    premium: false,
    category: "Meta",
  },

  // Other notable models
  {
    value: "cohere/command-r-plus",
    label: "Command R+",
    provider: "Cohere",
    premium: true,
    category: "Other",
  },
  {
    value: "cohere/command-r",
    label: "Command R",
    provider: "Cohere",
    premium: false,
    category: "Other",
  },
  {
    value: "perplexity/sonar-medium-online",
    label: "Sonar Medium",
    provider: "Perplexity",
    premium: true,
    category: "Other",
  },
]

export function ModelSelector({
  onModelChange,
}: {
  onModelChange: (model: string) => void
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(searchConfig.defaultModel)
  const [userRole, setUserRole] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")

  React.useEffect(() => {
    async function loadUserRole() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setUserRole("free")
          return
        }

        // Use the config function to get the user role
        const role = getUserRole(user.email || "")
        setUserRole(role)
      } catch (error) {
        console.error("Error loading user role:", error)
        setUserRole("free") // Fallback to free
      } finally {
        setLoading(false)
      }
    }

    loadUserRole()
  }, [])

  // Filter models based on search term
  const filteredModels = React.useMemo(() => {
    let filtered = models

    if (searchTerm) {
      filtered = filtered.filter(
        (model) =>
          model.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          model.provider.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    return filtered
  }, [searchTerm])

  // Group models by category
  const groupedModels = React.useMemo(() => {
    const groups: Record<string, typeof models> = {}

    filteredModels.forEach((model) => {
      if (!groups[model.category]) {
        groups[model.category] = []
      }
      groups[model.category].push(model)
    })

    return groups
  }, [filteredModels])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {loading ? (
            "Loading models..."
          ) : (
            <>
              {value ? models.find((model) => model.value === value)?.label : "Select model..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0 max-h-[500px] overflow-y-auto"
        align="start"
        sideOffset={8}
        style={{ zIndex: 100 }}
      >
        <Command>
          <CommandInput placeholder="Search models..." onValueChange={setSearchTerm} />
          <CommandList className="max-h-[400px] overflow-y-auto">
            <CommandEmpty>No model found.</CommandEmpty>
            {Object.entries(groupedModels).map(([category, categoryModels]) => (
              <CommandGroup key={category} heading={category}>
                {categoryModels.map((model) => {
                  const isPremiumAndFreeUser = model.premium && userRole === "free"

                  return (
                    <CommandItem
                      key={model.value}
                      value={model.value}
                      onSelect={(currentValue) => {
                        // Only allow selection if the model is available to the user
                        if (!isPremiumAndFreeUser) {
                          setValue(currentValue)
                          onModelChange(currentValue)
                          setOpen(false)
                        } else {
                          // Optionally show upgrade prompt
                          router.push("/pricing")
                        }
                      }}
                      disabled={isPremiumAndFreeUser}
                      className={cn(
                        "flex items-center justify-between",
                        isPremiumAndFreeUser && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <div className="flex items-center">
                        <Check className={cn("mr-2 h-4 w-4", value === model.value ? "opacity-100" : "opacity-0")} />
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <span>{model.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({model.provider})</span>
                          </div>
                          {isPremiumAndFreeUser && (
                            <span className="text-xs text-muted-foreground">Pro plan required</span>
                          )}
                        </div>
                      </div>
                      {model.premium ? (
                        <Badge variant="outline" className="ml-2 text-xs bg-primary/10">
                          PRO
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="ml-2 text-xs bg-green-500/10 text-green-500 border-green-200"
                        >
                          FREE
                        </Badge>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

