'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import CategoryTabs from '@/components/home/CategoryTabs'
import AdCard, { type Ad } from '@/components/home/AdCard'
import BrandFetchModal, { type BrandData } from '@/components/modals/BrandFetchModal'
import RecreateModal from '@/components/modals/RecreateModal'
import { MOCK_ADS } from '@/lib/mock-data'

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [ads, setAds] = useState<Ad[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isBrandFetchOpen, setIsBrandFetchOpen] = useState(false)
  const [isRecreateOpen, setIsRecreateOpen] = useState(false)
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null)
  const [brandData, setBrandData] = useState<BrandData | null>(null)

  const fetchAds = useCallback(async (category: string) => {
    setIsLoading(true)
    try {
      const params = category !== 'All' ? `?category=${encodeURIComponent(category)}` : ''
      const res = await fetch(`/api/ads${params}`)
      if (res.ok) setAds(await res.json())
      else throw new Error()
    } catch {
      const filtered = category === 'All' ? MOCK_ADS : MOCK_ADS.filter((a) => a.category === category)
      setAds(filtered as Ad[])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchAds(activeCategory) }, [activeCategory, fetchAds])

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ad Library</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Browse and recreate high-performing ads</p>
          </div>
          <button
            onClick={() => setIsBrandFetchOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm shadow-violet-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create New Ad
          </button>
        </div>

        <CategoryTabs active={activeCategory} onChange={setActiveCategory} />

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : ads.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} onRecreate={(ad) => { setSelectedAd(ad); setBrandData(null); setIsRecreateOpen(true) }} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/40 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-violet-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">No ads in this category</h3>
            <p className="text-gray-400 text-sm mt-1">Create your first ad to get started</p>
            <button
              onClick={() => setIsBrandFetchOpen(true)}
              className="mt-4 flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Ad
            </button>
          </div>
        )}
      </div>

      <BrandFetchModal
        isOpen={isBrandFetchOpen}
        onClose={() => setIsBrandFetchOpen(false)}
        onProceed={(data) => { setBrandData(data); setSelectedAd(null); setIsRecreateOpen(true); setIsBrandFetchOpen(false) }}
      />
      <RecreateModal
        isOpen={isRecreateOpen}
        onClose={() => { setIsRecreateOpen(false); setSelectedAd(null); setBrandData(null) }}
        brandData={brandData}
        sourceAd={selectedAd}
      />
    </>
  )
}
