'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Wand2, X, Sparkles, ArrowRight, AlertCircle } from 'lucide-react'
import type { BrandData } from './BrandFetchModal'
import type { Ad } from '../home/AdCard'
import SmartAssetsPicker from '@/components/smart-assets/SmartAssetsPicker'

interface RecreateModalProps {
  isOpen: boolean
  onClose: () => void
  brandData?: BrandData | null
  sourceAd?: Ad | null
}

type Step = 'form' | 'results'

export default function RecreateModal({ isOpen, onClose, brandData, sourceAd }: RecreateModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [campaignName, setCampaignName] = useState(
    sourceAd ? `${sourceAd.title} — Recreated` : brandData?.name ? `${brandData.name} Campaign` : ''
  )
  const [description, setDescription] = useState('')
  const [analysis, setAnalysis] = useState(
    sourceAd
      ? `Recreate a high-converting ad inspired by "${sourceAd.title}". Focus on the key message, emotion, and call-to-action.`
      : ''
  )
  const [selectedAssetUrls, setSelectedAssetUrls] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAds, setGeneratedAds] = useState<Ad[]>([])
  const [generatedProjectId, setGeneratedProjectId] = useState<string | null>(null)

  const handleClose = () => {
    setIsGenerating(false)
    setError(null)
    setStep('form')
    setGeneratedAds([])
    setGeneratedProjectId(null)
    onClose()
  }

  const handleRegenerate = () => {
    setStep('form')
    setGeneratedAds([])
    setGeneratedProjectId(null)
    setError(null)
  }

  const toggleAsset = (url: string) =>
    setSelectedAssetUrls((prev) => prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url])

  const handleGenerate = async () => {
    if (!campaignName.trim()) return
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName.trim(),
          script: analysis.trim() || null,
          description: description.trim() || null,
          referenceAssets: selectedAssetUrls,
          ratio: '9:16',
          style: 'modern',
          productId: brandData?.productId ?? null,
          category: sourceAd?.category ?? 'All',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Generation failed. Please try again.')
        setIsGenerating(false)
        return
      }
      if (!data.ads || data.ads.length === 0) {
        setError('No images were generated. The NanoBanana API did not return any results.')
        setIsGenerating(false)
        return
      }
      // Display images directly from the API response — never re-fetch from DB
      setGeneratedAds(data.ads)
      setGeneratedProjectId(data.projectId ?? null)
      setStep('results')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isOpen) return null

  const hasSourceImage = !!sourceAd?.imageUrl

  // ── Results step ──────────────────────────────────────────
  if (step === 'results') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
        <div
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl animate-slide-up w-full max-w-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: '92vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {generatedAds.length} Variation{generatedAds.length !== 1 ? 's' : ''} Generated
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Image grid — real NanoBanana results */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-4">
              {generatedAds.map((ad, i) => (
                <div key={ad.id ?? i} className="space-y-1.5">
                  <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <Image
                      src={ad.imageUrl}
                      alt={ad.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 672px) 50vw, 280px"
                      priority={i < 2}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">{ad.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={handleRegenerate}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Regenerate
            </button>
            {generatedProjectId && (
              <button
                onClick={() => { handleClose(); router.push(`/projects/${generatedProjectId}`) }}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-all shadow-sm shadow-violet-200"
              >
                View Project <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {!generatedProjectId && (
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Form step ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div
        className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl animate-slide-up flex overflow-hidden ${
          hasSourceImage ? 'w-full max-w-4xl' : 'w-full max-w-lg'
        }`}
        style={{ maxHeight: '92vh' }}
      >
        {/* ── Left: large source image ── */}
        {hasSourceImage && (
          <div className="relative flex-shrink-0 bg-gray-950" style={{ width: '52%' }}>
            <Image
              src={sourceAd.imageUrl}
              alt={sourceAd.title}
              fill
              className="object-cover"
              sizes="480px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/30" />
            <div className="absolute top-4 left-4">
              <span className="px-2.5 py-1 bg-white/15 backdrop-blur-sm text-white/80 text-[10px] font-semibold uppercase tracking-wider rounded-full border border-white/20">
                Source Ad
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-white font-bold text-lg leading-tight drop-shadow">{sourceAd.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                  {sourceAd.category}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Right: form ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {sourceAd ? 'Recreate Ad' : 'Create Ad'}
            </h2>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Brand badge */}
            {brandData && (
              <div className="flex items-center gap-2 p-3 bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800 rounded-xl">
                <div className="w-6 h-6 bg-violet-600 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  B
                </div>
                <span className="text-sm text-violet-700 dark:text-violet-300 font-medium">{brandData.name}</span>
                <span className="text-xs text-violet-400 ml-auto">Brand loaded</span>
              </div>
            )}

            {/* Campaign Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Campaign Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Summer Glow Campaign"
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this campaign is for..."
                rows={2}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none transition"
              />
            </div>

            {/* Product Analysis */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Analysis</label>
              <p className="text-xs text-gray-400">Describe the product, audience, benefits, and tone</p>
              <textarea
                value={analysis}
                onChange={(e) => setAnalysis(e.target.value)}
                placeholder="e.g. Premium skincare serum for women 25–45. Key benefits: reduces wrinkles, boosts hydration. Tone: elegant. CTA: Shop Now..."
                rows={4}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none transition"
              />
              <p className="text-xs text-gray-400 text-right">{analysis.length} chars</p>
            </div>

            {/* Smart Assets picker */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reference from Smart Assets</label>
                {selectedAssetUrls.length > 0 && (
                  <span className="ml-auto text-xs px-2 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 rounded-full font-medium">
                    {selectedAssetUrls.length} selected
                  </span>
                )}
              </div>
              <SmartAssetsPicker
                selectedUrls={selectedAssetUrls}
                onSelect={toggleAsset}
                compact
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !campaignName.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-xl transition-all shadow-sm shadow-violet-200"
              >
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  : <><Wand2 className="w-4 h-4" /> Generate 4 Variations</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
