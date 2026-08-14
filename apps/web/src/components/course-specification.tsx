'use client'

// Printable course-specification document for a standard training module — the
// artefact a CPD assessor reviews. Auto-assembled from everything already captured
// (outcomes, duration/CPD hours, assessment, lesson structure, standards, evidence
// base, governance/attestation). Keeps `.spec-sheet` for print isolation.

import { X, Printer } from 'lucide-react'

const FREQ_LABEL: Record<string, string> = { annual: 'Annual', biennial: 'Every 2 years', triennial: 'Every 3 years', once: 'One-off', adhoc: 'Ad-hoc' }

function fmtDate(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '—' }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-gray-100 py-1.5 text-sm">
      <span className="w-44 shrink-0 font-medium text-neutral-mid">{label}</span>
      <span className="flex-1 text-neutral-dark">{children}</span>
    </div>
  )
}

export function CourseSpecification({ m, qa, onClose }: { m: any; qa: any; onClose: () => void }) {
  const lc = m.learning_content ?? {}
  const outcomes: string[] = Array.isArray(lc.outcomes) ? lc.outcomes : []
  const sections: any[] = Array.isArray(lc.sections) ? lc.sections : []
  const questions: any[] = Array.isArray(m.questions) ? m.questions : []
  const refs: any[] = Array.isArray(m.policy_refs) ? m.policy_refs : []
  const standards: any[] = Array.isArray(m.standards) ? m.standards : []
  const courseRefs: any[] = Array.isArray(lc.references) ? lc.references : []
  const glossary: any[] = Array.isArray(lc.glossary) ? lc.glossary : []
  const baseline: any[] = Array.isArray(lc.baseline) ? lc.baseline : []
  const checklist: any[] = Array.isArray(lc.practical_checklist) ? lc.practical_checklist : []
  const hours = m.duration_minutes ? (m.duration_minutes / 60).toFixed(1) : null

  function print() { document.body.classList.add('printing-spec'); window.print(); setTimeout(() => document.body.classList.remove('printing-spec'), 600) }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 print:bg-white print:p-0">
      <div className="my-6 w-full max-w-3xl">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-neutral-dark hover:bg-neutral-light"><X size={14} /> Close</button>
          <button onClick={print} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-dark"><Printer size={14} /> Print / save PDF</button>
        </div>

        <div className="spec-sheet rounded-xl border border-gray-200 bg-white p-8 shadow-card">
          <div className="mb-4 flex items-center justify-between border-b-2 border-teal pb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">Course Specification</p>
              <h1 className="mt-0.5 text-xl font-bold text-neutral-dark">{m.name}</h1>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-color.png" alt="CareStream" className="h-12 w-auto object-contain" />
          </div>

          <div className="mb-5">
            <Row label="Status">{m.approved ? 'Published (standard library)' : 'Draft'}{m.cpd_accredited ? ' · CPD accredited' : ''}</Row>
            <Row label="Type">Annual refresher · knowledge assessment (teach-then-assess)</Row>
            <Row label="Frequency / renewal">{FREQ_LABEL[m.frequency] ?? m.frequency}{m.renewal_months ? ` · renews every ${m.renewal_months} months` : ''}</Row>
            <Row label="Duration (CPD)">{m.duration_minutes ? `${m.duration_minutes} minutes ≈ ${hours} CPD hours` : 'Not set'}</Row>
            <Row label="Target audience">Care-home staff (delivered in each learner's first language)</Row>
            {m.requires_practical && <Row label="Practical">Knowledge component only — a separate practical/observed competency assessment is also required.</Row>}
          </div>

          <Section title="Learning outcomes">
            {outcomes.length ? <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-dark">{outcomes.map((o, i) => <li key={i}>{o}</li>)}</ol> : <p className="text-sm text-neutral-mid">None recorded.</p>}
          </Section>

          <Section title="Lesson structure">
            <ol className="list-decimal space-y-0.5 pl-5 text-sm text-neutral-dark">
              {sections.map((s, i) => <li key={i}>{s.heading || `Section ${i + 1}`} <span className="text-neutral-mid">— teaching + applied scenario + knowledge check</span></li>)}
            </ol>
            <p className="mt-1 text-xs text-neutral-mid">{sections.length} interactive sections, each with a real care scenario and a formative check.</p>
          </Section>

          <Section title="Assessment">
            <p className="text-sm text-neutral-dark">{questions.length} single-best-answer multiple-choice questions (4 options each), served as a randomised bank. Pass mark <strong>{m.pass_mark}%</strong>. Passing issues a certificate; learners may review and retake on a fail.</p>
          </Section>

          <Section title="Mapped standards">
            {standards.length ? <ul className="flex flex-wrap gap-1.5">{standards.map((s, i) => <li key={i} className="rounded-full bg-teal-light/40 px-2 py-0.5 text-xs text-teal-dark">{s.label}</li>)}</ul> : <p className="text-sm text-neutral-mid">None mapped.</p>}
          </Section>

          <Section title="Evidence base (grounding sources)">
            {refs.length ? <ul className="list-disc space-y-0.5 pl-5 text-sm text-neutral-dark">{refs.map((r, i) => <li key={i}>{r.title}{r.section ? ` — ${r.section}` : ''}</li>)}</ul> : <p className="text-sm text-neutral-mid">None recorded.</p>}
          </Section>

          {courseRefs.length > 0 && (
            <Section title="References and evidence base">
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-neutral-dark">
                {courseRefs.map((r, i) => (
                  <li key={i}>{r.title}{r.source ? `, ${r.source}` : ''}{r.url ? <span className="text-xs text-neutral-mid"> ({r.url})</span> : null}</li>
                ))}
              </ul>
            </Section>
          )}

          {glossary.length > 0 && (
            <Section title="Glossary">
              <p className="text-sm text-neutral-dark">{glossary.length} key term{glossary.length === 1 ? '' : 's'} defined for learners: <span className="text-neutral-mid">{glossary.map((g: any) => g.term).join(', ')}</span></p>
            </Section>
          )}

          {(baseline.length > 0 || checklist.length > 0) && (
            <Section title="Additional components">
              {baseline.length > 0 && <Row label="Pre-course baseline check">{baseline.length} question{baseline.length === 1 ? '' : 's'} (learning gain measured against final assessment)</Row>}
              {checklist.length > 0 && <Row label="Observed competency checklist">{checklist.length} item{checklist.length === 1 ? '' : 's'} (manager sign-off)</Row>}
            </Section>
          )}

          <Section title="Quality assurance & governance">
            {qa && (
              <ul className="mb-2 space-y-0.5 text-sm">
                {qa.checks.map((c: any) => (
                  <li key={c.key} className="text-neutral-dark"><span className={c.status === 'pass' ? 'text-green-600' : c.status === 'warn' ? 'text-amber-600' : 'text-red-600'}>{c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✗'}</span> {c.label} — <span className="text-neutral-mid">{c.detail}</span></li>
                ))}
              </ul>
            )}
            <Row label="Reviewer attestation">{m.attested_by_name ? `${m.attested_by_name}${m.attested_by_role ? `, ${m.attested_by_role}` : ''} on ${fmtDate(m.attested_at)}` : 'Not yet attested'}</Row>
            <Row label="Content created / published">{fmtDate(m.created_at)}{m.approved_at ? ` / ${fmtDate(m.approved_at)}` : ''}</Row>
          </Section>

          <p className="mt-6 border-t border-gray-100 pt-3 text-[10px] leading-relaxed text-neutral-mid">
            Generated by CareStream from anonymised reference policies and reviewed by a named competent person. Records completion of a knowledge assessment;
            the provider remains responsible for ensuring training meets regulatory requirements.
          </p>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 text-sm font-semibold text-teal-dark">{title}</p>
      {children}
    </div>
  )
}
