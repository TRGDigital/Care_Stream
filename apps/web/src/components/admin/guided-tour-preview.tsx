'use client'

// PREVIEW HARNESS for the new-tenant guided tour. Three candidate designs
// rendered over the real dashboard so Len can pick one. Only visible when the
// URL carries ?tour=a|b|c (or ?tour=preview) — tenants never see this. Once a
// variant is chosen it gets real first-login trigger + auto-tick logic and the
// other two are removed.
//
// Step order per Len (2026-08-16): policies → gap analysis → training and
// onboarding → staff. Clients may do things in any order; the tour guides, it
// never locks.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, GraduationCap, ScanSearch, Users, X, ChevronDown, ArrowRight } from 'lucide-react'

type TourStep = {
  n:     number
  title: string
  desc:  string
  href:  string
  cta:   string
  Icon:  typeof FileText
  img:   string   // drop a screenshot at this path to replace the icon panel
}

const STEPS: TourStep[] = [
  {
    n: 1, title: 'Upload your policies',
    desc: 'Everything in CareStream is built on your own policies. Upload them first and the staff answers, gap analysis and training all work from your real content.',
    href: '/policies', cta: 'Go to Policies', Icon: FileText, img: '/tour/step-1.png',
  },
  {
    n: 2, title: 'Run your Gap Analysis',
    desc: 'See how your policies cover the regulations that apply to your service, adopt the suggested fixes, and publish the improved versions.',
    href: '/gaps', cta: 'Open Gaps', Icon: ScanSearch, img: '/tour/step-2.png',
  },
  {
    n: 3, title: 'Create training and onboarding',
    desc: 'Turn your policies into ad hoc training for your team, and build onboarding flows for each role on the Onboarding page.',
    href: '/training', cta: 'Set up training', Icon: GraduationCap, img: '/tour/step-3.png',
  },
  {
    n: 4, title: 'Add your staff',
    desc: 'Add your team one by one or import everyone from a CSV in minutes, then invite them into the staff hub with passwordless links.',
    href: '/staff', cta: 'Go to Staff', Icon: Users, img: '/tour/step-4.png',
  },
]

