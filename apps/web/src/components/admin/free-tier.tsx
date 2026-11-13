'use client'

// Everything a Free account sees that a paying account does not: the "X of 5 policies used" strip,
// the upgrade prompts, the locked-section overlay and the free dashboard. Nothing here renders for
// any other tier: callers check `useIsFree()` (the session tier) first.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowRight, Check, ClipboardCheck, FileText, GraduationCap, Loader2, Lock, ScanSearch, Sparkles, UserPlus, X } from 'lucide-react'
import { createApiClient, errorCode, isUpgradeCode } from '@/lib/api-client'

export function useIsFree(): boolean {
  const { data: session } = useSession()
  return (session?.user as any)?.tier === 'free'
}

/** Start Stripe Checkout for Starter. A free account is charged straight away (no trial). */
export async function startUpgrade(token: string, planName = 'Starter'): Promise<void> {
  const api = createApiClient(token)
  const { plans } = await api.billing.plans()
  const plan = plans.find((p: any) => p.name === planName) ?? plans[0]
  if (!plan) throw new Error('No plan available.')
  const { url } = await api.billing.checkout(plan.id)
  window.location.href = url
}

export function UpgradeButton({ token, label = 'Upgrade to Starter', className = '', source = 'button', planName = 'Starter' }: { token?: string; label?: string; className?: string; source?: string; planName?: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <span>
      <button
        type="button" disabled={busy || !token}
        onClick={async () => { if (!token) return; setBusy(true); setErr(''); try { createApiClient(token).billing.freeEvent(source).catch(() => {}); await startUpgrade(token, planName) } catch (e: any) { setErr(e.message ?? 'Could not start checkout.'); setBusy(false) } }}
        className={`inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-60 ${className}`}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {busy ? 'Opening checkout…' : label}
      </button>
      {err && <span className="ml-3 text-xs text-red-600">{err}</span>}
    </span>
  )
}

/** A short upgrade prompt for a feature or allowance a free account does not have. */
export function FreeUpgradePanel({ title, body, token }: { title: string; body: string; token?: string }) {
  return (
    <div className="rounded-card border border-amber-200 bg-gradient-to-b from-amber-50/70 to-white p-6 text-center shadow-card">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100"><Sparkles size={18} className="text-amber-600" /></div>
      <h3 className="mb-1 text-base font-bold text-neutral-dark">{title}</h3>
      <p className="mx-auto mb-4 max-w-md text-sm text-neutral-mid">{body}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <UpgradeButton token={token} />
        <Link href="/billing" className="text-sm font-semibold text-teal hover:underline">Compare plans</Link>
      </div>
      <p className="mt-3 text-xs text-neutral-mid">Everything you have done stays exactly as it is.</p>
    </div>
  )
}

/** Replaces the "Language preferences" box on the add and edit staff forms for a Free account.
 *  Greyed out, with the reason: translation costs real money to produce, so it starts on Starter. */
export function FreeLanguageLock({ token }: { token?: string }) {
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Lock size={13} className="text-neutral-mid" />
        <p className="text-xs font-semibold text-neutral-mid">Language preferences</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Starter plan and above</span>
      </div>
      <div aria-hidden className="pointer-events-none grid select-none grid-cols-2 gap-3 opacity-50">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-dark">First language</label>
          <select disabled className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm"><option>English</option></select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-dark">Second language <span className="font-normal text-neutral-mid">(optional)</span></label>
          <select disabled className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm"><option>None</option></select>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-neutral-dark">
        Staff on the free plan learn in English. Training, questions and messages in 60+ languages start on the Starter plan, because every translation has a real cost to produce. Upgrade and each person can learn in the language they are most confident in, with your records kept in English.
      </p>
      <UpgradeButton token={token} label="Upgrade to unlock languages" planName="Starter" source="staff_language" />
    </div>
  )
}

/** A locked feature, explained: what it is, what it gives you, and the upgrade button. Used in
 *  place of a locked tab (the sidebar uses FreeLockOverlay for the same job). */
