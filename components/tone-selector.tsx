"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const tones = [
  {
    value: "balanced",
    label: "Balanced",
    description: "A neutral, balanced perspective",
  },
  {
    value: "funny",
    label: "Funny",
    description: "Humorous and entertaining",
  },
  {
    value: "deep-dive",
    label: "Deep Dive",
    description: "Thorough and comprehensive",
  },
  {
    value: "expert",
    label: "Expert",
    description: "Technical and specialized",
  },
  {
    value: "wordcel",
    label: "Wordcel",
    description: "Eloquent and literary",
  },
  {
    value: "phd",
    label: "PhD",
    description: "Academic and scholarly",
  },
]

export function ToneSelector({
  onToneChange,
}: {
  onToneChange: (tone: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("balanced")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {value ? tones.find((tone) => tone.value === value)?.label : "Select tone..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[250px] max-w-[350px] p-0 z-[100]" align="start" sideOffset={8}>
        <Command>
          <CommandInput placeholder="Search tones..." />
          <CommandList>
            <CommandEmpty>No tone found.</CommandEmpty>
            <CommandGroup>
              {tones.map((tone) => (
                <CommandItem
                  key={tone.value}
                  value={tone.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue)
                    onToneChange(currentValue)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === tone.value ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span>{tone.label}</span>
                    <span className="text-xs text-muted-foreground">{tone.description}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

