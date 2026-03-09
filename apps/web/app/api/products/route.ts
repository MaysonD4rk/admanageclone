import { NextRequest, NextResponse } from 'next/server'
import { getAllProducts, createProduct } from '@/lib/services/brand-fetch.service'
import { ValidationError, toErrorResponse } from '@/lib/errors'

export async function GET() {
  const products = await getAllProducts()
  return NextResponse.json(products)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || typeof body.name !== 'string') {
      throw new ValidationError('name is required')
    }

    const product = await createProduct(body)
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(toErrorResponse(error), { status: 400 })
    }
    console.error('[products POST]', error)
    return NextResponse.json(toErrorResponse(error), { status: 500 })
  }
}
