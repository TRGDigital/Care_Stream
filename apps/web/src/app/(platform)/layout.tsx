import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform Console — CareStreamAI',
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
