import Image from 'next/image'
import { Globe, FolderOpen, Calendar, Tag } from 'lucide-react'

interface ProductCardProps {
  product: {
    id: string
    name: string
    category?: string
    description?: string | null
    usps?: string[]
    brandUrl?: string | null
    logoUrl?: string | null
    colors: string[]
    images: string[]
    createdAt: string | Date
    _count?: { projects: number }
  }
}

export default function ProductCard({ product }: ProductCardProps) {
  const date = new Date(product.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 border border-violet-100 dark:border-violet-800 overflow-hidden flex items-center justify-center flex-shrink-0">
          {product.logoUrl ? (
            <Image src={product.logoUrl} alt={product.name} width={48} height={48} className="object-contain rounded-xl" />
          ) : (
            <span className="text-lg font-bold text-violet-400 dark:text-violet-300">{product.name.charAt(0)}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{product.name}</h3>
            {product.category && product.category !== 'All' && (
              <span className="flex-shrink-0 px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[10px] font-medium rounded-full">
                {product.category}
              </span>
            )}
          </div>

          {product.brandUrl && (
            <div className="flex items-center gap-1 mt-0.5">
              <Globe className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <a
                href={product.brandUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 truncate transition-colors"
              >
                {product.brandUrl.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </div>
          )}

          {product.colors.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              {product.colors.map((color, i) => (
                <div
                  key={i}
                  className="w-3.5 h-3.5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {product.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{product.description}</p>
      )}

      {product.usps && product.usps.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {product.usps.slice(0, 3).map((usp) => (
            <span key={usp} className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-[10px] font-medium rounded-full">
              <Tag className="w-2.5 h-2.5 text-gray-400" />
              {usp}
            </span>
          ))}
          {product.usps.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 text-gray-400 dark:text-gray-500 text-[10px] rounded-full">
              +{product.usps.length - 3} more
            </span>
          )}
        </div>
      )}

      {product.images.length > 0 && (
        <div className="flex gap-1.5 overflow-hidden rounded-xl">
          {product.images.slice(0, 3).map((img, i) => (
            <div key={i} className="relative flex-1 aspect-square rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700">
              <Image src={img} alt="" fill className="object-cover" sizes="80px" />
            </div>
          ))}
          {product.images.length > 3 && (
            <div className="relative flex-1 aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">+{product.images.length - 3}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-gray-50 dark:border-gray-700 mt-auto">
        <div className="flex items-center gap-1 text-[11px] text-gray-400">
          <Calendar className="w-3 h-3" />
          {date}
        </div>
        {product._count !== undefined && (
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <FolderOpen className="w-3 h-3" />
            {product._count.projects} campaign{product._count.projects !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
