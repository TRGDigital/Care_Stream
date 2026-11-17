import type { Metadata } from 'next'

// Private tokenised page for friends and family. Never indexed.
export const metadata: Metadata = {
  title: 'Help us get to know your loved one',
  robots: { index: false, follow: false, nocache: true },
}

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return children
}
