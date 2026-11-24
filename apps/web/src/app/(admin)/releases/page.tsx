'use client'

import { useEffect } from 'react'
import { RELEASES, NEWEST_RELEASE_ID } from '@/data/releases'

export default function ReleasesPage() {
  // Opening this page counts as having seen the latest release (clears the dot on the support menu).
  useEffect(() => { try { if (NEWEST_RELEASE_ID) window.localStorage.setItem('cs-release-seen', NEWEST_RELEASE_ID) } catch { /* storage blocked */ } }, [])
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-neutral-dark">Releases and announcements</h1>
      <p className="mt-1 text-sm text-neutral-mid">What is new in CareStream, newest first.</p>
      <div className="mt-6 space-y-5">
        {RELEASES.map(r => (
          <article key={r.id} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal">{r.date}</p>
            <h2 className="mt-1 text-lg font-bold text-neutral-dark">{r.title}</h2>
            <p className="mt-1 text-sm text-neutral-mid">{r.summary}</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-dark">
              {r.items.map(i => <li key={i}>{i}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}
