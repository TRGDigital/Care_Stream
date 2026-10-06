'use client'

import { usePathname } from 'next/navigation'
import { JsonLd } from './json-ld'
import { breadcrumbSchema } from '@/lib/schema'

// Words that are acronyms in the care sector, shown in capitals rather than title case
// ("data-protection-gdpr" reads "Data Protection GDPR", not "Data Protection Gdpr").
const ACRONYMS = new Set(['gdpr', 'cqc', 'coshh', 'riddor', 'dbs', 'dols', 'mca', 'ppe', 'ipc', 'uk', 'nhs', 'dse', 'cpd', 'peg', 'vte', 'who', 'ico', 'dspt', 'lpa', 'nvq', 'hca', 'ai', 'faq', 'dpa', 'hr', 'eol', 'loler'])
const titleCase = (s: string) =>
  s.split('-').map(w => (ACRONYMS.has(w) ? w.toUpperCase() : w.replace(/^\w/, c => c.toUpperCase()))).join(' ')

// Emits a BreadcrumbList for the current path (Home › … › Page). Applied site-wide
// in the marketing layout. Skipped on the homepage (no breadcrumb needed).
export function BreadcrumbsJsonLd() {
  const pathname = usePathname()
  if (!pathname || pathname === '/') return null

  const segments = pathname.split('/').filter(Boolean)
  const items = [{ name: 'Home', path: '/' }]
  let acc = ''
  for (const seg of segments) {
    acc += `/${seg}`
    items.push({ name: titleCase(seg), path: acc })
  }
  return <JsonLd data={breadcrumbSchema(items)} />
}
