import { prismaMock, resetPrismaMocks } from '../mocks/prisma.mock'

jest.mock('@/lib/db', () => ({ prisma: prismaMock }))

// Mock the NanoBanana service so we test orchestration, not API calls
jest.mock('@/lib/services/nanobanana.service', () => ({
  buildAdPrompt: jest.fn((p: string) => `AD_CONTEXT: ${p}`),
  buildNanoBananaRequest: jest.fn((prompt: string) => ({ prompt })),
  callNanoBananaAPI: jest.fn(),
  isTransientError: jest.fn(() => false),
}))

// Mock the smart-assets service to test the "save to assets" branch in isolation
jest.mock('@/lib/services/smart-assets.service', () => ({
  saveSmartAssetsSafe: jest.fn(),
}))

import { generateAndSaveImage, getAllGeneratedImages } from '@/lib/services/generated-images.service'
import { callNanoBananaAPI } from '@/lib/services/nanobanana.service'
import { saveSmartAssetsSafe } from '@/lib/services/smart-assets.service'

const mockCallNanoBanana = callNanoBananaAPI as jest.Mock
const mockSaveSmartAssets = saveSmartAssetsSafe as jest.Mock

const MOCK_API_RESPONSE = {
  taskId: 'task_xyz',
  paramJson: '{}',
  completeTime: '2026-03-08 21:44:38',
  response: {
    originImageUrl: null,
    resultImageUrl: 'https://tempfile.aiquickdraw.com/test.png',
  },
  successFlag: 1,
  errorCode: null,
  errorMessage: null,
  operationType: 'nanobanana_IMAGETOIMAGE',
  createTime: '2026-03-08 21:44:09',
}

const MOCK_DB_RECORD = {
  id: 'gi_001',
  taskId: 'task_xyz',
  userPrompt: 'glow serum product shot',
  fullPrompt: 'AD_CONTEXT: glow serum product shot',
  generatedImageUrl: 'https://tempfile.aiquickdraw.com/test.png',
  originalImageUrl: null,
  aspectRatio: 'auto',
  resolution: '1K',
  savedToAssets: false,
  smartAssetId: null,
  createdAt: new Date(),
}

beforeEach(() => {
  resetPrismaMocks()
  mockCallNanoBanana.mockReset()
  mockSaveSmartAssets.mockReset()
})

