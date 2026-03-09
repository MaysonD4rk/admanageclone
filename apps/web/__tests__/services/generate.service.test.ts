/**
 * Tests for pure utility functions in generate.service.
 * No DB mocking needed for the URL generation logic.
 */
import { generateImageUrls } from '@/lib/services/generate.service'

describe('generateService — pure utilities', () => {
  describe('generateImageUrls', () => {
    it('returns 4 variations by default', () => {
      const result = generateImageUrls('modern', '9:16')
      expect(result).toHaveLength(4)
    })

    it('returns the requested count of variations', () => {
      expect(generateImageUrls('modern', '9:16', 2)).toHaveLength(2)
      expect(generateImageUrls('modern', '9:16', 1)).toHaveLength(1)
    })

    it('each variation has a title and imageUrl', () => {
      const result = generateImageUrls('modern', '9:16')
      result.forEach((v, i) => {
        expect(v.title).toBe(`Variation ${i + 1}`)
        expect(v.imageUrl).toContain('picsum.photos')
      })
    })

    it('uses correct dimensions for 9:16 ratio', () => {
      const [first] = generateImageUrls('modern', '9:16')
      expect(first.imageUrl).toContain('360/640')
    })

    it('uses correct dimensions for 1:1 ratio', () => {
      const [first] = generateImageUrls('modern', '1:1')
      expect(first.imageUrl).toContain('500/500')
    })

    it('uses correct dimensions for 16:9 ratio', () => {
      const [first] = generateImageUrls('modern', '16:9')
      expect(first.imageUrl).toContain('640/360')
    })

    it('falls back to 9:16 dimensions for unknown ratio', () => {
      const [first] = generateImageUrls('modern', '4:3')
      expect(first.imageUrl).toContain('360/640')
    })

    it('includes the style in the image URL', () => {
      const [first] = generateImageUrls('vibrant', '9:16')
      expect(first.imageUrl).toContain('vibrant')
    })

    it('produces unique URLs between calls (timestamp-based seeds)', () => {
      const first = generateImageUrls('modern', '9:16')[0].imageUrl
      // Ensure there is at least 1ms between calls
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const second = generateImageUrls('modern', '9:16')[0].imageUrl
          expect(first).not.toBe(second)
          resolve()
        }, 5)
      })
    })
  })
})
