'use client'

import { useState } from 'react'
import Modal from './Modal'
import { Search, Loader2, Globe, Palette, ImageIcon, ArrowRight } from 'lucide-react'
import Image from 'next/image'

export interface BrandData {
  name: string
  logoUrl: string
  colors: string[]
  images: string[]
  productId: string
}

interface BrandFetchModalProps {
  isOpen: boolean
  onClose: () => void
  onProceed: (brandData: BrandData) => void
}

type Step = 'input' | 'loading' | 'result'

export default function BrandFetchModal({ isOpen, onClose, onProceed }: BrandFetchModalProps) {
  const [url, setUrl] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [brandData, setBrandData] = useState<BrandData | null>(null)
  const [error, setError] = useState('')

  const handleClose = () => {
    setUrl('')
    setStep('input')
    setBrandData(null)
    setError('')
    onClose()
  }

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL')
      return
    }
    setError('')
    setStep('loading')

    try {
      const res = await fetch('/api/brand-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      setBrandData(data)
      setStep('result')
    } catch {
      setError('Failed to analyze URL. Please try again.')
      setStep('input')
    }
  }

  const handleProceed = () => {
    if (brandData) {
      handleClose()
      onProceed(brandData)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Analyze Brand" size="lg">
      <div className="p-6">
        {step === 'input' && (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">
              Paste a product URL from Amazon, Shopify, or any e-commerce store and we&apos;ll extract the brand assets automatically.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Product URL</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                    placeholder="https://www.amazon.com/product/..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleAnalyze}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Analyze
                </button>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="border border-dashed border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Supported platforms</p>
              <div className="flex gap-3 flex-wrap">
                {['Amazon', 'Shopify', 'Etsy', 'WooCommerce', 'Magento'].map((p) => (
                  <span key={p} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-violet-600 animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900">Analyzing brand...</p>
              <p className="text-sm text-gray-500 mt-1">Extracting logo, colors, and product images</p>
            </div>
            <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full animate-pulse" style={{ width: '70%' }} />
            </div>
          </div>
        )}

        {step === 'result' && brandData && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                ✓
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">Brand analyzed successfully</p>
                <p className="text-xs text-green-600">{brandData.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Logo */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <Globe className="w-3 h-3" /> Logo
                </div>
                <div className="aspect-square bg-gray-50 border border-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                  <Image src={brandData.logoUrl} alt="Logo" width={80} height={80} className="object-contain rounded-lg" />
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <Palette className="w-3 h-3" /> Colors
                </div>
                <div className="aspect-square bg-gray-50 border border-gray-100 rounded-xl p-2 flex flex-col gap-2 justify-center">
                  {brandData.colors.map((color, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md border border-gray-200 flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-[10px] text-gray-500 font-mono">{color}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Images */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <ImageIcon className="w-3 h-3" /> Images
                </div>
                <div className="aspect-square bg-gray-50 border border-gray-100 rounded-xl overflow-hidden grid grid-cols-2 gap-0.5 p-0.5">
                  {brandData.images.slice(0, 4).map((img, i) => (
                    <div key={i} className="relative overflow-hidden rounded-sm">
                      <Image src={img} alt={`Product ${i + 1}`} fill className="object-cover" sizes="60px" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('input')}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Try Another URL
              </button>
              <button
                onClick={handleProceed}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm py-2.5 rounded-xl transition-colors"
              >
                Create Ad <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
