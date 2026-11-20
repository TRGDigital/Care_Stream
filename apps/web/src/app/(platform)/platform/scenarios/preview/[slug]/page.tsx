'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getPlatformToken, createPlatformClient } from '@/lib/platform-api'
import { ScenarioPageView } from '@/components/marketing/scenario-page'
import { KeywordHighlighter } from '@/components/marketing/keyword-highlighter'
import { getScenarioReadNext } from '@/lib/scenario-readnext'
import type { Scenario } from '@/lib/scenarios'
import type { ScenarioReadNext } from '@/components/marketing/scenario-page'

// Draft preview for a scenario page. Drafts are not served by the public site, so this page
// checks the platform admin token and then loads the page content (a separate chunk that
// is only fetched here) and shows it in the live design. Add ?yellowkws to the address to
// highlight the page's target keywords. Pages in the database are published with the Publish button in /platform/blog, Scenarios.

export default function ScenarioDraftPreview() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug ?? '')
  const [s, setS] = useState<Scenario | null>(null)
  const [readNext, setReadNext] = useState<ScenarioReadNext[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'noauth'>('loading')

  useEffect(() => {
    const token = getPlatformToken()
    if (!token) { setState('noauth'); return }
    // A valid platform token is required: this call fails for anything else. It is a small
    // admin call on purpose (the blog list took about 20 seconds and left this page loading).
    createPlatformClient(token).searchMisses.list(1).then(async () => {
      const mod = await import('@/data/scenarios')
      let found = mod.getAnyScenario(slug)
      if (!found) {
        // Pages written by the nightly routine live in the database.
        try {
          const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/admin/scenarios/${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${token}` } })
          if (r.ok) found = ((await r.json())?.data?.scenario ?? null) as Scenario | null
        } catch { /* fall through to "no scenario" */ }
      }
      setS(found); setState(found ? 'ok' : 'missing')
      if (found) getScenarioReadNext(found.read_next).then(setReadNext).catch(() => setReadNext([]))
    }).catch(() => setState('noauth'))
  }, [slug])

  if (state === 'loading') return <p style={{ padding: 40 }}>Loading the scenario...</p>
  if (state === 'noauth') return <p style={{ padding: 40 }}>Sign in to the platform console first (<Link href="/platform/login">platform login</Link>), then reopen this link.</p>
  if (state === 'missing' || !s) return <p style={{ padding: 40 }}>No scenario with the slug "{slug}".</p>

  return (
    <div>
      <meta name="robots" content="noindex,nofollow" />
      <div style={{ background: '#FFE600', color: '#000', padding: '10px 16px', fontSize: 14, fontWeight: 600, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span>{s.status === 'published' ? 'Published scenario' : 'Draft scenario'}: only you can see this. Add ?yellowkws to the address to highlight the keywords.</span>
        <span>Page status: {s.status}. Slug: {s.slug}. Live address once approved: /scenarios/{s.slug}</span>
      </div>
      <ScenarioPageView s={s} readNext={readNext} />
      <KeywordHighlighter slug={s.slug} keywords={{ primary: s.primary_keyword, secondary: s.secondary_keywords }} />
    </div>
  )
}
