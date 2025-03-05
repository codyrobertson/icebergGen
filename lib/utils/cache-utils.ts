/**
 * Simple in-memory cache with TTL support for expensive operations
 */

export interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes default TTL

  constructor() {
    // Set up periodic cleanup to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000)
  }

  /**
   * Get a cached item
   * @param key Cache key
   * @returns The cached value or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if the entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param data The data to cache
   * @param ttl Time to live in milliseconds
   */
  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    const timestamp = Date.now()
    const expiresAt = timestamp + ttl

    this.cache.set(key, {
      data,
      timestamp,
      expiresAt,
    })
  }

  /**
   * Check if a key exists and is not expired
   * @param key Cache key
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete a key from the cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Remove all expired entries from the cache
   */
  cleanup(): void {
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * Helper to wrap an expensive function with caching
   * @param fn The function to cache
   * @param keyFn Function to generate a cache key from arguments
   * @param ttl TTL in milliseconds
   */
  memoize<T, Args extends any[]>(
    fn: (...args: Args) => Promise<T>,
    keyFn: (...args: Args) => string,
    ttl = this.DEFAULT_TTL,
  ): (...args: Args) => Promise<T> {
    return async (...args: Args): Promise<T> => {
      const key = keyFn(...args)

      const cached = this.get<T>(key)
      if (cached !== null) {
        return cached
      }

      const result = await fn(...args)
      this.set(key, result, ttl)
      return result
    }
  }
}

// Export a singleton instance
export const memoryCache = new MemoryCache()

/**
 * Decorator function to cache the results of expensive operations
 * @param keyPrefix Prefix for the cache key
 * @param ttl Time to live in milliseconds
 */
export function withCache<T>(
  fn: (...args: any[]) => Promise<T>,
  keyPrefix: string,
  ttl?: number,
): (...args: any[]) => Promise<T> {
  return memoryCache.memoize(fn, (...args) => `${keyPrefix}:${JSON.stringify(args)}`, ttl)
}

