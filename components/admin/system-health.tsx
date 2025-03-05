"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export function SystemHealth() {
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchSystemHealth() {
    setLoading(true)
    setError(null)

    try {
      // Make a search request with debug=true to get system health information
      const res = await fetch(`/api/search?q=test&debug=true&nocache=true`)

      if (!res.ok) {
        throw new Error(`Failed to fetch system health: ${res.status}`)
      }

      const data = await res.json()
      setHealth({
        systemHealth: data.systemHealth,
        providerStatuses: data.providerStatuses,
        providerAnalytics: data.providerAnalytics,
        cacheStats: data.cacheStats,
      })
    } catch (err) {
      console.error("Error fetching system health:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSystemHealth()
  }, [])

  // Helper for status badge
  function getStatusBadge(status: string) {
    switch (status) {
      case "healthy":
      case "passing":
        return <Badge className="bg-green-500">Healthy</Badge>
      case "degraded":
      case "warning":
        return <Badge className="bg-yellow-500">Degraded</Badge>
      case "failing":
      case "deprecated":
        return <Badge className="bg-red-500">Failing</Badge>
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>
    }
  }

  // Helper for status icon
  function getStatusIcon(status: string) {
    switch (status) {
      case "healthy":
      case "passing":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "degraded":
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case "failing":
      case "deprecated":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!health) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-gray-500">Loading system health data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">System Health</h2>
        <Button onClick={fetchSystemHealth} disabled={loading} size="sm">
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Overall System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>Overall System Status</span>
            {health.systemHealth && getStatusBadge(health.systemHealth.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {health.systemHealth && (
            <>
              <div className="flex items-center mb-4">
                {getStatusIcon(health.systemHealth.status)}
                <span className="ml-2">
                  {health.systemHealth.status === "healthy" ? "All systems operational" : "Some systems degraded"}
                </span>
              </div>

              {health.systemHealth.issues.length > 0 && (
                <Alert className="mb-4">
                  <AlertTitle>Issues Detected</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 mt-2">
                      {health.systemHealth.issues.map((issue: string, i: number) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  Last updated: {new Date(health.systemHealth.lastUpdated).toLocaleString()}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Provider Status */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {health.providerAnalytics &&
              Object.entries(health.providerAnalytics).map(([provider, data]: [string, any]) => (
                <div key={provider} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{provider.charAt(0).toUpperCase() + provider.slice(1)}</h3>
                    {getStatusBadge(data.status)}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Success Rate</span>
                        <span>{(data.successRate * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={data.successRate * 100} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Weight</span>
                        <span>{data.weight.toFixed(2)}</span>
                      </div>
                      <Progress value={data.weight * 100} className="h-2" />
                    </div>

                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Avg Response Time</span>
                        <span>{data.avgResponseTime ? `${data.avgResponseTime.toFixed(0)}ms` : "N/A"}</span>
                      </div>
                    </div>

                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Last Used</span>
                        <span>{data.lastUsed ? new Date(data.lastUsed).toLocaleString() : "Never"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Cache Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          {health.cacheStats && (
            <div>
              <p>
                <strong>Total Items:</strong> {health.cacheStats.size}
              </p>
              <p className="mt-2">
                <strong>Cache Keys:</strong>
              </p>
              {health.cacheStats.keys.length > 0 ? (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2">
                  <ul className="list-disc pl-5">
                    {health.cacheStats.keys.map((key: string, i: number) => (
                      <li key={i} className="text-sm truncate">
                        {key}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-gray-500 italic">No items in cache</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

