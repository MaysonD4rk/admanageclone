import { NextRequest, NextResponse } from 'next/server'
import { generateAdCampaign } from '@/lib/services/generate.service'
import { ValidationError, toErrorResponse } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || typeof body.name !== 'string') {
      throw new ValidationError('name is required')
    }

    // Simulate AI generation delay
    await new Promise((r) => setTimeout(r, 2000))

    const result = await generateAdCampaign(body)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(toErrorResponse(error), { status: 400 })
    }
    console.error('[generate POST]', error)
    return NextResponse.json(toErrorResponse(error), { status: 500 })
  }
}
