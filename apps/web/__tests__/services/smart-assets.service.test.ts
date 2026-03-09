import { prismaMock, resetPrismaMocks } from '../mocks/prisma.mock'

jest.mock('@/lib/db', () => ({ prisma: prismaMock }))

import {
  getAllSmartAssets,
  findSmartAssetByUrl,
  saveSmartAsset,
  saveSmartAssetsSafe,
  deleteSmartAsset,
} from '@/lib/services/smart-assets.service'
import { DuplicateAssetError } from '@/lib/errors'

const MOCK_ASSET = {
  id: 'sa_001',
  title: 'Test Asset',
  imageUrl: 'https://picsum.photos/seed/test/400/400',
  createdAt: new Date('2025-01-01'),
}

beforeEach(() => resetPrismaMocks())

describe('SmartAssetsService', () => {
  // ── getAllSmartAssets ──────────────────────────────────────

  describe('getAllSmartAssets', () => {
    it('returns assets from the database ordered by createdAt desc', async () => {
      prismaMock.smartAsset.findMany.mockResolvedValue([MOCK_ASSET])

      const result = await getAllSmartAssets()

      expect(result).toEqual([MOCK_ASSET])
      expect(prismaMock.smartAsset.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      })
    })

    it('returns an empty array when no assets exist', async () => {
      prismaMock.smartAsset.findMany.mockResolvedValue([])
      const result = await getAllSmartAssets()
      expect(result).toEqual([])
    })
  })

  // ── findSmartAssetByUrl ───────────────────────────────────

  describe('findSmartAssetByUrl', () => {
    it('returns an asset when the URL exists', async () => {
      prismaMock.smartAsset.findFirst.mockResolvedValue(MOCK_ASSET)

      const result = await findSmartAssetByUrl(MOCK_ASSET.imageUrl)

      expect(result).toEqual(MOCK_ASSET)
      expect(prismaMock.smartAsset.findFirst).toHaveBeenCalledWith({
        where: { imageUrl: MOCK_ASSET.imageUrl },
      })
    })

    it('returns null when the URL does not exist', async () => {
      prismaMock.smartAsset.findFirst.mockResolvedValue(null)
      const result = await findSmartAssetByUrl('https://non-existent.com/img.jpg')
      expect(result).toBeNull()
    })
  })

  // ── saveSmartAsset ────────────────────────────────────────

  describe('saveSmartAsset', () => {
    it('creates and returns a new asset when the URL is unique', async () => {
      prismaMock.smartAsset.findFirst.mockResolvedValue(null) // no duplicate
      prismaMock.smartAsset.create.mockResolvedValue(MOCK_ASSET)

      const result = await saveSmartAsset({ imageUrl: MOCK_ASSET.imageUrl, title: 'Test Asset' })

      expect(result).toEqual(MOCK_ASSET)
      expect(prismaMock.smartAsset.create).toHaveBeenCalledWith({
        data: { title: 'Test Asset', imageUrl: MOCK_ASSET.imageUrl },
      })
    })

    it('uses "Smart Asset" as default title when none provided', async () => {
      prismaMock.smartAsset.findFirst.mockResolvedValue(null)
      prismaMock.smartAsset.create.mockResolvedValue({ ...MOCK_ASSET, title: 'Smart Asset' })

      await saveSmartAsset({ imageUrl: MOCK_ASSET.imageUrl })

      expect(prismaMock.smartAsset.create).toHaveBeenCalledWith({
        data: { title: 'Smart Asset', imageUrl: MOCK_ASSET.imageUrl },
      })
    })

    it('throws DuplicateAssetError when the URL already exists', async () => {
      prismaMock.smartAsset.findFirst.mockResolvedValue(MOCK_ASSET)

      await expect(saveSmartAsset({ imageUrl: MOCK_ASSET.imageUrl })).rejects.toThrow(
        DuplicateAssetError,
      )
    })

    it('throws DuplicateAssetError with the existing asset id', async () => {
      prismaMock.smartAsset.findFirst.mockResolvedValue(MOCK_ASSET)

      try {
        await saveSmartAsset({ imageUrl: MOCK_ASSET.imageUrl })
        fail('Expected DuplicateAssetError to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(DuplicateAssetError)
        expect((error as DuplicateAssetError).existingId).toBe(MOCK_ASSET.id)
      }
    })

    it('throws when imageUrl is empty', async () => {
      await expect(saveSmartAsset({ imageUrl: '' })).rejects.toThrow('imageUrl is required')
    })
  })

  // ── saveSmartAssetsSafe ───────────────────────────────────

  describe('saveSmartAssetsSafe', () => {
    it('saves new assets and returns isDuplicate: false for each', async () => {
      prismaMock.smartAsset.findFirst.mockResolvedValue(null)
      prismaMock.smartAsset.create.mockResolvedValue(MOCK_ASSET)

      const results = await saveSmartAssetsSafe([{ imageUrl: MOCK_ASSET.imageUrl }])

      expect(results).toHaveLength(1)
      expect(results[0].isDuplicate).toBe(false)
      if (!results[0].isDuplicate) {
        expect(results[0].asset).toEqual(MOCK_ASSET)
      }
    })

    it('returns isDuplicate: true for already-saved URLs without throwing', async () => {
      prismaMock.smartAsset.findFirst.mockResolvedValue(MOCK_ASSET)

      const results = await saveSmartAssetsSafe([{ imageUrl: MOCK_ASSET.imageUrl }])

      expect(results).toHaveLength(1)
      expect(results[0].isDuplicate).toBe(true)
      if (results[0].isDuplicate) {
        expect(results[0].existingAsset).toEqual(MOCK_ASSET)
      }
      expect(prismaMock.smartAsset.create).not.toHaveBeenCalled()
    })

    it('handles mixed new and duplicate assets in a single batch', async () => {
      const newUrl = 'https://picsum.photos/seed/new/400/400'
      const dupUrl = MOCK_ASSET.imageUrl
      const newAsset = { ...MOCK_ASSET, id: 'sa_002', imageUrl: newUrl }

      prismaMock.smartAsset.findFirst
        .mockResolvedValueOnce(null)       // newUrl → not found
        .mockResolvedValueOnce(MOCK_ASSET) // dupUrl → found (duplicate)

      prismaMock.smartAsset.create.mockResolvedValue(newAsset)

      const results = await saveSmartAssetsSafe([{ imageUrl: newUrl }, { imageUrl: dupUrl }])

      expect(results).toHaveLength(2)
      expect(results[0].isDuplicate).toBe(false)
      expect(results[1].isDuplicate).toBe(true)
    })

    it('returns empty array for empty input', async () => {
      const results = await saveSmartAssetsSafe([])
      expect(results).toEqual([])
    })
  })

  // ── deleteSmartAsset ─────────────────────────────────────

  describe('deleteSmartAsset', () => {
    it('calls prisma.smartAsset.delete with the provided id', async () => {
      prismaMock.smartAsset.delete.mockResolvedValue(MOCK_ASSET)

      await deleteSmartAsset(MOCK_ASSET.id)

      expect(prismaMock.smartAsset.delete).toHaveBeenCalledWith({
        where: { id: MOCK_ASSET.id },
      })
    })
  })
})
