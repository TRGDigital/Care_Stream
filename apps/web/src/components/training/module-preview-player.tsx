'use client'

// Read-only stepped module player — overview, then one lesson section per step,
// then each assessment question (correct answer shown), then a done screen.
// Presentational only: the parent fetches the normalised module and passes it in.
// Used by the annual "View training" preview AND the statutory-module preview.

import { useEffect, useState } from 'react'
import { apiAssetUrl } from '@/lib/api-client'
import { ChevronLeft } from 'lucide-react'

const FREQ_LABEL: Record<string, string> = { annual: 'Annual', biennial: 'Every 2 years', triennial: 'Every 3 years', once: 'One-off', adhoc: 'Ad-hoc' }

export type PreviewReference = { title: string; source?: string | null; url?: string | null }
export type PreviewGlossaryEntry = { term: string; definition: string }
export type PreviewBaselineQuestion = { id: string; text: string; options: string[]; correct: number }

export type PreviewModule = {
  name: string
  frequency: string | null
  pass_mark: number | null
  requires_practical: boolean
  duration_minutes: number | null
  summary: string | null
  outcomes: string[]
  key_points: string[]
  sections: Array<{ heading: string; body: string; image_url: string | null }>
  questions: Array<{ text: string; options: string[]; correct: number | null; explanation: string | null }>
  standards: string[]
  illustration_url: string | null
  // Optional CPD extras (top-level or nested under learning_content depending on the endpoint)
  references?: PreviewReference[] | null
  glossary?: PreviewGlossaryEntry[] | null
  baseline?: PreviewBaselineQuestion[] | null
  practical_checklist?: string[] | null
  learning_content?: {
    references?: PreviewReference[] | null
    glossary?: PreviewGlossaryEntry[] | null
    baseline?: PreviewBaselineQuestion[] | null
    practical_checklist?: string[] | null
  } | null
}

