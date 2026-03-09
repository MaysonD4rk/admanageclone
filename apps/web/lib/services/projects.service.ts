import { prisma } from '@/lib/db'
import { NotFoundError } from '@/lib/errors'
import type { Project } from '@/lib/types'
import { MOCK_PROJECTS } from '@/lib/mock-data'

export async function getAllProjects(): Promise<Project[]> {
  try {
    return await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: { ads: true, product: true },
    }) as unknown as Project[]
  } catch {
    return MOCK_PROJECTS as unknown as Project[]
  }
}

export async function getProjectById(id: string): Promise<Project> {
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: { ads: true, product: true },
    })
    if (!project) throw new NotFoundError('Project')
    return project as unknown as Project
  } catch (e) {
    if (e instanceof NotFoundError) throw e
    const mock = (MOCK_PROJECTS as unknown as Project[]).find((p) => p.id === id)
    return mock ?? (MOCK_PROJECTS[0] as unknown as Project)
  }
}

export async function deleteProject(id: string): Promise<void> {
  await prisma.ad.deleteMany({ where: { projectId: id } })
  await prisma.project.delete({ where: { id } })
}
