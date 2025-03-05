/**
 * Data Transfer Object for article summary requests.
 * Validates and structures incoming request data.
 */
export interface ArticleSummaryDto {
  readonly url: string
  readonly title: string
  readonly description?: string
  readonly model?: string
}

/**
 * Validates an ArticleSummaryDto object.
 * @param data The data to validate
 * @returns A tuple containing [isValid, errors]
 */
export function validateArticleSummaryDto(data: any): [boolean, string[]] {
  const errors: string[] = []

  if (!data.url) {
    errors.push("URL is required")
  } else if (typeof data.url !== "string") {
    errors.push("URL must be a string")
  }

  if (!data.title) {
    errors.push("Title is required")
  } else if (typeof data.title !== "string") {
    errors.push("Title must be a string")
  }

  if (data.description && typeof data.description !== "string") {
    errors.push("Description must be a string")
  }

  if (data.model && typeof data.model !== "string") {
    errors.push("Model must be a string")
  }

  return [errors.length === 0, errors]
}

