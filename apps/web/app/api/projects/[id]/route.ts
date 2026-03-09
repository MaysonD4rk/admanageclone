import { NextRequest, NextResponse } from 'next/server'
import { getProjectById, deleteProject } from '@/lib/services/projects.service'
import { NotFoundError, toErrorResponse } from '@/lib/errors'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const project = await getProjectById(params.id)
    return NextResponse.json(project)
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(toErrorResponse(error), { status: 404 })
    }
    console.error('[projects/:id GET]', error)
    return NextResponse.json(toErrorResponse(error), { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await deleteProject(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[projects/:id DELETE]', error)
    return NextResponse.json(toErrorResponse(error), { status: 500 })
  }
}
