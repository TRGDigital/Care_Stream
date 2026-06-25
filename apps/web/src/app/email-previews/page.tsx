'use client'

// Internal preview gallery for the plan-specific onboarding email drip.
// Not linked anywhere; reviewed on a Vercel preview URL. Copy lives in emails-data.ts.

import { useState } from 'react'
import { SEQUENCES, PLAN_ORDER, type PlanKey, type OnboardingEmail } from './emails-data'

function EmailFrame({ email, index }: { email: OnboardingEmail; index: number }) {
  return (
    <div className="mx-auto w-full max-w-[640px]">
      {/* Meta strip (not part of the email) */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-neutral-500">
        <span className="rounded-full bg-neutral-900 px-2 py-0.5 font-semibold text-white">Working day {index + 1}</span>
        <span><span className="font-semibold text-neutral-700">Subject:</span> {email.subject}</span>
        {email.badge && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">{email.badge}</span>}
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
          <a
            href="#"
            onClick={e => e.preventDefault()}
            className="inline-block rounded-lg bg-[#9B52B5] px-6 py-3 text-sm font-bold text-white no-underline"
          >
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
  const [plan, setPlan] = useState<PlanKey>('starter')
  const seq = SEQUENCES[plan]

  return (
    <div className="min-h-screen bg-neutral-100 pb-24">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-teal">Internal preview, for review</p>
          <h1 className="text-2xl font-extrabold text-neutral-900">New-client onboarding emails</h1>
          <p className="mt-2 text-sm text-neutral-600">
            A plan-specific drip sent on working days after signup, one feature per email, benefit-led. Pick a plan to scroll its full sequence as the client will see it. Copy and order are easy to change, just tell me what to tweak.
          </p>
        </div>
      </header>

      {/* Plan tabs */}
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 px-6 py-3">
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
        </div>

        <div className="space-y-10">
          {seq.emails.map((email, i) => (
            <EmailFrame key={i} email={email} index={i} />
          ))}
        </div>
      </main>
    </div>
  )
}
