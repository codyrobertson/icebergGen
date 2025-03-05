"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function DiagnosticsPage() {
  const [adminKey, setAdminKey] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [initDbRunning, setInitDbRunning] = useState(false)
  const [initDbResults, setInitDbResults] = useState<any>(null)
  const [initDbError, setInitDbError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    if (!adminKey) {
      setError("Admin key is required")
      return
    }

    setIsRunning(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch("/api/diagnostics", {
        headers: {
          "x-admin-key": adminKey,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to run diagnostics")
      }

      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsRunning(false)
    }
  }

  const initializeDatabase = async () => {
    if (!adminKey) {
      setInitDbError("Admin key is required")
      return
    }

    setInitDbRunning(true)
    setInitDbError(null)
    setInitDbResults(null)

    try {
      const response = await fetch("/api/init-db", {
        headers: {
          "x-admin-key": adminKey,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize database")
      }

      setInitDbResults(data)
    } catch (err) {
      setInitDbError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setInitDbRunning(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Database Diagnostics</h1>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Admin Authentication</CardTitle>
            <CardDescription>Enter your admin key to run diagnostics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="adminKey">Admin Key</Label>
                <Input
                  id="adminKey"
                  placeholder="Enter your admin key"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Run Diagnostics</CardTitle>
              <CardDescription>Check database tables and connections</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={runDiagnostics} disabled={isRunning || !adminKey} className="w-full">
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...
                  </>
                ) : (
                  "Run Diagnostics"
                )}
              </Button>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {results && (
                <div className="mt-4 space-y-4">
                  <h3 className="text-lg font-semibold">Results:</h3>

                  <div className="space-y-2">
                    <h4 className="font-medium">Environment:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {Object.entries(results.environment).map(([key, value]) => (
                        <li key={key}>
                          {key}: <span className="font-mono">{value as string}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Tables Exist:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {Object.entries(results.diagnostics.tablesExist).map(([table, exists]) => (
                        <li key={table} className="flex items-center">
                          {table}:{" "}
                          {exists ? (
                            <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="ml-2 h-4 w-4 text-red-500" />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Tables Created:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {Object.entries(results.diagnostics.tablesCreated).map(([table, created]) => (
                        <li key={table} className="flex items-center">
                          {table}:{" "}
                          {created ? (
                            <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="ml-2 h-4 w-4 text-red-500" />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Test User Created:</h4>
                    <div className="flex items-center">
                      {results.diagnostics.userCreated ? (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4 text-red-500" />
                      )}
                      {results.diagnostics.userCreated ? "Success" : "Failed"}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Initialize Database</CardTitle>
              <CardDescription>Create required database tables</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={initializeDatabase} disabled={initDbRunning || !adminKey} className="w-full">
                {initDbRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Initializing...
                  </>
                ) : (
                  "Initialize Database"
                )}
              </Button>

              {initDbError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{initDbError}</AlertDescription>
                </Alert>
              )}

              {initDbResults && (
                <div className="mt-4 space-y-4">
                  <h3 className="text-lg font-semibold">Results:</h3>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto text-xs">
                    {JSON.stringify(initDbResults, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

