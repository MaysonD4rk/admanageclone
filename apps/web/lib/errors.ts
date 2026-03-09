// ─────────────────────────────────────────────────────────
// Domain errors — typed error hierarchy for the app
// ─────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404)
  }
}

export class DuplicateAssetError extends AppError {
  constructor(public readonly existingId: string) {
    super(`Smart Asset already exists (id: ${existingId})`, 409)
  }
}

/**
 * Thrown when the NanoBanana API returns successFlag !== 1
 * or when the HTTP request itself fails.
 */
export class NanoBananaError extends AppError {
  constructor(
    message: string,
    public readonly nanoBananaErrorCode: string | null,
    statusCode: number = 502,
    public readonly taskId?: string,
  ) {
    super(message, statusCode)
  }
}

/** Convert a domain error into a JSON-safe HTTP response body. */
export function toErrorResponse(error: unknown): { error: string; details?: unknown } {
  if (error instanceof AppError) {
    return { error: error.message }
  }
  if (error instanceof Error) {
    return { error: error.message }
  }
  return { error: 'An unexpected error occurred' }
}
