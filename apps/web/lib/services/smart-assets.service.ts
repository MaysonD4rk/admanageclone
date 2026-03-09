import { prisma } from '@/lib/db'
import { DuplicateAssetError } from '@/lib/errors'
import type { SmartAsset, CreateSmartAssetInput, SmartAssetSaveResult } from '@/lib/types'

/**
 * Retrieve all Smart Assets ordered by most recent first.
 */
export async function getAllSmartAssets(): Promise<SmartAsset[]> {
  return prisma.smartAsset.findMany({ orderBy: { createdAt: 'desc' } })
}

/**
 * Find a Smart Asset by its image URL.
 * Used for duplicate detection.
 */
export async function findSmartAssetByUrl(imageUrl: string): Promise<SmartAsset | null> {
  return prisma.smartAsset.findFirst({ where: { imageUrl } })
}

/**
 * Save a new Smart Asset.
 *
 * Duplicate prevention strategy: URL comparison.
 * If an asset with the same imageUrl already exists, throws DuplicateAssetError.
 * The caller (API route) catches this and returns HTTP 409.
 *
 * @throws {DuplicateAssetError} when the imageUrl already exists
 */
export async function saveSmartAsset(input: CreateSmartAssetInput): Promise<SmartAsset> {
  if (!input.imageUrl) {
    throw new Error('imageUrl is required')
  }

  const existing = await findSmartAssetByUrl(input.imageUrl)
  if (existing) {
    throw new DuplicateAssetError(existing.id)
  }

  return prisma.smartAsset.create({
    data: {
      title: input.title ?? 'Smart Asset',
      imageUrl: input.imageUrl,
    },
  })
}

/**
 * Save multiple Smart Assets, skipping duplicates gracefully.
 * Returns a result per input with isDuplicate flag — no exceptions thrown.
 */
export async function saveSmartAssetsSafe(
  inputs: CreateSmartAssetInput[],
): Promise<SmartAssetSaveResult[]> {
  return Promise.all(
    inputs.map(async (input): Promise<SmartAssetSaveResult> => {
      const existing = await findSmartAssetByUrl(input.imageUrl)
      if (existing) {
        return { isDuplicate: true, existingAsset: existing }
      }
      const asset = await prisma.smartAsset.create({
        data: { title: input.title ?? 'Smart Asset', imageUrl: input.imageUrl },
      })
      return { isDuplicate: false, asset }
    }),
  )
}

/**
 * Delete a Smart Asset by ID.
 */
export async function deleteSmartAsset(id: string): Promise<void> {
  await prisma.smartAsset.delete({ where: { id } })
}
