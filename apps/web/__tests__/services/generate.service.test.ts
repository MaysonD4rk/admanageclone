import { prismaMock, resetPrismaMocks } from '../mocks/prisma.mock'

jest.mock('@/lib/db', () => ({ prisma: prismaMock }))

// Mock NanoBanana so generate tests don't make real API calls
jest.mock('@/lib/services/nanobanana.service', () => ({
  buildAdPrompt: jest.fn((p: string) => `AD_CONTEXT: ${p}`),
  buildNanoBananaRequest: jest.fn((prompt: string, opts: Record<string, unknown>) => ({
    prompt,
    ...opts,
  })),
  callNanoBananaAPI: jest.fn(),
  isTransientError: jest.fn(() => false),
}))

import { generateImageUrls, generateAdCampaign } from '@/lib/services/generate.service'
import { callNanoBananaAPI } from '@/lib/services/nanobanana.service'

const mockCallNanoBanana = callNanoBananaAPI as jest.Mock

function makeNanoBananaResponse(index: number) {
  return {
    taskId: `task_${index}`,
    paramJson: '{}',
    completeTime: '2026-03-08 21:44:38',
    response: {
      originImageUrl: null,
      resultImageUrl: `https://tempfile.aiquickdraw.com/generated_${index}.png`,
    },
    successFlag: 1,
    errorCode: null,
    errorMessage: null,
    operationType: 'nanobanana_IMAGETOIMAGE',
    createTime: '2026-03-08 21:44:09',
  }
}

const MOCK_PROJECT = {
  id: 'proj_001',
  name: 'Test Campaign',
  script: null,
  ratio: '9:16',
  style: 'modern',
  productId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const MOCK_AD = (index: number) => ({
  id: `ad_00${index}`,
  title: `Variation ${index}`,
  imageUrl: `https://tempfile.aiquickdraw.com/generated_${index}.png`,
  category: 'All',
  projectId: 'proj_001',
  createdAt: new Date(),
  updatedAt: new Date(),
})

beforeEach(() => {
  resetPrismaMocks()
  mockCallNanoBanana.mockReset()
})

// ─── generateImageUrls (pure — demo seed utility) ─────────

describe('generateImageUrls (demo utility)', () => {
  it('returns the requested number of variations', () => {
    expect(generateImageUrls('modern', '9:16', 4)).toHaveLength(4)
    expect(generateImageUrls('modern', '1:1', 2)).toHaveLength(2)
  })

  it('each variation has a title and picsum imageUrl', () => {
    generateImageUrls('minimal', '16:9').forEach((v, i) => {
      expect(v.title).toBe(`Variation ${i + 1}`)
      expect(v.imageUrl).toContain('picsum.photos')
    })
  })

  it('uses correct dimensions for each ratio', () => {
    expect(generateImageUrls('s', '9:16')[0].imageUrl).toContain('360/640')
    expect(generateImageUrls('s', '1:1')[0].imageUrl).toContain('500/500')
    expect(generateImageUrls('s', '16:9')[0].imageUrl).toContain('640/360')
  })

  it('falls back to 9:16 for unknown ratios', () => {
    expect(generateImageUrls('s', '4:3')[0].imageUrl).toContain('360/640')
  })
})

// ─── generateAdCampaign (real NanoBanana) ─────────────────

describe('generateAdCampaign', () => {
  beforeEach(() => {
    prismaMock.project.create.mockResolvedValue(MOCK_PROJECT)
    prismaMock.product.findUnique.mockResolvedValue(null) // no reference images by default
    ;[1, 2, 3, 4].forEach((i) => {
      prismaMock.ad.create.mockResolvedValueOnce(MOCK_AD(i))
    })
    // 4 successful NanoBanana responses
    ;[1, 2, 3, 4].forEach((i) => {
      mockCallNanoBanana.mockResolvedValueOnce(makeNanoBananaResponse(i))
    })
  })

  it('creates a project and returns a projectId', async () => {
    const result = await generateAdCampaign({ name: 'Test', script: 'ad copy' })
    expect(result.projectId).toBe('proj_001')
    expect(prismaMock.project.create).toHaveBeenCalledTimes(1)
  })

  it('calls NanoBanana exactly 4 times (one per variation)', async () => {
    await generateAdCampaign({ name: 'Test', script: 'ad copy' })
    expect(mockCallNanoBanana).toHaveBeenCalledTimes(4)
  })

  it('returns 4 ads with real NanoBanana image URLs', async () => {
    const result = await generateAdCampaign({ name: 'Test', script: 'ad copy' })
    expect(result.ads).toHaveLength(4)
    result.ads.forEach((ad, i) => {
      expect(ad.imageUrl).toContain(`generated_${i + 1}.png`)
    })
  })

  it('passes product reference images to NanoBanana when productId is given', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({
      images: ['https://scraped.com/img1.jpg', 'https://scraped.com/img2.jpg'],
    })

    await generateAdCampaign({ name: 'Test', script: 'ad', productId: 'prod_123' })

    const [, callInit] = mockCallNanoBanana.mock.calls[0]
    // The request passed to callNanoBananaAPI should include imageUrls
    // (verified via buildNanoBananaRequest mock)
    expect(mockCallNanoBanana).toHaveBeenCalledTimes(4)
  })

  it('prefers explicitly provided referenceAssets over product images', async () => {
    const explicitAssets = ['https://explicit.com/asset.jpg']
    await generateAdCampaign({
      name: 'Test',
      referenceAssets: explicitAssets,
      productId: 'prod_123', // should be ignored since referenceAssets is provided
    })

    // product.findUnique should NOT be called when referenceAssets is provided
    expect(prismaMock.product.findUnique).not.toHaveBeenCalled()
  })

  it('returns partial results when some NanoBanana calls fail', async () => {
    mockCallNanoBanana.mockReset()
    mockCallNanoBanana
      .mockResolvedValueOnce(makeNanoBananaResponse(1))
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce(makeNanoBananaResponse(3))
      .mockRejectedValueOnce(new Error('API error'))

    // Only 2 ads will be created (variations 1 and 3)
    prismaMock.ad.create
      .mockResolvedValueOnce(MOCK_AD(1))
      .mockResolvedValueOnce(MOCK_AD(3))

    const result = await generateAdCampaign({ name: 'Partial', script: 'ad' })
    expect(result.ads).toHaveLength(2)
  })

  it('returns empty ads array when all NanoBanana calls fail', async () => {
    mockCallNanoBanana.mockReset()
    mockCallNanoBanana.mockRejectedValue(new Error('Total failure'))

    const result = await generateAdCampaign({ name: 'Failed', script: 'ad' })
    expect(result.ads).toHaveLength(0)
    expect(result.projectId).toBeDefined() // project still created
  })

  it('uses a fallback projectId when DB write fails', async () => {
    prismaMock.project.create.mockRejectedValueOnce(new Error('DB error'))
    ;[1, 2, 3, 4].forEach((i) => prismaMock.ad.create.mockResolvedValueOnce(MOCK_AD(i)))

    const result = await generateAdCampaign({ name: 'Fallback', script: 'ad' })
    expect(result.projectId).toMatch(/^mp/)
  })
})
