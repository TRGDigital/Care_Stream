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

      // ── Content theme switchover: NO redirects are needed ─────────────────
      // This note used to say thirteen redirects were still to come "with the
      // port". They are not coming, and adding them would be a mistake.
      //
      // The rebuilt theme groups those pages under /our-services/, /trust/ and
      // /contact/ prefixes. Len's rule for the switchover is that no current URL
      // changes: the port swaps the TEMPLATE and the pages keep the flat URLs they
      // already have. All thirteen (/care-audits, /cqc-compliance, /hr-policies,
      // /policy-gap-detection, /cqc-staff-questions, /cqc-report-chat,
      // /business-continuity, /privacy, /terms, /cookies, /dpa, /faq, and
      // /care-policies) are live at those flat paths today and stay there.
      //
      // Why this note matters: the redirects WERE added ahead of the port once and
      // shipped, pointing thirteen working pages at routes the app does not serve.
      // Every one became a 301 to a 404. A redirect is only ever as good as its
      // destination, and a 301 to a missing page is strictly worse than no
      // redirect, because it takes a working page off the site.

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
