import { Header } from "@/components/ui/header"
import { ResearchProcess } from "@/components/research-process"

export default function ResearchPage({
  searchParams,
}: {
  searchParams: { q: string }
}) {
  const query = searchParams.q || ""

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <ResearchProcess query={query} />
      </main>
    </div>
  )
}

