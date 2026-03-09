import { NextRequest, NextResponse } from 'next/server'
import {
  getAllSmartAssets,
  saveSmartAsset,
  saveSmartAssetsSafe,
  deleteSmartAsset,
} from '@/lib/services/smart-assets.service'
import { DuplicateAssetError, ValidationError, toErrorResponse } from '@/lib/errors'

export async function GET() {
  const assets = await getAllSmartAssets()
  return NextResponse.json(assets)
}

/**
 * POST /api/smart-assets
 *
 * Accepts either a single asset { title?, imageUrl }
 * or a batch { items: { title?, imageUrl }[] }
 *
 * Returns 409 on duplicate when saving a single asset.
 * Batch mode silently skips duplicates and reports per-item status.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Batch mode
    if (Array.isArray(body.items)) {
      const results = await saveSmartAssetsSafe(body.items)
      return NextResponse.json(results, { status: 200 })
    }

    // Single mode
    const { imageUrl, title } = body
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new ValidationError('imageUrl is required and must be a string')
    }

    const asset = await saveSmartAsset({ imageUrl, title })
    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    if (error instanceof DuplicateAssetError) {
      return NextResponse.json(
        { error: 'Asset already saved to Smart Assets', existingId: error.existingId },
        { status: 409 },
      )
    }
    if (error instanceof ValidationError) {
      return NextResponse.json(toErrorResponse(error), { status: 400 })
    }
    console.error('[smart-assets POST]', error)
    return NextResponse.json(toErrorResponse(error), { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    await deleteSmartAsset(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(toErrorResponse(error), { status: 500 })
  }
}
