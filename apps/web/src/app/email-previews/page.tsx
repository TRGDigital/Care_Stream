'use client'

// Internal preview gallery for the plan-specific onboarding email drip.
// Not linked anywhere; reviewed on a Vercel preview URL. Copy lives in emails-data.ts.
// Supports client-side reordering (persisted per browser) so the order can be
// arranged and exported, plus a screenshot slot with "where to click" guidance.

import { useEffect, useState } from 'react'
import { SEQUENCES, PLAN_ORDER, type PlanKey, type OnboardingEmail } from './emails-data'

const identity = (n: number) => Array.from({ length: n }, (_, i) => i)
const isPerm = (a: number[], n: number) => a.length === n && [...a].sort((x, y) => x - y).every((v, i) => v === i)

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
        {/* Preheader (the inbox preview line) */}
        <div className="bg-neutral-50 px-6 py-2 text-[11px] italic text-neutral-400">{email.preheader}</div>

        {/* Brand bar */}
        <div className="bg-[#9B52B5] px-6 py-4">
          <span className="text-lg font-extrabold tracking-tight text-white">CareStream<span className="text-white/70">AI</span></span>
        </div>

        {/* Body */}
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

          {/* Tip */}
          {email.tip && (
            <div className="mb-6 rounded-lg border border-teal/30 bg-teal-light px-4 py-3 text-[14px] leading-relaxed text-teal-dark">
              <span className="font-bold">Tip:</span> {email.tip}
            </div>
          )}

          {/* CTA */}
          <a href="#" onClick={e => e.preventDefault()} className="inline-block rounded-lg bg-[#9B52B5] px-6 py-3 text-sm font-bold text-white no-underline">
            {email.ctaLabel}
          </a>

          {/* Sign-off */}
          <p className="mt-7 text-[15px] leading-relaxed text-neutral-700">
            Here whenever you need us,<br />
            <span className="font-semibold text-neutral-900">The CareStream Team</span>
          </p>
        </div>

        {/* Footer */}
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
  const [orders, setOrders] = useState<Record<PlanKey, number[]>>({
    starter:      identity(SEQUENCES.starter.emails.length),
    professional: identity(SEQUENCES.professional.emails.length),
    enterprise:   identity(SEQUENCES.enterprise.emails.length),
  })
  const [copied, setCopied] = useState(false)

  // Hydrate any saved orders from this browser after mount (avoids SSR mismatch).
  useEffect(() => {
    setOrders(prev => {
      const next = { ...prev }
      for (const p of PLAN_ORDER) {
        try {
          const raw = localStorage.getItem(`cs-email-order-${p}`)
          if (!raw) continue
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && isPerm(parsed, SEQUENCES[p].emails.length)) next[p] = parsed
        } catch { /* ignore */ }
      }
      return next
    })
  }, [])

  const seq   = SEQUENCES[plan]
  const order = orders[plan]

  function persist(p: PlanKey, next: number[]) {
    setOrders(prev => ({ ...prev, [p]: next }))
    try { localStorage.setItem(`cs-email-order-${p}`, JSON.stringify(next)) } catch { /* ignore */ }
    setCopied(false)
  }

  function move(pos: number, dir: -1 | 1) {
    const target = pos + dir
    if (target < 0 || target >= order.length) return
    const next = [...order]
    ;[next[pos], next[target]] = [next[target], next[pos]]
    persist(plan, next)
  }

  function reset() {
    persist(plan, identity(seq.emails.length))
  }

  function copyOrder() {
    const text = `${seq.label} email order (${seq.emails.length})\n` +
      order.map((origIdx, i) => `${i + 1}. ${seq.emails[origIdx].subject}`).join('\n')
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) }).catch(() => {})
  }

  const reordered = order !== undefined && !isPerm(order, seq.emails.length) ? identity(seq.emails.length) : order
  const isChanged = reordered.some((v, i) => v !== i)

  return (
    <div className="min-h-screen bg-neutral-100 pb-24">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-teal">Internal preview, for review</p>
          <h1 className="text-2xl font-extrabold text-neutral-900">New-client onboarding emails</h1>
          <p className="mt-2 text-sm text-neutral-600">
            A plan-specific drip sent on working days after signup, one feature per email, benefit-led. Pick a plan to scroll its full sequence as the admin will see it. Use the ↑ ↓ buttons on any email to change the order, then Copy order to send me the final arrangement.
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
            {isChanged && <span className="text-xs font-medium text-amber-600">Custom order (saved in this browser)</span>}
          </div>
        </div>

        <div className="space-y-10">
          {reordered.map((origIdx, pos) => (
            <EmailFrame
              key={origIdx}
              email={seq.emails[origIdx]}
              index={pos}
              canUp={pos > 0}
              canDown={pos < reordered.length - 1}
              onUp={() => move(pos, -1)}
              onDown={() => move(pos, 1)}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
