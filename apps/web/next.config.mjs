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
      // The rebuilt theme groups thirteen pages under a section prefix, and those
      // moves need 301s from the live URLs. They are NOT here yet, and must not be
      // added until the destination routes exist.
      //
      // They were added ahead of the port and shipped, which pointed /privacy,
      // /care-audits, /cqc-compliance and ten others at routes the app does not
      // serve: every one of them became a redirect to a 404. A redirect is only
      // ever as good as its destination, and a 301 to a missing page is strictly
      // worse than no redirect, because it takes a working page off the site.
      //
      // The list lives in the switchover plan; it goes in with the port, in the
      // same deploy that creates /our-services/*, /trust/* and /contact/faq, and
      // audit_pages.py in the theme repo is the check: it follows every redirect
      // and reports the status of where it lands.
      //
      // /contact and /care-policies stay where they are either way.

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
