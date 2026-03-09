import { NextResponse } from 'next/server'
import { getAllProjects } from '@/lib/services/projects.service'
import { toErrorResponse } from '@/lib/errors'

export async function GET() {
  try {
    const projects = await getAllProjects()
    return NextResponse.json(projects)
  } catch (error) {
    console.error('[projects GET]', error)
    return NextResponse.json(toErrorResponse(error), { status: 500 })
  }
}
