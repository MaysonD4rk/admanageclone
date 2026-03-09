'use client'

import Image from 'next/image'
import { RefreshCw } from 'lucide-react'
import type { Ad } from '@/lib/types'

export type { Ad }

interface AdCardProps {
  ad: Ad
  onRecreate: (ad: Ad) => void
}

export default function AdCard({ ad, onRecreate }: AdCardProps) {
  return (
    <div className="group relative rounded-2xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer aspect-[4/5]">
      <Image
        src={ad.imageUrl}
        alt={ad.title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
      />

      {/* Category badge */}
      <div className="absolute top-3 left-3 z-10">
        <span className="px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium rounded-full">
          {ad.category}
        </span>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
        <button
          onClick={() => onRecreate(ad)}
          className="flex items-center gap-2 bg-white text-gray-900 font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg hover:bg-violet-50 hover:text-violet-700 transition-colors transform translate-y-2 group-hover:translate-y-0 duration-300"
        >
          <RefreshCw className="w-4 h-4" />
          Recreate
        </button>
      </div>

      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent z-10">
        <p className="text-white text-xs font-medium truncate">{ad.title}</p>
      </div>
    </div>
  )
}
