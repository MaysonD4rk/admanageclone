export const MOCK_ADS = [
  { id: 'm1', title: 'Summer Flash Sale', category: 'Sale', imageUrl: 'https://picsum.photos/seed/sale1/400/500', createdAt: new Date().toISOString() },
  { id: 'm2', title: 'Year-End Deals', category: 'Sale', imageUrl: 'https://picsum.photos/seed/sale2/400/500', createdAt: new Date().toISOString() },
  { id: 'm3', title: 'Black Friday Special', category: 'Sale', imageUrl: 'https://picsum.photos/seed/sale3/400/500', createdAt: new Date().toISOString() },
  { id: 'm4', title: 'New Year Celebration', category: 'New Year', imageUrl: 'https://picsum.photos/seed/ny1/400/500', createdAt: new Date().toISOString() },
  { id: 'm5', title: 'Happy New Year 2025', category: 'New Year', imageUrl: 'https://picsum.photos/seed/ny2/400/500', createdAt: new Date().toISOString() },
  { id: 'm6', title: 'Glow Serum Ad', category: 'Beauty', imageUrl: 'https://picsum.photos/seed/beauty1/400/500', createdAt: new Date().toISOString() },
  { id: 'm7', title: 'Skincare Routine', category: 'Beauty', imageUrl: 'https://picsum.photos/seed/beauty2/400/500', createdAt: new Date().toISOString() },
  { id: 'm8', title: 'Lipstick Collection', category: 'Beauty', imageUrl: 'https://picsum.photos/seed/beauty3/400/500', createdAt: new Date().toISOString() },
  { id: 'm9', title: 'Vitamin D Supplement', category: 'Health', imageUrl: 'https://picsum.photos/seed/health1/400/500', createdAt: new Date().toISOString() },
  { id: 'm10', title: 'Protein Shake', category: 'Health', imageUrl: 'https://picsum.photos/seed/health2/400/500', createdAt: new Date().toISOString() },
  { id: 'm11', title: 'Organic Smoothie', category: 'Food', imageUrl: 'https://picsum.photos/seed/food1/400/500', createdAt: new Date().toISOString() },
  { id: 'm12', title: 'Artisan Pasta', category: 'Food', imageUrl: 'https://picsum.photos/seed/food2/400/500', createdAt: new Date().toISOString() },
  { id: 'm13', title: 'Cold Brew Coffee', category: 'Food', imageUrl: 'https://picsum.photos/seed/food3/400/500', createdAt: new Date().toISOString() },
  { id: 'm14', title: 'Brand Awareness', category: 'All', imageUrl: 'https://picsum.photos/seed/all1/400/500', createdAt: new Date().toISOString() },
  { id: 'm15', title: 'Product Launch', category: 'All', imageUrl: 'https://picsum.photos/seed/all2/400/500', createdAt: new Date().toISOString() },
  { id: 'm16', title: 'Mega Sale Event', category: 'Sale', imageUrl: 'https://picsum.photos/seed/sale4/400/500', createdAt: new Date().toISOString() },
]

export const MOCK_PROJECTS = [
  {
    id: 'mp1',
    name: 'Sample Campaign',
    ratio: '9:16',
    style: 'modern',
    createdAt: new Date().toISOString(),
    ads: [
      { id: 'ma1', title: 'Variation 1', imageUrl: 'https://picsum.photos/seed/var1/400/500', category: 'All' },
      { id: 'ma2', title: 'Variation 2', imageUrl: 'https://picsum.photos/seed/var2/400/500', category: 'All' },
      { id: 'ma3', title: 'Variation 3', imageUrl: 'https://picsum.photos/seed/var3/400/500', category: 'All' },
      { id: 'ma4', title: 'Variation 4', imageUrl: 'https://picsum.photos/seed/var4/400/500', category: 'All' },
    ],
  },
]

export const MOCK_PRODUCTS = [
  {
    id: 'mpr1',
    name: 'Sample Brand',
    brandUrl: 'https://example.com',
    logoUrl: 'https://picsum.photos/seed/logo1/100/100',
    colors: ['#6d28d9', '#a78bfa', '#ffffff'],
    images: [
      'https://picsum.photos/seed/prod1/300/300',
      'https://picsum.photos/seed/prod2/300/300',
      'https://picsum.photos/seed/prod3/300/300',
    ],
    createdAt: new Date().toISOString(),
  },
]
