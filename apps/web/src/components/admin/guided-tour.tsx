'use client'

// New-tenant guided tour (chosen design: spotlight coach marks). The screen
// dims, the current step's real sidebar item is ringed with a numbered badge,
// and a detail card sits beside it: image, what the page is for and how it
// works. Auto-opens once per device for tenants who have not started setting
// up; replayable any time via the sidebar "Take the tour" button. Steps tick
// themselves off from real data, never from clicks — clients can work in any
// order, the tour guides, it never locks.
//
// Step order per Len: policies → gap analysis → training and onboarding →
// staff. Training-only tenants get their own two-step journey (staff →
// licences). Drop screenshots at /public/tour/step-N.png (or to-step-N.png for
// training only) to replace the icon panels.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, FileText, GraduationCap, KeyRound, ScanSearch, Users, X } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'

type TourStep = {
  key:    'policies' | 'gaps' | 'training' | 'onboarding' | 'staff' | 'licences'
  title:  string
  desc:   string
  how:    string[]     // "how it works" bullets — the extra detail Len asked for
  href:   string
  cta:    string
  Icon:   typeof FileText
  img:    string
}

const FULL_STEPS: TourStep[] = [
  {
    key: 'policies', title: 'Upload your policies',
    desc: 'Everything in CareStream is built on your own policies, so this is the first step. Once uploaded, the staff answers, gap analysis and training all work from your real content.',
    how: [
      'Upload Word or PDF files one at a time, or use Bulk upload for a whole folder.',
      'Each policy becomes instantly searchable for staff in the hub, in their own language.',
      'You stay in control: edit, version and publish; staff always see the latest published copy.',
    ],
    href: '/policies', cta: 'Go to Policies', Icon: FileText, img: '/tour/step-1.png',
  },
  {
    key: 'gaps', title: 'Run your Gap Analysis',
    desc: 'See exactly how your policies cover the regulations that apply to your service, and fix what is missing with AI-suggested wording.',
    how: [
      'Four guided checks: regulation coverage, out-of-date content, cross-policy consistency and CQC wording.',
      'Adopt the suggested fixes, then review and publish them on the Policies page.',
      'Re-run any time; results always reflect your published policies.',
    ],
    href: '/gaps', cta: 'Open Gaps', Icon: ScanSearch, img: '/tour/step-2.png',
  },
  {
    key: 'training', title: 'Create your training',
    desc: 'Turn your policies into training your team actually completes, delivered as short questions in the hub.',
    how: [
      'Statutory modules are ready to assign out of the box.',
      'Create ad hoc training modules straight from your own policies.',
      'Questions arrive in each person’s first language, and completions are tracked for CQC evidence.',
    ],
    href: '/training', cta: 'Set up training', Icon: GraduationCap, img: '/tour/step-3.png',
  },
  {
    key: 'onboarding', title: 'Set up onboarding',
    desc: 'Build step-by-step induction flows so every new starter learns your way of working from day one.',
    how: [
      'Adopt a ready-made flow for each job role, or build your own from policy reads and check questions.',
      'New starters enrol in their role’s flow automatically when you add them.',
      'Track everyone’s progress step by step from the Staff Onboarding page.',
    ],
    href: '/onboarding', cta: 'Open Onboarding', Icon: GraduationCap, img: '/tour/step-4.png',
  },
  {
    key: 'staff', title: 'Add your staff',
    desc: 'Get your whole team into CareStream in minutes, with their logins handled for you.',
    how: [
      'Add people one at a time, or import everyone from a CSV with the column mapper.',
      'Each person’s job role drives the training and onboarding they receive.',
      'Use Hub invites to email everyone a passwordless sign-in link, or print a QR sheet for the staff room.',
    ],
    href: '/staff', cta: 'Go to Staff', Icon: Users, img: '/tour/step-5.png',
  },
]

