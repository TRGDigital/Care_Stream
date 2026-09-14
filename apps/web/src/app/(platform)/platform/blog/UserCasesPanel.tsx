'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Check, ExternalLink } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// The /uses pages. The copy on these is expected to change over time, so it lives in the
// database and is edited here rather than in the page components: a wording change is a save,
// not a deploy.

interface Row {
  slug: string
  label: string
  exists: boolean
  status: string
  title?: string
  meta_title?: string | null
  meta_description?: string | null
  hero_image_url?: string | null
  updated_at?: string
}

interface Section { heading: string; bullets: string[]; links: { label: string; href: string }[]; image: string | null; image_alt: string }
interface Content { eyebrow: string; lede: string; sections: Section[]; cards: { title: string; body: string }[]; note: string }
interface FaqGroup { label: string; items: { question: string; answer: string }[] }
interface Page extends Row { content: Content; faqs: FaqGroup[] }

const STATUS: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  draft:     'bg-amber-100 text-amber-700',
  missing:   'bg-neutral-200 text-neutral-600',
}

export function UserCasesPanel({ token }: { token: string }) {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState<string | null>(null)
  const [note, setNote]       = useState('')
  const [open, setOpen]       = useState<Page | null>(null)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const auth = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token])

  const load = useCallback(async () => {
    const res = await fetch(`${API_URL}/admin/user-cases`, { headers: auth() })
    const body = await res.json()
    setRows(body?.data?.pages ?? [])
    setLoading(false)
  }, [auth])

  useEffect(() => { if (token) load() }, [token, load])

  async function seed() {
    setBusy('seed'); setNote('')
    try {
      const res = await fetch(`${API_URL}/admin/user-cases/seed`, { method: 'POST', headers: auth() })
      const body = await res.json()
      const d = body?.data ?? {}
      setNote(
        `Created ${d.created?.length ?? 0}, updated ${d.updated?.length ?? 0}, left alone ${d.skipped?.length ?? 0}.` +
        (d.note ? ` ${d.note}` : ''),
      )
      await load()
    } finally { setBusy(null) }
  }

  async function setStatus(slug: string, status: string) {
    setBusy(slug)
    try {
      await fetch(`${API_URL}/admin/user-cases/${slug}`, {
        method: 'PUT',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await load()
    } finally { setBusy(null) }
  }

  async function edit(slug: string) {
    setBusy(slug)
    try {
      const res = await fetch(`${API_URL}/admin/user-cases/${slug}`, { headers: auth() })
      const body = await res.json()
      if (body?.data?.page) setOpen(body.data.page as Page)
    } finally { setBusy(null) }
  }

  async function save() {
    if (!open) return
    setSaving(true); setSaved(false)
    try {
      await fetch(`${API_URL}/admin/user-cases/${open.slug}`, {
        method: 'PUT',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: open.title, meta_title: open.meta_title, meta_description: open.meta_description,
          content: open.content, faqs: open.faqs,
        }),
      })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
      await load()
    } finally { setSaving(false) }
  }

  function patchContent(p: Partial<Content>) {
    setOpen(o => o ? { ...o, content: { ...o.content, ...p } } : o)
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-neutral-mid"><Loader2 className="mr-1 inline animate-spin" size={16} /> Loading user cases…</div>
  }

  // ── the editor ──
  if (open) {
    const c = open.content ?? ({ sections: [], cards: [] } as unknown as Content)
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-dark">{open.label}</p>
            <p className="font-mono text-xs text-neutral-mid">/uses/{open.slug}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(null)}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm">Back</button>
            <button type="button" onClick={save} disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        <Field label="Headline" hint="<em>…</em> colours part of the line, as on the live page.">
          <input value={open.title ?? ''} onChange={e => setOpen({ ...open, title: e.target.value })} className={INPUT} />
        </Field>
        <Field label="Intro paragraph">
          <textarea rows={3} value={c.lede ?? ''} onChange={e => patchContent({ lede: e.target.value })} className={INPUT} />
        </Field>
        <Field label="Search engine title"><input value={open.meta_title ?? ''} onChange={e => setOpen({ ...open, meta_title: e.target.value })} className={INPUT} /></Field>
        <Field label="Search engine description">
          <textarea rows={2} value={open.meta_description ?? ''} onChange={e => setOpen({ ...open, meta_description: e.target.value })} className={INPUT} />
        </Field>

        <p className="pt-2 text-sm font-semibold text-neutral-dark">Sections</p>
        {(c.sections ?? []).map((s, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
            <input value={s.heading} className={INPUT}
              onChange={e => {
                const next = [...c.sections]; next[i] = { ...s, heading: e.target.value }; patchContent({ sections: next })
              }} />
            <textarea rows={3} value={(s.bullets ?? []).join('\n')} className={INPUT + ' font-mono text-xs'}
              onChange={e => {
                const next = [...c.sections]
                next[i] = { ...s, bullets: e.target.value.split('\n').filter(Boolean) }
                patchContent({ sections: next })
              }} />
            <p className="text-xs text-neutral-mid">One point per line. Image: <code>{s.image ?? 'none'}</code></p>
          </div>
        ))}

        <p className="pt-2 text-sm font-semibold text-neutral-dark">Supporting points</p>
        {(c.cards ?? []).map((card, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
            <input value={card.title} className={INPUT}
              onChange={e => { const next = [...c.cards]; next[i] = { ...card, title: e.target.value }; patchContent({ cards: next }) }} />
            <textarea rows={2} value={card.body} className={INPUT}
              onChange={e => { const next = [...c.cards]; next[i] = { ...card, body: e.target.value }; patchContent({ cards: next }) }} />
          </div>
        ))}

        <p className="pt-2 text-sm font-semibold text-neutral-dark">Questions</p>
        {(open.faqs ?? []).map((g, gi) => (
          <div key={gi} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
            <input value={g.label} className={INPUT + ' font-semibold'}
              onChange={e => { const next = [...open.faqs]; next[gi] = { ...g, label: e.target.value }; setOpen({ ...open, faqs: next }) }} />
            {g.items.map((f, fi) => (
              <div key={fi} className="space-y-1 border-l-2 border-gray-100 pl-3">
                <input value={f.question} className={INPUT}
                  onChange={e => {
                    const next = [...open.faqs]; const items = [...g.items]
                    items[fi] = { ...f, question: e.target.value }; next[gi] = { ...g, items }
                    setOpen({ ...open, faqs: next })
                  }} />
                <textarea rows={2} value={f.answer} className={INPUT}
                  onChange={e => {
                    const next = [...open.faqs]; const items = [...g.items]
                    items[fi] = { ...f, answer: e.target.value }; next[gi] = { ...g, items }
                    setOpen({ ...open, faqs: next })
                  }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  // ── the list ──
  const missing = rows.filter(r => !r.exists).length
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-neutral-mid">
          The <code className="rounded bg-neutral-light px-1 py-0.5 text-xs">/uses/&hellip;</code> user case pages.
          Edit the wording here and it is live within a minute, with no deploy. Each page also shows
          the three blog posts allocated to it under a post&rsquo;s <strong>User case</strong> setting.
        </p>
        <button type="button" onClick={seed} disabled={busy === 'seed'}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-neutral-light disabled:opacity-50">
          {busy === 'seed' ? <Loader2 size={14} className="animate-spin" /> : null}
          Load starting copy
        </button>
      </div>

      {note && <p className="rounded-md bg-neutral-light px-3 py-2 text-xs text-neutral-dark">{note}</p>}
      {missing > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {missing} of {rows.length} pages have no content yet. &ldquo;Load starting copy&rdquo; fills
          them from the content theme and leaves any page you have already edited alone.
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
                /uses/{r.slug}
                {r.status === 'published' && (
                  <a href={`https://www.carestreamai.com/uses/${r.slug}`} target="_blank" rel="noopener"
                     className="ml-2 inline-flex items-center gap-1 text-teal">view <ExternalLink size={11} /></a>
                )}
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
                  {r.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const INPUT = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">{label}</label>
      {children}
      {hint && <p className="text-xs text-neutral-mid">{hint}</p>}
    </div>
  )
}
