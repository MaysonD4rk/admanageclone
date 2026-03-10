/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      // Placeholder images (demo/seed)
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
      // Mercado Livre CDN
      { protocol: 'https', hostname: 'http2.mlstatic.com' },
      { protocol: 'https', hostname: '*.mlstatic.com' },
      // Amazon product images
      { protocol: 'https', hostname: '*.amazon.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
      // NanoBanana generated images
      { protocol: 'https', hostname: 'tempfile.aiquickdraw.com' },
      { protocol: 'https', hostname: '*.aiquickdraw.com' },
    ],
  },
}

module.exports = nextConfig
