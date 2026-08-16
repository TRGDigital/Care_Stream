'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type AdoptionTenant } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { CheckCircle2, GraduationCap, Loader2 } from 'lucide-react'
import Link from 'next/link'

// ─── Funnel definition ────────────────────────────────────────────────────────

type StageKey = keyof AdoptionTenant['stages']

const STAGES: Array<{ key: StageKey; label: string }> = [
  { key: 'policies',    label: 'Policies'       },
  { key: 'staff',       label: 'Staff'          },
  { key: 'analysis',    label: 'First analysis' },
  { key: 'publish',     label: 'First publish'  },
  { key: 'staff_login', label: 'Staff in hub'   },
]

// Policies, analysis and publish do not apply to training-only tenants; their
// funnel is staff → staff_login only.
const TRAINING_ONLY_STAGES: StageKey[] = ['staff', 'staff_login']

function applicableStages(tenant: AdoptionTenant): StageKey[] {
  return tenant.tier === 'training_only' ? TRAINING_ONLY_STAGES : STAGES.map(s => s.key)
}

/** The first not-yet-achieved stage in the tenant's funnel (null = funnel complete). */
function stallStage(tenant: AdoptionTenant): StageKey | null {
  for (const key of applicableStages(tenant)) {
    if (!tenant.stages[key]) return key
  }
  return null
}

/** Stalled 7+ days: the first null stage has been null for 7+ days, measured from
 *  the tenant's sign-up or their latest achieved stage, whichever is later. */
function isStalled(tenant: AdoptionTenant, now: number): boolean {
  if (!stallStage(tenant)) return false
  let reference = new Date(tenant.created_at).getTime()
  for (const key of applicableStages(tenant)) {
    const achieved = tenant.stages[key]
    if (achieved) reference = Math.max(reference, new Date(achieved).getTime())
  }
  return now - reference >= 7 * 24 * 60 * 60 * 1000
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Stage cell ───────────────────────────────────────────────────────────────

function StageCell({ achieved, applies, stalled }: { achieved: string | null; applies: boolean; stalled: boolean }) {
  if (!applies) {
    return (
      <td className="px-4 py-3 text-center">
        <span className="text-xs text-neutral-mid/40">n/a</span>
      </td>
    )
  }
  return (
    <td className="px-4 py-3">
      <div
        className={`mx-auto flex w-fit items-center justify-center gap-1.5 rounded-md px-2 py-1 ${
          stalled ? 'bg-amber-50 ring-1 ring-amber-400' : ''
        }`}
      >
        {achieved ? (
          <>
            <CheckCircle2 size={14} className="shrink-0 text-green-600" />
            <span className="whitespace-nowrap text-xs text-neutral-dark" title={formatDateFull(achieved)}>
              {formatDate(achieved)}
            </span>
          </>
        ) : (
          <span
            className={`inline-block h-2 w-2 rounded-full ${stalled ? 'bg-amber-400' : 'bg-gray-300'}`}
            title={stalled ? 'Current stall stage' : 'Not yet'}
          />
        )}
      </div>
    </td>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdoptionPage() {
  const token                   = usePlatformAuth()
  const [tenants, setTenants]   = useState<AdoptionTenant[]>([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState<string | null>(null)
  const [stalledOnly, setStalledOnly] = useState(false)

  useEffect(() => {
    if (!token) return
    createPlatformClient(token).adoption()
      .then(data => setTenants(data.tenants))
      .catch(e  => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  const now = useMemo(() => Date.now(), [tenants])

  if (!token) return null

  const stalledCount = tenants.filter(t => isStalled(t, now)).length
  const filtered     = stalledOnly ? tenants.filter(t => isStalled(t, now)) : tenants

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-dark">Adoption funnel</h1>
            <p className="mt-0.5 text-xs text-neutral-mid">
              Where each tenant is in onboarding. The amber cell is the stage they are currently stuck at.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark">
            <input
              type="checkbox"
              checked={stalledOnly}
              onChange={e => setStalledOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal/20"
            />
            Stalled 7+ days
            {stalledCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{stalledCount}</span>
            )}
          </label>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-gray-200 bg-neutral-light text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Joined</th>
                  {STAGES.map(s => (
                    <th key={s.key} className="px-4 py-3 text-center">{s.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(t => {
                  const stall = stallStage(t)
                  return (
                    <tr key={t.id} className="hover:bg-neutral-light/50">
                      <td className="px-4 py-3">
                        <Link href={`/platform/clients/${t.id}`} className="font-medium text-teal hover:underline">
                          {t.name}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-2">
                          {t.account_number && (
                            <span className="rounded bg-neutral-light px-1.5 py-0.5 font-mono text-xs font-medium text-neutral-dark">{t.account_number}</span>
                          )}
                          {t.tier === 'training_only' ? (
                            <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              <GraduationCap size={10} />
                              Training only
                            </span>
                          ) : t.plan_name ? (
                            <span className="text-xs text-neutral-mid">{t.plan_name}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-mid">{formatDateFull(t.created_at)}</td>
                      {STAGES.map(s => {
                        const applies = t.tier !== 'training_only' || TRAINING_ONLY_STAGES.includes(s.key)
                        return (
                          <StageCell
                            key={s.key}
                            achieved={t.stages[s.key]}
                            applies={applies}
                            stalled={stall === s.key}
                          />
                        )
                      })}
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={2 + STAGES.length} className="px-4 py-10 text-center text-sm text-neutral-mid">
                      {stalledOnly ? 'No tenants have been stalled for 7 or more days.' : 'No tenants yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PlatformShell>
  )
}
