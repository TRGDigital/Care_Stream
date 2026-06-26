'use client'

// Internal preview gallery for the plan-specific onboarding email drip.
// Not linked anywhere; reviewed on a Vercel preview URL. Copy lives in emails-data.ts.
//
// Ordering is GLOBAL by subject: the core onboarding emails are shared across all
// three plans, so arranging them on any plan reorders them everywhere they appear.
// Plan-specific emails (premium features, finales) just sit at their global rank.

import { useEffect, useMemo, useState } from 'react'
import { SEQUENCES, PLAN_ORDER, type PlanKey, type OnboardingEmail } from './emails-data'

// Canonical union of every email subject, in a sensible default order (Enterprise is
// the superset; Starter's finale is the only extra, appended at the end).
const ALL_SUBJECTS: string[] = (() => {
  const seen = new Set<string>(); const out: string[] = []
  for (const p of ['enterprise', 'starter', 'professional'] as PlanKey[]) {
    for (const e of SEQUENCES[p].emails) if (!seen.has(e.subject)) { seen.add(e.subject); out.push(e.subject) }
  }
  return out
})()

const sameSet = (a: string[]) => a.length === ALL_SUBJECTS.length && ALL_SUBJECTS.every(s => a.includes(s))

function EmailFrame({
  email, index, canUp, canDown, onUp, onDown,
}: {
  email: OnboardingEmail; index: number; canUp: boolean; canDown: boolean; onUp: () => void; onDown: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-[640px]">
      {/* Meta strip (not part of the email) */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-neutral-500">
        <span className="rounded-full bg-neutral-900 px-2 py-0.5 font-semibold text-white">Working day {index + 1}</span>
        <span className="min-w-0 flex-1 truncate"><span className="font-semibold text-neutral-700">Subject:</span> {email.subject}</span>
        {email.badge && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">{email.badge}</span>}
        <span className="flex items-center gap-1">
          <button onClick={onUp} disabled={!canUp} title="Move earlier" className="flex h-6 w-6 items-center justify-center rounded border border-neutral-200 bg-white text-neutral-600 hover:border-[#9B52B5] hover:text-[#9B52B5] disabled:opacity-30">↑</button>
          <button onClick={onDown} disabled={!canDown} title="Move later" className="flex h-6 w-6 items-center justify-center rounded border border-neutral-200 bg-white text-neutral-600 hover:border-[#9B52B5] hover:text-[#9B52B5] disabled:opacity-30">↓</button>
        </span>
      </div>

      {/* The email itself */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="bg-neutral-50 px-6 py-2 text-[11px] italic text-neutral-400">{email.preheader}</div>

        <div className="bg-[#9B52B5] px-6 py-4">
          <span className="text-lg font-extrabold tracking-tight text-white">CareStream<span className="text-white/70">AI</span></span>
        </div>

        <div className="px-6 py-7 sm:px-8">
          <h1 className="mb-4 text-[22px] font-extrabold leading-snug text-neutral-900">{email.headline}</h1>

          {email.intro.map((p, i) => (
            <p key={i} className="mb-3 text-[15px] leading-relaxed text-neutral-700">{p}</p>
          ))}

          {/* Screenshot + where to click */}
          <div className="my-6">
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <div className="flex items-center gap-1.5 bg-neutral-100 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                <span className="ml-2 text-[11px] text-neutral-400">CareStream</span>
              </div>
              {email.imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={email.imageSrc} alt="" className="block w-full" />
              ) : (
                <div className="flex h-44 items-center justify-center bg-[repeating-linear-gradient(45deg,#fafafa,#fafafa_10px,#f4f4f5_10px,#f4f4f5_20px)] text-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Platform screenshot</p>
                    <p className="mt-0.5 text-[11px] text-neutral-400">to be added</p>
                  </div>
                </div>
              )}
            </div>
            {email.where && (
              <p className="mt-2 flex gap-1.5 text-[13px] leading-relaxed text-neutral-600">
                <span aria-hidden>📍</span>
                <span><span className="font-bold text-neutral-800">Where to click:</span> {email.where}</span>
              </p>
            )}
          </div>

          {/* Steps */}
          <div className="my-6 space-y-3">
            {email.steps.map((s, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#9B52B5] text-[11px] font-bold text-white">{i + 1}</span>
                <p className="text-[15px] leading-relaxed text-neutral-700">
                  <span className="font-bold text-neutral-900">{s.title}.</span> {s.body}
                </p>
              </div>
            ))}
          </div>

          {email.tip && (
            <div className="mb-6 rounded-lg border border-teal/30 bg-teal-light px-4 py-3 text-[14px] leading-relaxed text-teal-dark">
              <span className="font-bold">Tip:</span> {email.tip}
            </div>
          )}

          <a href="#" onClick={e => e.preventDefault()} className="inline-block rounded-lg bg-[#9B52B5] px-6 py-3 text-sm font-bold text-white no-underline">
            {email.ctaLabel}
          </a>

          <p className="mt-7 text-[15px] leading-relaxed text-neutral-700">
            Here whenever you need us,<br />
            <span className="font-semibold text-neutral-900">The CareStream Team</span>
          </p>
        </div>

        <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-5 text-[11px] leading-relaxed text-neutral-400">
          <p className="mb-1">CareStreamAI, compliance and training for care providers.</p>
          <p>You are receiving this because you started a CareStream account. <span className="underline">Unsubscribe</span> from onboarding tips at any time.</p>
        </div>
      </div>
    </div>
  )
}

export default function EmailPreviewsPage() {
  const [plan, setPlan]   = useState<PlanKey>('starter')
  const [globalOrder, setGlobalOrder] = useState<string[]>(ALL_SUBJECTS)
  const [copied, setCopied] = useState(false)

  // Hydrate the saved global order from this browser after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cs-email-global-order')
      if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed) && sameSet(parsed)) setGlobalOrder(parsed) }
    } catch { /* ignore */ }
  }, [])

  const rank = useMemo(() => { const m = new Map<string, number>(); globalOrder.forEach((s, i) => m.set(s, i)); return m }, [globalOrder])
  const seq  = SEQUENCES[plan]
  const displayed = useMemo(
    () => [...seq.emails].sort((a, b) => (rank.get(a.subject) ?? 0) - (rank.get(b.subject) ?? 0)),
    [seq, rank],
  )

  function persistGlobal(next: string[]) {
    setGlobalOrder(next)
    try { localStorage.setItem('cs-email-global-order', JSON.stringify(next)) } catch { /* ignore */ }
    setCopied(false)
  }

  // Move the email at display position `pos` before/after its visible neighbour, by
  // re-placing its subject in the global order. Shared emails move on every plan.
  function move(pos: number, dir: -1 | 1) {
    const subs = displayed.map(e => e.subject)
    const a = subs[pos], b = subs[pos + dir]
    if (!a || !b) return
    const next = globalOrder.filter(s => s !== a)
    const bi = next.indexOf(b)
    next.splice(dir === -1 ? bi : bi + 1, 0, a)
    persistGlobal(next)
  }

  function reset() { persistGlobal(ALL_SUBJECTS) }

  function copyOrder() {
    const text = `${seq.label} email order (${displayed.length})\n` +
      displayed.map((e, i) => `${i + 1}. ${e.subject}`).join('\n')
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) }).catch(() => {})
  }

  const isChanged = globalOrder.some((s, i) => s !== ALL_SUBJECTS[i])

  return (
    <div className="min-h-screen bg-neutral-100 pb-24">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-teal">Internal preview, for review</p>
          <h1 className="text-2xl font-extrabold text-neutral-900">New-client onboarding emails</h1>
          <p className="mt-2 text-sm text-neutral-600">
            A plan-specific drip sent on working days after signup, one feature per email, benefit-led. Use the ↑ ↓ buttons to set the order. The core emails are shared across all three plans, so reordering them on one plan reorders them on every plan. Then Copy order to send me the final arrangement.
          </p>
        </div>
      </header>

      {/* Plan tabs */}
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-3">
          {PLAN_ORDER.map(p => {
            const s = SEQUENCES[p]
            const active = p === plan
            return (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${active ? 'bg-[#9B52B5] text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
              >
                {s.label}
                <span className={`ml-1.5 text-xs ${active ? 'text-white/70' : 'text-neutral-400'}`}>{s.emails.length}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sequence */}
      <main className="mx-auto max-w-3xl px-6">
        <div className="py-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-extrabold text-neutral-900">{seq.label} <span className="text-sm font-medium text-neutral-500">{seq.price}</span></h2>
            <span className="text-sm font-semibold text-neutral-700">{seq.emails.length} emails</span>
          </div>
          <p className="mt-1 text-sm text-neutral-600">{seq.blurb}</p>

          {/* Reorder toolbar */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={copyOrder} className="rounded-lg bg-[#9B52B5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7A3D9A]">
              {copied ? 'Copied to clipboard' : 'Copy this order'}
            </button>
            <button onClick={reset} disabled={!isChanged} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-40">
              Reset to default
            </button>
            {isChanged && <span className="text-xs font-medium text-amber-600">Custom order (shared across plans, saved in this browser)</span>}
          </div>
        </div>

        <div className="space-y-10">
          {displayed.map((email, pos) => (
            <EmailFrame
              key={email.subject}
              email={email}
              index={pos}
              canUp={pos > 0}
              canDown={pos < displayed.length - 1}
              onUp={() => move(pos, -1)}
              onDown={() => move(pos, 1)}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
