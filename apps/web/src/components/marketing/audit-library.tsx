'use client'

import { useState } from 'react'
import Link from 'next/link'
import './audit-library.css'
import { AUDIT_CATALOGUE, SERVICE_LABEL } from '@/lib/audit-catalogue'
import { AUDIT_PAGE_SLUGS } from '@/lib/audit-pages'

// The public library of free audits, labelled with the care services each one suits, on /care-audits.
// Every card is in the server HTML (this renders on the server too); the chips only narrow what is shown.

const FREQ: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', periodic: 'Periodic' }
const SCOPE: Record<string, string> = { resident: 'Per person', staff: 'Per staff member', room: 'Per room' }

export function AuditLibrary() {
  const [service, setService] = useState('all')
  const [query, setQuery] = useState('')
  const counts: Record<string, number> = {}
  for (const a of AUDIT_CATALOGUE) for (const s of a.services) counts[s] = (counts[s] ?? 0) + 1
  const keys = Object.keys(SERVICE_LABEL).filter(k => counts[k])
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const shown = AUDIT_CATALOGUE.filter(a =>
    (service === 'all' || a.services.includes(service)) &&
    words.every(w => (a.name + ' ' + a.description).toLowerCase().includes(w)))
  return (
    <section className="audlib bg-white py-20" id="audit-library" aria-labelledby="audit-library-h">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-xs font-bold uppercase tracking-[0.13em] text-teal">Free audit library</p>
        <h2 id="audit-library-h" className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-dark md:text-4xl">
          90+ free audits, labelled by care service
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-neutral-mid">
          Every audit here is free to run on a free CareStream account: scored sections, recorded findings, actions and a report. No card needed.
          Pick your service to see the audits that suit it.
        </p>
        <label className="tsearch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
          <input type="search" value={query} onChange={e => setQuery(e.target.value)}
                 placeholder={`Search 90+ audits, e.g. MAR chart, fire safety, medication...`} aria-label="Search the free audits by name" />
        </label>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter audits by care service">
          <button type="button" onClick={() => setService('all')} aria-pressed={service === 'all'}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${service === 'all' ? 'border-teal bg-teal text-white' : 'border-gray-200 text-neutral-dark hover:border-teal'}`}>
            All services ({AUDIT_CATALOGUE.length})
          </button>
          {keys.map(k => (
            <button key={k} type="button" onClick={() => setService(k)} aria-pressed={service === k}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${service === k ? 'border-teal bg-teal text-white' : 'border-gray-200 text-neutral-dark hover:border-teal'}`}>
              {SERVICE_LABEL[k]} ({counts[k]})
            </button>
          ))}
        </div>
        <p className="mt-5 text-sm text-neutral-mid" aria-live="polite">
          {query || service !== 'all' ? `${shown.length} audit${shown.length === 1 ? '' : 's'} found` : ''}
        </p>
        {shown.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-neutral-light/50 p-6 text-sm text-neutral-mid">
            <p className="font-semibold text-neutral-dark">We do not have an audit with that name yet.</p>
            <p className="mt-1">Try fewer words, or pick a care service above. If the audit you need is missing, <Link href="/contact" className="font-semibold text-teal underline underline-offset-2">tell us which one</Link> and we will consider adding it.</p>
          </div>
        )}
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(a => (
            <li key={a.slug} className="flex flex-col rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                <span className="rounded-full bg-teal/10 px-2 py-0.5 text-teal">{FREQ[a.frequency] ?? a.frequency}</span>
                {SCOPE[a.scope] && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-neutral-mid">{SCOPE[a.scope]}</span>}
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">Free</span>
              </div>
              <h3 className="mt-3 text-lg font-bold leading-snug text-neutral-dark">{a.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-mid">{a.description}</p>
              <p className="mt-3 text-xs text-neutral-mid">
                <span className="font-semibold text-neutral-dark">For: </span>
                {a.services.length === Object.keys(SERVICE_LABEL).length ? 'every care service' : a.services.map(s => SERVICE_LABEL[s] ?? s).join(', ')}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={`/register?tier=free&source=audit-${a.slug}`} className="inline-flex w-fit items-center rounded-lg border border-teal px-3 py-1.5 text-sm font-semibold text-teal hover:bg-teal-light/40">
                  Run it free
                </Link>
                {AUDIT_PAGE_SLUGS.has(a.slug) && (
                  <Link href={`/care-audits/${a.slug}`} className="inline-flex w-fit items-center rounded-lg bg-teal px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-dark">
                    See this audit
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
