'use client'

// Shown when a policies-only buyer clicks a locked part of the console.
//
// They came in through the policy shop: they bought a document, not a subscription,
// and have never seen what CareStream is. So this explains the tiers rather than
// simply refusing — the lock is the first time most of them learn there is more.

import { X, Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

const TIERS = [
  {
    name: 'What you have',
    price: 'One-off',
    current: true,
    blurb: 'The policies you bought, written for your service and kept updated for a year.',
    points: ['Your policies, personalised and human-reviewed', 'Updated when the law changes', 'No subscription'],
  },
  {
    name: 'Training',
    price: 'From £25.99 per person',
    blurb: 'Add CQC-aligned staff training, completed in the hub in over 60 languages.',
    points: ['Annual mandatory training', 'A certificate for every member of staff', 'Bought per person, no subscription'],
  },
  {
    name: 'Full CareStream',
    price: 'From £85 a month',
    blurb: 'The whole platform: your policies answering questions for staff, on any shift, in any language.',
    points: [
      'Staff ask a question and get the answer from your policies',
      'Policy gap analysis against current legislation',
      'CQC evidence that builds itself',
      'Audits, staff onboarding and compliance tracking',
    ],
  },
]

export function UpgradeOverlay({ feature, onClose }: { feature: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div
      role="dialog" aria-modal="true" aria-label={`${feature} is not included in your plan`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-dark/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-7 shadow-elevated"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-neutral-dark">{feature} is part of CareStream</h2>
            <p className="mt-1 text-sm text-neutral-mid">
              You bought policies, which do not need a subscription. {feature} comes with the wider
              platform — here is what each step adds.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map(t => (
            <div key={t.name}
              className={`rounded-xl border p-5 ${t.current ? 'border-teal bg-teal-light/20' : 'border-gray-200 bg-white'}`}>
              {t.current && (
                <span className="mb-2 inline-block rounded-full bg-teal px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Your plan
                </span>
              )}
              <h3 className="text-sm font-bold text-neutral-dark">{t.name}</h3>
              <p className="mt-0.5 text-xs font-semibold text-teal">{t.price}</p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-mid">{t.blurb}</p>
              <ul className="mt-3 space-y-1.5">
                {t.points.map(pt => (
                  <li key={pt} className="flex items-start gap-2 text-xs leading-relaxed text-neutral-dark">
                    <Check size={13} className="mt-0.5 shrink-0 text-teal" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/demo"
            className="flex-1 rounded-btn bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700">
            Book a demo
          </Link>
          <Link href="/pricing"
            className="flex-1 rounded-btn border-2 border-gray-200 px-6 py-3 text-center text-sm font-semibold text-neutral-dark hover:border-teal hover:text-teal">
            See full pricing <ArrowRight size={14} className="inline" />
          </Link>
        </div>
        <p className="mt-3 text-center text-xs text-neutral-mid">
          Your policies are unaffected either way — they are yours, and stay updated.
        </p>
      </div>
    </div>
  )
}
