'use client'

// Authoring for the interactive lesson activities that sit between a course's
// teaching sections (put the steps in order / sort into bins / match the pairs).
// They are stored inside learning_content.activities, so the normal module save
// writes them — this editor only shapes the array.
//
// "Draft with AI" reads the course's own lesson sections and proposes activities
// for review; nothing is saved until the module is saved, so the wording is
// always yours.

import { useState } from 'react'
import { Plus, Trash2, Sparkles, Loader2, ArrowUp, ArrowDown } from 'lucide-react'

export type Activity = {
  id: string
  type: 'order' | 'sort' | 'match'
  title: string
  instructions: string
  after_section: number | null
  steps?: string[]
  bins?: Array<{ id: string; name: string; note: string }>
  items?: Array<{ text: string; bin: string }>
  pairs?: Array<{ term: string; definition: string }>
}

const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'
const SMALL = 'rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none'

const TYPE_LABEL: Record<Activity['type'], string> = {
  order: 'Put the steps in order',
  sort:  'Sort into bins',
  match: 'Match the pairs',
}

const blank = (type: Activity['type']): Activity => {
  const base = { id: `act${Date.now()}`, type, title: '', instructions: '', after_section: 0 }
  if (type === 'order') return { ...base, steps: ['', '', ''] }
  if (type === 'sort') return {
    ...base,
    bins:  [{ id: 'bin1', name: '', note: '' }, { id: 'bin2', name: '', note: '' }, { id: 'bin3', name: '', note: '' }],
    items: [{ text: '', bin: 'bin1' }, { text: '', bin: 'bin2' }, { text: '', bin: 'bin3' }],
  }
  return { ...base, pairs: [{ term: '', definition: '' }, { term: '', definition: '' }, { term: '', definition: '' }] }
}

