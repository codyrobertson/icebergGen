import { Suspense } from "react"
import { AuthForm } from "@/components/auth/auth-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold">Iceberg.AI</h1>
        <p className="text-muted-foreground">Explore the depths of any topic with AI-powered research</p>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <AuthForm />
      </Suspense>
    </div>
  )
}

