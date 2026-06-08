import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { CookieConsent } from '@/components/marketing/cookie-consent'
import { AltMapProvider } from '@/components/alt-map-provider'
import { getSiteAltMap } from '@/lib/image-alts'
import { JsonLd } from '@/components/json-ld'
import { organizationSchema, webSiteSchema, siteNavigationSchema } from '@/lib/schema'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://carestreamai.com'),
  title: {
    default:  'CareStreamAI — AI Policy Access for UK Care Homes',
    template: '%s | CareStreamAI',
  },
  description: 'Give every member of your care team instant access to your policies in any language, 24/7. AI-powered policy access via WhatsApp, email and chat — built for UK care providers.',
  keywords:    ['care home policies', 'CQC compliance', 'care AI', 'multilingual care', 'UK care training'],
  authors:     [{ name: 'CareStreamAI', url: 'https://carestreamai.com' }],
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
    icon:  '/icon-192.png',
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
    <html lang="en">
      <head>
        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-MZ4DJVLH');`}
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
      </body>
    </html>
  )
}
