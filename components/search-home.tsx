import React from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

export function SearchHome() {
  return (
    <div className="max-w-4xl w-full mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Iceberg Chart Generator</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Research, analyze, and create beautiful iceberg charts
        </p>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-col md:flex-row gap-3">
            <Input 
              placeholder="Enter a topic to research..."
              className="flex-1"
            />
            <Button type="submit" variant="primary">
              Search
            </Button>
          </form>
          
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Popular searches:
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                Conspiracy Theories
              </Button>
              <Button variant="outline" size="sm">
                Ancient Civilizations
              </Button>
              <Button variant="outline" size="sm">
                Government Secrets
              </Button>
              <Button variant="outline" size="sm">
                Lost Technologies
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 