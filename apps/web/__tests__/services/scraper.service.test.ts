/**
 * Tests for scraper.service.ts
 *
 * All network calls are mocked — no real HTTP requests are made.
 * We test platform detection and the HTML parsing logic by feeding
 * realistic but controlled HTML fixtures.
 */
import {
  detectPlatform,
  extractAmazonImages,
  extractAmazonTitle,
  extractMercadoLivreImages,
  extractMercadoLivreTitle,
  extractGenericImages,
  scrapeProduct,
} from '@/lib/services/scraper.service'

// ─── detectPlatform ───────────────────────────────────────

describe('detectPlatform', () => {
  it.each([
    ['https://www.amazon.com/dp/B08N5WRWNW', 'amazon'],
    ['https://www.amazon.com.br/dp/B08N5WRWNW', 'amazon'],
    ['https://www.amazon.de/dp/B08N5WRWNW', 'amazon'],
    ['https://produto.mercadolivre.com.br/MLB-123', 'mercadolivre'],
    ['https://www.mercadolibre.com.ar/p/MLA-123', 'mercadolivre'],
    ['https://http2.mlstatic.com/image.jpg', 'mercadolivre'],
    ['https://www.shopify.com/product/t-shirt', 'generic'],
    ['https://www.example.com/product', 'generic'],
    ['not-a-url', 'generic'],
    ['', 'generic'],
  ])('detects platform for "%s" → "%s"', (url, expected) => {
    expect(detectPlatform(url)).toBe(expected)
  })
})

// ─── Amazon extraction ────────────────────────────────────

describe('extractAmazonImages', () => {
  const AMAZON_WITH_COLOR_IMAGES_JSON = `
    <html><body>
    <script type="text/javascript">
      P.when('A').register("ImageBlockATF", function(A) {
        var data = {"colorImages": {"initial": [
          {"hiRes": "https://m.media-amazon.com/images/I/product1._AC_SL1500_.jpg", "thumb": "t1"},
          {"hiRes": "https://m.media-amazon.com/images/I/product2._AC_SL1500_.jpg", "thumb": "t2"},
          {"large": "https://m.media-amazon.com/images/I/product3.jpg", "thumb": "t3"}
        ]}};
      });
    </script>
    </body></html>
  `

  it('extracts hiRes images from embedded JSON', () => {
    const images = extractAmazonImages(AMAZON_WITH_COLOR_IMAGES_JSON)
    expect(images).toContain('https://m.media-amazon.com/images/I/product1._AC_SL1500_.jpg')
    expect(images).toContain('https://m.media-amazon.com/images/I/product2._AC_SL1500_.jpg')
  })

  it('falls back to #landingImage when JSON is not present', () => {
    const html = `
      <html><body>
        <img id="landingImage" src="https://m.media-amazon.com/images/I/main-product.jpg" />
      </body></html>
    `
    const images = extractAmazonImages(html)
    expect(images).toContain('https://m.media-amazon.com/images/I/main-product.jpg')
  })

  it('returns an empty array for unrecognized HTML', () => {
    const images = extractAmazonImages('<html><body><p>No products here</p></body></html>')
    expect(images).toEqual([])
  })

  it('deduplicates identical URLs', () => {
    const url = 'https://m.media-amazon.com/images/I/dup.jpg'
    const html = `
      <html><body>
        <script>var d = {"colorImages":{"initial":[{"hiRes":"${url}"},{"hiRes":"${url}"}]}}</script>
      </body></html>
    `
    const images = extractAmazonImages(html)
    expect(images.filter((u) => u === url)).toHaveLength(1)
  })

  it('filters out sprite and icon URLs', () => {
    const html = `
      <html><body>
        <script>var d = {"colorImages":{"initial":[
          {"hiRes":"https://amazon.com/sprite-sheet.png"},
          {"hiRes":"https://amazon.com/product-icon.jpg"},
          {"hiRes":"https://amazon.com/real-product.jpg"}
        ]}}</script>
      </body></html>
    `
    const images = extractAmazonImages(html)
    expect(images).toContain('https://amazon.com/real-product.jpg')
    expect(images.some((u) => u.includes('sprite'))).toBe(false)
  })

  it('returns at most 5 images', () => {
    const imgUrls = Array.from({ length: 10 }, (_, i) => `{"hiRes":"https://amazon.com/prod${i}.jpg"}`)
    const html = `<html><body><script>{"colorImages":{"initial":[${imgUrls.join(',')}]}}</script></body></html>`
    expect(extractAmazonImages(html).length).toBeLessThanOrEqual(5)
  })
})

describe('extractAmazonTitle', () => {
  it('extracts the product title from #productTitle', () => {
    const html = `<html><body><span id="productTitle">  Premium Wireless Headphones  </span></body></html>`
    expect(extractAmazonTitle(html)).toBe('Premium Wireless Headphones')
  })

  it('returns undefined when no title element exists', () => {
    expect(extractAmazonTitle('<html><body></body></html>')).toBeUndefined()
  })
})

// ─── Mercado Livre extraction ─────────────────────────────

