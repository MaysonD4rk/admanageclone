import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = ['All', 'Sale', 'New Year', 'Beauty', 'Health', 'Food']

const seedAds = [
  { title: 'Summer Flash Sale', category: 'Sale', imageUrl: 'https://picsum.photos/seed/sale1/400/500' },
  { title: 'Year-End Deals', category: 'Sale', imageUrl: 'https://picsum.photos/seed/sale2/400/500' },
  { title: 'Black Friday Special', category: 'Sale', imageUrl: 'https://picsum.photos/seed/sale3/400/500' },
  { title: 'New Year Celebration', category: 'New Year', imageUrl: 'https://picsum.photos/seed/ny1/400/500' },
  { title: 'Happy New Year 2025', category: 'New Year', imageUrl: 'https://picsum.photos/seed/ny2/400/500' },
  { title: 'Glow Serum Ad', category: 'Beauty', imageUrl: 'https://picsum.photos/seed/beauty1/400/500' },
  { title: 'Skincare Routine', category: 'Beauty', imageUrl: 'https://picsum.photos/seed/beauty2/400/500' },
  { title: 'Lipstick Collection', category: 'Beauty', imageUrl: 'https://picsum.photos/seed/beauty3/400/500' },
  { title: 'Vitamin D Supplement', category: 'Health', imageUrl: 'https://picsum.photos/seed/health1/400/500' },
  { title: 'Protein Shake', category: 'Health', imageUrl: 'https://picsum.photos/seed/health2/400/500' },
  { title: 'Organic Smoothie', category: 'Food', imageUrl: 'https://picsum.photos/seed/food1/400/500' },
  { title: 'Artisan Pasta', category: 'Food', imageUrl: 'https://picsum.photos/seed/food2/400/500' },
  { title: 'Cold Brew Coffee', category: 'Food', imageUrl: 'https://picsum.photos/seed/food3/400/500' },
  { title: 'Brand Awareness', category: 'All', imageUrl: 'https://picsum.photos/seed/all1/400/500' },
  { title: 'Product Launch', category: 'All', imageUrl: 'https://picsum.photos/seed/all2/400/500' },
  { title: 'Mega Sale Event', category: 'Sale', imageUrl: 'https://picsum.photos/seed/sale4/400/500' },
]

async function main() {
  console.log('Seeding database...')

  await prisma.ad.deleteMany()
  await prisma.project.deleteMany()
  await prisma.product.deleteMany()

  for (const ad of seedAds) {
    await prisma.ad.create({ data: ad })
  }

  const product = await prisma.product.create({
    data: {
      name: 'Sample Brand',
      brandUrl: 'https://example.com',
      logoUrl: 'https://picsum.photos/seed/logo1/100/100',
      colors: ['#6d28d9', '#a78bfa', '#ffffff'],
      images: [
        'https://picsum.photos/seed/prod1/300/300',
        'https://picsum.photos/seed/prod2/300/300',
        'https://picsum.photos/seed/prod3/300/300',
      ],
    },
  })

  const project = await prisma.project.create({
    data: {
      name: 'Sample Campaign',
      script: 'Discover our amazing products this season!',
      ratio: '9:16',
      style: 'modern',
      productId: product.id,
    },
  })

  await prisma.ad.createMany({
    data: [
      { title: 'Variation 1', category: 'All', imageUrl: 'https://picsum.photos/seed/var1/400/500', projectId: project.id },
      { title: 'Variation 2', category: 'All', imageUrl: 'https://picsum.photos/seed/var2/400/500', projectId: project.id },
      { title: 'Variation 3', category: 'All', imageUrl: 'https://picsum.photos/seed/var3/400/500', projectId: project.id },
      { title: 'Variation 4', category: 'All', imageUrl: 'https://picsum.photos/seed/var4/400/500', projectId: project.id },
    ],
  })

  console.log('Seeding complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
