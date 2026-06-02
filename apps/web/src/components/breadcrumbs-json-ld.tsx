'use client'

import { usePathname } from 'next/navigation'
import { JsonLd } from './json-ld'
import { breadcrumbSchema } from '@/lib/schema'

const titleCase = (s: string) =>
  s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

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
