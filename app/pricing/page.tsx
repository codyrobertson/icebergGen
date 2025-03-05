import { Header } from "@/components/ui/header"
import { PricingCards } from "@/components/pricing/pricing-cards"

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
            <p className="text-xl text-muted-foreground">Select the perfect plan for your research needs</p>
          </div>
          <PricingCards />
        </div>
      </main>
    </div>
  )
}

