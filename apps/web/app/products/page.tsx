'use client'

import { useState, useEffect } from 'react'
import { Package, Plus } from 'lucide-react'
import ProductCard from '@/components/products/ProductCard'
import AddProductModal, { type CreatedProduct } from '@/components/modals/AddProductModal'
import { MOCK_PRODUCTS } from '@/lib/mock-data'

type Product = Parameters<typeof ProductCard>[0]['product']

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => setProducts(data))
      .catch(() => setProducts(MOCK_PRODUCTS as Product[]))
      .finally(() => setIsLoading(false))
  }, [])

  const handleCreated = (product: CreatedProduct) => {
    setProducts((prev) => [product as unknown as Product, ...prev])
  }

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your product catalog and brand assets</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm shadow-violet-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-violet-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">No products yet</h3>
            <p className="text-gray-400 text-sm mt-1">Create your first product to start building campaigns</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        )}
      </div>

      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
      />
    </>
  )
}
