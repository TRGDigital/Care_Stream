import type { Metadata } from 'next'
// The connect page is for staff with the printed poster only: never for search results.
export const metadata: Metadata = { robots: { index: false, follow: false }, title: 'Connect a tablet' }
export default function TabletLayout({ children }: { children: React.ReactNode }) { return <>{children}</> }
