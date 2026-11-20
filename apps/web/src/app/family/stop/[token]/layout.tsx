import type { Metadata } from 'next'

// Private tokenised page from a reminder email. Never indexed.
export const metadata: Metadata = {
  title: 'Stop these reminders',
  robots: { index: false, follow: false, nocache: true },
}

export default function StopRemindersLayout({ children }: { children: React.ReactNode }) {
  return children
}