// Image slot: shows the screenshot when one exists at /public/tour/step-N.png,
// otherwise a branded icon panel so the layout reads correctly in preview.
function ImageSlot({ step, className }: { step: TourStep; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`overflow-hidden rounded-lg border border-gray-100 bg-gradient-to-br from-teal-light/40 to-indigo-50 ${className ?? ''}`}>
      {failed ? (
        <div className="flex h-full w-full items-center justify-center py-8">
          <step.Icon size={40} className="text-teal/70" />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={step.img} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
    </div>
  )
}

function Dots({ current }: { current: number }) {
  return (
    <span className="flex items-center gap-1.5">
      {STEPS.map((s, i) => (
        <span key={s.n} className={`h-1.5 rounded-full transition-all ${i === current ? 'w-5 bg-teal' : 'w-1.5 bg-gray-300'}`} />
      ))}
    </span>
  )
}

// ─── Variant A: spotlight coach marks ─────────────────────────────────────────
// Dims the page and rings the ACTUAL sidebar link for the current step, with a
// numbered card beside it.

function VariantA({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = STEPS[i]

  useEffect(() => {
    function measure() {
      const el = document.querySelector(`a[href="${STEPS[i].href}"]`)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [i])

  const pad = 6
  const cardTop = rect ? Math.min(Math.max(rect.top - 40, 16), window.innerHeight - 320) : 100

  return (
    <div className="fixed inset-0 z-[70]">
      {rect ? (
        <>
          {/* Backdrop with a cut-out: the highlight box casts a giant shadow */}
          <div
            className="absolute rounded-xl ring-4 ring-teal transition-all duration-300"
            style={{
              top: rect.top - pad, left: rect.left - pad,
              width: rect.width + pad * 2, height: rect.height + pad * 2,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            }}
          />
          <span
            className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-teal text-sm font-bold text-white shadow-lg transition-all duration-300"
            style={{ top: rect.top - pad - 12, left: rect.left + rect.width + pad - 12 }}
          >
            {step.n}
          </span>
          {/* Card beside the highlighted nav item */}
          <div className="absolute w-80 rounded-xl bg-white p-4 shadow-2xl transition-all duration-300" style={{ top: cardTop, left: (rect.right + 24) }}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-neutral-dark">Step {step.n}: {step.title}</p>
              <button onClick={onClose} aria-label="Skip tour" className="rounded p-0.5 text-neutral-mid hover:text-neutral-dark"><X size={15} /></button>
            </div>
            <ImageSlot step={step} className="mt-2 h-28" />
            <p className="mt-2 text-xs leading-relaxed text-neutral-mid">{step.desc}</p>
            <div className="mt-3 flex items-center justify-between">
              <Dots current={i} />
              <div className="flex items-center gap-2">
                {i > 0 && <button onClick={() => setI(i - 1)} className="text-xs font-semibold text-neutral-mid hover:text-neutral-dark">Back</button>}
                <Link href={step.href} className="rounded-btn border border-teal px-2.5 py-1 text-xs font-semibold text-teal hover:bg-teal-light/30">{step.cta}</Link>
                {i < STEPS.length - 1
                  ? <button onClick={() => setI(i + 1)} className="rounded-btn bg-teal px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-dark">Next</button>
                  : <button onClick={onClose} className="rounded-btn bg-teal px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-dark">Finish</button>}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Sidebar link not on screen (small viewport) — plain centred card */
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-4">
          <div className="w-80 rounded-xl bg-white p-4 shadow-2xl">
            <p className="text-sm font-bold text-neutral-dark">Step {step.n}: {step.title}</p>
            <ImageSlot step={step} className="mt-2 h-28" />
            <p className="mt-2 text-xs leading-relaxed text-neutral-mid">{step.desc}</p>
            <div className="mt-3 flex items-center justify-between">
              <Dots current={i} />
              {i < STEPS.length - 1
                ? <button onClick={() => setI(i + 1)} className="rounded-btn bg-teal px-2.5 py-1 text-xs font-semibold text-white">Next</button>
                : <button onClick={onClose} className="rounded-btn bg-teal px-2.5 py-1 text-xs font-semibold text-white">Finish</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Variant B: welcome journey modal ─────────────────────────────────────────
// A centred first-login carousel: big number, image, copy, "Take me there".

function VariantB({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const step = STEPS[i]
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal">Welcome to CareStream</p>
          <button onClick={onClose} aria-label="Skip tour" className="rounded p-1 text-neutral-mid hover:text-neutral-dark"><X size={16} /></button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal text-lg font-bold text-white">{step.n}</span>
          <h2 className="text-lg font-bold text-neutral-dark">{step.title}</h2>
        </div>
        <ImageSlot step={step} className="mt-4 h-44 w-full" />
        <p className="mt-3 text-sm leading-relaxed text-neutral-mid">{step.desc}</p>
        <div className="mt-5 flex items-center justify-between">
          <Dots current={i} />
          <div className="flex items-center gap-2">
            {i > 0 && <button onClick={() => setI(i - 1)} className="text-sm font-semibold text-neutral-mid hover:text-neutral-dark">Back</button>}
            <Link href={step.href} className="flex items-center gap-1.5 rounded-btn border border-teal px-3 py-1.5 text-sm font-semibold text-teal hover:bg-teal-light/30">
              {step.cta} <ArrowRight size={13} />
            </Link>
            {i < STEPS.length - 1
              ? <button onClick={() => setI(i + 1)} className="rounded-btn bg-teal px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-dark">Next</button>
              : <button onClick={onClose} className="rounded-btn bg-teal px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-dark">Finish</button>}
          </div>
        </div>
        <button onClick={onClose} className="mt-3 text-xs text-neutral-mid hover:underline">Skip the tour, I will explore myself</button>
      </div>
    </div>
  )
}

// ─── Variant C: floating numbered guide ───────────────────────────────────────
// Persistent bottom-right launcher that expands into the numbered steps; stays
// available on every page until all four are done.

function VariantC() {
  const [open, setOpen]   = useState(true)
  const [active, setActive] = useState(0)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 rounded-full bg-teal px-4 py-2.5 text-sm font-semibold text-white shadow-xl hover:bg-teal-dark">
        Getting started <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">0 of 4</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70] w-96 overflow-hidden rounded-card border border-gray-100 bg-white shadow-2xl">
      <div className="flex items-center justify-between bg-teal px-4 py-3">
        <p className="text-sm font-bold text-white">Getting started with CareStream</p>
        <button onClick={() => setOpen(false)} aria-label="Minimise" className="rounded p-0.5 text-white/80 hover:text-white"><ChevronDown size={16} /></button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-2">
        {STEPS.map((s, idx) => {
          const isActive = idx === active
          return (
            <div key={s.n} className={`rounded-lg ${isActive ? 'bg-teal-light/20' : ''}`}>
              <button onClick={() => setActive(idx)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isActive ? 'bg-teal text-white' : 'border-2 border-gray-300 text-neutral-mid'}`}>{s.n}</span>
                <span className={`text-sm font-semibold ${isActive ? 'text-neutral-dark' : 'text-neutral-mid'}`}>{s.title}</span>
              </button>
              {isActive && (
                <div className="px-3 pb-3 pl-12">
                  <ImageSlot step={s} className="h-24 w-full" />
                  <p className="mt-2 text-xs leading-relaxed text-neutral-mid">{s.desc}</p>
                  <Link href={s.href} className="mt-2 inline-flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark">
                    {s.cta} <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="border-t border-gray-100 px-4 py-2 text-[11px] text-neutral-mid">
        Do these in any order. Each step ticks itself off as you complete it.
      </p>
    </div>
  )
}

// ─── Preview harness ──────────────────────────────────────────────────────────

export function GuidedTourPreview() {
  const [variant, setVariant] = useState<'a' | 'b' | 'c' | null>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('tour')
    if (v === 'a' || v === 'b' || v === 'c') { setVariant(v); setEnabled(true) }
    else if (v === 'preview') { setVariant('a'); setEnabled(true) }
  }, [])

  if (!enabled) return null

  return (
    <>
      {/* Variant switcher, preview only */}
      <div className="fixed left-1/2 top-3 z-[80] flex -translate-x-1/2 items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1.5 shadow-xl">
        <span className="px-2 text-xs font-semibold text-neutral-mid">Tour preview:</span>
        {(['a', 'b', 'c'] as const).map(v => (
          <button key={v} onClick={() => setVariant(v)}
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${variant === v ? 'bg-teal text-white' : 'text-neutral-mid hover:bg-neutral-light'}`}>
            {v}
          </button>
        ))}
        <button onClick={() => setEnabled(false)} aria-label="Close preview" className="ml-1 rounded-full p-1 text-neutral-mid hover:text-neutral-dark"><X size={14} /></button>
      </div>
      {variant === 'a' && <VariantA onClose={() => setVariant(null)} />}
      {variant === 'b' && <VariantB onClose={() => setVariant(null)} />}
      {variant === 'c' && <VariantC />}
    </>
  )
}
