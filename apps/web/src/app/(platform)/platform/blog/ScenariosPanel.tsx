'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ALL_SCENARIOS } from '@/data/scenarios'
import { plainText, type Scenario } from '@/lib/scenarios'
import kwVolumes from '@/lib/keyword-volumes.json'

// The Scenarios tab: every scenario page with its meta information, keywords and content outline.
// Pages live in src/data/scenarios/*.json (the first 93) or in the database (written by the nightly routine). "published" ones are public at
// /scenarios/<slug> and in the sitemap, "draft" ones are only visible here through Preview. Database pages have a Publish button.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const SITE = 'https://www.carestreamai.com'
const volumes = kwVolumes.volumes as Record<string, number>

function wordCount(s: Scenario): number {
  const parts: string[] = []
  const walk = (o: unknown, key = ''): void => {
    if (typeof o === 'string') { if (!/^(slug|status|image|href|type)$/.test(key) && !/^https?:/.test(o)) parts.push(plainText(o)); return }
    if (Array.isArray(o)) { o.forEach(x => walk(x, key)); return }
    if (o && typeof o === 'object') Object.entries(o as Record<string, unknown>).forEach(([k, v]) => { if (k !== 'read_next') walk(v, k) })
  }
  walk(s)
  return parts.join(' ').split(/\s+/).filter(Boolean).length
}

function linkCount(s: Scenario): { internal: number; external: number } {
  const hrefs: string[] = []
  const json = JSON.stringify(s)
  for (const m of json.matchAll(/href=\\"([^\\"]+)\\"/g)) hrefs.push(m[1])
  s.feature_links.forEach(f => hrefs.push(f.href))
  s.how.blocks.forEach(b => b.tags.forEach(t => hrefs.push(t.href)))
  const uniq = Array.from(new Set(hrefs))
  return { internal: uniq.filter(h => h.startsWith('/')).length, external: uniq.filter(h => h.startsWith('http')).length }
}

const Len = ({ n, lo, hi }: { n: number; lo: number; hi: number }) => (
  <span className={`ml-2 text-xs ${n >= lo && n <= hi ? 'text-green-700' : 'text-amber-700'}`}>{n} characters</span>
)

