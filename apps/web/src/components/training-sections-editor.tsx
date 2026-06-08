'use client'

// Controlled editor for a module's interactive learning sections. Each section
// teaches one part of the topic, then applies it with a mandatory scenario and a
// quick in-lesson knowledge check. Shared by the tenant and Console review screens.

import { useState } from 'react'
import { Plus, Trash2, Lightbulb, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react'

export type LessonSection = {
  heading: string
  body: string
  image_key?: string | null
  scenario: { situation: string; prompt: string; answer: string }
  check: { question: string; options: string[]; correct: number }
}

const INPUT = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

function blankSection(): LessonSection {
  return { heading: '', body: '', scenario: { situation: '', prompt: '', answer: '' }, check: { question: '', options: ['', '', '', ''], correct: 0 } }
}

export function SectionsEditor({ value, onChange, onGenerateImage, assetUrl, imageHint }: {
  value: LessonSection[]
  onChange: (next: LessonSection[]) => void
  onGenerateImage?: (index: number) => Promise<void>  // saves + generates + reloads
  assetUrl?: (path: string | null | undefined) => string | null
  imageHint?: string  // e.g. "free" or "uses 1 AI credit"
}) {
  const sections = Array.isArray(value) ? value : []
  const [imgBusy, setImgBusy] = useState<number | null>(null)
  const sectionImg = (s: LessonSection) => (s.image_key && assetUrl) ? assetUrl(`/public/training/image/${String(s.image_key).split('/').pop()}`) : null
  async function genImage(i: number) {
    if (!onGenerateImage) return
    setImgBusy(i)
    try { await onGenerateImage(i) }
    catch (e: any) { alert(e?.message ?? 'Image generation failed — please try again.') }
    finally { setImgBusy(null) }
  }
  const update = (i: number, patch: Partial<LessonSection>) => onChange(sections.map((s, j) => j === i ? { ...s, ...patch } : s))
  const updateScenario = (i: number, patch: Partial<LessonSection['scenario']>) => onChange(sections.map((s, j) => j === i ? { ...s, scenario: { ...s.scenario, ...patch } } : s))
  const updateCheck = (i: number, patch: Partial<LessonSection['check']>) => onChange(sections.map((s, j) => j === i ? { ...s, check: { ...s.check, ...patch } } : s))
  const setOption = (i: number, oi: number, v: string) => onChange(sections.map((s, j) => j === i ? { ...s, check: { ...s.check, options: s.check.options.map((o, k) => k === oi ? v : o) } } : s))

  return (
    <div className="space-y-3">
      {sections.map((s, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">Section {i + 1}</span>
            <button onClick={() => onChange(sections.filter((_, j) => j !== i))} className="rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={14} /></button>
          </div>

          {/* Section image (optional) */}
          {onGenerateImage && (
            <div className="mb-3 overflow-hidden rounded-lg border border-gray-100">
              {sectionImg(s)
                ? <img src={sectionImg(s) ?? ''} alt="" className="aspect-[16/9] w-full object-cover" />
                : <div className="flex aspect-[16/9] w-full items-center justify-center bg-neutral-light/60"><ImageIcon size={22} className="text-gray-300" /></div>}
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                <span className="text-[11px] text-neutral-mid">Section image{imageHint ? ` · ${imageHint}` : ''}</span>
                <button onClick={() => genImage(i)} disabled={imgBusy === i} className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-neutral-dark hover:border-teal/40 hover:text-teal disabled:opacity-50">
                  {imgBusy === i ? <><Loader2 size={11} className="animate-spin" /> Generating…</> : <><Sparkles size={11} /> {s.image_key ? 'Regenerate' : 'Generate image'}</>}
                </button>
              </div>
            </div>
          )}

          <label className="mb-1 block text-xs font-medium text-neutral-mid">Heading</label>
          <input value={s.heading} onChange={e => update(i, { heading: e.target.value })} className={`${INPUT} mb-2 font-medium`} />
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Teaching text</label>
          <textarea value={s.body} onChange={e => update(i, { body: e.target.value })} rows={3} className={`${INPUT} mb-3`} />

          {/* Scenario (mandatory) */}
          <div className="mb-3 rounded-lg border border-teal/20 bg-teal-light/20 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal"><Lightbulb size={12} /> Scenario (required)</p>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Situation</label>
            <textarea value={s.scenario.situation} onChange={e => updateScenario(i, { situation: e.target.value })} rows={2} className={`${INPUT} mb-2`} />
            <label className="mb-1 block text-xs font-medium text-neutral-mid">What should they do? (prompt)</label>
            <input value={s.scenario.prompt} onChange={e => updateScenario(i, { prompt: e.target.value })} className={`${INPUT} mb-2`} />
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Answer &amp; why</label>
            <textarea value={s.scenario.answer} onChange={e => updateScenario(i, { answer: e.target.value })} rows={2} className={INPUT} />
          </div>

          {/* In-lesson check */}
          <div className="rounded-lg border border-gray-100 bg-neutral-light/40 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">Quick check</p>
            <textarea value={s.check.question} onChange={e => updateCheck(i, { question: e.target.value })} rows={2} placeholder="Check question" className={`${INPUT} mb-2`} />
            <div className="space-y-1.5">
              {s.check.options.map((o, oi) => (
                <label key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`chk-${i}`} checked={s.check.correct === oi} onChange={() => updateCheck(i, { correct: oi })} className="accent-green-500" />
                  <input value={o} onChange={e => setOption(i, oi, e.target.value)} className={`flex-1 rounded-md border px-3 py-1.5 text-sm outline-none ${s.check.correct === oi ? 'border-green-300 bg-green-50/40' : 'border-gray-300 focus:border-teal'}`} />
                </label>
              ))}
            </div>
          </div>
        </div>
      ))}
      <button onClick={() => onChange([...sections, blankSection()])} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add section</button>
    </div>
  )
}
