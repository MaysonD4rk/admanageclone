import { NextRequest, NextResponse } from 'next/server'
import { analyzeBrandUrl } from '@/lib/services/brand-fetch.service'
import { detectPlatform } from '@/lib/services/scraper.service'
import { ValidationError, toErrorResponse } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      throw new ValidationError('url is required')
    }

    const platform = detectPlatform(url)
    console.info(`[brand-fetch] Analyzing ${platform} URL: ${url}`)

    // Real scraping + product creation (no artificial delay — scraping takes real time)
    const result = await analyzeBrandUrl(url)

    return NextResponse.json({
      ...result,
      // Expose platform so the UI can display the detected marketplace
      platform,
      scrapingSucceeded: !!(result.scrapedProduct?.images?.length),
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(toErrorResponse(error), { status: 400 })
    }
    console.error('[brand-fetch POST]', error)
    return NextResponse.json(toErrorResponse(error), { status: 500 })
  }
}
