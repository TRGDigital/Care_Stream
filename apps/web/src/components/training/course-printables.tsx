'use client'

// Printable course artefacts for a standard training module:
//  - CourseSummarySheet: one-page learner takeaway (outcomes, key points, glossary, references)
//  - PracticalChecklistSheet: observed competency checklist with manager sign-off
// Both follow the CourseSpecification pattern: fixed overlay, Close + Print buttons,
// and the `.spec-sheet` class + body.printing-spec for print isolation.

import { useRef, useState } from 'react'
import { X, Printer, Download, Loader2 } from 'lucide-react'
import { downloadElementAsPdf, safeFileName } from '@/lib/download-pdf'

function printSheet() { document.body.classList.add('printing-spec'); window.print(); setTimeout(() => document.body.classList.remove('printing-spec'), 600) }

function SheetShell({ label, name, onClose, children }: { label: string; name: string; onClose: () => void; children: React.ReactNode }) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  async function download() {
    if (!sheetRef.current || saving) return
    setSaving(true)
    try { await downloadElementAsPdf(sheetRef.current, safeFileName(`${name} - ${label}`)) }
    catch { printSheet() }   // fall back to the print dialog if the renderer fails
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 print:bg-white print:p-0">
      <div className="my-6 w-full max-w-3xl">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-neutral-dark hover:bg-neutral-light"><X size={14} /> Close</button>
          <div className="flex items-center gap-2">
            <button onClick={printSheet} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-neutral-dark hover:bg-neutral-light"><Printer size={14} /> Print</button>
            <button onClick={download} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Preparing…</> : <><Download size={14} /> Download PDF</>}
            </button>
          </div>
        </div>

        <div ref={sheetRef} className="spec-sheet rounded-xl border border-gray-200 bg-white p-8 shadow-card">
          <div className="mb-4 flex items-center justify-between border-b-2 border-teal pb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">{label}</p>
              <h1 className="mt-0.5 text-xl font-bold text-neutral-dark">{name}</h1>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-color.png" alt="CareStream" className="h-12 w-auto object-contain" />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── One-page learner takeaway ────────────────────────────────────────────────

export function CourseSummarySheet({ m, onClose }: { m: any; onClose: () => void }) {
  const lc = m?.learning_content ?? {}
  const outcomes: string[] = lc.outcomes ?? m?.outcomes ?? []
  const keyPoints: string[] = lc.key_points ?? m?.key_points ?? []
  const glossary: Array<{ term: string; definition: string }> = lc.glossary ?? m?.glossary ?? []
  const references: Array<{ title: string; source?: string; url?: string }> = lc.references ?? m?.references ?? []
  const hours = m?.duration_minutes ? (m.duration_minutes / 60).toFixed(1) : null

  return (
    <SheetShell label="Course summary" name={m?.name ?? ''} onClose={onClose}>
      {m?.duration_minutes != null && (
        <p className="mb-3 text-xs text-neutral-mid">Duration: {m.duration_minutes} minutes{hours ? ` (approximately ${hours} CPD hours)` : ''}</p>
      )}

      {outcomes.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-dark">Learning outcomes</p>
          <ol className="list-decimal space-y-0.5 pl-5 text-xs leading-relaxed text-neutral-dark">{outcomes.map((o, i) => <li key={i}>{o}</li>)}</ol>
        </div>
      )}

      {keyPoints.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-dark">Key points</p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs leading-relaxed text-neutral-dark">{keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
      )}

      {glossary.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-dark">Key terms</p>
          <dl className={`text-xs leading-relaxed text-neutral-dark ${glossary.length > 6 ? 'grid grid-cols-2 gap-x-6 gap-y-1' : 'space-y-1'}`}>
            {glossary.map((g, i) => (
              <div key={i}><dt className="inline font-semibold">{g.term}: </dt><dd className="inline text-neutral-mid">{g.definition}</dd></div>
            ))}
          </dl>
        </div>
      )}

      {references.length > 0 && (
        <div className="mb-1">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-dark">References and further reading</p>
          <ul className="space-y-0.5 text-[10px] leading-relaxed text-neutral-dark">
            {references.map((r, i) => (
              <li key={i}>
                <span className="font-medium">{r.title}</span>
                {r.source ? `, ${r.source}` : ''}
                {r.url ? <span className="text-neutral-mid"> ({r.url})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 border-t border-gray-100 pt-2 text-[9px] leading-relaxed text-neutral-mid">
        Learner takeaway generated by CareStream. Keep this summary with your certificate as part of your CPD record.
      </p>
    </SheetShell>
  )
}

// ─── Observed competency checklist (manager sign-off) ─────────────────────────

export function PracticalChecklistSheet({ m, onClose }: { m: any; onClose: () => void }) {
  const lc = m?.learning_content ?? {}
  const items: string[] = lc.practical_checklist ?? m?.practical_checklist ?? []

  return (
    <SheetShell label="Observed competency checklist" name={m?.name ?? ''} onClose={onClose}>
      <p className="mb-4 text-sm text-neutral-dark">To be completed by a manager or competent assessor while observing the staff member. This complements the knowledge module.</p>

      {items.length > 0 ? (
        <div className="mb-6">
          {items.map((item, i) => (
            <div key={i} className={`flex items-start gap-3 py-2 text-sm text-neutral-dark ${i > 0 ? 'border-t border-gray-100' : ''}`}>
              <span aria-hidden="true" className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded-[3px] border-2 border-neutral-dark" />
              <span className="leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-6 text-sm text-neutral-mid">No checklist items recorded for this module.</p>
      )}

      <div className="mt-2 border-t-2 border-teal pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-teal-dark">Sign-off</p>
        <div className="space-y-5">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <SignLine label="Staff member name" w="w-56" />
            <SignLine label="Signature" w="w-48" />
            <SignLine label="Date" w="w-28" />
          </div>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <SignLine label="Assessor name" w="w-44" />
            <SignLine label="Role" w="w-32" />
            <SignLine label="Signature" w="w-40" />
            <SignLine label="Date" w="w-28" />
          </div>
        </div>
      </div>

      <p className="mt-5 border-t border-gray-100 pt-2 text-[9px] leading-relaxed text-neutral-mid">
        File the signed checklist with the staff member&rsquo;s training record. The knowledge certificate and this observed assessment together evidence competency.
      </p>
    </SheetShell>
  )
}

function SignLine({ label, w }: { label: string; w: string }) {
  return (
    <span className="inline-flex items-end gap-2 text-xs text-neutral-mid">
      {label}
      <span className={`inline-block ${w} border-b border-neutral-dark`}>&nbsp;</span>
    </span>
  )
}
