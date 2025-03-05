/**
 * Options for retry operations
 */
export interface RetryOptions {
  maxRetries?: number
  retryDelay?: (attempt: number) => number
  onRetry?: (attempt: number, error: Error) => void
  shouldRetry?: (error: Error) => boolean
}

/**
 * Wraps a promise with a timeout.
 * @param promise The promise to wrap
 * @param ms Timeout in milliseconds
 * @returns A promise that rejects if the timeout is reached
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeoutError = new Error(`Operation timed out after ${ms}ms`)
  timeoutError.name = "TimeoutError"

  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(timeoutError), ms))])
}

/**
 * Executes an operation with retry logic
 * @param operation The async operation to execute
 * @param options Retry configuration options
 * @returns A promise resolving to the operation result
 */
export async function withRetry<T>(operation: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 2,
    retryDelay = (attempt) => Math.min(1000 * Math.pow(2, attempt), 5000),
    onRetry = () => {},
    shouldRetry = (error) => error.name !== "AbortError" && error.name !== "TimeoutError",
  } = options

  let attempt = 0

  while (true) {
    try {
      return await operation(attempt)
    } catch (error) {
      if (attempt >= maxRetries || !shouldRetry(error as Error)) {
        throw error
      }

      onRetry(attempt, error as Error)
      await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)))
      attempt++
    }
  }
}

/**
 * Executes multiple promises with a concurrency limit
 * @param items Items to process
 * @param operation Async operation to apply to each item
 * @param concurrency Maximum number of concurrent operations
 * @returns Results of all operations in the same order as inputs
 */
export async function withConcurrencyLimit<T, R>(
  items: T[],
  operation: (item: T, index: number) => Promise<R>,
  concurrency = 2,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let currentIndex = 0

  async function processNext(): Promise<void> {
    const index = currentIndex++
    if (index >= items.length) return

    try {
      results[index] = await operation(items[index], index)
    } catch (error) {
      console.error(`Error processing item at index ${index}:`, error)
      throw error
    }

    return processNext()
  }

  // Start initial batch of concurrent operations
  const workers = Array(Math.min(concurrency, items.length))
    .fill(0)
    .map(() => processNext())

  await Promise.all(workers)
  return results
}

