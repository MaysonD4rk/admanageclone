'use client'

import { useState, useRef, useCallback, ChangeEvent } from 'react'
import Image from 'next/image'
import { ArrowLeft, Plus, X, Trash2, Loader2, Upload, Tag, Wand2, Sparkles, BookImage } from 'lucide-react'
import SmartAssetsPicker from '@/components/smart-assets/SmartAssetsPicker'

const CATEGORIES = ['All', 'Sale', 'New Year', 'Beauty', 'Health', 'Food']

interface Asset {
  id: string
  url: string
  loading: boolean
  source: 'upload' | 'ai'
}

export interface CreatedProduct {
  id: string
  name: string
  category: string
  description?: string | null
  usps: string[]
  images: string[]
  createdAt: string
}

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (product: CreatedProduct) => void
}


export default function AddProductModal({ isOpen, onClose, onCreated }: AddProductModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('All')
  const [description, setDescription] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [uspInput, setUspInput] = useState('')
  const [usps, setUsps] = useState<string[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // AI generation state
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGeneratingAsset, setIsGeneratingAsset] = useState(false)
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null)

  const reset = () => {
    setName(''); setCategory('All'); setDescription(''); setAnalysis('')
    setUspInput(''); setUsps([]); setAssets([]); setErrors({})
    setIsSubmitting(false); setAiPrompt(''); setGeneratedPreview(null)
    setIsGeneratingAsset(false)
  }

  const handleClose = () => { reset(); onClose() }

  const addUsp = () => {
    const trimmed = uspInput.trim()
    if (trimmed && !usps.includes(trimmed)) setUsps((p) => [...p, trimmed])
    setUspInput('')
  }

  const removeUsp = (usp: string) => setUsps((p) => p.filter((u) => u !== usp))

  // Mock S3 upload flow
  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const tempId = `temp-${Date.now()}`
    setAssets((p) => [...p, { id: tempId, url: '', loading: true, source: 'upload' }])
    e.target.value = ''

    try {
      const { uploadUrl, finalUrl } = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      }).then((r) => r.json())

      // "Upload" to fake S3 (localhost mock endpoint)
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })

      setAssets((p) => p.map((a) => (a.id === tempId ? { ...a, url: finalUrl, loading: false } : a)))
    } catch {
      setAssets((p) => p.filter((a) => a.id !== tempId))
    }
  }, [])

  const removeAsset = (id: string) => setAssets((p) => p.filter((a) => a.id !== id))

  // AI asset generation via NanoBanana
  const handleGenerateAsset = async () => {
    if (!aiPrompt.trim()) return
    setIsGeneratingAsset(true)
    setGeneratedPreview(null)

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: aiPrompt.trim(), aspectRatio: '1:1', resolution: '1K' }),
      })
      const data = await res.json()
      if (res.ok && data.generatedImage?.generatedImageUrl) {
        setGeneratedPreview(data.generatedImage.generatedImageUrl)
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setIsGeneratingAsset(false)
    }
  }

  const addToSmartAssets = () => {
    if (!generatedPreview) return
    setAssets((p) => [
      ...p,
      { id: `ai-${Date.now()}`, url: generatedPreview, loading: false, source: 'ai' },
    ])
    setGeneratedPreview(null)
    setAiPrompt('')
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Product name is required'
    return errs
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          description: description.trim() || null,
          usps,
          images: assets.filter((a) => !a.loading).map((a) => a.url),
          colors: [],
        }),
      })
      onCreated(await res.json())
      handleClose()
    } catch {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const uploadedCount = assets.filter((a) => !a.loading).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Create Product</h2>
          </div>
          <div className="w-[60px]" />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Product Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Product Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })) }}
              placeholder="e.g. Glow Serum Pro"
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm text-gray-900 dark:text-white dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition ${errors.name ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'}`}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this product do? Who is it for?"
              rows={2}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none transition"
            />
          </div>

          {/* Product Analysis */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Analysis</label>
            <p className="text-xs text-gray-400">Describe the product in depth — target audience, key differentiators, tone, messaging</p>
            <textarea
              value={analysis}
              onChange={(e) => setAnalysis(e.target.value)}
              placeholder="e.g. Premium anti-aging serum for women 30–55. Key ingredients: retinol + hyaluronic acid. USP: results in 7 days. Tone: scientific yet approachable. Main competitor: The Ordinary..."
              rows={4}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none transition"
            />
          </div>

          {/* Selling Points (USPs) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Selling Points (USPs)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={uspInput}
                onChange={(e) => setUspInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUsp() } }}
                placeholder="e.g. Free shipping on all orders"
                className="flex-1 px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
              />
              <button
                onClick={addUsp}
                disabled={!uspInput.trim()}
                className="px-3.5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {usps.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {usps.map((usp) => (
                  <span key={usp} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium rounded-full border border-violet-100 dark:border-violet-800">
                    <Tag className="w-3 h-3" />
                    {usp}
                    <button onClick={() => removeUsp(usp)} className="ml-0.5 text-violet-400 hover:text-violet-700 dark:hover:text-violet-200 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Assets ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Smart Assets</label>
              {uploadedCount > 0 && (
                <span className="text-xs text-gray-400">{uploadedCount} asset{uploadedCount !== 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Assets grid */}
            <div className="grid grid-cols-4 gap-3">
              {/* Upload button — always first */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 flex flex-col items-center justify-center gap-1 transition-all group"
              >
                <Upload className="w-5 h-5 text-gray-300 dark:text-gray-500 group-hover:text-violet-400 transition-colors" />
                <span className="text-[10px] font-medium text-gray-300 dark:text-gray-500 group-hover:text-violet-400 transition-colors">Upload</span>
              </button>

              {assets.map((asset) => (
                <div key={asset.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 group">
                  {asset.loading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <Image src={asset.url} alt="" fill className="object-cover" sizes="120px" />
                      {/* AI badge */}
                      {asset.source === 'ai' && (
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-violet-600/90 rounded text-[9px] text-white font-medium flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> AI
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <button
                        onClick={() => removeAsset(asset.id)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

            {/* Saved Smart Assets picker */}
            <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <BookImage className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Add from Smart Assets</span>
              </div>
              <SmartAssetsPicker
                selectedUrls={assets.filter((a) => !a.loading).map((a) => a.url)}
                onSelect={(url) => {
                  if (!assets.find((a) => a.url === url)) {
                    setAssets((p) => [...p, { id: `sa-${Date.now()}`, url, loading: false, source: 'ai' }])
                  }
                }}
                compact
              />
            </div>

            {/* AI Generation section */}
            <div className="border border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Generate with AI</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGenerateAsset() } }}
                  placeholder="Describe the image (e.g. minimalist product shot on white background)..."
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                />
                <button
                  onClick={handleGenerateAsset}
                  disabled={!aiPrompt.trim() || isGeneratingAsset}
                  className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {isGeneratingAsset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Generate
                </button>
              </div>

              {/* Generated preview */}
              {isGeneratingAsset && (
                <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating image...
                </div>
              )}
              {generatedPreview && !isGeneratingAsset && (
                <div className="flex items-start gap-3">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    <Image src={generatedPreview} alt="Generated" fill className="object-cover" sizes="80px" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Image generated based on your prompt</p>
                    <button
                      onClick={addToSmartAssets}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add to Smart Assets
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-xl transition-all shadow-sm shadow-violet-200"
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  )
}