export function ModulePreviewPlayer({ m, name, onBack }: { m: PreviewModule; name: string; onBack: () => void }) {
  const [step, setStep] = useState(0)
  useEffect(() => { if (typeof window !== 'undefined') window.scrollTo({ top: 0 }) }, [step])

  const sections = m.sections ?? []
  const questions = m.questions ?? []
  const lc = m.learning_content ?? {}
  const glossary = lc?.glossary ?? m.glossary ?? []
  const references = lc?.references ?? m.references ?? []
  const baseline = lc?.baseline ?? m.baseline ?? []
  const practicalChecklist = lc?.practical_checklist ?? m.practical_checklist ?? []
  type StepT = { type: 'overview' } | { type: 'section'; i: number } | { type: 'question'; i: number } | { type: 'done' }
  const steps: StepT[] = [{ type: 'overview' }]
  sections.forEach((_, i) => steps.push({ type: 'section', i }))
  questions.forEach((_, i) => steps.push({ type: 'question', i }))
  steps.push({ type: 'done' })

  const cur = steps[step]
  const total = steps.length
  const progressPct = total > 1 ? Math.round((step / (total - 1)) * 100) : 0
  const label =
    !cur ? '' :
    cur.type === 'overview' ? 'Overview' :
    cur.type === 'section' ? `Section ${cur.i + 1} of ${sections.length}` :
    cur.type === 'question' ? `Question ${cur.i + 1} of ${questions.length}` :
    'Complete'

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-mid hover:text-teal"><ChevronLeft size={14} /> Back</button>

      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Preview · view only</span>
      <h1 className="mb-3 mt-2 text-xl font-bold text-neutral-dark">{m.name || name}</h1>

      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-xs text-neutral-mid">
          <span className="font-medium text-neutral-dark">{label}</span>
          <span>{progressPct}% through</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100"><div className="h-2 rounded-full bg-teal transition-all duration-300" style={{ width: `${progressPct}%` }} /></div>
      </div>

      {cur?.type === 'overview' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal">What staff read first</p>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {m.frequency && <span className="rounded-full bg-teal/10 px-2.5 py-1 font-medium text-teal">{FREQ_LABEL[m.frequency] ?? m.frequency}</span>}
            {m.pass_mark != null && <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-neutral-mid">Pass mark {m.pass_mark}%</span>}
            {m.duration_minutes != null && <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-neutral-mid">~{m.duration_minutes} min</span>}
            {m.requires_practical && <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">Practical assessment also required</span>}
            {baseline.length > 0 && <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">Includes a {baseline.length} question pre-course knowledge check</span>}
            {practicalChecklist.length > 0 && <span className="rounded-full bg-violet-50 px-2.5 py-1 font-medium text-violet-700">Includes an observed competency checklist for managers</span>}
          </div>
          {m.illustration_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={apiAssetUrl(m.illustration_url) ?? ''} alt="" className="mb-4 aspect-[16/9] w-full rounded-xl border border-gray-100 object-cover" />
          )}
          {m.summary && <p className="text-sm leading-relaxed text-neutral-dark">{m.summary}</p>}
          {m.outcomes?.length > 0 && (
            <div className="mt-4 rounded-lg bg-neutral-light/60 p-4">
              <p className="mb-1.5 text-xs font-semibold text-neutral-dark">What you&rsquo;ll be able to do</p>
              <ul className="space-y-1">{m.outcomes.map((o, i) => <li key={i} className="flex gap-2 text-sm text-neutral-dark"><span className="text-teal">✓</span>{o}</li>)}</ul>
            </div>
          )}
          {m.key_points?.length > 0 && (
            <ul className="mt-4 space-y-1.5">{m.key_points.map((p, i) => <li key={i} className="flex gap-2 text-sm text-neutral-dark"><span className="text-teal">✓</span>{p}</li>)}</ul>
          )}
          {glossary.length > 0 && (
            <details className="mt-4 rounded-lg border border-gray-100 bg-neutral-light/40">
              <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-semibold text-neutral-dark hover:text-teal">Key terms ({glossary.length})</summary>
              <dl className="space-y-2 px-4 pb-3 pt-1">
                {glossary.map((g, i) => (
                  <div key={i} className="text-sm">
                    <dt className="font-medium text-neutral-dark">{g.term}</dt>
                    <dd className="text-neutral-mid">{g.definition}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
          {references.length > 0 && (
            <details className="mt-3 rounded-lg border border-gray-100 bg-neutral-light/40">
              <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-semibold text-neutral-dark hover:text-teal">References and further reading ({references.length})</summary>
              <ul className="space-y-1.5 px-4 pb-3 pt-1">
                {references.map((r, i) => (
                  <li key={i} className="text-sm text-neutral-dark">
                    {r.url
                      ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-teal hover:underline">{r.title}</a>
                      : <span className="font-medium">{r.title}</span>}
                    {r.source && <span className="text-neutral-mid"> · {r.source}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {cur?.type === 'section' && sections[cur.i] && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
          {sections[cur.i].image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={apiAssetUrl(sections[cur.i].image_url) ?? ''} alt="" className="aspect-[16/9] w-full object-cover" />
          )}
          <div className="p-6">
            {sections[cur.i].heading && <p className="mb-2 text-base font-bold text-neutral-dark">{sections[cur.i].heading}</p>}
            <div className="prose prose-sm max-w-none text-neutral-dark" dangerouslySetInnerHTML={{ __html: sections[cur.i].body }} />
          </div>
        </div>
      )}

      {cur?.type === 'question' && questions[cur.i] && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Assessment question</p>
          <p className="font-medium text-neutral-dark">{questions[cur.i].text}</p>
          <ul className="mt-3 space-y-1.5">
            {questions[cur.i].options.map((opt, oi) => (
              <li key={oi} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${oi === questions[cur.i].correct ? 'border-green-300 bg-green-50 font-medium text-green-800' : 'border-gray-200 text-neutral-dark'}`}>
                <span>{String.fromCharCode(65 + oi)}.</span>
                <span>{opt}</span>
                {oi === questions[cur.i].correct && <span className="ml-auto text-xs font-semibold text-green-600">Correct answer</span>}
              </li>
            ))}
          </ul>
          {questions[cur.i].explanation && <p className="mt-3 rounded-lg bg-neutral-light/60 p-3 text-xs text-neutral-mid">{questions[cur.i].explanation}</p>}
        </div>
      )}

      {cur?.type === 'done' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-card">
          <div className="text-3xl">✅</div>
          <h2 className="mt-2 text-lg font-bold text-neutral-dark">End of module</h2>
          <p className="mt-1 text-sm text-neutral-mid">That&rsquo;s the full <span className="font-medium">{m.name || name}</span> module — {sections.length} section{sections.length === 1 ? '' : 's'} and {questions.length} assessment question{questions.length === 1 ? '' : 's'}.</p>
          {m.standards?.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Mapped standards</p>
              <div className="flex flex-wrap justify-center gap-2">{m.standards.map((s, i) => <span key={i} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-neutral-mid">{s}</span>)}</div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-neutral-mid transition-colors hover:bg-gray-100 disabled:opacity-40">← Back</button>
        {step < total - 1 ? (
          <button onClick={() => setStep(s => Math.min(total - 1, s + 1))} className="rounded-lg bg-teal px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal/90">Next →</button>
        ) : (
          <button onClick={() => setStep(0)} className="rounded-lg border border-teal px-6 py-2.5 text-sm font-semibold text-teal transition-colors hover:bg-teal/10">Start again</button>
        )}
      </div>
    </div>
  )
}
