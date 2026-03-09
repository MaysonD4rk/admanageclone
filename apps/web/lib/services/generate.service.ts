// ─────────────────────────────────────────────────────────
// Generate Service — Ad Campaign Orchestration
//
// Responsibilities:
//   - Create a Project record
//   - Generate exactly 4 ad images via the NanoBanana API (real, no mocks)
//   - Persist each generated Ad linked to the Project
//   - Handle partial failures gracefully (some ads may succeed even if others fail)
//
// Homepage demo seed data may still use generateImageUrls() directly.
// Any user-triggered generation goes through generateAdCampaign() which
// calls the real NanoBanana API.
// ─────────────────────────────────────────────────────────

import { prisma } from '@/lib/db'
import { withRetry } from '@/lib/utils/retry'
import {
  buildAdPrompt,
  buildNanoBananaRequest,
  callNanoBananaAPI,
  isTransientError,
} from '@/lib/services/nanobanana.service'
import type { GenerateAdsInput, GenerateAdsResult, Ad } from '@/lib/types'

// ─── Variation contexts ───────────────────────────────────
// Each of the 4 generated ads gets the same base prompt enriched
// with a distinct visual direction so the output images are varied.

const AD_VARIATION_CONTEXTS = [
  'Style direction: Professional product photography, clean neutral background, ' +
    'centered composition, soft studio lighting, emphasis on product detail.',
  'Style direction: Lifestyle photography, product shown in a real-world aspirational ' +
    'setting, natural light, relatable context, emotional connection.',
  'Style direction: Macro close-up shot, crisp focus on product texture and key features, ' +
    'premium quality visible, minimalist composition.',
  'Style direction: Bold and dynamic social media format, vibrant color palette, ' +
    'strong contrast, eye-catching typography space, optimized for Instagram/TikTok feeds.',
] as const

const RETRY_OPTIONS = {
  maxRetries: 2,
  baseDelayMs: 1000,
  isRetryable: isTransientError,
}

// ─── Utility — kept for seed script and tests ─────────────

const RATIO_DIMENSIONS: Record<string, { w: number; h: number }> = {
  '9:16': { w: 360, h: 640 },
  '1:1': { w: 500, h: 500 },
  '16:9': { w: 640, h: 360 },
}

/**
 * Generate placeholder picsum image URLs.
 * Used ONLY by the seed script to populate demo homepage content.
 * User-triggered campaigns always use generateAdCampaign().
 */
export function generateImageUrls(
  style: string,
  ratio: string,
  count: number = 4,
): Array<{ title: string; imageUrl: string }> {
  const dim = RATIO_DIMENSIONS[ratio] ?? RATIO_DIMENSIONS['9:16']
  const ts = Date.now()
  return ['gen1', 'gen2', 'gen3', 'gen4'].slice(0, count).map((seed, i) => ({
    title: `Variation ${i + 1}`,
    imageUrl: `https://picsum.photos/seed/${seed}${style}${ts}/${dim.w}/${dim.h}`,
  }))
}

// ─── Reference images lookup ──────────────────────────────

/**
 * Load the scraped product images associated with a Product record.
 * These are used as reference images in the NanoBanana request (imageUrls field).
 */
async function getProductReferenceImages(productId: string | null | undefined): Promise<string[]> {
  if (!productId) return []
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { images: true },
    })
    return product?.images ?? []
  } catch {
    return []
  }
}

// ─── Real NanoBanana generation ───────────────────────────

/**
 * Call NanoBanana 4 times in parallel, each with a distinct visual direction.
 * Uses Promise.allSettled so a failure on one variation does not abort the others.
 *
 * @returns Ads for every variation that succeeded (may be fewer than 4 on failures)
 */
async function generateRealVariations(
  input: GenerateAdsInput,
  projectId: string,
  referenceImages: string[],
): Promise<Ad[]> {
  const basePrompt = buildAdPrompt(input.script ?? input.name ?? 'advertising image')

  const variationPromises = AD_VARIATION_CONTEXTS.map((context, index) =>
    withRetry(
      () =>
        callNanoBananaAPI(
          buildNanoBananaRequest(`${basePrompt} ${context}`, {
            imageUrls: referenceImages,
            aspectRatio: input.ratio,
            resolution: '1K',
          }),
        ),
      {
        ...RETRY_OPTIONS,
        onRetry: (attempt, total, error) => {
          const msg = error instanceof Error ? error.message : String(error)
          console.warn(`[generate] Variation ${index + 1}: retry ${attempt}/${total - 1} — ${msg}`)
        },
      },
    ).then((response) => ({
      index,
      title: `Variation ${index + 1}`,
      imageUrl: response.response.resultImageUrl,
    })),
  )

  const results = await Promise.allSettled(variationPromises)
  const ads: Ad[] = []

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(
        `[generate] Variation ${ads.length + 1} failed:`,
        result.reason instanceof Error ? result.reason.message : result.reason,
      )
      continue
    }

    const { title, imageUrl, index } = result.value

    try {
      const ad = await prisma.ad.create({
        data: {
          title,
          imageUrl,
          category: input.category ?? 'All',
          projectId,
        },
      })
      ads.push(ad as unknown as Ad)
    } catch (dbError) {
      console.error(`[generate] DB persist failed for variation ${index + 1}:`, dbError)
      // Still surface the image to the user even if DB write fails
      ads.push({
        id: `temp_${Date.now()}_${index}`,
        title,
        imageUrl,
        category: input.category ?? 'All',
        projectId,
      })
    }
  }

  return ads
}

// ─── Main entry point ─────────────────────────────────────

/**
 * Generate an ad campaign with 4 real NanoBanana images.
 *
 * Flow:
 *  1. Create Project in DB
 *  2. Resolve reference images (from input or product record)
 *  3. Generate 4 variations via NanoBanana in parallel
 *  4. Persist each Ad and return results
 *
 * Reference images (scraped product photos) are passed to NanoBanana as
 * imageUrls to guide the visual style of the generated ads.
 */
export async function generateAdCampaign(input: GenerateAdsInput): Promise<GenerateAdsResult> {
  // Step 1 — create Project
  let projectId: string
  try {
    const project = await prisma.project.create({
      data: {
        name: input.name ?? `Campaign ${new Date().toLocaleDateString()}`,
        script: input.script ?? null,
        ratio: input.ratio ?? '9:16',
        style: input.style ?? 'modern',
        productId: input.productId ?? null,
      },
    })
    projectId = project.id
  } catch {
    projectId = `mp${Date.now()}`
  }

  // Step 2 — resolve reference images
  // Prefer explicitly provided images, then fall back to product's scraped images
  const referenceImages =
    input.referenceAssets && input.referenceAssets.length > 0
      ? input.referenceAssets
      : await getProductReferenceImages(input.productId)

  // Step 3+4 — generate real ads via NanoBanana and persist
  const ads = await generateRealVariations(input, projectId, referenceImages)

  if (ads.length === 0) {
    console.error('[generate] All NanoBanana variations failed for project:', projectId)
  }

  return { projectId, ads }
}
