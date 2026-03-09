import { prisma } from '@/lib/db'
import type { BrandData, CreateProductInput } from '@/lib/types'

// ─── Pure utility functions (fully testable without DB) ───

/**
 * Extract the root domain from a URL string.
 * Returns the original string if parsing fails.
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const BRAND_PALETTES: Record<string, string[]> = {
  amazon: ['#FF9900', '#232F3E', '#FFFFFF'],
  shopify: ['#96BF48', '#5C6AC4', '#FFFFFF'],
}

const DEFAULT_PALETTE = ['#6d28d9', '#a78bfa', '#f3f4f6']

/**
 * Generate deterministic mock brand data from a product URL.
 * Pure function — no side effects, safe to test in isolation.
 */
export function buildBrandData(url: string): Omit<BrandData, 'productId'> {
  const domain = extractDomain(url)
  const seed = domain.replace(/\./g, '')
  const brandKey = Object.keys(BRAND_PALETTES).find((k) => domain.includes(k))
  const colors = brandKey ? BRAND_PALETTES[brandKey] : DEFAULT_PALETTE
  const brandName = capitalize(domain.split('.')[0])

  return {
    name: brandName,
    logoUrl: `https://picsum.photos/seed/${seed}logo/100/100`,
    colors,
    images: [
      `https://picsum.photos/seed/${seed}1/300/300`,
      `https://picsum.photos/seed/${seed}2/300/300`,
      `https://picsum.photos/seed/${seed}3/300/300`,
    ],
  }
}

/**
 * Persist a product derived from brand analysis.
 * Falls back to a mock ID if the DB is unavailable.
 */
export async function createProductFromBrand(
  url: string,
  brandData: Omit<BrandData, 'productId'>,
): Promise<BrandData> {
  try {
    const product = await prisma.product.create({
      data: {
        name: brandData.name,
        brandUrl: url,
        logoUrl: brandData.logoUrl,
        colors: brandData.colors,
        images: brandData.images,
      },
    })
    return { ...brandData, productId: product.id }
  } catch {
    return { ...brandData, productId: `mpr${Date.now()}` }
  }
}

/**
 * Full brand-fetch flow: build data + persist.
 */
export async function analyzeBrandUrl(url: string): Promise<BrandData> {
  const brandData = buildBrandData(url)
  return createProductFromBrand(url, brandData)
}

/**
 * Create a product directly from form inputs.
 */
export async function createProduct(input: CreateProductInput) {
  try {
    return await prisma.product.create({
      data: {
        name: input.name,
        category: input.category ?? 'All',
        description: input.description ?? null,
        usps: input.usps ?? [],
        brandUrl: input.brandUrl ?? null,
        logoUrl: input.logoUrl ?? null,
        colors: input.colors ?? [],
        images: input.images ?? [],
      },
    })
  } catch {
    return {
      id: `mpr${Date.now()}`,
      ...input,
      category: input.category ?? 'All',
      usps: input.usps ?? [],
      colors: input.colors ?? [],
      images: input.images ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
}

export async function getAllProducts() {
  try {
    return await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { projects: true } } },
    })
  } catch {
    return []
  }
}
