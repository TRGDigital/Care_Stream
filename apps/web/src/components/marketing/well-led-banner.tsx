'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, GraduationCap, BarChart3, Check } from 'lucide-react'
import { PRODUCTS, PRODUCT_GROUPS, statementFor, topicForPath, showsWellLedBanner, hubHref } from '@/lib/well-led'

const ICONS = { pol: FileText, trn: GraduationCap, evi: BarChart3 }

/** The CQC Well-led banner at the end of searchable content pages (blogs, scenarios, collections, audits, policies, topics).
 *  The message follows the page: a policy page speaks to Governance, an audit page to Learning, a language page to Inclusion. */
export function WellLedBanner() {
  const pathname = usePathname() || ''
  if (!showsWellLedBanner(pathname)) return null
  const topic = topicForPath(pathname)
  const st = statementFor(topic)
  return (
    <aside className="wl-banner mx-auto w-full max-w-content px-6 pb-14 pt-4" aria-label="CQC Well-led">
      <div className="rounded-3xl border border-gray-100 bg-gradient-to-b from-white to-teal-light p-6 shadow-card md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1 basis-96">
            <span className="inline-block rounded-full border border-teal bg-white px-3 py-1 text-xs font-semibold text-teal-dark">
              CQC Well-led · {st.cqcName}
            </span>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight text-neutral-dark md:text-[26px]">{st.bannerHead}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-mid">{st.bannerLine}</p>
          </div>
          <Link href={hubHref(topic, 'banner')} className="rounded-full bg-teal px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-dark">
            How CareStream helps with CQC Well-led
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {PRODUCT_GROUPS.map(g => {
            const Icon = ICONS[g.id]
            return (
              <div key={g.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-teal-light"><Icon size={17} className="text-teal" /></span>
                  <div>
                    <p className="text-sm font-bold leading-tight text-neutral-dark">{g.title}</p>
                    <p className="text-xs text-neutral-mid">{g.sub}</p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {g.items.map(id => {
                    const prod = PRODUCTS[id]
                    const key = st.key.includes(id)
                    return (
                      <li key={id} className="flex items-start gap-2 text-[13px] leading-snug">
                        <span className={`mt-0.5 flex h-[15px] w-[15px] flex-none items-center justify-center rounded-full ${key ? 'bg-teal' : 'bg-teal-light'}`}>
                          <Check size={10} strokeWidth={3} className={key ? 'text-white' : 'text-teal-dark'} />
                        </span>
                        <Link href={prod.href} className={`hover:underline ${key ? 'font-bold text-teal-dark' : 'text-neutral-dark'}`}>{prod.name}</Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-neutral-mid">Highlighted: most relevant to this page. Every product helps build Well-led evidence.</p>
      </div>
    </aside>
  )
}
