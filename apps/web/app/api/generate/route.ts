import { NextRequest, NextResponse } from 'next/server'
import { generateAdCampaign } from '@/lib/services/generate.service'
import { NanoBananaError, ValidationError, toErrorResponse } from '@/lib/errors'
import type { GenerateAdsInput } from '@/lib/types'

// Allow up to 2 minutes for 4 parallel NanoBanana generations
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const body: GenerateAdsInput = await request.json()

    if (!body.name || typeof body.name !== 'string') {
      throw new ValidationError('name is required')
    }

    // Real NanoBanana generation — no artificial delay
    const result = await generateAdCampaign(body)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(toErrorResponse(error), { status: 400 })
    }
    if (error instanceof NanoBananaError) {
      console.error('[generate POST] NanoBanana error:', {
        message: error.message,
        code: error.nanoBananaErrorCode,
        taskId: error.taskId,
      })
      return NextResponse.json(
        { ...toErrorResponse(error), errorCode: error.nanoBananaErrorCode },
        { status: error.statusCode },
      )
    }
    console.error('[generate POST]', error)
    return NextResponse.json(toErrorResponse(error), { status: 500 })
  }
}
