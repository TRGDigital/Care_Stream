/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Serve modern formats (smaller than PNG/JPEG) wherever next/image is used.
    formats: ['image/avif', 'image/webp'],
    // Cache optimised images at the edge + in the browser for a year. The
    // generated `/_next/image` URLs carry a `&dpl=<deployment>` param, so every
    // deploy busts the cache automatically — there's no staleness risk. Without
    // this, public/ assets inherit `max-age=0, must-revalidate`, so every image
    // re-ran the optimizer and was never browser-cached (a big mobile drag).
    minimumCacheTTL: 31536000,
  },
  experimental: {
    // Guarantee per-icon / per-export tree-shaking for these barrel packages.
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  // Long-cache static brand assets (logos, favicons, fonts, raw images served as
  // plain <img>). Files in public/ otherwise get no cache headers on Vercel, so
  // they revalidate on every request.
  async headers() {
    return [
      {
        source: '/:path*.(jpg|jpeg|png|gif|webp|avif|svg|ico|woff|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig
