'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Check, ExternalLink } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// The seven /our-services pages (/care-audits, /cqc-compliance and the rest). Their copy lives
// in the database and is edited here rather than in the page components: a wording change is a
// save, not a deploy.
//
// The editor is driven by the BLOCKS the page actually has, not by a fixed form. These pages
// run from four to thirteen sections and no two are built the same, so a fixed form would
// either hide a section or invent empty ones.

interface Row {
  slug: string
  exists: boolean
  status: string
  title?: string
  meta_title?: string | null
  meta_description?: string | null
  hero_image_url?: string | null
  updated_at?: string
}

interface Item { marker: string; tag: string; tone: string; title: string; paras: string[]; bullets: string[] }
interface Block {
  kind: string; tint: boolean; label: string; heading: string
  intro: string[]; image: string | null; items: Item[]; bullets: string[]
}
interface Page extends Row { content: { lede: string[]; blocks: Block[] } }

const STATUS: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  draft:     'bg-amber-100 text-amber-700',
  missing:   'bg-neutral-200 text-neutral-600',
}

const LABEL: Record<string, string> = {
  published: 'Live', draft: 'Draft', missing: 'Not imported',
}

function Lines({ label, value, onChange }: {
  label: string; value: string[]; onChange: (v: string[]) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-neutral-mid">{label}</span>
      {/* One paragraph per line. They are stored separately because several blocks put a
          bullet list between their paragraphs, and joining across it invents a sentence. */}
      <textarea
        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
        rows={Math.min(8, Math.max(2, value.length + 1))}
        value={value.join('\n')}
        onChange={e => onChange(e.target.value.split('\n').filter(x => x.trim() !== ''))}
      />
    </label>
  )
}

