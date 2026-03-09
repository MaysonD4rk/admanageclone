// ─────────────────────────────────────────────────────────
// Scraper Service
//
// Responsibilities:
//   - Detect which e-commerce platform a URL belongs to
//   - Fetch the product page HTML (with browser-like headers)
//   - Extract product images per platform using platform-specific strategies
//   - Return a structured ScrapingResult, never throwing
//
// Does NOT: persist data, call NanoBanana, know about HTTP routes
// ─────────────────────────────────────────────────────────

import { load } from 'cheerio'
import type { ScrapedProduct, ScrapingPlatform, ScrapingResult } from '@/lib/types'

const SCRAPER_TIMEOUT_MS = 10_000
const MAX_IMAGES = 5

// Simulate a real browser to reduce bot-detection blocks
const BROWSER_HEADERS: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xhtml+xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'max-age=0',
}

// ─── Platform detection ───────────────────────────────────

/**
 * Detect which e-commerce platform a URL belongs to.
 * Pure function — safe to test without network access.
 */
export function detectPlatform(url: string): ScrapingPlatform {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    if (hostname.includes('amazon.')) return 'amazon'
    if (
      hostname.includes('mercadolivre.') ||
      hostname.includes('mercadolibre.') ||
      hostname.includes('mlstatic.com')
    )
      return 'mercadolivre'
    return 'generic'
  } catch {
    return 'generic'
  }
}

// ─── Page fetching ────────────────────────────────────────

/** Fetch HTML with browser-like headers and a timeout. */
export async function fetchProductPage(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SCRAPER_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      redirect: 'follow',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

// ─── Image filters ────────────────────────────────────────

/** Return true for URLs that are clearly not product images */
function isNonProductImage(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    lower.includes('sprite') ||
    lower.includes('icon') ||
    lower.includes('logo') ||
    lower.includes('transparent-pixel') ||
    lower.includes('blank.gif') ||
    lower.includes('placeholder') ||
    lower.endsWith('.svg')
  )
}

function dedupe(urls: string[]): string[] {
  const seen = new Set<string>()
  return urls.filter((u) => {
    if (!u.startsWith('http') || isNonProductImage(u) || seen.has(u)) return false
    seen.add(u)
    return true
  })
}

// ─── Amazon ───────────────────────────────────────────────

/**
 * Extract product images from an Amazon product page.
 *
 * Strategy order (most → least reliable):
 *   1. Embedded JSON `colorImages` with `hiRes` keys (fullest size)
 *   2. #landingImage / #imgTagWrapperId (main product image)
 *   3. Thumbnail strip `data-a-hires` attributes (alternate views)
 */
export function extractAmazonImages(html: string): string[] {
  const $ = load(html)
  const images: string[] = []

  // Strategy 1 — parse embedded colorImages JSON
  $('script').each((_, el) => {
    const content = $(el).html() ?? ''
    if (!content.includes('"hiRes"') && !content.includes('colorImages')) return

    const hiResRegex = /"hiRes"\s*:\s*"([^"]+)"/g
    let m: RegExpExecArray | null
    while ((m = hiResRegex.exec(content)) !== null) {
      if (m[1]) images.push(m[1])
    }

    // If hiRes not found, try "large"
    if (images.length === 0) {
      const largeRegex = /"large"\s*:\s*"([^"]+)"/g
      while ((m = largeRegex.exec(content)) !== null) {
        if (m[1]) images.push(m[1])
      }
    }
  })

  // Strategy 2 — main image element
  if (images.length === 0) {
    const mainImg =
      $('#landingImage').attr('src') ??
      $('#imgTagWrapperId img').first().attr('src') ??
      $('#main-image').attr('src')
    if (mainImg) images.push(mainImg)
  }

  // Strategy 3 — thumbnail strip alternate views
  if (images.length < 2) {
    $('#altImages li img, .a-unordered-list li img').each((_, el) => {
      const hiRes = $(el).attr('data-a-hires')
      const src = hiRes ?? $(el).attr('src')
      if (src) {
        // Convert thumbnail URL to fullsize by removing dimension tokens
        const fullSize = src.replace(/\._[A-Z0-9_,]+_\./g, '.')
        images.push(fullSize)
      }
    })
  }

  return dedupe(images).slice(0, MAX_IMAGES)
}

export function extractAmazonTitle(html: string): string | undefined {
  const $ = load(html)
  return (
    $('#productTitle').text().trim() ||
    $('h1.a-size-large').first().text().trim() ||
    undefined
  )
}

// ─── Mercado Livre ────────────────────────────────────────

/**
 * Extract product images from a Mercado Livre product page.
 *
 * Strategy order:
 *   1. `__NEXT_DATA__` JSON embedded by Next.js SSR (most complete)
 *   2. Gallery figure images (CSS class selectors)
 */
