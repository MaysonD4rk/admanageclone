import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { filename = 'image.jpg' } = body

  const uuid = randomUUID()
  const ext = filename.split('.').pop() ?? 'jpg'
  const key = `uploads/${uuid}.${ext}`

  // Build the fake S3 upload URL pointing to our local endpoint
  const host = request.headers.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const uploadUrl = `${protocol}://${host}/api/upload/fake-s3?key=${encodeURIComponent(key)}`

  // Use a picsum seed based on the uuid for a deterministic mock image URL
  const seed = uuid.replace(/-/g, '').slice(0, 12)
  const finalUrl = `https://picsum.photos/seed/${seed}/400/400`

  return NextResponse.json({ uploadUrl, key, finalUrl })
}
