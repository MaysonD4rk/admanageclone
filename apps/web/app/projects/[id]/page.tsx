import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ProjectViewer from '@/components/projects/ProjectViewer'
import { MOCK_PROJECTS } from '@/lib/mock-data'

async function getProject(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/projects/${id}`, { cache: 'no-store' })
    if (res.ok) return res.json()
  } catch {}
  return MOCK_PROJECTS.find((p) => p.id === id) ?? MOCK_PROJECTS[0]
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id)

  return (
    <div className="p-6">
      {/* Back */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      <ProjectViewer project={project} />
    </div>
  )
}
