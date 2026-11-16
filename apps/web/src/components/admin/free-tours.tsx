'use client'

// The tours a FREE account gets. Three short tours (audits, training, policies), each starting with adding staff because
// nothing can be allocated to anyone until the team is in. Built on the same spotlight tour as paid accounts, but with
// its own steps and real-data ticks, and opened by this host:
//   - first login: the tour for the route the account signed up through (a signup with no clear route gets the chooser)
//   - the sidebar "Take the tour" button: a small chooser to pick any of the three
// Only what a free account really has is shown (facts: ~/carestream-content/free-tier/facts.md). Paid features are named
// in one line and never walked through.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Award, CheckCircle2, ClipboardCheck, FileText, ShieldCheck, Users, X } from 'lucide-react'
import { createApiClient, type FreeTourState } from '@/lib/api-client'
import { GuidedTour, type CustomTour, type DoneMap, type TourStep } from '@/components/admin/guided-tour'

export type FreeTourId = 'audits' | 'training' | 'policies'

const STAFF_STEP: TourStep = {
  key: 'staff', title: 'Add your staff first',
  desc: 'Audits, training and policies all go to people, so start by adding your team. Staff logins are unlimited on the free plan.',
  how: [
    'Add each person with their name and email, or import everyone from a CSV.',
    'Email each person a sign in link, so there are no passwords to remember.',
    'Give each person a job role, so you can see who is who as you allocate work.',
  ],
  href: '/staff', cta: 'Go to Staff', Icon: Users, img: '/tour/step-5.png',
}

export const FREE_TOURS: Record<FreeTourId, { title: string; blurb: string; Icon: typeof FileText; steps: TourStep[] }> = {
  audits: {
    title: 'Run your audits', blurb: 'Over 100 audits, free to run, with a signed PDF report.', Icon: ClipboardCheck,
    steps: [
      STAFF_STEP,
      {
        key: 'audit_run', title: 'Pick an audit and run it',
        desc: 'Every CareStream audit template is free to run, on the web or on a phone.',
        how: [
          'Click Preview to read every question before you start.',
          'Answer Yes, No or Not applicable, add notes and photo evidence.',
          'Resident, room and whole service audits ask who or which room it is for.',
        ],
        href: '/audits', cta: 'Open Audits', Icon: ClipboardCheck, img: '/tour/free-audits-1.png',
      },
      {
        key: 'audit_team', title: 'Let your team carry out audits',
        desc: 'You choose which audits each person can carry out, and they do them from the hub on their phone.',
        how: [
          'Open a person on the Staff page and choose the audits they can carry out.',
          'A care manager can approve completed audits, and the sign off is recorded in the report.',
        ],
        href: '/staff', cta: 'Go to Staff', Icon: Users, img: '/tour/free-audits-2.png',
      },
      {
        key: 'audit_report', title: 'Sign, schedule and keep the evidence',
        desc: 'Finish with a signature and download a PDF report for your CQC evidence folder.',
        how: [
          'Schedule an audit to repeat, so the pattern over the months is visible.',
          'Gaps found can be turned into actions you track to completion.',
          'Written recommendations after every audit come with a paid plan.',
        ],
        href: '/audits', cta: 'Open Audits', Icon: ClipboardCheck, img: '/tour/free-audits-3.png',
      },
    ],
  },
  training: {
    title: 'Train your team', blurb: 'CPD certified courses, free for every member of staff.', Icon: Award,
    steps: [
      STAFF_STEP,
      {
        key: 'train_pick', title: 'Choose the free CPD courses',
        desc: 'CPD certified training is free for every member of staff, with a certificate for every course.',
        how: [
          'Access never expires, so people can come back to a course whenever they need to.',
          'Free accounts are English only. Courses in staff languages come with a paid plan.',
        ],
        href: '/training/annual', cta: 'Open CPD training', Icon: Award, img: '/tour/free-training-1.png',
      },
      {
        key: 'train_matrix', title: 'See who has finished what',
        desc: 'The training matrix shows each person against each course, so you can see at a glance what is done and what is still to do.',
        how: [
          'Everyone who completes a course gets their own certificate.',
          'Use the matrix as your evidence that the team is trained.',
        ],
        href: '/training', cta: 'Open Training', Icon: ShieldCheck, img: '/tour/free-training-2.png',
      },
    ],
  },
  policies: {
    title: 'Check your policies', blurb: 'Your first five policies, checked against the regulations free.', Icon: FileText,
    steps: [
      STAFF_STEP,
      {
        key: 'pol_add', title: 'Add your first policies',
        desc: 'Your free account checks your first five policies. Pick the ones that matter most to start with.',
        how: [
          'Upload PDF or Word files, one at a time or a folder at once.',
          'Five is a lifetime allowance, so deleting a policy does not give the place back. Upload a new version of the same policy instead.',
        ],
        href: '/policies', cta: 'Open Policies', Icon: FileText, img: '/tour/free-policies-1.png',
      },
      {
        key: 'pol_check', title: 'Run the policy gap check',
        desc: 'See how your policies cover the regulations that apply to your service.',
        how: [
          'Four guided checks: regulation coverage, out of date content, cross policy consistency and CQC wording.',
          'No limit on policies, example wording and adopting fixes with approvals come with a paid plan.',
        ],
        href: '/gaps', cta: 'Open Policy Gaps', Icon: ShieldCheck, img: '/tour/free-policies-2.png',
      },
    ],
  },
}

