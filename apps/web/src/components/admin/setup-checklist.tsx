'use client'

// "Get set up" checklist shown at the top of a new tenant's dashboard. Each step
// auto-detects completion from real data (policies uploaded, staff added, training
// assigned, a question asked), shows progress, links to the relevant page, and the
// whole card disappears once everything is done (or when dismissed).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { CheckCircle2, Circle, X, FileText, Users, GraduationCap, MessageSquare, ArrowRight } from 'lucide-react'

type Status = { policies: boolean; staff: boolean; training: boolean; query: boolean; allocated: boolean }
type Step = { done: boolean; Icon: typeof FileText; title: string; desc: string; href: string; cta: string }

export function SetupChecklist({ token, tenantId, tier = 'full' }: { token: string; tenantId: string; tier?: string }) {
  const trainingOnly = tier === 'training_only'
  const statusKey = `admin-setup-${tenantId}`
  const [status, setStatus]       = useState<Status | null>(() => persistentCache.get<Status>(statusKey) ?? null)
  const [dismissed, setDismissed] = useState(true) // hidden until we've checked localStorage

  const key = `cs-setup-dismissed-${tenantId}`

  useEffect(() => {
    try { setDismissed(localStorage.getItem(key) === '1') } catch { setDismissed(false) }
  }, [key])

  useEffect(() => {
    const api = createApiClient(token)
    const save = (s: Status) => { setStatus(s); persistentCache.set(statusKey, s) }
    // Training-only clients have a different starting setup: add staff, then allocate the
    // licences they bought. No policies / hub / full-training assignment applies to them.
    if (trainingOnly) {
      Promise.allSettled([api.users.list(), api.training.licences()]).then(([u, l]) => {
        const lic = l.status === 'fulfilled' ? ((l.value as any)?.licences ?? []) : []
        save({
          policies: false, training: false, query: false,
          staff:     u.status === 'fulfilled' && ((u.value as any)?.users ?? []).filter((x: any) => x?.is_active !== false).length > 1,
          allocated: Array.isArray(lic) && lic.some((x: any) => x?.user_id),
        })
      }).catch(() => {})
      return
    }
    Promise.allSettled([
      api.policies.list({ limit: '1' }),
      api.users.list(),
      api.query.list({ limit: '1' }),
      api.training.compliance(),
    ]).then(([p, u, q, t]) => {
      save({
        policies: p.status === 'fulfilled' && Number((p.value as any)?.total ?? 0) > 0,
        staff:    u.status === 'fulfilled' && ((u.value as any)?.users ?? []).filter((x: any) => x?.is_active !== false).length > 1,
        query:    q.status === 'fulfilled' && Number((q.value as any)?.total ?? 0) > 0,
        training: t.status === 'fulfilled' && (((t.value as any)?.enrollments ?? []).length > 0),
        allocated: false,
      })
    }).catch(() => {})
  }, [token, trainingOnly, statusKey])

  if (!status || dismissed) return null

  const steps: Step[] = trainingOnly
    ? [
        { done: status.staff,     Icon: Users,         title: 'Add your team',                   desc: 'Invite the staff who need to complete this training.',                  href: '/staff',    cta: 'Add staff' },
        { done: status.allocated, Icon: GraduationCap, title: 'Allocate your training licences', desc: 'Assign the licences you bought to staff so they can start the module.', href: '/licences', cta: 'Allocate licences' },
      ]
    : [
        { done: status.policies, Icon: FileText,      title: 'Upload your policies',    desc: 'Add your policies & procedures so the AI answers from your own content.', href: '/policies', cta: 'Upload policies' },
        { done: status.staff,    Icon: Users,         title: 'Add your team',           desc: 'Invite staff so they can ask questions and complete training.',          href: '/staff',    cta: 'Add staff' },
        { done: status.training, Icon: GraduationCap, title: 'Set up staff training',   desc: 'Assign statutory & specialist training to your team.',                   href: '/training', cta: 'Assign training' },
        { done: status.query,    Icon: MessageSquare, title: 'Ask your first question', desc: 'Try it out — ask a policy question in the staff hub.',                   href: '/chat',     cta: 'Open the hub' },
      ]
  const doneCount = steps.filter(s => s.done).length
  if (doneCount === steps.length) return null // fully set up — hide automatically

  function dismiss() {
    try { localStorage.setItem(key, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div className="relative mb-6 overflow-hidden rounded-card border-2 border-blue-600 bg-gradient-to-br from-blue-50 to-white shadow-card">
      <button
        onClick={dismiss}
        aria-label="Dismiss setup guide"
        className="absolute right-3 top-3 rounded p-1 text-neutral-mid hover:bg-white hover:text-neutral-dark"
      >
        <X size={16} />
      </button>

      <div className="px-6 pt-5">
        <h2 className="text-lg font-bold text-neutral-dark">{trainingOnly ? 'Welcome to CareStream — let’s get your training going' : 'Welcome to CareStream — let’s get you set up'}</h2>
        <p className="mt-0.5 text-sm text-neutral-mid">{trainingOnly ? 'A couple of quick steps to get your team into their training.' : 'A few quick steps to get the most from your account.'}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          <span className="whitespace-nowrap text-xs font-medium text-neutral-mid">{doneCount} of {steps.length} done</span>
        </div>
      </div>

      <div className="mt-4 grid gap-px bg-gray-100 sm:grid-cols-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3 bg-white p-4">
            {s.done
              ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-blue-600" />
              : <Circle size={20} className="mt-0.5 shrink-0 text-gray-300" />}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${s.done ? 'text-neutral-mid line-through' : 'text-neutral-dark'}`}>{s.title}</p>
              {!s.done && (
                <>
                  <p className="mt-0.5 text-xs leading-snug text-neutral-mid">{s.desc}</p>
                  <Link href={s.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                    {s.cta} <ArrowRight size={12} />
                  </Link>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
