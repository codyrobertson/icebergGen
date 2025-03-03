import { Header } from "@/components/ui/header"
import { SearchHome } from "@/components/search-home"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <SearchHome />
      </main>
    </div>
  )
}