export function FreeFeaturePanel({ title, summary, benefits, plan = 'Starter', token }: { title: string; summary: string; benefits: string[]; plan?: string; token?: string }) {
  return (
    <div className="mx-auto max-w-2xl rounded-card border border-amber-200 bg-gradient-to-b from-amber-50/70 to-white p-8 shadow-card">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100"><Lock size={18} className="text-amber-600" /></div>
        <div>
          <h3 className="text-lg font-bold text-neutral-dark">{title}</h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Part of the {plan} plan and above</p>
        </div>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-neutral-mid">{summary}</p>
      <ul className="mb-6 space-y-2 text-sm text-neutral-dark">
        {benefits.map(b => <li key={b} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-teal" />{b}</li>)}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <UpgradeButton token={token} label={`Upgrade to ${plan}`} planName={plan} source="training_tab" />
        <Link href="/billing" className="inline-flex items-center gap-1 text-sm font-semibold text-teal hover:underline">Compare plans <ArrowRight size={14} /></Link>
      </div>
      <p className="mt-3 text-xs text-neutral-mid">Your CPD training and everything you have done stays exactly as it is.</p>
    </div>
  )
}

/** Turns a thrown API error into an inline upgrade prompt when it is a plan limit. */
export function PlanLimitNotice({ error, token }: { error: unknown; token?: string }) {
  const code = errorCode(error)
  if (!isUpgradeCode(code)) return null
  const body = (error as any)?.message ?? 'This is part of the paid plans.'
  return <FreeUpgradePanel title="Part of the paid plans" body={body} token={token} />
}

// ─── Policies: "X of 5 policies used" ─────────────────────────────────────────

export function PolicyAllowanceStrip({ token, refreshKey = 0, onAllowance }: { token: string; refreshKey?: number; onAllowance?: (a: { used: number; limit: number | null; remaining: number | null }) => void }) {
  const [a, setA] = useState<{ used: number; limit: number | null; remaining: number | null } | null>(null)
  useEffect(() => {
    createApiClient(token).policies.allowance().then(r => { if (r.limited) { setA(r); onAllowance?.(r) } }).catch(() => {})
  }, [token, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!a || a.limit === null) return null
  const full = (a.remaining ?? 0) <= 0
  return (
    <div className={`mb-4 rounded-card border p-4 ${full ? 'border-amber-200 bg-amber-50/60' : 'border-teal/20 bg-teal-light/20'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-neutral-dark">Free plan: {a.used} of {a.limit} policies used</p>
          <p className="text-xs text-neutral-mid">
            {full
              ? 'You have used all of your free policies. Move to a paid plan to add more.'
              : `You can add ${a.remaining} more. A free account includes ${a.limit} policies in total: deleting one does not free a place, and a new version of a policy does not use one.`}
          </p>
        </div>
        {full && <UpgradeButton token={token} />}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200"><div className="h-1.5 rounded-full bg-teal" style={{ width: `${Math.min(100, (a.used / a.limit) * 100)}%` }} /></div>
    </div>
  )
}

// ─── Locked sections (sidebar) ────────────────────────────────────────────────

// What each locked sidebar section does and what it gives you, written for the overlay.
// `plan` is the lowest plan that includes it. Keyed by the sidebar label.
interface LockedFeature { summary: string; benefits: string[]; plan: 'Starter' | 'Professional' | 'Enterprise' }
const LOCKED_FEATURES: Record<string, LockedFeature> = {
  'Query history': {
    plan: 'Starter',
    summary: 'Every question your staff ask CareStream, and the answer they were given, in one searchable record.',
    benefits: ['See what staff are really unsure about, so you can fix the policy or run a refresher', 'Every answer is traced back to the policy it came from, ready to show an inspector', 'Spot repeat questions and turn them into training or a policy update', 'Search and filter by member of staff, topic or date'],
  },
  'Knowledge Base': {
    plan: 'Starter',
    summary: 'Teach CareStream the things only your home knows, beyond your policies.',
    benefits: ['Add local procedures, contacts and routines so staff get answers specific to your home', 'Staff questions are answered from your policies and your knowledge base together', 'Keeps answers consistent, whoever is on shift', 'Edit or remove an entry at any time'],
  },
  'Compliance': {
    plan: 'Enterprise',
    summary: 'A workforce compliance register for the checks that decide whether someone is safe to work.',
    benefits: ['DBS, right to work, professional registration and references in one register', 'Upload credential documents and get alerts before anything expires', 'One view of who is cleared to work and who needs action', 'Built for multi-site providers, with group-wide reporting'],
  },
  'Translation Review': {
    plan: 'Starter',
    summary: 'Staff learn and ask questions in their own language. This is where you check and improve the translations.',
    benefits: ['Review the wording staff see in 60+ languages', 'Approve better translations and add your own care terms to a glossary', 'Staff can suggest improvements and you decide what goes live', 'Helps every member of the team understand policies and training properly'],
  },
  'Analytics': {
    plan: 'Starter',
    summary: 'See how CareStream is being used and where your team needs support.',
    benefits: ['Usage and question trends across your staff', 'Advanced analytics on Professional: deeper breakdowns by topic, team and time', 'Evidence of how policies are being understood in practice', 'Export for management meetings and governance reports'],
  },
  'CQC Reports': {
    plan: 'Professional',
    summary: 'A CQC readiness report built from your policies, training and evidence, so you know where you stand before an inspector does.',
    benefits: ['Your position against the CQC quality statements, in plain English', 'Gaps highlighted with what to do next', 'Evidence pulled together from policies, training and audits', 'A report you can take to a provider meeting or a registered manager review'],
  },
  'CQC Staff Prep': {
    plan: 'Starter',
    summary: 'Get staff ready for the questions an inspector is likely to ask them.',
    benefits: ['Realistic CQC questions for each role, in plain language', 'Staff practise with answers grounded in your own policies', 'Builds confidence on the day of an inspection', 'See who has practised and who needs more help'],
  },
  'Staff Onboarding': {
    plan: 'Starter',
    summary: 'Onboarding flows that take a new starter from day one to fully inducted, and stay up to date as your policies change.',
    benefits: ['Ready-made induction flows you can tick on or tailor', 'Track every new starter against the flow, with a completion matrix', 'Generate onboarding from a policy update so nobody is left behind', 'Supports agency and local inductions'],
  },
  'Benchmarking': {
    plan: 'Enterprise',
    summary: 'Compare your homes side by side across one group console.',
    benefits: ['Group-wide view of compliance and training', 'Benchmark sites against each other', 'Spot the home that needs support before it becomes a problem'],
  },
}
const GENERIC_BENEFITS = ['Staff questions answered from your policies, in 60+ languages', 'AI recommendations at the end of every audit', 'Unlimited policies and the full gap analysis, with example wording', 'The CQC evidence pack and workforce tools']

export function FreeLockOverlay({ feature, onClose, token }: { feature: string; onClose: () => void; token?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  const info = LOCKED_FEATURES[feature]
  const plan = info?.plan ?? 'Starter'
  return (
    <div role="dialog" aria-modal="true" aria-label={`${feature} is part of the paid plans`} className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-dark/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-7 shadow-elevated" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"><Lock size={9} /> {plan} plan and above</p>
            <h2 className="text-xl font-extrabold text-neutral-dark">{feature}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-mid">{info?.summary ?? 'This is part of the paid plans.'}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="shrink-0 rounded-lg p-1.5 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">What you get</p>
        <ul className="mb-5 space-y-2 text-sm text-neutral-dark">
          {(info?.benefits ?? GENERIC_BENEFITS).map(t => (
            <li key={t} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-teal" />{t}</li>
          ))}
        </ul>
        <p className="mb-5 rounded-lg bg-teal-light/20 px-3 py-2 text-xs text-neutral-dark">Your free account keeps every audit, a policy check on your first 5 policies and CPD training for your whole team. Upgrading adds this and keeps everything you have done.</p>
        <div className="flex flex-wrap items-center gap-3">
          <UpgradeButton token={token} label={`Upgrade to ${plan}`} planName={plan} source={`lock_${feature.toLowerCase().replace(/[^a-z]+/g, '_')}`} />
          <Link href="/billing" className="inline-flex items-center gap-1 text-sm font-semibold text-teal hover:underline">Compare plans <ArrowRight size={14} /></Link>
        </div>
      </div>
    </div>
  )
}

// ─── Audits: the locked AI recommendations ────────────────────────────────────

export interface FindingsRow { section: string; failing: number; total: number }

/** Shown in place of the AI recommendations on a free account: a plain count of the findings
 *  (worked out from the answers, no AI), a clearly labelled example, and the upgrade button. */
export function LockedRecommendations({ summary, token }: { summary?: FindingsRow[] | null; token?: string }) {
  return (
    <div className="overflow-hidden rounded-card bg-white shadow-card">
      <div className="flex items-center gap-2 px-6 py-4">
        <Sparkles size={16} className="shrink-0 text-teal" />
        <h2 className="font-semibold text-neutral-dark">AI recommendations</h2>
        <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"><Lock size={9} /> Paid plans</span>
      </div>
      <div className="space-y-4 px-6 pb-6">
        {summary && summary.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Your findings</p>
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 text-sm">
              {summary.map(r => (
                <li key={r.section} className="flex items-center justify-between px-3 py-2">
                  <span className="text-neutral-dark">{r.section}</span>
                  <span className={r.failing ? 'font-semibold text-amber-700' : 'text-green-700'}>{r.failing ? `${r.failing} to look at` : 'No gaps'} <span className="font-normal text-neutral-mid">of {r.total}</span></span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="relative rounded-lg border border-gray-100 bg-neutral-light/40 p-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Example only</p>
          <div className="select-none text-sm leading-relaxed text-neutral-dark blur-[3px]" aria-hidden>
            <p className="font-semibold">Immediate actions</p>
            <p>1. Record the missing weekly checks and name who is responsible for each one, with a date. (Safe)</p>
            <p>2. Re-brief night staff on the escalation steps, and sign them off in the next team meeting. (Well-led)</p>
          </div>
        </div>
        <p className="text-sm text-neutral-mid">On a paid plan, every completed audit ends with recommendations written from your own answers, ranked by risk and linked to the CQC quality statements, ready to turn into an action plan. Audits you finish now are kept, and you can add the recommendations to them after you upgrade.</p>
        <UpgradeButton token={token} />
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function FreeDashboard({ token, name }: { token: string; name?: string | null }) {
  const [audits, setAudits] = useState<number | null>(null)
  const [policies, setPolicies] = useState<{ used: number; limit: number | null } | null>(null)
  const [staff, setStaff] = useState<number | null>(null)
  const [gapsRan, setGapsRan] = useState<boolean | null>(null)
  const [cpdAssigned, setCpdAssigned] = useState<boolean | null>(null)
  useEffect(() => {
    const api = createApiClient(token)
    api.training.compliance().then((r: any) => setCpdAssigned((r.enrollments ?? []).length > 0)).catch(() => setCpdAssigned(false))
    api.audits.runs().then((r: any) => setAudits((r.runs ?? []).filter((x: any) => x.status === 'completed').length)).catch(() => setAudits(0))
    api.policies.allowance().then(r => setPolicies(r)).catch(() => {})
    api.users.list().then((r: any) => setStaff((r.users ?? r ?? []).length)).catch(() => {})
    api.analytics.gapsPipeline().then((p: any) => setGapsRan((p.sections ?? []).some((s: any) => s.ran_at))).catch(() => setGapsRan(false))
  }, [token])
  const steps = [
    { done: cpdAssigned === true, href: '/training/annual', Icon: GraduationCap, title: 'Start free CPD training', body: 'Assign the Care Certificate and annual refreshers to your team.' },
    { done: (audits ?? 0) > 0, href: '/audits', Icon: ClipboardCheck, title: 'Run your first audit', body: 'Every audit template is included.' },
    { done: (policies?.used ?? 0) > 0, href: '/policies', Icon: FileText, title: 'Add your policies', body: `Up to ${policies?.limit ?? 5} in total on the free plan.` },
    { done: gapsRan === true, href: '/gaps', Icon: ScanSearch, title: 'Run the gap analysis', body: 'See which regulations your policies cover.' },
    { done: (staff ?? 0) > 1, href: '/staff', Icon: UserPlus, title: 'Add your team', body: 'As many staff logins as you like.' },
  ]
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-dark">Welcome{name ? `, ${name.split(' ')[0]}` : ''}</h1>
        <p className="text-sm text-neutral-mid">You are on the free plan: CPD training for your whole team, every audit, and a gap analysis of your first 5 policies.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {steps.map(s => (
          <Link key={s.title} href={s.href} className="flex items-start gap-3 rounded-card bg-white p-5 shadow-card transition-shadow hover:shadow-md">
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${s.done ? 'bg-green-100 text-green-700' : 'bg-teal-light text-teal'}`}>{s.done ? <Check size={18} /> : <s.Icon size={18} />}</span>
            <span><span className="block text-sm font-bold text-neutral-dark">{s.title}</span><span className="block text-xs text-neutral-mid">{s.body}</span></span>
          </Link>
        ))}
      </div>
      <div className="rounded-card border border-teal/20 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-mid">Your plan</p>
            <p className="text-xl font-extrabold text-neutral-dark">Free</p>
            <p className="mt-1 text-sm text-neutral-mid">{audits ?? 0} audits completed · {policies ? `${policies.used} of ${policies.limit ?? 5} policies used` : ''}</p>
          </div>
          <UpgradeButton token={token} />
        </div>
        <ul className="mt-4 grid gap-2 text-sm text-neutral-dark sm:grid-cols-2">
          {['AI recommendations on every audit', 'More than 5 policies, and example wording for each gap', 'Staff questions answered from your policies', 'Face-to-face training, CQC evidence and workforce records'].map(t => (
            <li key={t} className="flex items-start gap-2"><Sparkles size={14} className="mt-0.5 shrink-0 text-amber-500" />{t}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-neutral-mid">Upgrading is charged straight away. Everything you have done is kept.</p>
      </div>
    </div>
  )
}
