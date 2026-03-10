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

const NANOBANANA_RESULT_ENDPOINT =
  'https://api.nanobananaapi.ai/api/v1/nanobanana/record-info'

const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 110_000 // just under the 120s maxDuration

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
    // Never retry quota/auth/client errors — only transient server errors
    if (error.statusCode === 402 || error.statusCode === 401 || error.statusCode === 400) return false
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
 * Submit a generation task to NanoBanana and poll until the image is ready.
 *
 * Flow:
 *  1. POST /generate-2 → { code: 200, data: { taskId } }
 *  2. Poll GET /record-info?taskId every POLL_INTERVAL_MS
 *  3. successFlag 0 = still processing, 1 = done, 2/3 = failed
 */
export async function callNanoBananaAPI(
  request: NanoBananaRequest,
): Promise<NanoBananaResponse> {
  const apiKey = getApiKey()

  // ── Step 1: Submit the task ───────────────────────────────
  let submitResponse: Response
  try {
    submitResponse = await fetch(NANOBANANA_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
  } catch (cause) {
    throw new NanoBananaError(
      `Network error submitting to NanoBanana: ${cause instanceof Error ? cause.message : String(cause)}`,
      'NETWORK_ERROR',
      503,
    )
  }

  if (!submitResponse.ok) {
    throw new NanoBananaError(
      `NanoBanana submit returned HTTP ${submitResponse.status}`,
      `HTTP_${submitResponse.status}`,
      submitResponse.status >= 500 ? 502 : 400,
    )
  }

  const submitRaw = await submitResponse.json()

  if (submitRaw.code !== 200 || !submitRaw.data?.taskId) {
    throw new NanoBananaError(
      submitRaw.msg ?? `NanoBanana submit error (code ${submitRaw.code})`,
      String(submitRaw.code),
      submitRaw.code === 402 ? 402 : 502,
    )
  }

  const taskId: string = submitRaw.data.taskId
  console.log(`[nanobanana] Task submitted: ${taskId}`)

  // ── Step 2: Poll for result ───────────────────────────────
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)

    let pollResponse: Response
    try {
      pollResponse = await fetch(`${NANOBANANA_RESULT_ENDPOINT}?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
    } catch {
      // Network hiccup — keep polling
      continue
    }

    if (!pollResponse.ok) continue

    const result = await pollResponse.json() as NanoBananaResponse

    if (result.successFlag === 1) {
      console.log(`[nanobanana] Task ${taskId} complete: ${result.response?.resultImageUrl}`)
      return result
    }

    if (result.successFlag === 2 || result.successFlag === 3) {
      throw new NanoBananaError(
        result.errorMessage ?? `NanoBanana task ${taskId} failed (flag ${result.successFlag})`,
        result.errorCode,
        502,
        taskId,
      )
    }

    // successFlag === 0: still generating, keep polling
    console.log(`[nanobanana] Task ${taskId} still processing...`)
  }

  throw new NanoBananaError(
    `NanoBanana task ${taskId} timed out after ${POLL_TIMEOUT_MS / 1000}s`,
    'TIMEOUT',
    504,
    taskId,
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
