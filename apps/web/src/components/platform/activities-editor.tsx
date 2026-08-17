'use client'

// Authoring for the interactive activities that end a lesson section.
//
// Each activity belongs to a section and is edited inside that section, right
// under its quick check — the same place the learner meets it. They are stored
// flat in learning_content.activities with an after_section index, so the hub
// and the preview read one list; only the editing is per-section.
//
// SectionActivity  — the slot inside a section card
// ActivitiesToolbar — draft-with-AI, coverage at a glance, and any activity not
//                     attached to a section

import { useState } from 'react'
import { Plus, Trash2, Sparkles, Loader2, Lightbulb } from 'lucide-react'

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

export const TYPE_LABEL: Record<Activity['type'], string> = {
  order: 'Put the steps in order',
  sort:  'Sort into bins',
  match: 'Match the pairs',
}

export function blankActivity(type: Activity['type'], afterSection: number | null): Activity {
  const base = { id: `act${Date.now()}${Math.floor(Math.random() * 1000)}`, type, title: '', instructions: '', after_section: afterSection }
  if (type === 'order') return { ...base, steps: ['', '', ''] }
  if (type === 'sort') return {
    ...base,
    bins:  [{ id: 'bin1', name: '', note: '' }, { id: 'bin2', name: '', note: '' }, { id: 'bin3', name: '', note: '' }],
    items: [{ text: '', bin: 'bin1' }, { text: '', bin: 'bin2' }, { text: '', bin: 'bin3' }],
  }
  return { ...base, pairs: [{ term: '', definition: '' }, { term: '', definition: '' }, { term: '', definition: '' }] }
}

// ─── the form for one activity ────────────────────────────────────────────────