const TRAINING_ONLY_STEPS: TourStep[] = [
  {
    key: 'staff', title: 'Add your team',
    desc: 'Add the staff who need to complete the training you have bought.',
    how: [
      'Add people one at a time, or import everyone from a CSV with the column mapper.',
      'Each person gets their own login, shown once and downloadable, or emailed to them automatically.',
    ],
    href: '/staff', cta: 'Go to Staff', Icon: Users, img: '/tour/to-step-1.png',
  },
  {
    key: 'licences', title: 'Allocate your training licences',
    desc: 'Assign the licences you bought so each person can start their module.',
    how: [
      'Pick a licence, pick a staff member, done; they are notified and can start straight away.',
      'Track progress and download certificates from the Training page as people complete.',
    ],
    href: '/licences', cta: 'Allocate licences', Icon: KeyRound, img: '/tour/to-step-2.png',
  },
]

// Which steps are genuinely done, from real data (mirrors the setup checklist).
type DoneMap = Partial<Record<TourStep['key'], boolean>>

function ImageSlot({ step, className }: { step: TourStep; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`overflow-hidden rounded-lg border border-gray-100 bg-gradient-to-br from-teal-light/40 to-indigo-50 ${className ?? ''}`}>
      {failed ? (
        <div className="flex h-full w-full items-center justify-center py-8">
          <step.Icon size={44} className="text-teal/70" />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={step.img} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
    </div>
  )
}

export function GuidedTour({ token, tenantId, tier, openSignal }: {
  token:      string
  tenantId:   string
  tier?:      string
  openSignal: number   // increment to (re)open the tour from the sidebar button
}) {
  const trainingOnly = tier === 'training_only'
  const steps = trainingOnly ? TRAINING_ONLY_STEPS : FULL_STEPS
  const seenKey = `cs-tour-seen-${tenantId}`

  const [open, setOpen] = useState(false)
  const [i, setI]       = useState(0)
  const [done, setDone] = useState<DoneMap>({})
  const [rect, setRect] = useState<DOMRect | null>(null)

  // Real-data ticks, fetched when the tour opens. Failures leave a step
  // unticked rather than erroring — the tour must never block.
  const loadDone = useCallback(() => {
    const api = createApiClient(token)
    if (trainingOnly) {
      Promise.allSettled([api.users.list(), api.training.licences()]).then(([u, l]) => {
        const lic = l.status === 'fulfilled' ? ((l.value as any)?.licences ?? []) : []
        setDone({
          staff:    u.status === 'fulfilled' && ((u.value as any)?.users ?? []).filter((x: any) => x?.is_active !== false).length > 1,
          licences: Array.isArray(lic) && lic.some((x: any) => x?.user_id),
        })
      })
      return
    }
    Promise.allSettled([
      api.policies.list({ limit: '1' }),
      api.analytics.gapsPipeline(),
      api.training.compliance(),
      api.onboarding.listFlows(),
      api.users.list(),
    ]).then(([p, g, t, o, u]) => {
      setDone({
        policies:   p.status === 'fulfilled' && Number((p.value as any)?.total ?? 0) > 0,
        gaps:       g.status === 'fulfilled' && ((g.value as any)?.sections ?? []).some((s: any) => s?.ran_at),
        training:   t.status === 'fulfilled' && (((t.value as any)?.enrollments ?? []).length > 0),
        onboarding: o.status === 'fulfilled' && (((o.value as any)?.flows ?? []).length > 0),
        staff:      u.status === 'fulfilled' && ((u.value as any)?.users ?? []).filter((x: any) => x?.is_active !== false).length > 1,
      })
    })
  }, [token, trainingOnly])

  function openTour() {
    setI(0)
    loadDone()
    setOpen(true)
    try { localStorage.setItem(seenKey, '1') } catch { /* ignore */ }
  }

  // Sidebar button pressed.
  useEffect(() => { if (openSignal > 0) openTour() }, [openSignal])  // eslint-disable-line react-hooks/exhaustive-deps

  // First-visit auto-open: once per device, and only for tenants who have not
  // started yet (no policies for full accounts, no staff for training-only) so
  // established accounts never get surprised by a tour.
  useEffect(() => {
    if (!token || !tenantId) return
    try { if (localStorage.getItem(seenKey) === '1') return } catch { return }
    const api = createApiClient(token)
    if (trainingOnly) {
      api.users.list().then((d: any) => {
        if (((d?.users ?? []).filter((x: any) => x?.is_active !== false).length) <= 1) openTour()
      }).catch(() => {})
    } else {
      api.policies.list({ limit: '1' }).then((d: any) => {
        if (Number(d?.total ?? 0) === 0) openTour()
      }).catch(() => {})
    }
  }, [token, tenantId])  // eslint-disable-line react-hooks/exhaustive-deps

  // Track the current step's sidebar link so the spotlight follows it.
  useEffect(() => {
    if (!open) return
    function measure() {
      const el = document.querySelector(`aside a[href="${steps[i].href}"]`) ?? document.querySelector(`a[href="${steps[i].href}"]`)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open, i, steps])

  if (!open) return null

  const step = steps[i]
  const stepDone = !!done[step.key]
  const pad = 6
  const cardW = 448  // w-md card; wider than the preview so the detail fits
  const cardLeft = rect ? Math.min(rect.right + 24, window.innerWidth - cardW - 16) : 0
  const cardTop = rect ? Math.min(Math.max(rect.top - 60, 16), Math.max(window.innerHeight - 480, 16)) : 0

  const footer = (
    <div className="mt-4 flex items-center justify-between">
      <span className="flex items-center gap-1.5">
        {steps.map((s, idx) => (
          <span key={s.key} className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
            done[s.key] ? 'bg-green-500 text-white' : idx === i ? 'bg-teal text-white' : 'bg-gray-200 text-neutral-mid'
          }`}>
            {done[s.key] ? <CheckCircle2 size={12} /> : idx + 1}
          </span>
        ))}
      </span>
      <div className="flex items-center gap-2">
        {i > 0 && <button onClick={() => setI(i - 1)} className="text-xs font-semibold text-neutral-mid hover:text-neutral-dark">Back</button>}
        <Link href={step.href} onClick={() => setOpen(false)} className="rounded-btn border border-teal px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/30">{step.cta}</Link>
        {i < steps.length - 1
          ? <button onClick={() => setI(i + 1)} className="rounded-btn bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark">Next</button>
          : <button onClick={() => setOpen(false)} className="rounded-btn bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark">Finish</button>}
      </div>
    </div>
  )

  const cardBody = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">{i + 1}</span>
          <p className="text-base font-bold text-neutral-dark">{step.title}</p>
          {stepDone && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">Done</span>}
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close tour" className="rounded p-0.5 text-neutral-mid hover:text-neutral-dark"><X size={16} /></button>
      </div>
      <ImageSlot step={step} className="mt-3 h-36" />
      <p className="mt-3 text-sm leading-relaxed text-neutral-mid">{step.desc}</p>
      <ul className="mt-2.5 space-y-1.5">
        {step.how.map((h, j) => (
          <li key={j} className="flex gap-2 text-xs leading-relaxed text-neutral-dark">
            <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-teal" />
            <span>{h}</span>
          </li>
        ))}
      </ul>
      {footer}
      <p className="mt-3 border-t border-gray-100 pt-2 text-[11px] text-neutral-mid">
        Do these in any order; each step ticks itself off as you complete it. Reopen this any time with <span className="font-semibold">Take the tour</span> in the sidebar.
      </p>
    </>
  )

  return (
    <div className="fixed inset-0 z-[70]">
      {rect ? (
        <>
          <div
            className="absolute rounded-xl ring-4 ring-teal transition-all duration-300"
            style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
          />
          <span
            className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-teal text-sm font-bold text-white shadow-lg transition-all duration-300"
            style={{ top: rect.top - pad - 12, left: rect.left + rect.width + pad - 12 }}
          >
            {i + 1}
          </span>
          <div className="absolute max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl bg-white p-5 shadow-2xl transition-all duration-300" style={{ top: cardTop, left: cardLeft, width: cardW }}>
            {cardBody}
          </div>
        </>
      ) : (
        /* Sidebar link not on screen (mobile / collapsed rail) — centred card */
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
            {cardBody}
          </div>
        </div>
      )}
    </div>
  )
}
