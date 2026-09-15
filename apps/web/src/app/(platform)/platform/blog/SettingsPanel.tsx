'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Check, ExternalLink } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// The 11 care-setting pages. Their copy used to live in TypeScript, so changing a sentence
// needed a deploy; this is where it is edited now.
//
// Only the words are exposed. The config also carries icon keys and the slug, which are how
// the page is built rather than what it says, and editing those here would be a way to break
// a page rather than improve it. They are preserved untouched on save.

interface Row { slug: string; label: string; status: string; exists: boolean; sort: number; updated_at?: string }
interface Item { title: string; body: string; iconKey?: string }
interface Config {
  label: string
  hero: { h1: string; subtitle: string }
  challenge: { h2: string; para1: string; para2: string; items: Item[] }
  servicesH2: string
  scenarios: { h2: string; sub: string; items: { tag: string; body: string }[] }
  deepDive: { label: string; h2: string; para1: string; para2: string; panelH3: string; panelBody: string; points: string[]; chips: string[] }
  outcomes: { h2: string; items: Item[] }
  cqc: { h2: string; intro: string; cards: Item[] }
  faqs: { question: string; answer: string }[]
  cta: { heading: string; sub: string }
  [k: string]: unknown
}

const STATUS: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  draft:     'bg-amber-100 text-amber-700',
  missing:   'bg-neutral-200 text-neutral-600',
}
const INPUT = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal'

