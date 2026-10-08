'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import {
  AlertCircle, Award, BookOpen, CalendarClock, CheckCircle2, ChevronRight, Clock, ClipboardCheck,
  GraduationCap, Loader2, ShoppingCart, UserPlus, Users,
} from 'lucide-react'

// The dashboard for a training-only client (tier 'training_only'): a care provider that bought
// CPD course licences or a bundle from the shop. Everything here is about that training: the
// licences bought and who has them, how each course is going, what needs the manager (practical
// sign-offs, renewals, staff who have not started), and the steps to get going.
//
// Data: GET /training/licences (licences, allocation, renewal dates) and GET /training/compliance
// (each staff member's enrolment per course, with status and certificate).

type Licences = Awaited<ReturnType<ReturnType<typeof createApiClient>['training']['licences']>>
type Compliance = Awaited<ReturnType<ReturnType<typeof createApiClient>['training']['compliance']>>

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const daysFrom = (d?: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null)

export function TrainingOnlyDashboard({ token, userId, name }: { token: string; userId: string; name?: string | null }) {
  const key = `training-only-dashboard-${userId}`
  const [data, setData] = useState<{ lic: Licences; comp: Compliance } | null>(() => persistentCache.get(key) ?? null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const api = createApiClient(token)
    Promise.all([api.training.licences(), api.training.compliance()])
      .then(([lic, comp]) => { const d = { lic, comp }; setData(d); persistentCache.set(key, d) })
      .catch(() => setFailed(true))
  }, [token, key])

  if (!data) {
    return failed
      ? <p className="rounded-card border border-red-100 bg-red-50 p-5 text-sm text-red-700">We could not load your training just now. Please refresh the page.</p>
      : <div className="flex items-center gap-2 py-16 text-sm text-neutral-mid"><Loader2 className="h-4 w-4 animate-spin" /> Loading your training…</div>
  }

  const { licences, summary } = data.lic
  const users = data.comp.users ?? []
  const enrolments = data.comp.enrollments ?? []
  const userName = new Map(users.map(u => [u.id, u.name]))

  // ── Totals ──
  const complete = enrolments.filter(e => e.status === 'complete')
  const inProgress = enrolments.filter(e => e.status === 'in_progress')
  const notStarted = enrolments.filter(e => e.status === 'not_started')
  const pendingSignOff = complete.filter(e => e.certificate_url === 'pending_practical')
  const certificates = complete.filter(e => e.certificate_url === 'issued')

  // ── Per course ──
  type Row = { name: string; total: number; allocated: number; notStarted: number; inProgress: number; complete: number; renewal: string | null }
  const courses = new Map<string, Row>()
  for (const l of licences) {
    const r = courses.get(l.module_name) ?? { name: l.module_name, total: 0, allocated: 0, notStarted: 0, inProgress: 0, complete: 0, renewal: null }
    r.total++
    if (l.allocated_to) r.allocated++
    if (l.renewal_due_at && (!r.renewal || l.renewal_due_at < r.renewal)) r.renewal = l.renewal_due_at
    courses.set(l.module_name, r)
  }
  for (const e of enrolments) {
    const r = courses.get(e.module?.name)
    if (!r) continue
    if (e.status === 'complete') r.complete++
    else if (e.status === 'in_progress') r.inProgress++
    else if (e.status === 'not_started') r.notStarted++
  }
  const courseRows = [...courses.values()].sort((a, b) => a.name.localeCompare(b.name))

  // ── Needs your attention ──
  const renewalsSoon = courseRows.filter(r => { const d = daysFrom(r.renewal); return d != null && d <= 60 })
  const slowStarters = notStarted.filter(e => e.created_at && (daysFrom(e.created_at) ?? 0) <= -14)
  const attention: { icon: JSX.Element; text: string; href: string; action: string }[] = []
  if (summary.available > 0) attention.push({ icon: <GraduationCap size={16} />, text: `${summary.available} ${summary.available === 1 ? 'licence is' : 'licences are'} not allocated to anyone yet`, href: '/licences', action: 'Allocate' })
  for (const e of pendingSignOff.slice(0, 5)) attention.push({ icon: <ClipboardCheck size={16} />, text: `${userName.get(e.user_id) ?? 'A staff member'} passed ${e.module?.name}: sign off their practical to issue the certificate`, href: `/staff/${e.user_id}`, action: 'Sign off' })
  if (slowStarters.length) attention.push({ icon: <Clock size={16} />, text: `${slowStarters.length} ${slowStarters.length === 1 ? 'course has' : 'courses have'} been allocated for over two weeks and not started`, href: '/analytics', action: 'See who' })
  for (const r of renewalsSoon) attention.push({ icon: <CalendarClock size={16} />, text: `${r.name} licences are due for renewal on ${fmt(r.renewal)}`, href: '/training', action: 'Buy renewals' })

  const recent = [...complete].sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at))).slice(0, 6)

  // ── Getting started ──
  const steps = [
    { done: summary.total > 0, title: 'Buy your training', text: 'Licences for the courses your team needs.', href: '/training', cta: 'Buy training' },
    // You count as one user, so the step is done once someone else is added or a licence is allocated.
    { done: users.length > 1 || summary.allocated > 0, title: 'Add your staff', text: 'Add each person once. Doing a course yourself? Skip this and allocate one to you.', href: '/staff', cta: 'Add staff' },
    { done: summary.allocated > 0, title: 'Allocate a licence to each person', text: 'Pick who does which course. It appears in their training straight away.', href: '/licences', cta: 'Allocate licences' },
    { done: complete.length > 0, title: 'Staff complete their courses', text: 'Short lessons in their own language, with a certificate when they pass.', href: '/analytics', cta: 'See progress' },
  ]
  const allDone = steps.every(s => s.done)

  const cards = [
    { label: 'Licences', value: summary.total, sub: `${summary.allocated} allocated · ${summary.available} available`, Icon: GraduationCap, tone: 'text-teal bg-teal/10' },
    { label: 'Staff', value: users.length, sub: users.length ? 'in your team' : 'none added yet', Icon: Users, tone: 'text-purple-600 bg-purple-100' },
    { label: 'Completed', value: complete.length, sub: `${inProgress.length} in progress · ${notStarted.length} not started`, Icon: CheckCircle2, tone: 'text-green-600 bg-green-100' },
    { label: 'Certificates', value: certificates.length, sub: pendingSignOff.length ? `${pendingSignOff.length} waiting for your practical sign-off` : 'issued to your staff', Icon: Award, tone: 'text-amber-600 bg-amber-100' },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">Your training{name ? `, ${name.split(' ')[0]}` : ''}</h1>
          <p className="mt-1 text-sm text-neutral-mid">Your CPD Certified courses, who has them, and how your team is getting on.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/licences" className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark"><GraduationCap size={15} /> Allocate licences</Link>
          <Link href="/staff" className="inline-flex items-center gap-1.5 rounded-btn border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-dark hover:bg-neutral-light"><UserPlus size={15} /> Add staff</Link>
          <Link href="/training" className="inline-flex items-center gap-1.5 rounded-btn border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-dark hover:bg-neutral-light"><ShoppingCart size={15} /> Buy more training</Link>
        </div>
      </div>

      {!allDone && (
        <div className="mb-6 rounded-card border border-teal/20 bg-teal-light/40 p-5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-dark">Getting your team started</h2>
          <ol className="grid gap-3 md:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className={`rounded-lg border bg-white p-4 ${s.done ? 'border-green-200' : 'border-gray-100'}`}>
                <div className="mb-1 flex items-center gap-2">
                  {s.done
                    ? <CheckCircle2 size={18} className="shrink-0 text-green-600" />
                    : <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-white">{i + 1}</span>}
                  <p className={`text-sm font-semibold ${s.done ? 'text-neutral-mid line-through' : 'text-neutral-dark'}`}>{s.title}</p>
                </div>
                <p className="mb-2 text-xs text-neutral-mid">{s.text}</p>
                {!s.done && <Link href={s.href} className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:underline">{s.cta} <ChevronRight size={12} /></Link>}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-mid">{c.label}</p>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.tone}`}><c.Icon size={16} /></span>
            </div>
            <p className="text-3xl font-bold text-neutral-dark">{c.value}</p>
            <p className="mt-1 text-xs text-neutral-mid">{c.sub}</p>
          </div>
        ))}
      </div>

      {attention.length > 0 && (
        <div className="mb-6 rounded-card border border-amber-200 bg-amber-50/60 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-neutral-dark">Needs your attention</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{attention.length}</span>
          </div>
          <ul className="space-y-2">
            {attention.map((a, i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg border border-amber-100 bg-white px-3 py-2.5">
                <span className="shrink-0 text-amber-600">{a.icon}</span>
                <p className="min-w-0 flex-1 text-sm text-neutral-dark">{a.text}</p>
                <Link href={a.href} className="shrink-0 rounded-btn bg-teal px-3 py-1 text-xs font-semibold text-white hover:bg-teal-dark">{a.action}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 rounded-card border border-gray-100 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2"><BookOpen size={16} className="text-teal" /><h2 className="text-sm font-semibold text-neutral-dark">Your courses</h2></div>
          <Link href="/analytics" className="text-xs font-semibold text-teal hover:underline">Training matrix</Link>
        </div>
        {courseRows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-neutral-mid">No courses yet. <Link href="/training" className="font-semibold text-teal hover:underline">Buy your first training</Link>.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-xs text-neutral-mid">
                <th className="px-5 py-2.5 text-left font-medium">Course</th>
                <th className="px-3 py-2.5 text-right font-medium">Licences</th>
                <th className="px-3 py-2.5 text-right font-medium">Allocated</th>
                <th className="px-3 py-2.5 text-right font-medium">Not started</th>
                <th className="px-3 py-2.5 text-right font-medium">In progress</th>
                <th className="px-3 py-2.5 text-right font-medium">Completed</th>
                <th className="px-5 py-2.5 text-right font-medium">Renewal due</th>
              </tr></thead>
              <tbody>
                {courseRows.map(r => (
                  <tr key={r.name} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-neutral-dark">{r.name}</td>
                    <td className="px-3 py-3 text-right">{r.total}</td>
                    <td className="px-3 py-3 text-right">{r.allocated < r.total ? <Link href="/licences" className="font-semibold text-teal hover:underline">{r.allocated} of {r.total}</Link> : r.allocated}</td>
                    <td className="px-3 py-3 text-right">{r.notStarted || ''}</td>
                    <td className="px-3 py-3 text-right">{r.inProgress || ''}</td>
                    <td className="px-3 py-3 text-right font-semibold text-green-700">{r.complete || ''}</td>
                    <td className="px-5 py-3 text-right text-neutral-mid">{fmt(r.renewal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-card border border-gray-100 bg-white shadow-card">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3"><Award size={16} className="text-amber-600" /><h2 className="text-sm font-semibold text-neutral-dark">Recently completed</h2></div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-neutral-mid">Completed courses and certificates appear here as your staff pass them.</p>
        ) : (
          <ul>
            {recent.map(e => (
              <li key={e.id} className="flex items-center gap-3 border-b border-gray-50 px-5 py-3 last:border-0">
                <CheckCircle2 size={16} className="shrink-0 text-green-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-dark">{userName.get(e.user_id) ?? 'Staff member'} · {e.module?.name}</p>
                  <p className="text-xs text-neutral-mid">{fmt(e.completed_at)}{e.certificate_url === 'pending_practical' ? ' · certificate waiting for your practical sign-off' : ' · certificate issued'}</p>
                </div>
                <Link href={`/staff/${e.user_id}`} className="shrink-0 text-xs font-semibold text-teal hover:underline">{e.certificate_url === 'pending_practical' ? 'Sign off' : 'Certificate'}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
