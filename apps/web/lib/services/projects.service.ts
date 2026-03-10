import { prisma } from '@/lib/db'
import { NotFoundError } from '@/lib/errors'
import type { Project } from '@/lib/types'

export async function getAllProjects(): Promise<Project[]> {
  return await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: { ads: true, product: true },
  }) as unknown as Project[]
}

export async function getProjectById(id: string): Promise<Project> {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { ads: true, product: true },
  })
  if (!project) throw new NotFoundError('Project')
  return project as unknown as Project
}

export async function deleteProject(id: string): Promise<void> {
  await prisma.ad.deleteMany({ where: { projectId: id } })
  await prisma.project.delete({ where: { id } })
}
