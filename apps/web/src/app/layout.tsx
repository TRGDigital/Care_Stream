import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://carestreamai.co.uk'),
  title: {
    default:  'CareStreamAI — AI Policy Access for UK Care Homes',
    template: '%s | CareStreamAI',
  },
  description: 'Give every member of your care team instant access to your policies in any language, 24/7. AI-powered policy access via WhatsApp, email and chat — built for UK care providers.',
  keywords:    ['care home policies', 'CQC compliance', 'care AI', 'multilingual care', 'UK care training'],
  authors:     [{ name: 'CareStreamAI', url: 'https://carestreamai.co.uk' }],
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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
