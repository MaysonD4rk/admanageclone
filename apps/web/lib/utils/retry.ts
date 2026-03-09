// ─────────────────────────────────────────────────────────
// Generic retry utility with exponential back-off
// ─────────────────────────────────────────────────────────

export interface RetryOptions {
  /** Maximum number of additional attempts after the first failure */
  maxRetries: number
  /** Delay before the first retry in ms; doubles on each subsequent retry */
  baseDelayMs: number
  /** Return true to retry, false to re-throw immediately */
  isRetryable?: (error: unknown) => boolean
  /** Called before each retry; useful for logging */
  onRetry?: (attempt: number, totalAttempts: number, error: unknown, delayMs: number) => void
}

/**
 * Execute `fn` and retry up to `maxRetries` times on failure.
 *
 * Back-off formula: delay = baseDelayMs * 2^(attempt - 1)
 *   attempt 1 → baseDelayMs
 *   attempt 2 → baseDelayMs * 2
 *   attempt 3 → baseDelayMs * 4
 *
 * @throws the last error if all attempts fail or `isRetryable` returns false
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxRetries, baseDelayMs, isRetryable = () => true, onRetry } = options
  const totalAttempts = maxRetries + 1
  let lastError: unknown

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      const isLastAttempt = attempt === totalAttempts
      if (isLastAttempt || !isRetryable(error)) throw error

      const delayMs = baseDelayMs * Math.pow(2, attempt - 1)
      onRetry?.(attempt, totalAttempts, error, delayMs)

      await sleep(delayMs)
    }
  }

  // Unreachable, but required by TypeScript
  throw lastError
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
