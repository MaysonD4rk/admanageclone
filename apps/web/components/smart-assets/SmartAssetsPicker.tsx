'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Sparkles, Check, Loader2 } from 'lucide-react'

interface SmartAsset {
  id: string
  title: string
  imageUrl: string
  createdAt: string
}

interface SmartAssetsPickerProps {
  /** URLs already in use so we can highlight them */
  selectedUrls?: string[]
  onSelect: (imageUrl: string) => void
  compact?: boolean
}

export default function SmartAssetsPicker({ selectedUrls = [], onSelect, compact = false }: SmartAssetsPickerProps) {
  const [assets, setAssets] = useState<SmartAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/smart-assets')
      .then((r) => r.json())
      .then(setAssets)
      .catch(() => setAssets([]))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading Smart Assets...
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-gray-400 dark:text-gray-500">
        <Sparkles className="w-3.5 h-3.5" />
        No Smart Assets saved yet. Save images from Project Viewer to get started.
      </div>
    )
  }

  return (
    <div>
      <div className={`flex gap-2 overflow-x-auto scrollbar-hide pb-1 ${compact ? '' : 'flex-wrap'}`}>
        {assets.map((asset) => {
          const isSelected = selectedUrls.includes(asset.imageUrl)
          return (
            <button
              key={asset.id}
              onClick={() => onSelect(asset.imageUrl)}
              title={asset.title}
              className={`relative flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                compact ? 'w-16 h-16' : 'w-20 h-20'
              } ${
                isSelected
                  ? 'border-violet-500 ring-1 ring-violet-400'
                  : 'border-transparent hover:border-violet-300 dark:hover:border-violet-600'
              }`}
            >
              <Image src={asset.imageUrl} alt={asset.title} fill className="object-cover" sizes="80px" />
              {isSelected && (
                <div className="absolute inset-0 bg-violet-600/30 flex items-center justify-center">
                  <div className="w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