function ActivityFields({ a, patch }: { a: Activity; patch: (next: Partial<Activity>) => void }) {
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={a.title} onChange={e => patch({ title: e.target.value })} placeholder="Title, e.g. Match the term to its meaning" className={INPUT} />
        <input value={a.instructions} onChange={e => patch({ instructions: e.target.value })} placeholder="One sentence of instructions" className={INPUT} />
      </div>

      {a.type === 'order' && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-neutral-mid">Steps — enter them in the CORRECT order (staff see them shuffled)</p>
          <div className="space-y-2">
            {(a.steps ?? []).map((s, si) => (
              <div key={si} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center text-xs font-semibold text-neutral-mid">{si + 1}</span>
                <input value={s} onChange={e => patch({ steps: (a.steps ?? []).map((x, j) => (j === si ? e.target.value : x)) })} className={INPUT} />
                <button onClick={() => patch({ steps: (a.steps ?? []).filter((_, j) => j !== si) })} className="shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            ))}
            <button onClick={() => patch({ steps: [...(a.steps ?? []), ''] })} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add step</button>
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
                  <input value={b.name} onChange={e => patch({ bins: (a.bins ?? []).map((x, j) => (j === bi ? { ...x, name: e.target.value } : x)) })} placeholder="Bin name" className={`${INPUT} mb-1.5`} />
                  <input value={b.note} onChange={e => patch({ bins: (a.bins ?? []).map((x, j) => (j === bi ? { ...x, note: e.target.value } : x)) })} placeholder="A few words on what belongs here" className={INPUT} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-neutral-mid">Items — and the bin each belongs in</p>
            <div className="space-y-2">
              {(a.items ?? []).map((it, ii) => (
                <div key={ii} className="flex items-center gap-2">
                  <input value={it.text} onChange={e => patch({ items: (a.items ?? []).map((x, j) => (j === ii ? { ...x, text: e.target.value } : x)) })} placeholder="Item" className={INPUT} />
                  <select value={it.bin} onChange={e => patch({ items: (a.items ?? []).map((x, j) => (j === ii ? { ...x, bin: e.target.value } : x)) })} className={SMALL}>
                    {(a.bins ?? []).map(b => <option key={b.id} value={b.id}>{b.name || b.id}</option>)}
                  </select>
                  <button onClick={() => patch({ items: (a.items ?? []).filter((_, j) => j !== ii) })} className="shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              ))}
              <button onClick={() => patch({ items: [...(a.items ?? []), { text: '', bin: (a.bins ?? [])[0]?.id ?? 'bin1' }] })} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add item</button>
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
                <input value={p.term} onChange={e => patch({ pairs: (a.pairs ?? []).map((x, j) => (j === pi ? { ...x, term: e.target.value } : x)) })} placeholder="Term" className={`${INPUT} sm:max-w-[240px]`} />
                <input value={p.definition} onChange={e => patch({ pairs: (a.pairs ?? []).map((x, j) => (j === pi ? { ...x, definition: e.target.value } : x)) })} placeholder="What it means" className={INPUT} />
                <button onClick={() => patch({ pairs: (a.pairs ?? []).filter((_, j) => j !== pi) })} className="shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            ))}
            <button onClick={() => patch({ pairs: [...(a.pairs ?? []), { term: '', definition: '' }] })} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add pair</button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── the slot inside a section card ───────────────────────────────────────────

export function SectionActivity({ sectionIndex, activities, onChange }: {
  sectionIndex: number
  activities: Activity[]
  onChange: (next: Activity[]) => void
}) {
  const idx = activities.findIndex(a => a.after_section === sectionIndex)
  const a = idx >= 0 ? activities[idx] : null

  const patch = (next: Partial<Activity>) => onChange(activities.map((x, j) => (j === idx ? { ...x, ...next } : x)))
  const remove = () => onChange(activities.filter((_, j) => j !== idx))
  const add = (type: Activity['type']) => onChange([...activities, blankActivity(type, sectionIndex)])

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
          <Lightbulb size={12} /> Interactive activity — ends this section
        </p>
        {a && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-amber-700">{TYPE_LABEL[a.type]}</span>
            <button onClick={remove} className="rounded p-1 text-neutral-mid hover:text-red-500" title="Remove this activity"><Trash2 size={13} /></button>
          </div>
        )}
      </div>

      {a
        ? <ActivityFields a={a} patch={patch} />
        : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-mid">Nothing yet — optional, but it&apos;s what staff do after the quick check.</span>
            {(['match', 'sort', 'order'] as const).map(t => (
              <button key={t} onClick={() => add(t)} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-700 hover:border-amber-400">
                <Plus size={11} /> {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        )}
    </div>
  )
}

// ─── the toolbar above the sections ───────────────────────────────────────────

export function ActivitiesToolbar({ activities, onChange, sectionHeadings, onDraft }: {
  activities: Activity[]
  onChange: (next: Activity[]) => void
  sectionHeadings: string[]
  onDraft?: () => Promise<Activity[]>
}) {
  const [drafting, setDrafting] = useState(false)
  const [error, setError] = useState('')
  const strays = activities.filter(a => a.after_section == null)

  async function draft() {
    if (!onDraft) return
    setDrafting(true); setError('')
    try {
      // Only fill the gaps, so a section you have already written keeps your wording.
      const taken = new Set(activities.map(a => a.after_section).filter(s => s != null))
      const fresh = (await onDraft()).filter(a => a.after_section == null || !taken.has(a.after_section))
      if (!fresh.length) setError('Nothing new to add — every section already has an activity.')
      else onChange([...activities, ...fresh])
    }
    catch (e: any) { setError(e?.message ?? 'Could not draft activities — try again.') }
    finally { setDrafting(false) }
  }

  return (
    <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-neutral-dark">Interactive activities</p>
          <p className="text-[11px] text-neutral-mid">One per section, edited inside each section below — under its quick check. Extra to the lesson and the assessment; never a replacement.</p>
        </div>
        {onDraft && (
          <button onClick={draft} disabled={drafting} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
            {drafting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {drafting ? 'Drafting…' : 'Draft the empty sections with AI'}
          </button>
        )}
      </div>

      {sectionHeadings.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sectionHeadings.map((h, si) => {
            const has = activities.some(a => a.after_section === si)
            return (
              <span key={si} title={h || `Section ${si + 1}`}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${has ? 'bg-teal-light text-teal' : 'border border-dashed border-gray-300 text-neutral-mid'}`}>
                {si + 1}. {(h || `Section ${si + 1}`).slice(0, 24)} {has ? '✓' : '—'}
              </span>
            )
          })}
        </div>
      )}

      {activities.length > 0 && (
        <p className="mt-2 text-[11px] text-neutral-mid">
          {activities.length} {activities.length === 1 ? 'activity' : 'activities'} — roughly {activities.length * 2} minutes of extra learning time.
          Worth adding that to <strong>Duration</strong> above, since it feeds the CPD hours.
        </p>
      )}

      {strays.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5">
          <p className="mb-2 text-[11px] font-semibold text-amber-700">
            {strays.length} {strays.length === 1 ? 'activity is' : 'activities are'} not attached to a section, so {strays.length === 1 ? 'it runs' : 'they run'} at the end of the lesson. Give {strays.length === 1 ? 'it' : 'each'} a section to move {strays.length === 1 ? 'it' : 'them'} up:
          </p>
          {strays.map(s => (
            <div key={s.id} className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-neutral-dark">{s.title || TYPE_LABEL[s.type]}</span>
              <select
                value=""
                onChange={e => { if (e.target.value !== '') onChange(activities.map(x => (x.id === s.id ? { ...x, after_section: Number(e.target.value) } : x))) }}
                className={SMALL}
              >
                <option value="">Move to…</option>
                {sectionHeadings.map((h, si) => <option key={si} value={si}>{si + 1}. {h || `Section ${si + 1}`}</option>)}
              </select>
              <button onClick={() => onChange(activities.filter(x => x.id !== s.id))} className="rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}
