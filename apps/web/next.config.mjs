/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Serve modern formats (smaller than PNG/JPEG) wherever next/image is used.
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    // Guarantee per-icon / per-export tree-shaking for these barrel packages.
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
}

export default nextConfig