// Real-data ticks: a step is only ticked when the account has really done it, never from a click.
async function loadDoneFor(token: string, tour: FreeTourId): Promise<DoneMap> {
  const api = createApiClient(token)
  const staffP = api.users.list().then((u: any) => (u?.users ?? []).filter((x: any) => x?.is_active !== false).length > 1).catch(() => false)
  if (tour === 'audits') {
    const runs = await api.audits.runs({ status: 'completed' }).then((r: any) => (r?.runs ?? []).length > 0).catch(() => false)
    return { staff: await staffP, audit_run: runs }
  }
  if (tour === 'training') {
    const enrolled = await api.training.compliance().then((t: any) => (t?.enrollments ?? []).length > 0).catch(() => false)
    return { staff: await staffP, train_pick: enrolled }
  }
  const [pol, gaps] = await Promise.all([
    api.policies.list({ limit: '1' }).then((p: any) => Number(p?.total ?? 0) > 0).catch(() => false),
    api.analytics.gapsPipeline().then((g: any) => (g?.sections ?? []).some((s: any) => s?.ran_at)).catch(() => false),
  ])
  return { staff: await staffP, pol_add: pol, pol_check: gaps }
}

export function FreeTourHost({ token, tenantId, openSignal }: { token: string; tenantId: string; openSignal: number }) {
  const [state, setState] = useState<FreeTourState | null>(null)
  const [chooser, setChooser] = useState(false)
  const [tour, setTour] = useState<FreeTourId | null>(null)
  const [signal, setSignal] = useState(0)
  const api = useRef(createApiClient(token))
  useEffect(() => { api.current = createApiClient(token) }, [token])

  const begin = useCallback((t: FreeTourId) => {
    setChooser(false); setTour(t); setSignal(n => n + 1)
  }, [])

  // Load the account's tour state; on a brand new free account open its tour once, or the chooser if it has no clear route.
  useEffect(() => {
    if (!token) return
    let live = true
    api.current.freeTour.get().then(s => {
      if (!live) return
      setState(s)
      if (!s.auto_opened && s.is_new) {
        api.current.freeTour.event('auto_opened').catch(() => {})
        if (s.track) begin(s.track); else setChooser(true)
      }
    }).catch(() => {})
    return () => { live = false }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // The sidebar "Take the tour" button opens the chooser (refreshing which tours are finished).
  useEffect(() => {
    if (openSignal <= 0) return
    api.current.freeTour.get().then(setState).catch(() => {})
    setChooser(true)
  }, [openSignal])

  const custom: CustomTour | undefined = tour ? {
    tourId: `free-${tour}`,
    steps: FREE_TOURS[tour].steps,
    loadDone: () => loadDoneFor(token, tour),
    onStart: () => { api.current.freeTour.event('started', tour).catch(() => {}) },
    onFinish: () => {
      api.current.freeTour.event('finished', tour).catch(() => {})
      setState(s => s ? { ...s, tours: { ...s.tours, [tour]: { ...(s.tours[tour] ?? {}), finished_at: new Date().toISOString() } } } : s)
    },
  } : undefined

  return (
    <>
      {chooser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4" onClick={() => setChooser(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-bold text-neutral-dark">Choose a tour</p>
                <p className="mt-0.5 text-xs text-neutral-mid">Each one takes about two minutes and starts with adding your staff.</p>
              </div>
              <button onClick={() => setChooser(false)} aria-label="Close" className="rounded p-0.5 text-neutral-mid hover:text-neutral-dark"><X size={16} /></button>
            </div>
            <ul className="mt-4 space-y-2">
              {(Object.keys(FREE_TOURS) as FreeTourId[]).map(id => {
                const t = FREE_TOURS[id]; const finished = !!state?.tours?.[id]?.finished_at
                return (
                  <li key={id}>
                    <button onClick={() => begin(id)} className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-teal/50 hover:bg-teal-light/20">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal"><t.Icon size={17} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-neutral-dark">{t.title}</span>
                        <span className="block text-xs text-neutral-mid">{t.blurb}</span>
                      </span>
                      {finished && <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700"><CheckCircle2 size={11} /> Done</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
      {tour && <GuidedTour key={tour} token={token} tenantId={tenantId} tier="free" openSignal={signal} custom={custom} />}
    </>
  )
}