describe('extractMercadoLivreImages', () => {
  it('extracts images from __NEXT_DATA__ JSON', () => {
    const pictures = [
      { url: 'https://http2.mlstatic.com/D_NQ_NP_product1-F.jpg' },
      { url: 'https://http2.mlstatic.com/D_NQ_NP_product2-F.jpg' },
    ]
    const nextData = JSON.stringify({
      props: { pageProps: { initialState: { components: { gallery: { pictures } } } } },
    })
    const html = `<html><head><script id="__NEXT_DATA__" type="application/json">${nextData}</script></head><body></body></html>`

    const images = extractMercadoLivreImages(html)
    expect(images).toContain('https://http2.mlstatic.com/D_NQ_NP_product1-F.jpg')
    expect(images).toContain('https://http2.mlstatic.com/D_NQ_NP_product2-F.jpg')
  })

  it('replaces {width} and {height} placeholders with concrete values', () => {
    const pictures = [{ url: 'https://mlstatic.com/D_NQ_{width}x{height}_product.jpg' }]
    const nextData = JSON.stringify({
      props: { pageProps: { initialState: { components: { gallery: { pictures } } } } },
    })
    const html = `<html><head><script id="__NEXT_DATA__">${nextData}</script></head><body></body></html>`

    const [first] = extractMercadoLivreImages(html)
    expect(first).not.toContain('{width}')
    expect(first).not.toContain('{height}')
  })

  it('falls back to CSS selector when __NEXT_DATA__ has no pictures', () => {
    const html = `
      <html><body>
        <figure class="ui-pdp-gallery__figure">
          <img class="ui-pdp-gallery__figure__image"
               src="https://http2.mlstatic.com/D_NQ_NP_gallery.jpg" />
        </figure>
      </body></html>
    `
    const images = extractMercadoLivreImages(html)
    expect(images).toContain('https://http2.mlstatic.com/D_NQ_NP_gallery.jpg')
  })

  it('returns empty array for unrecognized HTML', () => {
    expect(extractMercadoLivreImages('<html><body><p>No products</p></body></html>')).toEqual([])
  })
})

describe('extractMercadoLivreTitle', () => {
  it('extracts title from .ui-pdp-title', () => {
    const html = `<html><body><h1 class="ui-pdp-title">Smartphone Galaxy S24</h1></body></html>`
    expect(extractMercadoLivreTitle(html)).toBe('Smartphone Galaxy S24')
  })
})

// ─── Generic extraction ───────────────────────────────────

describe('extractGenericImages', () => {
  it('extracts og:image first', () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="https://example.com/og-product.jpg" />
        </head>
        <body></body>
      </html>
    `
    const images = extractGenericImages(html, 'https://example.com')
    expect(images[0]).toBe('https://example.com/og-product.jpg')
  })

  it('converts relative image URLs to absolute', () => {
    const html = `<html><body><img src="/images/product.jpg" width="400" height="400" alt="product" /></body></html>`
    const images = extractGenericImages(html, 'https://mystore.com')
    expect(images).toContain('https://mystore.com/images/product.jpg')
  })

  it('filters out images with logo or icon in alt text', () => {
    const html = `
      <html><body>
        <img src="https://example.com/logo.png" alt="company logo" width="300" />
        <img src="https://example.com/product.jpg" alt="great product" width="400" />
      </body></html>
    `
    const images = extractGenericImages(html, 'https://example.com')
    expect(images).toContain('https://example.com/product.jpg')
    expect(images.some((u) => u.includes('logo.png'))).toBe(false)
  })
})

// ─── scrapeProduct integration ────────────────────────────

describe('scrapeProduct', () => {
  afterEach(() => jest.restoreAllMocks())

  it('returns success:true with product data when fetch succeeds', async () => {
    const pictures = [{ url: 'https://http2.mlstatic.com/product.jpg' }]
    const nextData = JSON.stringify({
      props: { pageProps: { initialState: { components: { gallery: { pictures } } } } },
    })
    const html = `
      <html>
        <head><script id="__NEXT_DATA__">${nextData}</script></head>
        <body><h1 class="ui-pdp-title">Cool Product</h1></body>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => html,
    } as Response)

    const result = await scrapeProduct('https://produto.mercadolivre.com.br/MLB-123')

    expect(result.success).toBe(true)
    expect(result.product?.platform).toBe('mercadolivre')
    expect(result.product?.images).toContain('https://http2.mlstatic.com/product.jpg')
    expect(result.product?.title).toBe('Cool Product')
  })

  it('returns success:false without throwing when fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network unreachable'))
    const result = await scrapeProduct('https://www.amazon.com/dp/B08N')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Network unreachable')
  })

  it('returns success:false without throwing when HTTP 403 is received', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    } as Response)
    const result = await scrapeProduct('https://www.amazon.com/dp/B08N')
    expect(result.success).toBe(false)
  })

  it('uses the correct platform for the URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<html><head><meta property="og:image" content="https://cdn.example.com/product.jpg"></head><body></body></html>',
    } as Response)

    const result = await scrapeProduct('https://www.myshop.com/product/123')
    expect(result.product?.platform).toBe('generic')
  })
})
