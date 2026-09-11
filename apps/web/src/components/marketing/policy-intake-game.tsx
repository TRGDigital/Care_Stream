'use client'

// The gamified intake that IS the buying journey (Len, 11 Sept): a start screen led
// by an image, then one question per step with progress and encouragement, ending on
// the Buy button. Never one long form.
//
// Answers persist to localStorage so the coming checkout can carry them straight into
// the order's intake — the buyer never types anything twice. Nothing personal goes in
// a URL. Every step is skippable: a missing answer is collected after purchase, and
// the flow says so rather than blocking the sale.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, PartyPopper, ShieldCheck, Sparkles } from 'lucide-react'

export type IntakeGameField = { key: string; label: string; help: string | null; shared: boolean }

const PLACEHOLDERS: Record<string, string> = {
  company_legal_name: 'e.g. Meadowbrook Care Ltd',
  trading_name: 'e.g. Meadowbrook House',
  address: 'e.g. 14 Orchard Lane, York, YO1 7EX',
  cqc_provider_id: 'e.g. 1-101234567',
  cqc_location_id: 'e.g. 1-2098765432',
  registered_manager: 'e.g. Sarah Ellison',
  nominated_individual: 'e.g. David Okafor',
}

// A little warmth at the right moments, indexed by completed-step count.
const CHEERS = [
  'Great start.',
  'That’s the official bits underway.',
  'Nice — CQC details done.',
  'Almost there.',
  'Last few.',
]

export function PolicyIntakeGame({ slug, title, pricePence, fields, buyHref }: {
  slug: string
  title: string
  pricePence: number
  fields: IntakeGameField[]
  buyHref: string
}) {
  // step -1 = start screen; 0..n-1 = one field each; n = the finale with Buy.
  const [step, setStep] = useState(-1)
  const [values, setValues] = useState<Record<string, string>>({})
  const storageKey = `cs_policy_intake_${slug}`

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
      if (saved && typeof saved === 'object') setValues(saved)
    } catch { /* fresh start is fine */ }
  }, [storageKey])

  const save = (next: Record<string, string>) => {
    setValues(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const total = fields.length
  const answered = useMemo(() => fields.filter(f => (values[f.key] ?? '').trim()).length, [fields, values])
  const pct = step < 0 ? 0 : Math.round((Math.min(step, total) / total) * 100)
  const money = `£${(pricePence / 100).toFixed(0)}`

  const field = step >= 0 && step < total ? fields[step] : null
  const next = () => setStep(s => Math.min(s + 1, total))
  const back = () => setStep(s => Math.max(s - 1, -1))

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-elevated ring-1 ring-gray-100">
      {/* Progress — visible from the first question onward */}
      {step >= 0 && (
        <div className="border-b border-gray-100 px-6 py-3">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-mid">
            <span>{step < total ? `Question ${step + 1} of ${total}` : 'Done'}</span>
            <span className="text-teal">{step < total ? `${pct}%` : '100%'}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-teal transition-all duration-500" style={{ width: `${step < total ? pct : 100}%` }} />
          </div>
        </div>
      )}

      {step === -1 && (
        <div>
          {/* IMAGE SLOT: Len's per-policy start image drops in here. */}
          <div className="flex aspect-[16/9] w-full items-center justify-center bg-teal-gradient">
            <div className="text-center text-white">
              <Sparkles size={40} className="mx-auto mb-2 opacity-90" />
              <p className="text-sm font-semibold opacity-90">[ Start image — coming from Len ]</p>
            </div>
          </div>
          <div className="px-6 py-6">
            <h3 className="text-xl font-extrabold text-neutral-dark">Let’s build your {title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-mid">
              Answer {total} quick questions — about three minutes — and we’ll write this policy
              for your service, in your name, with your people. You can skip anything and add it later.
            </p>
            <button onClick={() => setStep(0)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-btn bg-teal px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-teal/90">
              Start building it <ArrowRight size={16} />
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-mid">
              <ShieldCheck size={13} className="text-teal" /> Asked once — reused for every policy you buy
            </p>
          </div>
        </div>
      )}

      {field && (
        <div className="px-6 py-6">
          {step > 0 && (values[fields[step - 1].key] ?? '').trim() !== '' && (
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-green-600">
              <CheckCircle2 size={13} /> {CHEERS[Math.min(Math.floor(step / Math.max(1, Math.ceil(total / CHEERS.length))), CHEERS.length - 1)]}
            </p>
          )}
          <label className="block text-lg font-bold text-neutral-dark">
            {field.label}
            {field.shared && <span className="ml-2 align-middle rounded-full bg-teal-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal">saved for all your policies</span>}
          </label>
          {field.help && <p className="mt-1 text-xs text-neutral-mid">{field.help}</p>}
          <input
            autoFocus
            value={values[field.key] ?? ''}
            onChange={e => save({ ...values, [field.key]: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') next() }}
            placeholder={PLACEHOLDERS[field.key] ?? ''}
            className="mt-4 w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-base focus:border-teal focus:outline-none"
          />
          <div className="mt-5 flex items-center justify-between">
            <button onClick={back} className="inline-flex items-center gap-1 text-sm font-medium text-neutral-mid hover:text-neutral-dark">
              <ArrowLeft size={15} /> Back
            </button>
            <div className="flex items-center gap-3">
              <button onClick={next} className="text-xs text-neutral-mid underline hover:text-neutral-dark">Skip for now</button>
              <button onClick={next}
                className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-6 py-2.5 text-sm font-bold text-white hover:bg-teal/90">
                {step === total - 1 ? 'Finish' : 'Next'} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === total && (
        <div className="px-6 py-6">
          <p className="flex items-center gap-2 text-lg font-extrabold text-neutral-dark">
            <PartyPopper size={20} className="text-teal" /> That’s everything we need
          </p>
          <p className="mt-1 text-sm text-neutral-mid">
            {answered === total
              ? `All ${total} answers in — your ${title} is ready to be written the moment you buy.`
              : `${answered} of ${total} answered. No problem — we’ll ask for the rest after purchase, writing starts once they’re in.`}
          </p>
          <ul className="mt-4 max-h-44 space-y-1 overflow-y-auto rounded-lg bg-gray-50 px-4 py-3">
            {fields.map((f, i) => (
              <li key={f.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-neutral-mid">{f.label}</span>
                {(values[f.key] ?? '').trim()
                  ? <span className="truncate font-medium text-neutral-dark">{values[f.key]}</span>
                  : <button onClick={() => setStep(i)} className="text-xs text-teal underline">add</button>}
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl border border-teal/30 bg-teal-light/20 px-4 py-3 text-center">
            <p className="text-2xl font-extrabold text-neutral-dark">{money} <span className="text-sm font-medium text-neutral-mid">one-off</span></p>
            <p className="text-xs text-neutral-mid">First year of updates included · delivered within 2 working days</p>
          </div>
          <Link href={buyHref}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-btn bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700">
            Buy now · {money}
          </Link>
          <p className="mt-2 text-center text-xs text-neutral-mid">Your answers are saved on this device and carried into your order.</p>
        </div>
      )}
    </div>
  )
}
