import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MOCK_ADS } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  try {
    const where = category && category !== 'All' ? { category } : {}
    const ads = await prisma.ad.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(ads)
  } catch {
    const filtered =
      !category || category === 'All'
        ? MOCK_ADS
        : MOCK_ADS.filter((a) => a.category === category)
    return NextResponse.json(filtered)
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, imageUrl, category, projectId } = body

  try {
    const ad = await prisma.ad.create({
      data: { title, imageUrl, category: category ?? 'All', projectId },
    })
    return NextResponse.json(ad, { status: 201 })
  } catch {
    return NextResponse.json(
      { id: `m${Date.now()}`, title, imageUrl, category, createdAt: new Date().toISOString() },
      { status: 201 }
    )
  }
}
