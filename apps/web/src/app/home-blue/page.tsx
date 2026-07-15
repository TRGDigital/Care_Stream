import './blue-theme.css'
import type { Metadata } from 'next'
import HomePage from '@/app/page'

/*
 * THROWAWAY BLUE PREVIEW of the marketing homepage.
 *
 * This is a private dummy so the owner can eyeball whether a bright-blue accent
 * "pops" better than the current brand purple. It renders the EXACT same
 * `HomePage` component as the real homepage (src/app/page.tsx) — every section,
 * same order, zero drift — wrapped in a single `.theme-blue` container. All the
 * blue comes from the locally-scoped overrides in ./blue-theme.css; nothing in
 * the real site, tailwind.config.ts or globals.css is touched.
 *
 * Placed at root (not inside the (marketing) route group) on purpose: the real
 * homepage is a root, self-contained page that renders its own nav + footer.
 * The (marketing) layout injects its own nav/footer/breadcrumbs, which would
 * duplicate the chrome. Root placement mirrors the real homepage exactly.
 */

export const metadata: Metadata = {
  title: 'CareStreamAI (Blue Theme Preview) · Internal',
  description: 'Private internal preview of the homepage with a bright-blue accent instead of the brand purple. Not for indexing.',
  robots: { index: false, follow: false },
}

export default async function HomeBluePreviewPage() {
  return <div className="theme-blue">{await HomePage()}</div>
}
