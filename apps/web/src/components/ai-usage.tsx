'use client'

// Shared AI-usage UI. Two meters: AI credits (generation actions) and Queries
// (everyday Q&A) — kept separate. Used on the dashboard and each AI feature page.

import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { Sparkles, MessageSquare } from 'lucide-react'

type Meter = { used: number; limit: number | null; remaining: number | null; resets_at: string }
type Usage = { credits: Meter; queries: Meter }

function resetLabel(iso: string) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }

export function useAiUsage(token: string) {
  const [usage, setUsage] = useState<Usage | null>(null)
  useEffect(() => { createApiClient(token).training.aiUsage().then(setUsage).catch(() => {}) }, [token])
  return usage
}

// Compact credits bar for an AI feature page.
export function AiCreditsBar({ token }: { token: string }) {
  const usage = useAiUsage(token)
  if (!usage || usage.credits.limit === null) return null
  const c = usage.credits
  const out = (c.remaining ?? 0) <= 0
  return (
    <div className={`mb-4 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${out ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-neutral-mid'}`}>
      <Sparkles size={14} className={out ? 'text-amber-500' : 'text-teal'} />
      <span><strong className="text-neutral-dark">{c.used}</strong> of <strong className="text-neutral-dark">{c.limit}</strong> AI credits used this month{c.remaining !== null ? ` · ${c.remaining} left` : ''}.</span>
      <span className="text-xs">Resets {resetLabel(c.resets_at)}.</span>
      {out && <span className="text-xs font-medium">Wait for the reset or upgrade your plan.</span>}
    </div>
  )
}

function MeterCard({ icon, label, meter, hint }: { icon: React.ReactNode; label: string; meter: Meter; hint: string }) {
  const pct = meter.limit ? Math.min(100, Math.round((meter.used / meter.limit) * 100)) : 0
  const colour = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-teal'
  return (
    <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
      <div className="mb-1 flex items-center gap-2">{icon}<p className="text-sm font-semibold text-neutral-dark">{label}</p></div>
      <p className="text-2xl font-bold text-neutral-dark">{meter.used}<span className="text-base font-medium text-neutral-mid"> / {meter.limit === null ? '∞' : meter.limit}</span></p>
      {meter.limit !== null && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-2 rounded-full ${colour}`} style={{ width: `${pct}%` }} /></div>
      )}
      <p className="mt-1.5 text-xs text-neutral-mid">{meter.limit === null ? 'Unlimited' : `${meter.remaining} left`} · resets {resetLabel(meter.resets_at)}. {hint}</p>
    </div>
  )
}

// Two-card panel for the dashboard.
export function AiUsageCards({ token }: { token: string }) {
  const usage = useAiUsage(token)
  if (!usage) return null
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <MeterCard icon={<Sparkles size={15} className="text-teal" />} label="AI credits" meter={usage.credits} hint="Generating training, CQC questions and similar." />
      <MeterCard icon={<MessageSquare size={15} className="text-teal" />} label="Queries" meter={usage.queries} hint="Everyday questions staff ask." />
    </div>
  )
}
