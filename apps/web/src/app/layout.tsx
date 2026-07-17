import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { CookieConsent } from '@/components/marketing/cookie-consent'
import { DemoModalRoot } from '@/components/marketing/demo-modal'
import { AltMapProvider } from '@/components/alt-map-provider'
import { getSiteAltMap } from '@/lib/image-alts'
import { JsonLd } from '@/components/json-ld'
import { organizationSchema, webSiteSchema, siteNavigationSchema } from '@/lib/schema'
import { SpeedInsights } from '@vercel/speed-insights/next'

// `variable` exposes the self-hosted font as a CSS var so Tailwind's `font-sans`
// (and the html-level default) resolve to it — removing any reliance on a
// runtime Google Fonts load for the literal "Inter" family.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

export const metadata: Metadata = {
  metadataBase: new URL('https://www.carestreamai.com'),
  title: {
    default:  'CareStreamAI — AI Policy Access for UK Care Homes',
    template: '%s | CareStreamAI',
  },
  description: 'Give every member of your care team instant access to your policies in any language, 24/7. AI-powered policy access via chat, email and voice — built for UK care providers.',
  keywords:    ['care home policies', 'CQC compliance', 'care AI', 'multilingual care', 'UK care training'],
  authors:     [{ name: 'CareStreamAI', url: 'https://www.carestreamai.com' }],
  openGraph: {
    type:      'website',
    siteName:  'CareStreamAI',
    locale:    'en_GB',
    images:    [{ url: '/og-image.png', width: 1200, height: 630, alt: 'CareStreamAI — AI Policy Access for UK Care Homes' }],
  },
  twitter: {
    card:    'summary_large_image',
    images:  ['/og-image.png'],
  },
  robots: {
    index:  true,
    follow: true,
  },
  // PWA: app/manifest.ts is auto-linked by Next; these add the iOS home-screen
  // icon + standalone launch behaviour so the installed hub looks/acts like an app.
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable:        true,
    title:          'CareStream',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#9B52B5',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const altMap = await getSiteAltMap()
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Speed up the analytics handshake without blocking the main thread. */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        {/* Google Tag Manager — deferred to idle (lazyOnload) so it doesn't add
            to mobile Total Blocking Time during load. */}
        <Script id="gtm" strategy="lazyOnload">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-MZ4DJVLH');`}
        </Script>
        {/* NB: GA4 (G-KGFBN80R3W) is fired by the GTM container above via its own
            GA4 tag — that property is managed in GTM, not in code.
            The SEPARATE GA4 property G-0CD7WMQF8B below is loaded directly (it is
            not in the GTM container). Loaded afterInteractive (not the render-
            blocking async <script> Google's snippet uses) so it doesn't add to
            mobile load. If you later move it into GTM, delete these two Scripts. */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-0CD7WMQF8B" strategy="afterInteractive" />
        <Script id="gtag-ga4" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-0CD7WMQF8B');`}
        </Script>
      </head>
      <body className={inter.className}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MZ4DJVLH"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <JsonLd data={[organizationSchema(), webSiteSchema(), siteNavigationSchema()]} />
        <AltMapProvider map={altMap}>
          {children}
        </AltMapProvider>
        <CookieConsent />
        <DemoModalRoot />
        <SpeedInsights />
      </body>
    </html>
  )
}
