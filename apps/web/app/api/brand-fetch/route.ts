import { NextRequest, NextResponse } from 'next/server'
import { analyzeBrandUrl } from '@/lib/services/brand-fetch.service'
import { ValidationError, toErrorResponse } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      throw new ValidationError('url is required')
    }

    // Simulate network delay for realistic UX
    await new Promise((r) => setTimeout(r, 1500))

    const brandData = await analyzeBrandUrl(url)
    return NextResponse.json(brandData)
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(toErrorResponse(error), { status: 400 })
    }
    console.error('[brand-fetch POST]', error)
    return NextResponse.json(toErrorResponse(error), { status: 500 })
  }
}
