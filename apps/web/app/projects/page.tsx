'use client'

import { useState, useEffect } from 'react'
import { FolderOpen, Plus } from 'lucide-react'
import Link from 'next/link'
import ProjectCard from '@/components/projects/ProjectCard'
type Project = Parameters<typeof ProjectCard>[0]['project']

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">All your generated ad campaigns</p>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm shadow-violet-200 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/40 rounded-2xl flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-violet-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">No projects yet</h3>
          <p className="text-gray-400 text-sm mt-1">Generate your first ad campaign to see it here</p>
          <Link
            href="/"
            className="mt-4 flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Campaign
          </Link>
        </div>
      )}
    </div>
  )
}
