import { NextRequest, NextResponse } from 'next/server'

// Simulates an AWS S3 pre-signed URL upload endpoint.
// In production this would be the real S3 endpoint — here we just accept the
// request and return 200 so the frontend upload flow completes successfully.
export async function PUT(request: NextRequest) {
  const key = new URL(request.url).searchParams.get('key') ?? 'unknown'

  // Consume the body so the connection is properly handled
  await request.arrayBuffer()

  return NextResponse.json(
    { success: true, key, message: 'Upload accepted (mock S3)' },
    { status: 200 }
  )
}

// Also support POST in case the client sends a multipart form
export async function POST(request: NextRequest) {
  const key = new URL(request.url).searchParams.get('key') ?? 'unknown'
  await request.arrayBuffer()

  return NextResponse.json(
    { success: true, key, message: 'Upload accepted (mock S3)' },
    { status: 200 }
  )
}
