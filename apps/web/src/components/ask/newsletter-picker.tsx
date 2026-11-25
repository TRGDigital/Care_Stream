'use client'

// Browse the staff newsletter templates: pick a category, a newsletter type and a layout (short, standard or detailed), see its sections (and which are filled from your own
// records), then start the chat with that choice. No scroll bars: the lists grow with the content.
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Database, Loader2, Users } from 'lucide-react'
import { ask, type NewsletterLibrary } from '@/lib/ask-client'

const LAYOUT: Record<string, string> = { short: 'Short', standard: 'Standard', detailed: 'Detailed' }

export function NewsletterPicker({ token, onChoose, disabled }: { token: string; onChoose: (message: string) => void; disabled?: boolean }) {
  const [lib, setLib] = useState<NewsletterLibrary | null>(null)
  const [open, setOpen] = useState(false)
  const [cat, setCat] = useState<string | null>(null)
  const [type, setType] = useState<string | null>(null)
  const [layout, setLayout] = useState('standard')
  const [failed, setFailed] = useState(false)
  useEffect(() => { if (open && !lib && !failed) ask.newsletterTemplates(token).then(setLib).catch(() => setFailed(true)) }, [open, lib, failed, token])
  const category = lib?.categories.find(c => c.id === cat) ?? null
  const chosenType = category?.types.find(t => t.type === type) ?? null
  const template = lib && type ? lib.templates.find(t => t.type === type && t.layout === layout) ?? null : null
  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-neutral-dark">
        <span>Browse newsletter templates</span>{open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
      </button>
      {open && (
        <div className="border-t border-gray-200 px-4 py-3 text-sm">
          {failed && <p className="text-neutral-mid">The templates could not be loaded. You can still ask for a newsletter in your own words.</p>}
          {!lib && !failed && <p className="inline-flex items-center gap-2 text-neutral-mid"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Loading</p>}
          {lib && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Newsletter categories">
                {lib.categories.map(c => <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} onClick={() => { setCat(c.id); setType(null) }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${cat === c.id ? 'border-teal bg-teal text-white' : 'border-gray-300 text-neutral-dark hover:border-teal'}`}>{c.title}</button>)}
              </div>
              {category && <p className="text-xs text-neutral-mid">{category.blurb}</p>}
              {category && (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {category.types.map(t => (
                    <li key={t.type}><button type="button" onClick={() => setType(t.type)} className={`h-full w-full rounded-lg border px-3 py-2 text-left ${type === t.type ? 'border-teal bg-teal/5' : 'border-gray-200 hover:border-teal'}`}><span className="block font-semibold text-neutral-dark">{t.title}</span><span className="mt-0.5 block text-xs text-neutral-mid">{t.purpose}</span></button></li>
                  ))}
                </ul>
              )}
              {chosenType && template && (
                <div className="rounded-lg border border-teal/30 bg-teal/5 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-neutral-dark">{chosenType.title}</span>
                    {chosenType.layouts.map(l => <button key={l.id} type="button" onClick={() => setLayout(l.layout)} aria-pressed={layout === l.layout} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${layout === l.layout ? 'border-teal bg-teal text-white' : 'border-gray-300 bg-white text-neutral-dark'}`}>{LAYOUT[l.layout]} ({l.sections})</button>)}
                  </div>
                  <ol className="mt-2 space-y-1 text-xs text-neutral-dark">
                    {template.sections.map(s => <li key={s.key} className="flex items-center gap-1.5"><span>{s.title}</span>{s.from_data && <span className="inline-flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 text-[11px] text-neutral-mid" title="Filled from your own records"><Database size={10} aria-hidden="true" />from your records</span>}{s.needs_ticks && <span className="inline-flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 text-[11px] text-neutral-mid" title="You choose who is named"><Users size={10} aria-hidden="true" />you choose who</span>}</li>)}
                  </ol>
                  {template.heads_up && <p className="mt-2 text-xs text-neutral-mid">{template.heads_up}</p>}
                  <button type="button" disabled={disabled} onClick={() => onChoose(`I would like to use the ${chosenType.title} newsletter template, ${LAYOUT[layout].toLowerCase()} layout (${template.id}).`)} className="mt-3 rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Use this template</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