export function ServicesPanel({ token }: { token: string }) {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState(false)
  const [note, setNote]       = useState('')
  const [open, setOpen]       = useState<Page | null>(null)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const auth = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/service-pages`, { headers: auth() })
      setRows((await res.json())?.data?.pages ?? [])
    } catch { setNote('Could not reach the API.') }
    setLoading(false)
  }, [auth])

  useEffect(() => { load() }, [load])

  // Plain import skips existing rows so it cannot discard an edit. `replace` is how a corrected
  // import is delivered, and it asks first because it overwrites.
  async function seed(replace = false) {
    if (replace && !window.confirm(
      'Replace the copy on the imported service pages with the approved theme version?\n\n'
      + 'Any wording you have edited here will be overwritten.')) return
    setBusy(true); setNote('')
    try {
      const res = await fetch(
        `${API_URL}/admin/service-pages/seed${replace ? '?overwrite=true' : ''}`,
        { method: 'POST', headers: auth() })
      const d = (await res.json())?.data ?? {}
      setNote(`Added ${d.created?.length ?? 0}, refreshed ${d.updated?.length ?? 0}, `
              + `left alone ${d.skipped?.length ?? 0}.${d.note ? ` ${d.note}` : ''}`)
      await load()
    } catch { setNote('Could not reach the API. Nothing was changed.') }
    setBusy(false)
  }

  async function edit(slug: string) {
    setNote('')
    const res = await fetch(`${API_URL}/admin/service-pages/${slug}`, { headers: auth() })
    if (!res.ok) { setNote('Import the page first, then it can be edited.'); return }
    setOpen((await res.json())?.data?.page ?? null)
  }

  async function save(next: Partial<Page>) {
    if (!open) return
    setSaving(true); setSaved(false)
    try {
      const res = await fetch(`${API_URL}/admin/service-pages/${open.slug}`, {
        method: 'PUT',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (res.ok) { setSaved(true); await load() }
    } finally { setSaving(false) }
  }

  async function preview(slug: string) {
    const res = await fetch(`${API_URL}/admin/preview`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'service-page', slug }),
    })
    const url = (await res.json())?.data?.url
    if (url) window.open(url, '_blank', 'noopener')
    else setNote('Could not create a preview link.')
  }

  const setBlock = (i: number, patch: Partial<Block>) => {
    if (!open) return
    const blocks = open.content.blocks.map((b, n) => (n === i ? { ...b, ...patch } : b))
    setOpen({ ...open, content: { ...open.content, blocks } })
  }

  const setItem = (bi: number, ii: number, patch: Partial<Item>) => {
    if (!open) return
    const blocks = open.content.blocks.map((b, n) => n !== bi ? b : {
      ...b, items: b.items.map((it, m) => (m === ii ? { ...it, ...patch } : it)),
    })
    setOpen({ ...open, content: { ...open.content, blocks } })
  }

  if (loading) {
    return <p className="flex items-center gap-2 p-4 text-sm text-neutral-mid">
      <Loader2 size={14} className="animate-spin" /> Loading service pages…
    </p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-neutral-light/40 p-4">
        <p className="text-sm text-neutral-mid">
          The seven <strong>Our Services</strong> pages. <strong>Import approved copy</strong>
          {' '}brings across the wording signed off in the content theme; every string was
          checked back against the theme page it came from.
          <br />
          These pages keep their current addresses (<code className="rounded bg-white px-1 py-0.5 text-xs">/care-audits</code>,
          not <code className="rounded bg-white px-1 py-0.5 text-xs">/our-services/care-audits</code>).
          Add <code className="rounded bg-white px-1 py-0.5 text-xs">?v2=1</code> to any of them to see the rebuilt design.
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => seed(false)} disabled={busy}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-light disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            Import approved copy
          </button>
          <button type="button" onClick={() => seed(true)} disabled={busy}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-light disabled:opacity-50">
            Re-import and replace
          </button>
        </div>
      </div>

      {note && <p className="rounded-md bg-white px-3 py-2 text-xs text-neutral-dark">{note}</p>}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-neutral-mid">
            <th className="py-2">Page</th><th>Status</th><th>Updated</th><th />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.slug} className="border-b border-gray-100">
              <td className="py-2.5">
                <b className="font-semibold text-neutral-dark">/{r.slug}</b>
                {r.title && <span className="ml-2 text-xs text-neutral-mid">{r.title.replace(/<[^>]*>/g, '')}</span>}
              </td>
              <td>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[r.status] ?? STATUS.missing}`}>
                  {LABEL[r.status] ?? r.status}
                </span>
              </td>
              <td className="text-xs text-neutral-mid">
                {r.updated_at ? new Date(r.updated_at).toLocaleDateString('en-GB') : '—'}
              </td>
              <td className="py-2 text-right">
                {r.exists && (
                  <>
                    <button type="button" onClick={() => edit(r.slug)}
                      className="mr-2 rounded-md border border-gray-200 px-3 py-1 text-xs font-medium hover:bg-neutral-light">
                      Edit copy
                    </button>
                    <button type="button" onClick={() => preview(r.slug)}
                      className="mr-2 inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1 text-xs font-medium hover:bg-neutral-light">
                      Preview <ExternalLink size={11} />
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {open && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-dark">/{open.slug}</h3>
            <div className="flex items-center gap-2">
              {saved && <span className="flex items-center gap-1 text-xs text-green-700"><Check size={12} /> Saved</span>}
              <button type="button" onClick={() => save({ content: open.content, title: open.title })}
                disabled={saving}
                className="rounded-md bg-neutral-dark px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button"
                onClick={() => save({ status: open.status === 'published' ? 'draft' : 'published' })}
                className="rounded-md border border-gray-200 px-4 py-1.5 text-xs font-semibold hover:bg-neutral-light">
                {open.status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
              <button type="button" onClick={() => setOpen(null)}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs">Close</button>
            </div>
          </div>

          <Lines label="Hero paragraphs" value={open.content.lede}
                 onChange={lede => setOpen({ ...open, content: { ...open.content, lede } })} />

          {open.content.blocks.map((b, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-gray-100 bg-neutral-light/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">
                Section {i + 1} · {b.kind}{b.tint ? ' · tinted' : ''}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-neutral-mid">Label</span>
                  <input className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                         value={b.label} onChange={e => setBlock(i, { label: e.target.value })} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-neutral-mid">Heading</span>
                  <input className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                         value={b.heading} onChange={e => setBlock(i, { heading: e.target.value })} />
                </label>
              </div>
              <Lines label="Intro paragraphs" value={b.intro}
                     onChange={intro => setBlock(i, { intro })} />
              {!!b.bullets.length && (
                <Lines label="Bullets" value={b.bullets}
                       onChange={bullets => setBlock(i, { bullets })} />
              )}
              {b.items.map((it, j) => (
                <div key={j} className="space-y-2 rounded-md border border-gray-100 bg-white p-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {['marker', 'tag', 'title'].map(f => (
                      <label className="block" key={f}>
                        <span className="mb-1 block text-xs capitalize text-neutral-mid">{f}</span>
                        <input className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                               value={(it as any)[f] ?? ''}
                               onChange={e => setItem(i, j, { [f]: e.target.value } as Partial<Item>)} />
                      </label>
                    ))}
                  </div>
                  <Lines label="Paragraphs" value={it.paras}
                         onChange={paras => setItem(i, j, { paras })} />
                  {!!it.bullets.length && (
                    <Lines label="Bullets" value={it.bullets}
                           onChange={bullets => setItem(i, j, { bullets })} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
