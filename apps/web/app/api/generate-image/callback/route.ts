import { NextRequest, NextResponse } from 'next/server'
import { upsertFromCallback } from '@/lib/services/generated-images.service'
import type { NanoBananaResponse } from '@/lib/types'

/**
 * POST /api/generate-image/callback
 *
 * Webhook handler for async NanoBanana task completion notifications.
 * NanoBanana posts the same response shape here when a task finishes.
 */
export async function POST(request: NextRequest) {
  try {
    const payload: NanoBananaResponse = await request.json()

    if (!payload.taskId) {
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })
    }

    if (payload.successFlag !== 1) {
      console.warn('[callback] NanoBanana reported failure:', {
        taskId: payload.taskId,
        errorCode: payload.errorCode,
        errorMessage: payload.errorMessage,
      })
      return NextResponse.json({ received: true, status: 'failed' })
    }

    await upsertFromCallback({
      taskId: payload.taskId,
      resultImageUrl: payload.response.resultImageUrl,
      originImageUrl: payload.response.originImageUrl,
    })

    return NextResponse.json({ received: true, status: 'ok' })
  } catch (error) {
    console.error('[callback] Error processing NanoBanana callback:', error)
    // Always return 200 to NanoBanana so it doesn't retry indefinitely
    return NextResponse.json({ received: true, status: 'error' })
  }
}