export function ScenariosPanel({ token }: { token: string }) {
  // Pages from the repository plus the ones the nightly routine writes to the database. A database page can be published or unpublished here.
  const [dbList, setDbList] = useState<Scenario[]>([])
  const dbSlugs = useMemo(() => new Set(dbList.map(s => s.slug)), [dbList])
  const list = useMemo(() => {
    const m = new Map<string, Scenario>()
    ALL_SCENARIOS.forEach(s => m.set(s.slug, s))
    dbList.forEach(s => m.set(s.slug, s))
    return Array.from(m.values()).sort((a, b) => a.order - b.order)
  }, [dbList])
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const published = list.filter(s => s.status === 'published')
  const dbDrafts = dbList.filter(s => s.status === 'draft').length

  const loadDb = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/admin/scenarios`, { headers: { Authorization: `Bearer ${token}` } })
      const j = await r.json()
      if (r.ok) setDbList((j?.data?.scenarios ?? []) as Scenario[])
    } catch { /* the repository pages still show */ }
  }, [token])
  useEffect(() => { loadDb() }, [loadDb])

  async function setStatus(slug: string, status: 'published' | 'draft') {
    if (status === 'published' && !window.confirm('Publish this scenario? It goes live on the site (hub, home page and sitemap) within about five minutes.')) return
    setBusy(true); setMsg(null)
    try {
      const r = await fetch(`${API_URL}/admin/scenarios/${encodeURIComponent(slug)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) })
      const j = await r.json()
      if (!r.ok) setMsg(j?.error?.message ?? 'The change failed.')
      else { setMsg(status === 'published' ? `Published ${slug}. It is live within about five minutes. Use "Request indexing" below once it is live.` : `Unpublished ${slug}. It is a draft again.`); await loadDb() }
    } catch (e: any) { setMsg(`The change failed: ${e?.message ?? 'unknown error'}`) }
    setBusy(false)
  }

  async function requestIndexing() {
    if (!published.length) return
    setBusy(true); setMsg(null)
    const urls = [`${SITE}/scenarios`, ...published.map(s => `${SITE}/scenarios/${s.slug}`)]
    try {
      const r = await fetch(`${API_URL}/admin/seo-index/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ urls }) })
      const j = await r.json()
      if (!r.ok) setMsg(j?.error?.message ?? 'The request failed.')
      else {
        const res = (j?.data?.results ?? []) as { url: string; status: string }[]
        const ok = res.filter(x => x.status === 'submitted').length
        setMsg(`Requested indexing for ${j?.data?.requested ?? urls.length} URLs: ${ok} submitted${j?.data?.balance_before != null ? `, ${j.data.balance_before} credits before` : ''}. ${res.filter(x => x.status !== 'submitted').map(x => `${x.url.replace(SITE, '')}: ${x.status}`).join('; ')}`)
      }
    } catch (e: any) { setMsg(`The request failed: ${e?.message ?? 'unknown error'}`) }
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm text-neutral-mid">
          Situation led pages at <code className="rounded bg-neutral-light px-1 py-0.5 text-xs">/scenarios/&hellip;</code>, shown on the home page under &ldquo;Why should I use CareStream?&rdquo;.
          {' '}{published.length} published, {list.length - published.length} draft{dbDrafts ? ` (${dbDrafts} written by the nightly routine, waiting for you)` : ''}. Open a row to see its meta information, keywords and content outline.
        </p>
        <div className="flex items-center gap-2">
          <a href="/scenarios" target="_blank" rel="noopener noreferrer" className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:bg-neutral-light">Open hub</a>
          <button type="button" disabled={busy || !published.length} onClick={requestIndexing}
                  className="rounded-md bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
            {busy ? 'Requesting...' : 'Request indexing for published scenarios'}
          </button>
        </div>
      </div>
      {msg && <p className="rounded-md bg-neutral-light px-3 py-2 text-xs text-neutral-dark">{msg}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {list.map(s => {
          const isOpen = open === s.slug
          const links = linkCount(s)
          const pv = volumes[s.primary_keyword.toLowerCase()]
          return (
            <div key={s.slug}>
              <div className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-neutral-light/50">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(isOpen ? null : s.slug)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-mid">#{s.order}</span>
                    <p className="text-sm font-medium text-neutral-dark">{plainText(s.title)}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-mid">
                    /scenarios/{s.slug} &middot; primary keyword: <b>{s.primary_keyword}</b>{pv != null ? ` (${pv.toLocaleString('en-GB')} a month)` : ''} &middot; {wordCount(s).toLocaleString('en-GB')} words
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                  <a href={`/platform/scenarios/preview/${s.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark">Preview</a>
                  <a href={`/platform/scenarios/preview/${s.slug}?yellowkws`} target="_blank" rel="noopener noreferrer" className="rounded-md border border-yellow-300 bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-900 hover:bg-yellow-200">Keywords</a>
                  {dbSlugs.has(s.slug) && (
                    s.status === 'published'
                      ? <button type="button" disabled={busy} onClick={() => setStatus(s.slug, 'draft')} className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50">Unpublish</button>
                      : <button type="button" disabled={busy} onClick={() => setStatus(s.slug, 'published')} className="rounded-md bg-teal px-2 py-1 text-xs font-semibold text-white hover:bg-teal/90 disabled:opacity-50">Publish</button>
                  )}
                  {s.status === 'published' && <a href={`/scenarios/${s.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark">Live</a>}
                  <button type="button" onClick={() => setOpen(isOpen ? null : s.slug)} className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-neutral-dark hover:bg-neutral-light">{isOpen ? 'Close' : 'Open'}</button>
                </div>
              </div>

              {isOpen && (
                <div className="grid gap-6 bg-neutral-light/40 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="min-w-0 space-y-5 text-sm">
                    <section>
                      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-mid">Meta information</h4>
                      <dl className="space-y-2">
                        <div><dt className="text-xs text-neutral-mid">Meta title<Len n={s.meta_title.length} lo={30} hi={62} /></dt><dd className="font-medium">{s.meta_title}</dd></div>
                        <div><dt className="text-xs text-neutral-mid">Meta description<Len n={s.meta_description.length} lo={110} hi={156} /></dt><dd>{s.meta_description}</dd></div>
                        <div><dt className="text-xs text-neutral-mid">Address</dt><dd>{SITE}/scenarios/{s.slug}</dd></div>
                        <div><dt className="text-xs text-neutral-mid">Social image alt text</dt><dd>{s.image_alt}</dd></div>
                      </dl>
                    </section>
                    <section>
                      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-mid">Keywords (UK searches a month)</h4>
                      <p><mark className="rounded bg-yellow-200 px-1.5 outline outline-2 outline-amber-400">{s.primary_keyword}</mark> <span className="text-xs text-neutral-mid">{pv != null ? pv.toLocaleString('en-GB') : 'no data'} (primary)</span></p>
                      <p className="mt-1.5 flex flex-wrap gap-1.5">
                        {s.secondary_keywords.map(k => (
                          <span key={k} className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs">{k} <span className="text-neutral-mid">{volumes[k.toLowerCase()]?.toLocaleString('en-GB') ?? '-'}</span></span>
                        ))}
                      </p>
                    </section>
                    <section>
                      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-mid">Page content</h4>
                      <p><b>H1:</b> {plainText(s.title)}</p>
                      <p className="mt-1"><b>Opening:</b> {plainText(s.lede)}</p>
                      <p className="mt-1"><b>Home page card:</b> {s.card_title} &mdash; {s.card_snippet}</p>
                      <p className="mt-1 text-xs text-neutral-mid">{links.internal} internal links, {links.external} external links. Read next: {s.read_next.join(', ')}</p>
                    </section>
                    <section>
                      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-mid">The scenario story</h4>
                      <ol className="list-decimal space-y-0.5 pl-5">{s.trail.map((t, i) => <li key={i}><span className="text-xs font-semibold text-neutral-mid">{t.when}:</span> {t.text}</li>)}</ol>
                    </section>
                    <section>
                      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-mid">How it works</h4>
                      <ul className="list-disc space-y-0.5 pl-5">{s.how.blocks.map((b, i) => <li key={i}>{b.heading}</li>)}</ul>
                    </section>
                    <section>
                      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-mid">Talk it through (questions)</h4>
                      <ul className="list-disc space-y-0.5 pl-5">{s.talk.items.map((t, i) => <li key={i}>{t.q}</li>)}</ul>
                    </section>
                    <section>
                      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-mid">FAQs</h4>
                      <ul className="list-disc space-y-0.5 pl-5">{s.faqs.groups.flatMap(g => g.items).map((f, i) => <li key={i}>{f.q}</li>)}</ul>
                    </section>
                    <section>
                      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-mid">Guide</h4>
                      <p>{s.guide.heading}</p>
                      <ul className="mt-1 list-disc pl-5">{s.guide.sections.map((g, i) => <li key={i}>{g.h3}</li>)}</ul>
                    </section>
                  </div>
                  <div className="space-y-2">
                    <img src={s.image} alt={s.image_alt} className="w-full rounded-lg border border-gray-200" />
                    <p className="text-xs text-neutral-mid">Home page card and social share image</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
