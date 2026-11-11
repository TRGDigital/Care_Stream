import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform Console — CareStreamAI',
  // Internal console: keep out of search results (robots.txt does not list /platform).
  robots: { index: false, follow: false },
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
