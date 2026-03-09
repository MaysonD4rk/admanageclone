import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  const filename = request.nextUrl.searchParams.get('filename') ?? `ad-${Date.now()}.jpg`

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 })
  }

  try {
    const imageRes = await fetch(url, { headers: { 'User-Agent': 'AdManage/1.0' } })
    if (!imageRes.ok) throw new Error('Failed to fetch image')

    const blob = await imageRes.blob()
    const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg'

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch {
    return new NextResponse('Failed to download image', { status: 500 })
  }
}
