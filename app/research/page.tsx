import { Header } from "@/components/ui/header"
import ResearchProcess from "@/components/research-process"
import type { Metadata, ResolvingMetadata } from "next"

type Props = {
  params: {}
  searchParams: { q: string; model?: string; tone?: string }
}

export async function generateMetadata({ searchParams }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const query = searchParams.q || ""

  if (!query) {
    return {
      title: "Research | Iceberg.AI",
    }
  }

  return {
    title: `${query} | Iceberg.AI`,
    description: `Explore the depths of ${query} with AI-powered research from Iceberg.AI`,
    openGraph: {
      title: `${query} | Iceberg.AI`,
      description: `Explore the depths of ${query} with AI-powered research from Iceberg.AI`,
      images: [`/opengraph-image?query=${encodeURIComponent(query)}`],
    },
    twitter: {
      card: "summary_large_image",
      title: `${query} | Iceberg.AI`,
      description: `Explore the depths of ${query} with AI-powered research from Iceberg.AI`,
      images: [`/opengraph-image?query=${encodeURIComponent(query)}`],
      creator: "@mackody",
    },
  }
}

export default function ResearchPage({ searchParams }: Props) {
  const query = searchParams.q || ""
  const model = searchParams.model || "gpt-3.5-turbo"
  const tone = searchParams.tone || "balanced"

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <ResearchProcess query={query} />
      </main>
    </div>
  )
}