export function extractMercadoLivreImages(html: string): string[] {
  const $ = load(html)
  const images: string[] = []

  // Strategy 1 — __NEXT_DATA__ Next.js SSR payload
  const nextDataEl = $('#__NEXT_DATA__').html()
  if (nextDataEl) {
    try {
      const data = JSON.parse(nextDataEl)

      // Different ML page structures bury pictures in different paths
      const candidates = [
        data?.props?.pageProps?.initialState?.components?.gallery?.pictures,
        data?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data?.components?.gallery?.pictures,
        data?.props?.pageProps?.initialState?.pdp?.components?.gallery?.pictures,
      ]

      for (const pics of candidates) {
        if (!Array.isArray(pics) || pics.length === 0) continue
        for (const pic of pics) {
          const src = pic?.url ?? pic?.secure_url ?? pic?.src
          if (typeof src === 'string') {
            // Replace ML dimension placeholders with concrete values
            images.push(src.replace(/\{width\}/g, '500').replace(/\{height\}/g, '500'))
          }
        }
        if (images.length > 0) break
      }
    } catch {
      // Malformed JSON — fall through to strategy 2
    }
  }

  // Strategy 2 — CSS selectors for gallery images
  if (images.length === 0) {
    const selectors = [
      '.ui-pdp-gallery__figure__image',
      'figure.ui-pdp-gallery__figure img',
      '.ui-pdp-image',
    ]
    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const src =
          $(el).attr('data-zoom') ??
          $(el).attr('data-src') ??
          $(el).attr('src')
        if (src) images.push(src)
      })
      if (images.length > 0) break
    }
  }

  return dedupe(images).slice(0, MAX_IMAGES)
}

export function extractMercadoLivreTitle(html: string): string | undefined {
  const $ = load(html)
  return (
    $('.ui-pdp-title').first().text().trim() ||
    $('h1.ui-pdp-title').first().text().trim() ||
    undefined
  )
}

// ─── Generic ──────────────────────────────────────────────

/**
 * Generic fallback for unknown e-commerce platforms.
 *
 * Strategy order:
 *   1. Open Graph og:image meta tag (explicit representative image)
 *   2. Large `<img>` elements filtered by size and alt text heuristics
 */
export function extractGenericImages(html: string, pageUrl: string): string[] {
  const $ = load(html)
  const images: string[] = []
  let origin = ''
  try {
    origin = new URL(pageUrl).origin
  } catch { /* ignore */ }

  // Strategy 1 — og:image
  $('meta[property="og:image"], meta[name="og:image"]').each((_, el) => {
    const content = $(el).attr('content')
    if (content) images.push(content.startsWith('http') ? content : `${origin}${content}`)
  })

  // Strategy 2 — large img elements
  $('img').each((_, el) => {
    const src =
      $(el).attr('src') ??
      $(el).attr('data-src') ??
      $(el).attr('data-lazy')
    if (!src) return

    const fullSrc = src.startsWith('http') ? src : `${origin}${src.startsWith('/') ? src : `/${src}`}`
    const alt = ($(el).attr('alt') ?? '').toLowerCase()
    const width = parseInt($(el).attr('width') ?? '0', 10)
    const height = parseInt($(el).attr('height') ?? '0', 10)

    const isLargeEnough = (width === 0 || width > 200) && (height === 0 || height > 200)
    const isProductLike = !alt.includes('logo') && !alt.includes('banner') && !alt.includes('icon')

    if (isLargeEnough && isProductLike) images.push(fullSrc)
  })

  return dedupe(images).slice(0, MAX_IMAGES)
}

// ─── Main entry point ─────────────────────────────────────

/**
 * Scrape product images from any supported e-commerce URL.
 * Never throws — returns ScrapingResult with success=false on errors.
 *
 * Supported: Amazon, Mercado Livre, generic e-commerce.
 */
export async function scrapeProduct(url: string): Promise<ScrapingResult> {
  const platform = detectPlatform(url)

  try {
    const html = await fetchProductPage(url)

    let images: string[]
    let title: string | undefined

    switch (platform) {
      case 'amazon':
        images = extractAmazonImages(html)
        title = extractAmazonTitle(html)
        break
      case 'mercadolivre':
        images = extractMercadoLivreImages(html)
        title = extractMercadoLivreTitle(html)
        break
      default:
        images = extractGenericImages(html, url)
    }

    console.info(`[scraper] ${platform} — found ${images.length} images from ${url}`)

    return {
      success: true,
      product: { platform, images, title, url },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[scraper] Failed scraping ${platform} (${url}): ${message}`)
    return { success: false, error: message }
  }
}
