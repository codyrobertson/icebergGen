"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/loading-spinner"

export function DbHealthCheck() {
  const [isLoading, setIsLoading] = useState(true)
  const [healthData, setHealthData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/db-health", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Health check failed with status: ${response.status}`)
      }

      const data = await response.json()
      setHealthData(data)
    } catch (err: any) {
      console.error("Error checking database health:", err)
      setError(err.message || "Failed to check database health")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, []) // Removed checkHealth from dependencies

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checking Database Health</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <LoadingSpinner size="md" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Database Health Check Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={checkHealth}>Retry</Button>
        </CardFooter>
      </Card>
    )
  }

  if (!healthData?.healthy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Database Issues Detected</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Database Health Issues</AlertTitle>
            <AlertDescription>{healthData?.message || "The database is not in a healthy state."}</AlertDescription>
          </Alert>

          {healthData?.missingTables && healthData.missingTables.length > 0 && (
            <div className="mt-4">
              <p className="font-semibold">Missing Tables:</p>
              <ul className="list-disc pl-5 mt-2">
                {healthData.missingTables.map((table: string) => (
                  <li key={table}>{table}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={checkHealth}>Check Again</Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Health</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
          <AlertTitle>Healthy</AlertTitle>
          <AlertDescription>
            {healthData.message || "All database tables are properly configured."}
            {healthData.initialized && <p className="mt-2">Note: Missing tables were automatically initialized.</p>}
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={checkHealth}>
          Refresh
        </Button>
      </CardFooter>
    </Card>
  )
}

