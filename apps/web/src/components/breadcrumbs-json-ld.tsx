'use client'

import { usePathname } from 'next/navigation'
import { JsonLd } from './json-ld'
import { breadcrumbSchema } from '@/lib/schema'

// Words that are acronyms in the care sector, shown in capitals rather than title case
// ("data-protection-gdpr" reads "Data Protection GDPR", not "Data Protection Gdpr").
const ACRONYMS = new Set(['gdpr', 'cqc', 'coshh', 'riddor', 'dbs', 'dols', 'mca', 'ppe', 'ipc', 'uk', 'nhs', 'dse', 'cpd', 'peg', 'vte', 'who', 'ico', 'dspt', 'lpa', 'nvq', 'hca', 'ai', 'faq', 'dpa', 'hr', 'eol', 'loler'])
const titleCase = (s: string) =>
  s.split('-').map(w => (ACRONYMS.has(w) ? w.toUpperCase() : w.replace(/^\w/, c => c.toUpperCase()))).join(' ')

// Sections whose detail pages are NOT covered by this generic trail. Each of these has no index
// page at its own path (/features, /uses and /collection all return 404), so a trail built from
// path segments would point at a URL that does not exist. Their route files emit their own
// BreadcrumbList instead (components/page-breadcrumb-json-ld.tsx), using the page's real title
// and a parent that does exist.
const OWN_TRAIL = new Set(['features', 'uses', 'collection'])

// Emits a BreadcrumbList for the current path (Home › … › Page). Applied site-wide
// in the marketing layout. Skipped on the homepage (no breadcrumb needed) and on the
// sections above.
export function BreadcrumbsJsonLd() {
  const pathname = usePathname()
  if (!pathname || pathname === '/') return null

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 1 && OWN_TRAIL.has(segments[0])) return null
  const items = [{ name: 'Home', path: '/' }]
  let acc = ''
  for (const seg of segments) {
    acc += `/${seg}`
    items.push({ name: titleCase(seg), path: acc })
  }
  return <JsonLd data={breadcrumbSchema(items)} />
}
