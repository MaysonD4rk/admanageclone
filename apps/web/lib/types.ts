// ─────────────────────────────────────────────────────────
// Shared domain types — single source of truth for the app
// ─────────────────────────────────────────────────────────

export interface SmartAsset {
  id: string
  title: string
  imageUrl: string
  createdAt: string | Date
}

export interface Ad {
  id: string
  title: string
  imageUrl: string
  category: string
  projectId?: string | null
  createdAt?: string | Date
}

export interface Project {
  id: string
  name: string
  script?: string | null
  description?: string | null
  ratio: string
  style: string
  productId?: string | null
  product?: Pick<Product, 'id' | 'name' | 'logoUrl'> | null
  ads: Ad[]
  createdAt: string | Date
}

export interface Product {
  id: string
  name: string
  category: string
  description?: string | null
  usps: string[]
  brandUrl?: string | null
  logoUrl?: string | null
  colors: string[]
  images: string[]
  createdAt: string | Date
  _count?: { projects: number }
}

export interface BrandData {
  name: string
  logoUrl: string
  colors: string[]
  images: string[]
  productId: string
}

// ─── DTOs (Data Transfer Objects) ───────────────────────

export interface CreateSmartAssetInput {
  title?: string
  imageUrl: string
}

export interface CreateProductInput {
  name: string
  category?: string
  description?: string | null
  usps?: string[]
  brandUrl?: string | null
  logoUrl?: string | null
  colors?: string[]
  images?: string[]
}

export interface CreateProjectInput {
  name: string
  script?: string | null
  description?: string | null
  ratio?: string
  style?: string
  productId?: string | null
  category?: string
}

export interface GenerateAdsInput extends CreateProjectInput {
  referenceAssets?: string[]
}

// ─── Web Scraping ─────────────────────────────────────────

export type ScrapingPlatform = 'amazon' | 'mercadolivre' | 'generic'

/** Product data extracted from an e-commerce URL */
export interface ScrapedProduct {
  platform: ScrapingPlatform
  url: string
  /** Extracted product image URLs (product photos only, no logos/icons) */
  images: string[]
  /** Product title if successfully extracted */
  title?: string
}

export interface ScrapingResult {
  success: boolean
  product?: ScrapedProduct
  /** Human-readable error message when success is false */
  error?: string
}

// ─── NanoBanana API ───────────────────────────────────────

export type AspectRatio = '1:1' | '9:16' | '16:9' | 'auto'
export type Resolution = '1K' | '2K' | '4K'
export type OutputFormat = 'jpg' | 'png' | 'webp'

/** Exact request body expected by POST /api/v1/nanobanana/generate-2 */
export interface NanoBananaRequest {
  prompt: string
  imageUrls: string[]
  aspectRatio: string
  resolution: Resolution
  googleSearch: boolean
  outputFormat: OutputFormat
  callBackUrl: string
}

/** Exact response structure returned by NanoBanana */
export interface NanoBananaResponse {
  taskId: string
  paramJson: string
  completeTime: string
  response: {
    originImageUrl: string | null
    resultImageUrl: string
  }
  /** 1 = success; anything else = failure */
  successFlag: number
  errorCode: string | null
  errorMessage: string | null
  operationType: string
  createTime: string
}

/** Input to trigger image generation via NanoBanana */
export interface GenerateImageInput {
  userPrompt: string
  imageUrls?: string[]
  aspectRatio?: AspectRatio
  resolution?: Resolution
  /** When true, the generated image is also saved to Smart Assets */
  saveToSmartAssets?: boolean
}

/** Persisted record of a NanoBanana generation task */
export interface GeneratedImage {
  id: string
  taskId: string
  userPrompt: string
  fullPrompt: string
  generatedImageUrl: string
  originalImageUrl?: string | null
  aspectRatio: string
  resolution: string
  savedToAssets: boolean
  smartAssetId?: string | null
  createdAt: string | Date
}

export interface GenerateImageResult {
  generatedImage: GeneratedImage
  /** Set only when saveToSmartAssets was requested and succeeded */
  smartAssetId?: string
}

// ─── API Response shapes ─────────────────────────────────

export interface SaveSmartAssetResult {
  asset: SmartAsset
  isDuplicate: false
}

export interface DuplicateSmartAssetResult {
  isDuplicate: true
  existingAsset: SmartAsset
}

export type SmartAssetSaveResult = SaveSmartAssetResult | DuplicateSmartAssetResult

export interface GenerateAdsResult {
  projectId: string
  ads: Ad[]
}
