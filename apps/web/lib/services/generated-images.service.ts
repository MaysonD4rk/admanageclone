// ─────────────────────────────────────────────────────────
// GeneratedImages Service — orchestration layer
//
// Responsibilities:
//   - Orchestrate: prompt → NanoBanana → DB → (Smart Assets)
//   - Persist GeneratedImage records
//   - Delegate API calls to nanobanana.service
//   - Delegate asset storage to smart-assets.service (no duplication)
//
// Does NOT: handle HTTP requests, know about Next.js Request/Response
// ─────────────────────────────────────────────────────────

import { prisma } from '@/lib/db'
import { withRetry } from '@/lib/utils/retry'
import {
  buildAdPrompt,
  buildNanoBananaRequest,
  callNanoBananaAPI,
  isTransientError,
} from '@/lib/services/nanobanana.service'
import { saveSmartAssetsSafe } from '@/lib/services/smart-assets.service'
import type { GenerateImageInput, GenerateImageResult, GeneratedImage } from '@/lib/types'

const RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelayMs: 1000,
  isRetryable: isTransientError,
  onRetry: (attempt: number, total: number, error: unknown, delayMs: number) => {
    const msg = error instanceof Error ? error.message : String(error)
    console.warn(`[nanobanana] Retry ${attempt}/${total - 1} in ${delayMs}ms — ${msg}`)
  },
}

// ─── Orchestration ────────────────────────────────────────

/**
 * Full image generation pipeline:
 *  1. Build advertising-optimised prompt
 *  2. Call NanoBanana API (with retry)
 *  3. Persist metadata to DB
 *  4. Optionally save to Smart Assets (reuses existing service)
 */
export async function generateAndSaveImage(
  input: GenerateImageInput,
): Promise<GenerateImageResult> {
  if (!input.userPrompt?.trim()) {
    throw new Error('userPrompt is required')
  }

  // Step 1 — build prompt
  const fullPrompt = buildAdPrompt(input.userPrompt)

  // Step 2 — call NanoBanana with retry
  const nanoBananaRequest = buildNanoBananaRequest(fullPrompt, {
    imageUrls: input.imageUrls,
    aspectRatio: input.aspectRatio,
    resolution: input.resolution,
  })

  const apiResponse = await withRetry(
    () => callNanoBananaAPI(nanoBananaRequest),
    RETRY_OPTIONS,
  )

  // Step 3 — persist
  const generatedImage = await persistGeneratedImage({
    taskId: apiResponse.taskId,
    userPrompt: input.userPrompt,
    fullPrompt,
    generatedImageUrl: apiResponse.response.resultImageUrl,
    originalImageUrl: apiResponse.response.originImageUrl ?? null,
    aspectRatio: input.aspectRatio ?? 'auto',
    resolution: input.resolution ?? '1K',
  })

  // Step 4 — optionally save to Smart Assets (reuse existing logic, no duplication)
  let smartAssetId: string | undefined
  if (input.saveToSmartAssets) {
    const [result] = await saveSmartAssetsSafe([
      {
        title: `AI: ${input.userPrompt.slice(0, 60)}`,
        imageUrl: apiResponse.response.resultImageUrl,
      },
    ])
    if (!result.isDuplicate) {
      smartAssetId = result.asset.id
      await markSavedToAssets(generatedImage.id, smartAssetId)
      generatedImage.savedToAssets = true
      generatedImage.smartAssetId = smartAssetId
    }
  }

  return { generatedImage, smartAssetId }
}

// ─── DB operations ────────────────────────────────────────

interface PersistInput {
  taskId: string
  userPrompt: string
  fullPrompt: string
  generatedImageUrl: string
  originalImageUrl?: string | null
  aspectRatio: string
  resolution: string
}

async function persistGeneratedImage(data: PersistInput): Promise<GeneratedImage> {
  try {
    return (await prisma.generatedImage.create({ data })) as unknown as GeneratedImage
  } catch (cause) {
    // DB unavailable — return a transient record so the caller still gets the image URL
    console.warn('[generated-images] DB write failed, returning transient record:', cause)
    return {
      id: `gi_${Date.now()}`,
      savedToAssets: false,
      smartAssetId: null,
      createdAt: new Date().toISOString(),
      ...data,
    }
  }
}

async function markSavedToAssets(id: string, smartAssetId: string): Promise<void> {
  try {
    await prisma.generatedImage.update({
      where: { id },
      data: { savedToAssets: true, smartAssetId },
    })
  } catch {
    // Non-critical — the image is generated even if the flag update fails
    console.warn(`[generated-images] Could not mark ${id} as saved-to-assets`)
  }
}

export async function getAllGeneratedImages(): Promise<GeneratedImage[]> {
  try {
    return (await prisma.generatedImage.findMany({
      orderBy: { createdAt: 'desc' },
    })) as unknown as GeneratedImage[]
  } catch {
    return []
  }
}

export async function getGeneratedImageByTaskId(taskId: string): Promise<GeneratedImage | null> {
  try {
    return (await prisma.generatedImage.findUnique({
      where: { taskId },
    })) as unknown as GeneratedImage | null
  } catch {
    return null
  }
}

/**
 * Upsert a GeneratedImage via the NanoBanana async callback.
 * Used by POST /api/generate-image/callback.
 */
export async function upsertFromCallback(data: {
  taskId: string
  resultImageUrl: string
  originImageUrl?: string | null
}): Promise<void> {
  try {
    await prisma.generatedImage.updateMany({
      where: { taskId: data.taskId },
      data: {
        generatedImageUrl: data.resultImageUrl,
        originalImageUrl: data.originImageUrl ?? null,
      },
    })
  } catch (cause) {
    console.error('[generated-images] Callback upsert failed:', cause)
  }
}
