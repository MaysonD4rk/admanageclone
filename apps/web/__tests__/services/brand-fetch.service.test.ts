/**
 * Tests for pure utility functions in brand-fetch.service.
 * No DB mocking needed — these are side-effect-free functions.
 */
import {
  extractDomain,
  capitalize,
  buildBrandData,
} from '@/lib/services/brand-fetch.service'

describe('brandFetchService — pure utilities', () => {
  // ── extractDomain ─────────────────────────────────────────

  describe('extractDomain', () => {
    it('extracts the domain from a full URL', () => {
      expect(extractDomain('https://www.amazon.com/product/123')).toBe('amazon.com')
    })

    it('strips www. prefix', () => {
      expect(extractDomain('https://www.shopify.com')).toBe('shopify.com')
    })

    it('handles URLs without www', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com')
    })

    it('handles URLs with subdomains other than www', () => {
      expect(extractDomain('https://store.myshop.com')).toBe('store.myshop.com')
    })

    it('returns the original string when the URL is invalid', () => {
      expect(extractDomain('not-a-url')).toBe('not-a-url')
    })

    it('returns the original string for empty input', () => {
      expect(extractDomain('')).toBe('')
    })
  })

  // ── capitalize ────────────────────────────────────────────

  describe('capitalize', () => {
    it('capitalizes the first letter', () => {
      expect(capitalize('amazon')).toBe('Amazon')
    })

    it('does not change the rest of the string', () => {
      expect(capitalize('myBrand')).toBe('MyBrand')
    })

    it('handles an empty string', () => {
      expect(capitalize('')).toBe('')
    })

    it('handles a single character', () => {
      expect(capitalize('a')).toBe('A')
    })
  })

  // ── buildBrandData ────────────────────────────────────────

  describe('buildBrandData', () => {
    it('returns a BrandData object with name, logoUrl, colors, and images', () => {
      const data = buildBrandData('https://www.amazon.com/product')

      expect(data).toMatchObject({
        name: 'Amazon',
        colors: expect.any(Array),
        images: expect.any(Array),
        logoUrl: expect.stringContaining('picsum.photos'),
      })
    })

    it('uses Amazon brand palette for amazon.com URLs', () => {
      const { colors } = buildBrandData('https://www.amazon.com')
      expect(colors).toContain('#FF9900')
    })

    it('uses Shopify brand palette for shopify.com URLs', () => {
      const { colors } = buildBrandData('https://www.shopify.com')
      expect(colors).toContain('#96BF48')
    })

    it('uses default palette for unknown domains', () => {
      const { colors } = buildBrandData('https://www.mybrand.com')
      expect(colors).toContain('#6d28d9')
    })

    it('returns exactly 3 product images', () => {
      const { images } = buildBrandData('https://www.example.com')
      expect(images).toHaveLength(3)
    })

    it('generates deterministic output for the same URL', () => {
      const first = buildBrandData('https://www.example.com')
      const second = buildBrandData('https://www.example.com')
      expect(first).toEqual(second)
    })

    it('generates different data for different URLs', () => {
      const a = buildBrandData('https://www.brandA.com')
      const b = buildBrandData('https://www.brandB.com')
      expect(a.name).not.toBe(b.name)
    })
  })
})
