import { NextRequest, NextResponse } from 'next/server'
import { generateAndSaveImage, getAllGeneratedImages } from '@/lib/services/generated-images.service'
import { NanoBananaError, ValidationError, toErrorResponse } from '@/lib/errors'
import type { GenerateImageInput } from '@/lib/types'

export async function GET() {
  const images = await getAllGeneratedImages()
  return NextResponse.json(images)
}

/**
 * POST /api/generate-image
 *
 * Body: GenerateImageInput
 *   { userPrompt, imageUrls?, aspectRatio?, resolution?, saveToSmartAssets? }
 *
 * Returns: GenerateImageResult
 *   { generatedImage, smartAssetId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageInput = await request.json()

    if (!body.userPrompt || typeof body.userPrompt !== 'string') {
      throw new ValidationError('userPrompt is required and must be a string')
    }

    const result = await generateAndSaveImage(body)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(toErrorResponse(error), { status: 400 })
    }
    if (error instanceof NanoBananaError) {
      console.error('[generate-image POST] NanoBanana error:', {
        message: error.message,
        code: error.nanoBananaErrorCode,
        taskId: error.taskId,
      })
      return NextResponse.json(
        {
          ...toErrorResponse(error),
          errorCode: error.nanoBananaErrorCode,
          taskId: error.taskId,
        },
        { status: error.statusCode },
      )
    }
    console.error('[generate-image POST] Unexpected error:', error)
    return NextResponse.json(toErrorResponse(error), { status: 500 })
  }
}