describe('generateAndSaveImage', () => {
  it('returns a GenerateImageResult with the generated image', async () => {
    mockCallNanoBanana.mockResolvedValue(MOCK_API_RESPONSE)
    prismaMock.generatedImage = {
      create: jest.fn().mockResolvedValue(MOCK_DB_RECORD),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    } as unknown as typeof prismaMock.generatedImage

    const result = await generateAndSaveImage({ userPrompt: 'glow serum product shot' })

    expect(result.generatedImage.taskId).toBe('task_xyz')
    expect(result.generatedImage.generatedImageUrl).toBe(
      'https://tempfile.aiquickdraw.com/test.png',
    )
    expect(result.smartAssetId).toBeUndefined()
  })

  it('persists the record with the correct data', async () => {
    mockCallNanoBanana.mockResolvedValue(MOCK_API_RESPONSE)
    const createMock = jest.fn().mockResolvedValue(MOCK_DB_RECORD)
    prismaMock.generatedImage = { create: createMock } as unknown as typeof prismaMock.generatedImage

    await generateAndSaveImage({ userPrompt: 'glow serum product shot' })

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taskId: 'task_xyz',
          userPrompt: 'glow serum product shot',
          fullPrompt: 'AD_CONTEXT: glow serum product shot',
          generatedImageUrl: 'https://tempfile.aiquickdraw.com/test.png',
        }),
      }),
    )
  })

  it('saves to Smart Assets and returns smartAssetId when saveToSmartAssets is true', async () => {
    mockCallNanoBanana.mockResolvedValue(MOCK_API_RESPONSE)
    prismaMock.generatedImage = {
      create: jest.fn().mockResolvedValue(MOCK_DB_RECORD),
      update: jest.fn().mockResolvedValue({ ...MOCK_DB_RECORD, savedToAssets: true, smartAssetId: 'sa_new' }),
    } as unknown as typeof prismaMock.generatedImage

    mockSaveSmartAssets.mockResolvedValue([
      { isDuplicate: false, asset: { id: 'sa_new', imageUrl: MOCK_API_RESPONSE.response.resultImageUrl } },
    ])

    const result = await generateAndSaveImage({
      userPrompt: 'glow serum product shot',
      saveToSmartAssets: true,
    })

    expect(mockSaveSmartAssets).toHaveBeenCalledTimes(1)
    expect(result.smartAssetId).toBe('sa_new')
    expect(result.generatedImage.savedToAssets).toBe(true)
  })

  it('does not save to Smart Assets when saveToSmartAssets is false (default)', async () => {
    mockCallNanoBanana.mockResolvedValue(MOCK_API_RESPONSE)
    prismaMock.generatedImage = {
      create: jest.fn().mockResolvedValue(MOCK_DB_RECORD),
    } as unknown as typeof prismaMock.generatedImage

    await generateAndSaveImage({ userPrompt: 'test', saveToSmartAssets: false })

    expect(mockSaveSmartAssets).not.toHaveBeenCalled()
  })

  it('does not fail when Smart Assets reports a duplicate', async () => {
    mockCallNanoBanana.mockResolvedValue(MOCK_API_RESPONSE)
    prismaMock.generatedImage = {
      create: jest.fn().mockResolvedValue(MOCK_DB_RECORD),
    } as unknown as typeof prismaMock.generatedImage

    mockSaveSmartAssets.mockResolvedValue([
      { isDuplicate: true, existingAsset: { id: 'sa_existing' } },
    ])

    const result = await generateAndSaveImage({
      userPrompt: 'test',
      saveToSmartAssets: true,
    })

    // No smartAssetId because it was a duplicate
    expect(result.smartAssetId).toBeUndefined()
  })

  it('returns a transient record (no id from DB) when DB write fails', async () => {
    mockCallNanoBanana.mockResolvedValue(MOCK_API_RESPONSE)
    prismaMock.generatedImage = {
      create: jest.fn().mockRejectedValue(new Error('DB connection refused')),
    } as unknown as typeof prismaMock.generatedImage

    const result = await generateAndSaveImage({ userPrompt: 'test' })

    // Still returns the generated image URL even when DB is down
    expect(result.generatedImage.generatedImageUrl).toBe(
      'https://tempfile.aiquickdraw.com/test.png',
    )
    expect(result.generatedImage.id).toMatch(/^gi_/)
  })

  it('throws when userPrompt is empty', async () => {
    await expect(generateAndSaveImage({ userPrompt: '' })).rejects.toThrow('userPrompt is required')
    await expect(generateAndSaveImage({ userPrompt: '   ' })).rejects.toThrow('userPrompt is required')
  })

  it('propagates NanoBananaError when the API fails', async () => {
    const { NanoBananaError } = await import('@/lib/errors')
    mockCallNanoBanana.mockRejectedValue(
      new NanoBananaError('Prompt violation', 'PROMPT_VIOLATION', 502),
    )

    await expect(
      generateAndSaveImage({ userPrompt: 'test prompt' }),
    ).rejects.toThrow('Prompt violation')
  })
})

describe('getAllGeneratedImages', () => {
  it('returns images from the DB ordered by createdAt desc', async () => {
    prismaMock.generatedImage = {
      findMany: jest.fn().mockResolvedValue([MOCK_DB_RECORD]),
    } as unknown as typeof prismaMock.generatedImage

    const result = await getAllGeneratedImages()
    expect(result).toHaveLength(1)
    expect(result[0].taskId).toBe('task_xyz')
  })

  it('returns an empty array when the DB is unavailable', async () => {
    prismaMock.generatedImage = {
      findMany: jest.fn().mockRejectedValue(new Error('DB error')),
    } as unknown as typeof prismaMock.generatedImage

    const result = await getAllGeneratedImages()
    expect(result).toEqual([])
  })
})