export function SettingsPanel({ token }: { token: string }) {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState<string | null>(null)
  const [note, setNote]       = useState('')
  const [slug, setSlug]       = useState<string | null>(null)
  const [cfg, setCfg]         = useState<Config | null>(null)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const auth = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token])

  const load = useCallback(async () => {
    const res = await fetch(`${API_URL}/admin/setting-pages`, { headers: auth() })
    setRows((await res.json())?.data?.pages ?? [])
    setLoading(false)
  }, [auth])

  useEffect(() => { if (token) load() }, [token, load])

  async function seed() {
    setBusy('seed'); setNote('')
    try {
      const res = await fetch(`${API_URL}/admin/setting-pages/seed`, { method: 'POST', headers: auth() })
      const d = (await res.json())?.data ?? {}
      setNote(`Added ${d.created?.length ?? 0}, refreshed ${d.updated?.length ?? 0}, left alone ${d.skipped?.length ?? 0}.` + (d.note ? ` ${d.note}` : ''))
      await load()
    } finally { setBusy(null) }
  }

  async function setStatus(s: string, status: string) {
    setBusy(s)
    try {
      await fetch(`${API_URL}/admin/setting-pages/${s}`, {
        method: 'PUT', headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await load()
    } finally { setBusy(null) }
  }

  async function edit(s: string) {
    setBusy(s)
    try {
      const res = await fetch(`${API_URL}/admin/setting-pages/${s}`, { headers: auth() })
      const page = (await res.json())?.data?.page
      if (page) { setSlug(s); setCfg(page.config as Config) }
    } finally { setBusy(null) }
  }

  async function save() {
    if (!slug || !cfg) return
    setSaving(true); setSaved(false)
    try {
      await fetch(`${API_URL}/admin/setting-pages/${slug}`, {
        method: 'PUT', headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: cfg }),
      })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
      await load()
    } finally { setSaving(false) }
  }

  // Replace one value deep in the config without disturbing anything else — icon keys and the
  // slug travel through untouched.
  function patch(path: (string | number)[], value: string) {
    setCfg(prev => {
      if (!prev) return prev
      const next = structuredClone(prev) as Record<string, unknown>
      let node: Record<string, unknown> = next
      for (const key of path.slice(0, -1)) node = node[key as string] as Record<string, unknown>
      node[path[path.length - 1] as string] = value
      return next as Config
    })
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-neutral-mid"><Loader2 className="mr-1 inline animate-spin" size={16} /> Loading care settings…</div>
  }

  if (slug && cfg) {
    const Text = ({ label, path, rows = 1 }: { label: string; path: (string | number)[]; rows?: number }) => {
      let v: unknown = cfg
      for (const k of path) v = (v as Record<string, unknown>)?.[k as string]
      return (
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">{label}</label>
          {rows > 1
            ? <textarea rows={rows} value={String(v ?? '')} onChange={e => patch(path, e.target.value)} className={INPUT} />
            : <input value={String(v ?? '')} onChange={e => patch(path, e.target.value)} className={INPUT} />}
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-dark">{cfg.label}</p>
            <p className="font-mono text-xs text-neutral-mid">/{slug}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setSlug(null); setCfg(null) }}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm">Back</button>
            <button type="button" onClick={save} disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        <Text label="Headline" path={['hero', 'h1']} rows={2} />
        <Text label="Intro" path={['hero', 'subtitle']} rows={3} />

        <p className="pt-2 text-sm font-semibold text-neutral-dark">The challenge</p>
        <Text label="Heading" path={['challenge', 'h2']} rows={2} />
        <Text label="First paragraph" path={['challenge', 'para1']} rows={3} />
        <Text label="Second paragraph" path={['challenge', 'para2']} rows={3} />
        {cfg.challenge.items.map((it, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
            <Text label={`Point ${i + 1} title`} path={['challenge', 'items', i, 'title']} />
            <Text label="Body" path={['challenge', 'items', i, 'body']} rows={2} />
          </div>
        ))}

        <p className="pt-2 text-sm font-semibold text-neutral-dark">Day to day</p>
        <Text label="Heading" path={['scenarios', 'h2']} rows={2} />
        <Text label="Intro" path={['scenarios', 'sub']} rows={2} />
        {cfg.scenarios.items.map((s, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
            <Text label={`Scenario ${i + 1} label`} path={['scenarios', 'items', i, 'tag']} />
            <Text label="Body" path={['scenarios', 'items', i, 'body']} rows={3} />
          </div>
        ))}

        <p className="pt-2 text-sm font-semibold text-neutral-dark">Outcomes</p>
        <Text label="Heading" path={['outcomes', 'h2']} rows={2} />
        {cfg.outcomes.items.map((o, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
            <Text label={`Outcome ${i + 1} title`} path={['outcomes', 'items', i, 'title']} />
            <Text label="Body" path={['outcomes', 'items', i, 'body']} rows={2} />
          </div>
        ))}

        <p className="pt-2 text-sm font-semibold text-neutral-dark">Questions</p>
        {cfg.faqs.map((f, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
            <Text label={`Question ${i + 1}`} path={['faqs', i, 'question']} rows={2} />
            <Text label="Answer" path={['faqs', i, 'answer']} rows={4} />
          </div>
        ))}

        <p className="pt-2 text-sm font-semibold text-neutral-dark">Closing</p>
        <Text label="Heading" path={['cta', 'heading']} rows={2} />
        <Text label="Sub" path={['cta', 'sub']} rows={2} />
      </div>
    )
  }

  const missing = rows.filter(r => !r.exists).length
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-neutral-mid">
          The 11 care-setting pages. The wording here is the copy already on those pages, moved
          out of the code so it can be changed without a deploy. Edits go live within a minute.
          <br />
          A page renders from here once published; until then it shows the version in the code,
          so nothing can go blank.
        </p>
        <button type="button" onClick={seed} disabled={busy === 'seed'}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-neutral-light disabled:opacity-50">
          {busy === 'seed' ? <Loader2 size={14} className="animate-spin" /> : null}
          Import current copy
        </button>
      </div>

      {note && <p className="rounded-md bg-neutral-light px-3 py-2 text-xs text-neutral-dark">{note}</p>}
      {missing > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {missing} of {rows.length} pages are not in the database yet. &ldquo;Import current
          copy&rdquo; brings across exactly what those pages say today.
        </p>
      )}

      <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {rows.map(r => (
          <div key={r.slug} className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-neutral-dark">{r.label}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS[r.status] ?? STATUS.draft}`}>{r.status}</span>
              </div>
              <p className="mt-0.5 truncate font-mono text-xs text-neutral-mid">
                /{r.slug}
                <a href={`https://www.carestreamai.com/${r.slug}`} target="_blank" rel="noopener"
                   className="ml-2 inline-flex items-center gap-1 text-teal">view <ExternalLink size={11} /></a>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {r.exists && (
                <button type="button" onClick={() => edit(r.slug)} disabled={busy === r.slug}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-light disabled:opacity-50">Edit</button>
              )}
              {r.exists && (
                <button type="button" onClick={() => setStatus(r.slug, r.status === 'published' ? 'draft' : 'published')}
                  disabled={busy === r.slug}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-light disabled:opacity-50">
                  {r.status === 'published' ? 'Use code version' : 'Use this copy'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
