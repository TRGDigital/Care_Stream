'use client'

// Shared AI-usage UI. Two meters: AI tokens (the monthly allowance that governs
// generation) and Queries (everyday Q&A) — kept separate, because running out of
// tokens must never stop a carer asking what a policy says mid-shift.
//
// Token counts are shown in millions: "1.8M of 6M" is a number a manager can
// hold in their head, where 1,842,119 is not.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { Sparkles, MessageSquare } from 'lucide-react'

type Meter = { used: number; limit: number | null; remaining: number | null; resets_at: string }
type Usage = { credits: Meter; queries: Meter; tokens: Meter }

/** 6,000,000 -> "6M"; 1,842,119 -> "1.8M"; 940 -> "940". */
export function fmtTokens(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, '')}M`
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

function resetLabel(iso: string) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }

// Stale-while-revalidate: paint the last snapshot instantly, refresh in the background.
export function useAiUsage(token: string) {
  const { data: session } = useSession()
  const cacheKey = `ai-usage-${session?.user?.email ?? 'guest'}`
  const [usage, setUsage] = useState<Usage | null>(() => persistentCache.get<Usage>(cacheKey) ?? null)
  useEffect(() => {
    createApiClient(token).training.aiUsage().then(u => { setUsage(u); persistentCache.set(cacheKey, u) }).catch(() => {})
  }, [token, cacheKey])
  return usage
}

// Compact credits bar for an AI feature page.
export function AiCreditsBar({ token }: { token: string }) {
  const usage = useAiUsage(token)
  if (!usage || !usage.tokens || usage.tokens.limit === null) return null
  const t = usage.tokens
  const out = (t.remaining ?? 0) <= 0
  return (
    <div className={`mb-4 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${out ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-neutral-mid'}`}>
      <Sparkles size={14} className={out ? 'text-amber-500' : 'text-teal'} />
      <span><strong className="text-neutral-dark">{fmtTokens(t.used)}</strong> of <strong className="text-neutral-dark">{fmtTokens(t.limit!)}</strong> AI tokens used this month{t.remaining !== null ? ` · ${fmtTokens(t.remaining)} left` : ''}.</span>
      <span className="text-xs">Resets {resetLabel(t.resets_at)}.</span>
      {out && <span className="text-xs font-medium">Wait for the reset or move up a plan. Staff questions are not affected.</span>}
    </div>
  )
}

function MeterCard({ icon, label, meter, hint, big }: { icon: React.ReactNode; label: string; meter: Meter; hint: string; big?: boolean }) {
  const pct = meter.limit ? Math.min(100, Math.round((meter.used / meter.limit) * 100)) : 0
  const colour = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-teal'
  return (
    <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
      <div className="mb-1 flex items-center gap-2">{icon}<p className="text-sm font-semibold text-neutral-dark">{label}</p></div>
      <p className="text-2xl font-bold text-neutral-dark">{big ? fmtTokens(meter.used) : meter.used}<span className="text-base font-medium text-neutral-mid"> / {meter.limit === null ? '∞' : big ? fmtTokens(meter.limit) : meter.limit}</span></p>
      {meter.limit !== null && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-2 rounded-full ${colour}`} style={{ width: `${pct}%` }} /></div>
      )}
      <p className="mt-1.5 text-xs text-neutral-mid">{meter.limit === null ? 'Unlimited' : `${big ? fmtTokens(meter.remaining ?? 0) : meter.remaining} left`} · resets {resetLabel(meter.resets_at)}. {hint}</p>
    </div>
  )
}

// Two-card panel for the dashboard.
export function AiUsageCards({ token }: { token: string }) {
  const usage = useAiUsage(token)
  if (!usage) return null
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <MeterCard icon={<Sparkles size={15} className="text-teal" />} label="AI tokens" meter={usage.tokens ?? usage.credits} hint="Your monthly allowance for generating training, policy analysis, CQC questions and similar." big />
      <MeterCard icon={<MessageSquare size={15} className="text-teal" />} label="Queries" meter={usage.queries} hint="Everyday questions staff ask." />
    </div>
  )
}
