import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">Iceberg AI</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="default" size="sm" className="gap-1">
            <PlusCircle className="h-4 w-4" />
            New Iceberg
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}

