"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const models = [
  {
    value: "gpt-4",
    label: "GPT-4o",
    provider: "openai",
  },
  {
    value: "claude-3-7-sonnet",
    label: "Claude 3.7 Sonnet",
    provider: "anthropic",
  },
  {
    value: "claude-3-5-sonnet", 
    label: "Claude 3.5 Sonnet",
    provider: "anthropic",
  },
  {
    value: "deepseek-r1",
    label: "Deepseek R1",
    provider: "deepseek",
  },
  {
    value: "deepseek-r3",
    label: "Deepseek R3", 
    provider: "deepseek",
  },
  {
    value: "openai-o3-mini",
    label: "OpenAI O3 Mini",
    provider: "openai",
  }
]

export function ModelSelector({
  onModelChange,
}: {
  onModelChange: (model: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("gpt-4")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-[250px] justify-between">
          {value ? models.find((model) => model.value === value)?.label : "Select model..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            <CommandGroup>
              {models.map((model) => (
                <CommandItem
                  key={model.value}
                  value={model.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue)
                    onModelChange(currentValue)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === model.value ? "opacity-100" : "opacity-0")} />
                  {model.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
