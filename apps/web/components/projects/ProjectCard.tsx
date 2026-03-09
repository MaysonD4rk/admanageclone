import Link from 'next/link'
import Image from 'next/image'
import { Eye, ImageIcon, Calendar } from 'lucide-react'

interface Ad {
  id: string
  imageUrl: string
}

interface ProjectCardProps {
  project: {
    id: string
    name: string
    ratio: string
    style: string
    createdAt: string | Date
    ads: Ad[]
    product?: { name: string } | null
  }
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const previewAds = project.ads.slice(0, 3)
  const date = new Date(project.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Preview grid */}
      <div className="h-40 bg-gray-50 dark:bg-gray-700 relative overflow-hidden">
        {previewAds.length > 0 ? (
          <div className="flex gap-0.5 h-full">
            {previewAds.map((ad, i) => (
              <div key={ad.id} className={`relative flex-1 ${i === 0 ? 'flex-[2]' : 'flex-1'}`}>
                <Image src={ad.imageUrl} alt="" fill className="object-cover" sizes="200px" />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-500" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium rounded-full">
            {project.ads.length} ads
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{project.name}</h3>
        {project.product && (
          <p className="text-xs text-gray-400 mt-0.5">{project.product.name}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded font-medium">
            {project.ratio}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded font-medium capitalize">
            {project.style}
          </span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Calendar className="w-3 h-3" />
            {date}
          </div>
          <Link
            href={`/projects/${project.id}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </Link>
        </div>
      </div>
    </div>
  )
}
