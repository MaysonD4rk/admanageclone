// ─────────────────────────────────────────────────────────
// NanoBanana API Client
//
// Responsibilities (Single Responsibility Principle):
//   - Build advertising-optimized prompts
//   - Make typed HTTP calls to the NanoBanana endpoint
//   - Determine which errors are retryable
//
// Does NOT: persist data, call other services, handle HTTP requests
// ─────────────────────────────────────────────────────────

import { NanoBananaError } from '@/lib/errors'
import type { NanoBananaRequest, NanoBananaResponse, AspectRatio, Resolution } from '@/lib/types'

// ─── Configuration ────────────────────────────────────────

const NANOBANANA_ENDPOINT =
  'https://api.nanobananaapi.ai/api/v1/nanobanana/generate-2'

/** Resolved at runtime so tests can override via env mocks */
function getApiKey(): string {
  const key = process.env.NANOBANANA_API_KEY
  if (!key) {
    throw new NanoBananaError(
      'NANOBANANA_API_KEY environment variable is not set',
      'MISSING_API_KEY',
      500,
    )
  }
  return key
}

function getCallbackUrl(): string {
  return (
    process.env.NANOBANANA_CALLBACK_URL ??
    'http://localhost:3000/api/generate-image/callback'
  )
}

// ─── Prompt building ──────────────────────────────────────

/**
 * The advertising context prefix prepended to every user prompt.
 * This primes the model to generate ad-optimised visuals.
 */
const AD_CONTEXT_PREFIX =
  'Create a high-quality advertising image suitable for digital marketing and ads. ' +
  'The image should be visually appealing, attention-grabbing, and optimized for ' +
  'promotional use. User request: '

/**
 * Prepend advertising context to a user prompt.
 * Pure function — no side effects, fully testable.
 */
export function buildAdPrompt(userPrompt: string): string {
  const trimmed = userPrompt.trim()
  if (!trimmed) throw new Error('userPrompt must not be empty')
  return `${AD_CONTEXT_PREFIX}${trimmed}`
}

/**
 * Build the full NanoBanana request payload.
 * Pure function — no side effects, fully testable.
 */
export function buildNanoBananaRequest(
  fullPrompt: string,
  options: {
    imageUrls?: string[]
    aspectRatio?: AspectRatio | string
    resolution?: Resolution
  } = {},
): NanoBananaRequest {
  return {
    prompt: fullPrompt,
    imageUrls: options.imageUrls ?? [],
    aspectRatio: options.aspectRatio ?? 'auto',
    resolution: options.resolution ?? '1K',
    googleSearch: false,
    outputFormat: 'jpg',
    callBackUrl: getCallbackUrl(),
  }
}

// ─── Error classification ─────────────────────────────────

/**
 * Returns true for errors that are safe to retry:
 *   - Network/connection errors
 *   - 5xx upstream server errors
 *
 * Returns false for:
 *   - 4xx client errors (bad request, auth)
 *   - NanoBanana business-logic failures (bad prompt, etc.)
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof NanoBananaError) {
    return error.statusCode >= 500
  }
  if (error instanceof TypeError) {
    // fetch() throws TypeError for network failures
    return true
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('fetch failed') ||
      msg.includes('network') ||
      msg.includes('socket')
    )
  }
  return false
}

// ─── API call ─────────────────────────────────────────────

/**
 * Call the NanoBanana generate endpoint.
 *
 * @throws {NanoBananaError} on HTTP errors or when successFlag !== 1
 */
export async function callNanoBananaAPI(
  request: NanoBananaRequest,
): Promise<NanoBananaResponse> {
  const apiKey = getApiKey()

  let httpResponse: Response
  try {
    httpResponse = await fetch(NANOBANANA_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
  } catch (cause) {
    // Network-level failure (no response received)
    throw new NanoBananaError(
      `Network error calling NanoBanana: ${cause instanceof Error ? cause.message : String(cause)}`,
      'NETWORK_ERROR',
      503,
    )
  }

  if (!httpResponse.ok) {
    throw new NanoBananaError(
      `NanoBanana API returned HTTP ${httpResponse.status}`,
      `HTTP_${httpResponse.status}`,
      httpResponse.status >= 500 ? 502 : 400,
    )
  }

  const data: NanoBananaResponse = await httpResponse.json()

  if (data.successFlag !== 1) {
    console.error('[nanobanana] Generation failed:', {
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      taskId: data.taskId,
    })
    throw new NanoBananaError(
      data.errorMessage ?? 'NanoBanana generation failed',
      data.errorCode,
      502,
      data.taskId,
    )
  }

  return data
}
