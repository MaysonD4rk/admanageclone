'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Download, Edit2, Trash2, Check, Loader2, Sparkles, X } from 'lucide-react'
import type { Ad, Project, SmartAssetSaveResult } from '@/lib/types'

interface ProjectViewerProps {
  project: Project
}

interface SaveNotification {
  savedCount: number
  duplicateCount: number
}

export default function ProjectViewer({ project }: ProjectViewerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isDownloading, setIsDownloading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [notification, setNotification] = useState<SaveNotification | null>(null)

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const selectAll = () =>
    setSelected(
      selected.size === project.ads.length ? new Set() : new Set(project.ads.map((a) => a.id)),
    )

  const handleDownload = useCallback(async () => {
    if (isDownloading) return
    setIsDownloading(true)
    const selectedAds = project.ads.filter((a) => selected.has(a.id))

    for (const ad of selectedAds) {
      try {
        const filename = `${ad.title.replace(/[^a-z0-9]/gi, '-')}.jpg`
        const res = await fetch(
          `/api/download?url=${encodeURIComponent(ad.imageUrl)}&filename=${encodeURIComponent(filename)}`,
        )
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const anchor = Object.assign(document.createElement('a'), { href: url, download: filename })
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)
        URL.revokeObjectURL(url)
        if (selectedAds.length > 1) await new Promise((r) => setTimeout(r, 400))
      } catch {
        // continue with remaining downloads
      }
    }

    setIsDownloading(false)
  }, [isDownloading, project.ads, selected])

  /**
   * Save selected ads to Smart Assets using the batch API.
   * Duplicates are detected server-side via URL comparison and reported back.
   */
  const handleSaveToSmartAssets = useCallback(async () => {
    if (isSaving) return
    setIsSaving(true)
    setNotification(null)

    const selectedAds = project.ads.filter((a) => selected.has(a.id))
    const items = selectedAds.map((ad) => ({ title: ad.title, imageUrl: ad.imageUrl }))

    try {
      const res = await fetch('/api/smart-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })

      const results: SmartAssetSaveResult[] = await res.json()

      const savedCount = results.filter((r) => !r.isDuplicate).length
      const duplicateCount = results.filter((r) => r.isDuplicate).length

      // Mark newly saved assets for visual feedback
      const newSavedIds = new Set(savedIds)
      results.forEach((r, i) => {
        if (!r.isDuplicate) newSavedIds.add(selectedAds[i].id)
      })
      setSavedIds(newSavedIds)
      setNotification({ savedCount, duplicateCount })

      setTimeout(() => {
        setSelected(new Set())
        setTimeout(() => setNotification(null), 3000)
      }, 600)
    } catch {
      setNotification({ savedCount: 0, duplicateCount: 0 })
    } finally {
      setIsSaving(false)
    }
  }, [isSaving, project.ads, selected, savedIds])

  const ratioClass: Record<string, string> = {
    '9:16': 'aspect-[9/16]',
    '1:1': 'aspect-square',
    '16:9': 'aspect-video',
  }
  const imgAspect = ratioClass[project.ratio] ?? ratioClass['9:16']

  return (
    <div className="relative">
      {/* Save notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 animate-slide-up">
          <div
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
              notification.savedCount > 0
                ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                : 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}
          >
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              {notification.savedCount > 0 && (
                <p>{notification.savedCount} image{notification.savedCount !== 1 ? 's' : ''} saved to Smart Assets</p>
              )}
              {notification.duplicateCount > 0 && (
                <p className="text-xs opacity-80 mt-0.5">
                  {notification.duplicateCount} already in Smart Assets (skipped)
                </p>
              )}
            </div>
            <button onClick={() => setNotification(null)} className="ml-1 opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs px-2 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-full font-medium">
              {project.ratio}
            </span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full font-medium capitalize">
              {project.style}
            </span>
            {project.product && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Brand:{' '}
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {project.product.name}
                </span>
              </span>
            )}
          </div>
        </div>
        <button
          onClick={selectAll}
          className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
        >
          {selected.size === project.ads.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {project.ads.map((ad: Ad) => {
          const isSelected = selected.has(ad.id)
          const wasSaved = savedIds.has(ad.id)
          return (
            <div
              key={ad.id}
              onClick={() => toggle(ad.id)}
              className={`relative group cursor-pointer rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 shadow-sm transition-all duration-200 ${imgAspect} ${
                isSelected
                  ? 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-gray-900'
                  : 'hover:shadow-md'
              }`}
            >
              <Image
                src={ad.imageUrl}
                alt={ad.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
              <div
                className={`absolute inset-0 transition-colors duration-200 ${
                  isSelected ? 'bg-violet-600/20' : 'group-hover:bg-black/10'
                }`}
              />

              {/* Checkbox */}
              <div
                className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-violet-600 border-violet-600'
                    : 'bg-white/80 border-gray-300 group-hover:border-violet-400'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </div>

              {/* Saved badge */}
              {wasSaved && (
                <div className="absolute top-3 left-3 flex items-center gap-1 px-1.5 py-0.5 bg-violet-600/90 rounded-full">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                  <span className="text-[9px] text-white font-semibold">Saved</span>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-xs font-medium">{ad.title}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom Bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 animate-slide-up z-50">
          <div className="flex items-center gap-3 bg-gray-900 text-white rounded-2xl px-5 py-3.5 shadow-2xl shadow-black/30">
            <span className="text-sm font-medium pr-1">
              <span className="text-violet-400 font-bold">{selected.size}</span>{' '}
              item{selected.size !== 1 ? 's' : ''} selected
            </span>
            <div className="w-px h-5 bg-gray-700" />

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 active:scale-95 disabled:opacity-60 rounded-lg text-sm font-medium transition-all"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>

            <button
              onClick={handleSaveToSmartAssets}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 active:scale-95 disabled:opacity-60 rounded-lg text-sm font-medium transition-all"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {isSaving ? 'Saving...' : 'Save to Smart Assets'}
            </button>

            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-lg text-sm font-medium transition-all">
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>

            <button
              onClick={() => setSelected(new Set())}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 rounded-lg text-sm font-medium transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
