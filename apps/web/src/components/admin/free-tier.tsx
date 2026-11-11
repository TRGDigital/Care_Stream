'use client'

// Everything a Free account sees that a paying account does not: the "X of 5 policies used" strip,
// the upgrade prompts, the locked-section overlay and the free dashboard. Nothing here renders for
// any other tier: callers check `useIsFree()` (the session tier) first.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowRight, Check, ClipboardCheck, FileText, Loader2, Lock, ScanSearch, Sparkles, UserPlus, X } from 'lucide-react'
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

export function UpgradeButton({ token, label = 'Upgrade to Starter', className = '' }: { token?: string; label?: string; className?: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <span>
      <button
        type="button" disabled={busy || !token}
        onClick={async () => { if (!token) return; setBusy(true); setErr(''); try { await startUpgrade(token) } catch (e: any) { setErr(e.message ?? 'Could not start checkout.'); setBusy(false) } }}
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

export function FreeLockOverlay({ feature, onClose, token }: { feature: string; onClose: () => void; token?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div role="dialog" aria-modal="true" aria-label={`${feature} is part of the paid plans`} className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-dark/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-elevated" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-neutral-dark">{feature} is part of the paid plans</h2>
            <p className="mt-1 text-sm text-neutral-mid">Your free account includes every audit and a policy check on your first 5 policies. Paid plans add the rest.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="shrink-0 rounded-lg p-1.5 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
        </div>
        <ul className="mb-5 space-y-2 text-sm text-neutral-dark">
          {['Staff questions answered from your policies, in 60+ languages', 'AI recommendations at the end of every audit', 'Unlimited policies and the full gap analysis, with example wording', 'Staff training and the CQC evidence pack'].map(t => (
            <li key={t} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-teal" />{t}</li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <UpgradeButton token={token} />
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
  useEffect(() => {
    const api = createApiClient(token)
    api.audits.runs().then((r: any) => setAudits((r.runs ?? []).filter((x: any) => x.status === 'completed').length)).catch(() => setAudits(0))
    api.policies.allowance().then(r => setPolicies(r)).catch(() => {})
    api.users.list().then((r: any) => setStaff((r.users ?? r ?? []).length)).catch(() => {})
    api.analytics.gapsPipeline().then((p: any) => setGapsRan((p.sections ?? []).some((s: any) => s.ran_at))).catch(() => setGapsRan(false))
  }, [token])
  const steps = [
    { done: (audits ?? 0) > 0, href: '/audits', Icon: ClipboardCheck, title: 'Run your first audit', body: 'Every audit template is included.' },
    { done: (policies?.used ?? 0) > 0, href: '/policies', Icon: FileText, title: 'Add your policies', body: `Up to ${policies?.limit ?? 5} in total on the free plan.` },
    { done: gapsRan === true, href: '/gaps', Icon: ScanSearch, title: 'Run the gap analysis', body: 'See which regulations your policies cover.' },
    { done: (staff ?? 0) > 1, href: '/staff', Icon: UserPlus, title: 'Add your team', body: 'As many staff logins as you like.' },
  ]
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-dark">Welcome{name ? `, ${name.split(' ')[0]}` : ''}</h1>
        <p className="text-sm text-neutral-mid">You are on the free plan: every audit, and a gap analysis of your first 5 policies.</p>
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
          {['AI recommendations on every audit', 'More than 5 policies, and example wording for each gap', 'Staff questions answered from your policies', 'Training, CQC evidence and workforce records'].map(t => (
            <li key={t} className="flex items-start gap-2"><Sparkles size={14} className="mt-0.5 shrink-0 text-amber-500" />{t}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-neutral-mid">Upgrading is charged straight away. Everything you have done is kept.</p>
      </div>
    </div>
  )
}
