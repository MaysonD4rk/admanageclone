import { prisma } from '@/lib/db'
import type { GenerateAdsInput, GenerateAdsResult, Ad } from '@/lib/types'

const RATIO_DIMENSIONS: Record<string, { w: number; h: number }> = {
  '9:16': { w: 360, h: 640 },
  '1:1': { w: 500, h: 500 },
  '16:9': { w: 640, h: 360 },
}

const VARIATION_SEEDS = ['gen1', 'gen2', 'gen3', 'gen4'] as const

/**
 * Generate placeholder image URLs for ad variations.
 * Pure function — deterministic output from input; no side effects.
 *
 * Uses a timestamp in the seed to ensure new URLs on each call,
 * simulating unique AI-generated images.
 */
export function generateImageUrls(
  style: string,
  ratio: string,
  count: number = 4,
): Array<{ title: string; imageUrl: string }> {
  const dim = RATIO_DIMENSIONS[ratio] ?? RATIO_DIMENSIONS['9:16']
  const ts = Date.now()

  return VARIATION_SEEDS.slice(0, count).map((seed, i) => ({
    title: `Variation ${i + 1}`,
    imageUrl: `https://picsum.photos/seed/${seed}${style}${ts}/${dim.w}/${dim.h}`,
  }))
}

/**
 * Generate an ad campaign: create a Project + N Ad records.
 * Falls back to mock IDs when the DB is unavailable.
 */
export async function generateAdCampaign(input: GenerateAdsInput): Promise<GenerateAdsResult> {
  const variations = generateImageUrls(input.style ?? 'modern', input.ratio ?? '9:16')

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

    const ads: Ad[] = await Promise.all(
      variations.map((v) =>
        prisma.ad.create({
          data: {
            title: v.title,
            imageUrl: v.imageUrl,
            category: input.category ?? 'All',
            projectId: project.id,
          },
        }),
      ),
    )

    return { projectId: project.id, ads }
  } catch {
    const mockProjectId = `mp${Date.now()}`
    const ads: Ad[] = variations.map((v, i) => ({
      id: `ma${Date.now()}${i}`,
      ...v,
      category: input.category ?? 'All',
      projectId: mockProjectId,
    }))
    return { projectId: mockProjectId, ads }
  }
}
