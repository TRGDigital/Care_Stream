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
  // Legacy path that never had a page — the real page is /trust. 301 so any
  // external link or stale index consolidates onto the canonical URL.
  async redirects() {
    return [
      { source: '/trust-security', destination: '/trust', permanent: true },

      // ── Content theme switchover ──────────────────────────────────────────
      // The rebuilt theme groups these pages under a section prefix. Each source
      // below is a URL that is live and indexed TODAY, so it gets a 301 rather
      // than being dropped: external links, the CQC directory listings and any
      // stale search result keep working and the ranking consolidates onto the
      // new path. /contact and /care-policies are deliberately absent — they stay
      // exactly where they are.
      { source: '/business-continuity',  destination: '/our-services/business-continuity',  permanent: true },
      { source: '/care-audits',          destination: '/our-services/care-audits',          permanent: true },
      { source: '/cqc-compliance',       destination: '/our-services/cqc-compliance',       permanent: true },
      { source: '/cqc-report-chat',      destination: '/our-services/cqc-report-chat',      permanent: true },
      { source: '/cqc-staff-questions',  destination: '/our-services/cqc-staff-questions',  permanent: true },
      { source: '/hr-policies',          destination: '/our-services/hr-policies',          permanent: true },
      { source: '/policy-gap-detection', destination: '/our-services/policy-gap-detection', permanent: true },

      { source: '/privacy',              destination: '/trust/privacy',                     permanent: true },
      { source: '/terms',                destination: '/trust/terms',                       permanent: true },
      { source: '/dpa',                  destination: '/trust/dpa',                         permanent: true },
      { source: '/cookies',              destination: '/trust/cookies',                     permanent: true },

      { source: '/faq',                  destination: '/contact/faq',                       permanent: true },

      // ── Help centre sunset ────────────────────────────────────────────────
      // The 32 /help URLs are being retired with the theme (Len's call). Left
      // alone they would all 404, which wastes the crawl budget and drops any
      // link equity they hold, so every one of them lands on the home page.
      // Written as two rules because ":path*" alone does not match the bare
      // /help index. 308 (permanent) so the retirement is unambiguous.
      { source: '/help',        destination: '/', permanent: true },
      { source: '/help/:path*', destination: '/', permanent: true },
    ]
  },
}

export default nextConfig
