import { JsonLd } from './json-ld'
import { breadcrumbSchema } from '@/lib/schema'

/** A BreadcrumbList for a detail page whose section has no index page of its own, or whose
 *  parent is a different page from the one the URL path implies. Home is always the first
 *  crumb. `trail` lists the real, resolvable ancestors then the page itself, with the page's
 *  own title as the last name (the same words as its H1 or title, never the URL slug). */
export function PageBreadcrumbJsonLd({ trail }: { trail: Array<{ name: string; path: string }> }) {
  return <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, ...trail])} />
}
