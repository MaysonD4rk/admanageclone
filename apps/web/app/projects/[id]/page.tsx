import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ProjectViewer from '@/components/projects/ProjectViewer'

async function getProject(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/projects/${id}`, { cache: 'no-store' })
    if (res.ok) return res.json()
    return null
  } catch {
    return null
  }
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id)

  return (
    <div className="p-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      {project ? (
        <ProjectViewer project={project} />
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg font-semibold text-gray-800 dark:text-white">Project not found</p>
          <p className="text-sm text-gray-400 mt-1">This project may not have been saved, or the database is unavailable.</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            Generate a New Campaign
          </Link>
        </div>
      )}
    </div>
  )
}