export function ActivitiesEditor({ value, onChange, sectionHeadings, onDraft }: {
  value: Activity[]
  onChange: (next: Activity[]) => void
  sectionHeadings: string[]
  onDraft?: () => Promise<Activity[]>
}) {
  const [drafting, setDrafting] = useState(false)
  const [error, setError] = useState('')

  const patch = (i: number, next: Partial<Activity>) => onChange(value.map((a, j) => (j === i ? { ...a, ...next } : a)))
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i))
  const move = (i: number, dir: -1 | 1) => {
    const to = i + dir
    if (to < 0 || to >= value.length) return
    const next = value.slice()
    ;[next[i], next[to]] = [next[to], next[i]]
    onChange(next)
  }

  async function draft() {
    if (!onDraft) return
    setDrafting(true); setError('')
    try { onChange([...value, ...(await onDraft())]) }
    catch (e: any) { setError(e?.message ?? 'Could not draft activities — try again.') }
    finally { setDrafting(false) }
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-neutral-mid">
          No activities yet. These are extra to the lesson sections and the assessment — nothing is replaced.
        </p>
      )}

      {value.map((a, i) => (
        <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-teal-light px-2.5 py-0.5 text-xs font-semibold text-teal">{TYPE_LABEL[a.type]}</span>
            <label className="ml-auto flex items-center gap-1.5 text-xs text-neutral-mid">
              Show after
              <select
                value={a.after_section ?? ''}
                onChange={e => patch(i, { after_section: e.target.value === '' ? null : Number(e.target.value) })}
                className={SMALL}
              >
                {sectionHeadings.map((h, si) => <option key={si} value={si}>{si + 1}. {h || `Section ${si + 1}`}</option>)}
                <option value="">The end of the lesson</option>
              </select>
            </label>
            <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-neutral-mid hover:text-teal disabled:opacity-30" title="Move up"><ArrowUp size={14} /></button>
            <button onClick={() => move(i, 1)} disabled={i === value.length - 1} className="rounded p-1 text-neutral-mid hover:text-teal disabled:opacity-30" title="Move down"><ArrowDown size={14} /></button>
            <button onClick={() => remove(i)} className="rounded p-1 text-neutral-mid hover:text-red-500" title="Remove"><Trash2 size={14} /></button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <input value={a.title} onChange={e => patch(i, { title: e.target.value })} placeholder="Title, e.g. Match the term to its meaning" className={INPUT} />
            <input value={a.instructions} onChange={e => patch(i, { instructions: e.target.value })} placeholder="One sentence of instructions" className={INPUT} />
          </div>

          {a.type === 'order' && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-neutral-mid">Steps — enter them in the CORRECT order (staff see them shuffled)</p>
              <div className="space-y-2">
                {(a.steps ?? []).map((s, si) => (
                  <div key={si} className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-center text-xs font-semibold text-neutral-mid">{si + 1}</span>
                    <input value={s} onChange={e => patch(i, { steps: (a.steps ?? []).map((x, j) => (j === si ? e.target.value : x)) })} className={INPUT} />
                    <button onClick={() => patch(i, { steps: (a.steps ?? []).filter((_, j) => j !== si) })} className="shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                ))}
                <button onClick={() => patch(i, { steps: [...(a.steps ?? []), ''] })} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add step</button>
              </div>
            </div>
          )}

          {a.type === 'sort' && (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-medium text-neutral-mid">Bins</p>
                <div className="space-y-2">
                  {(a.bins ?? []).map((b, bi) => (
                    <div key={b.id} className="rounded-lg border border-gray-100 p-2">
                      <input value={b.name} onChange={e => patch(i, { bins: (a.bins ?? []).map((x, j) => (j === bi ? { ...x, name: e.target.value } : x)) })} placeholder="Bin name" className={`${INPUT} mb-1.5`} />
                      <input value={b.note} onChange={e => patch(i, { bins: (a.bins ?? []).map((x, j) => (j === bi ? { ...x, note: e.target.value } : x)) })} placeholder="A few words on what belongs here" className={INPUT} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-neutral-mid">Items — and the bin each belongs in</p>
                <div className="space-y-2">
                  {(a.items ?? []).map((it, ii) => (
                    <div key={ii} className="flex items-center gap-2">
                      <input value={it.text} onChange={e => patch(i, { items: (a.items ?? []).map((x, j) => (j === ii ? { ...x, text: e.target.value } : x)) })} placeholder="Item" className={INPUT} />
                      <select value={it.bin} onChange={e => patch(i, { items: (a.items ?? []).map((x, j) => (j === ii ? { ...x, bin: e.target.value } : x)) })} className={SMALL}>
                        {(a.bins ?? []).map(b => <option key={b.id} value={b.id}>{b.name || b.id}</option>)}
                      </select>
                      <button onClick={() => patch(i, { items: (a.items ?? []).filter((_, j) => j !== ii) })} className="shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={13} /></button>
                    </div>
                  ))}
                  <button onClick={() => patch(i, { items: [...(a.items ?? []), { text: '', bin: (a.bins ?? [])[0]?.id ?? 'bin1' }] })} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add item</button>
                </div>
              </div>
            </div>
          )}

          {a.type === 'match' && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-neutral-mid">Pairs</p>
              <div className="space-y-2">
                {(a.pairs ?? []).map((p, pi) => (
                  <div key={pi} className="flex items-start gap-2">
                    <input value={p.term} onChange={e => patch(i, { pairs: (a.pairs ?? []).map((x, j) => (j === pi ? { ...x, term: e.target.value } : x)) })} placeholder="Term" className={`${INPUT} sm:max-w-[240px]`} />
                    <input value={p.definition} onChange={e => patch(i, { pairs: (a.pairs ?? []).map((x, j) => (j === pi ? { ...x, definition: e.target.value } : x)) })} placeholder="What it means" className={INPUT} />
                    <button onClick={() => patch(i, { pairs: (a.pairs ?? []).filter((_, j) => j !== pi) })} className="shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                ))}
                <button onClick={() => patch(i, { pairs: [...(a.pairs ?? []), { term: '', definition: '' }] })} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add pair</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {(['match', 'sort', 'order'] as const).map(t => (
          <button key={t} onClick={() => onChange([...value, blank(t)])} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal hover:text-teal">
            <Plus size={12} /> {TYPE_LABEL[t]}
          </button>
        ))}
        {onDraft && (
          <button onClick={draft} disabled={drafting} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
            {drafting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {drafting ? 'Drafting…' : 'Draft with AI'}
          </button>
        )}
      </div>
    </div>
  )
}
