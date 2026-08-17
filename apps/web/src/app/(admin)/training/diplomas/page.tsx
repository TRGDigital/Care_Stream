'use client'

// Admin — Diplomas & Pathways. Put staff on a multi-unit programme and track it.
//
// Enrolling creates the ordinary unit training records, so a diploma never sits
// outside the training matrix: each unit still appears in Annual Training, still
// renews on its own cycle, and still counts once towards the plan allocation.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Award, Loader2, CheckCircle2, Clock, Users, ChevronDown, ChevronUp,
  GraduationCap, AlertTriangle, X, Info,
} from 'lucide-react'

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  not_started:       { label: 'Not started',    cls: 'bg-gray-100 text-neutral-mid' },
  in_progress:       { label: 'In progress',    cls: 'bg-amber-50 text-amber-600' },
  awaiting_synoptic: { label: 'Final assessment due', cls: 'bg-teal-light/50 text-teal-dark' },
  complete:          { label: 'Complete',       cls: 'bg-green-50 text-green-600' },
  expired:           { label: 'Expired',        cls: 'bg-red-50 text-red-600' },
}

export default function AdminDiplomasPage() {
  const { data: session } = useSession()
  const api = session?.accessToken ? createApiClient(session.accessToken) : null

  const [programmes, setProgrammes] = useState<any[] | null>(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  function load() {
    if (!api) return
    api.programmes.list().then(d => setProgrammes(d.programmes)).catch(e => setError(e?.message ?? 'Could not load programmes.'))
  }
  useEffect(() => { if (api) load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [session?.accessToken])

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <Link href="/training" className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-mid hover:text-neutral-dark">
        <ArrowLeft size={14} /> Training
      </Link>

      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-light/40">
          <Award size={20} className="text-teal" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-neutral-dark">Diplomas &amp; Pathways</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-mid">
            Several courses studied as one programme, with a final assessment that spans all of them, a reflective
            account and a single certificate. Units still appear in Annual Training and still renew on their own
            cycles — a diploma groups the same records, it does not duplicate them.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-gray-200 bg-neutral-light/40 p-3 text-xs text-neutral-mid">
        <Info size={14} className="mt-0.5 shrink-0 text-teal" />
        <p>
          Each staff member × unit uses one training allocation from your plan, the same as assigning that course
          directly. Units someone has already passed are re-used, not charged again.
        </p>
      </div>

      {msg && (
        <div className={`mt-4 flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${msg.tone === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          <p>{msg.text}</p>
          <button onClick={() => setMsg(null)} className="shrink-0"><X size={14} /></button>
        </div>
      )}
      {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!programmes && !error && <div className="mt-6"><Loader2 className="animate-spin text-teal" /></div>}

      {programmes?.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <GraduationCap size={26} className="mx-auto mb-2 text-neutral-mid" />
          <p className="text-sm font-medium text-neutral-dark">No diplomas available yet</p>
          <p className="mt-1 text-sm text-neutral-mid">CareStream publishes these centrally — check back shortly.</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {programmes?.map(p => (
          <div key={p.id} className="rounded-xl border border-gray-200 bg-white">
            <button onClick={() => setOpenId(openId === p.id ? null : p.id)} className="flex w-full items-start gap-3 p-4 text-left">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-neutral-dark">{p.name}</h2>
                  <span className="rounded-full bg-teal-light/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-dark">{p.kind}</span>
                  {p.cpd_accredited && <span className="rounded-full border border-teal/40 px-2 py-0.5 text-[10px] font-semibold text-teal">CPD</span>}
                </div>
                <p className="mt-1 text-xs text-neutral-mid">{p.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-mid">
                  <span><strong className="text-neutral-dark">{p.required_count}</strong> required units{p.unit_count > p.required_count && ` (+${p.unit_count - p.required_count} optional)`}</span>
                  {p.cpd_hours != null && <span className="inline-flex items-center gap-1"><Clock size={11} /> ~{p.cpd_hours} h</span>}
                  {p.synoptic_count > 0 && <span>{p.synoptic_count}-question final assessment ({p.synoptic_pass_mark}% to pass)</span>}
                  {p.require_practical && <span className="text-amber-600">needs observed sign-off</span>}
                  {p.enrolled > 0 && <span className="inline-flex items-center gap-1"><Users size={11} /> {p.enrolled} enrolled · {p.complete} complete</span>}
                </div>
              </div>
              {openId === p.id ? <ChevronUp size={16} className="mt-1 shrink-0 text-neutral-mid" /> : <ChevronDown size={16} className="mt-1 shrink-0 text-neutral-mid" />}
            </button>

            {openId === p.id && api && (
              <ProgrammePanel api={api} programme={p} onChanged={load} onMessage={setMsg} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Per-programme panel: outcomes, enrol, tracker ───────────────────────────

function ProgrammePanel({
  api, programme, onChanged, onMessage,
}: {
  api: any
  programme: any
  onChanged: () => void
  onMessage: (m: { tone: 'ok' | 'err'; text: string } | null) => void
}) {
  const [staffRows, setStaffRows] = useState<any[] | null>(null)
  const [allStaff, setAllStaff] = useState<any[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [due, setDue] = useState('')
  const [busy, setBusy] = useState(false)

  function loadRows() {
    api.programmes.staff(programme.id).then((d: any) => setStaffRows(d.staff)).catch(() => setStaffRows([]))
  }
  useEffect(() => {
    loadRows()
    api.users.list().then((d: any) => setAllStaff(d.users ?? [])).catch(() => setAllStaff([]))
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [programme.id])

  const enrolledIds = new Set((staffRows ?? []).map(r => r.user_id))
  const candidates = (allStaff ?? []).filter(u => !enrolledIds.has(u.id) && u.is_active !== false)

  async function enrol() {
    if (!picked.size || busy) return
    setBusy(true); onMessage(null)
    try {
      const r = await api.programmes.enrol(programme.id, { user_ids: [...picked], due_date: due || null })
      onMessage({ tone: 'ok', text: `Enrolled ${r.enrolled} staff member${r.enrolled === 1 ? '' : 's'} — ${r.units_created} unit assignment${r.units_created === 1 ? '' : 's'} created.` })
      setPicked(new Set()); setDue('')
      loadRows(); onChanged()
    } catch (e: any) {
      onMessage({ tone: 'err', text: e?.message ?? 'Could not enrol.' })
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5 border-t border-gray-100 bg-neutral-light/20 p-5">
      {/* Outcomes */}
      {programme.outcomes?.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-teal-dark">What staff will be able to do</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-dark">
            {programme.outcomes.map((o: string, i: number) => <li key={i}>{o}</li>)}
          </ol>
          {programme.standards?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {programme.standards.map((s: any, i: number) => (
                <span key={i} className="rounded-full bg-teal-light/40 px-2 py-0.5 text-[10px] text-teal-dark">{s.label}</span>
              ))}
            </div>
          )}
          {programme.attested_by_name && (
            <p className="mt-3 text-xs text-neutral-mid">
              Content attested by {programme.attested_by_name}{programme.attested_by_role ? `, ${programme.attested_by_role}` : ''}.
              {programme.independently_reviewed && ' Independently reviewed.'}
            </p>
          )}
        </div>
      )}

      {/* Enrol */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-teal-dark">Enrol staff</p>
        {!allStaff ? <Loader2 className="animate-spin text-teal" size={16} /> : candidates.length === 0 ? (
          <p className="text-sm text-neutral-mid">Everyone is already enrolled.</p>
        ) : (
          <>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-gray-100 p-2">
              {candidates.map(u => (
                <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-neutral-light/50">
                  <input
                    type="checkbox"
                    checked={picked.has(u.id)}
                    onChange={e => setPicked(prev => {
                      const next = new Set(prev)
                      if (e.target.checked) next.add(u.id); else next.delete(u.id)
                      return next
                    })}
                  />
                  <span className="text-neutral-dark">{u.name}</span>
                  {u.job_role && <span className="text-xs text-neutral-mid">{u.job_role}</span>}
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-mid">Due date (optional)</label>
                <input type="date" value={due} onChange={e => setDue(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <Button onClick={enrol} disabled={!picked.size || busy}>
                {busy ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Enrolling…</> : `Enrol ${picked.size || ''} staff`}
              </Button>
              {programme.required_count > 0 && picked.size > 0 && (
                <p className="text-xs text-neutral-mid">
                  Up to {picked.size * programme.required_count} allocations (fewer if units are already passed).
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Tracker */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-teal-dark">Progress</p>
        {!staffRows ? <Loader2 className="animate-spin text-teal" size={16} /> : staffRows.length === 0 ? (
          <p className="text-sm text-neutral-mid">Nobody is enrolled yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-gray-100 text-xs text-neutral-mid">
                <tr>
                  <th className="py-2 pr-3 text-left font-medium">Staff</th>
                  <th className="py-2 pr-3 text-left font-medium">Status</th>
                  <th className="py-2 pr-3 text-right font-medium">Units</th>
                  <th className="py-2 pr-3 text-right font-medium">CPD</th>
                  <th className="py-2 pr-3 text-right font-medium">Final</th>
                  <th className="py-2 pr-3 text-left font-medium">Outstanding</th>
                  <th className="py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staffRows.map(r => {
                  const meta = STATUS_META[r.status] ?? STATUS_META.not_started
                  return (
                    <tr key={r.enrollment_id}>
                      <td className="py-2 pr-3">
                        <p className="font-medium text-neutral-dark">{r.name}</p>
                        {r.job_role && <p className="text-xs text-neutral-mid">{r.job_role}</p>}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>{meta.label}</span>
                        {r.due_date && r.status !== 'complete' && <p className="mt-0.5 text-[11px] text-neutral-mid">Due {fmt(r.due_date)}</p>}
                        {r.completed_at && <p className="mt-0.5 text-[11px] text-green-600">{fmt(r.completed_at)}</p>}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <span className="font-medium text-neutral-dark">{r.units_complete}/{r.units_total}</span>
                        <div className="ml-auto mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div className={`h-full ${r.percent === 100 ? 'bg-green-500' : 'bg-teal'}`} style={{ width: `${Math.max(r.percent, 2)}%` }} />
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right text-neutral-dark">
                        {r.cpd_minutes_done ? `${Math.round((r.cpd_minutes_done / 60) * 10) / 10} h` : '—'}
                      </td>
                      <td className="py-2 pr-3 text-right text-neutral-dark">
                        {r.synoptic_score != null ? `${r.synoptic_score}%` : '—'}
                      </td>
                      <td className="py-2 pr-3">
                        {r.blocking?.length > 0
                          ? <span className="text-xs text-amber-700">{r.blocking.join('; ')}</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 size={12} /> Nothing</span>}
                        {r.practical_outstanding > 0 && (
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-amber-700">
                            <AlertTriangle size={11} /> Record the practical on their staff record
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={async () => {
                            if (!confirm(`Remove ${r.name} from this programme? Their individual course records are kept.`)) return
                            try { await api.programmes.removeEnrolment(r.enrollment_id); loadRows(); onChanged() }
                            catch (e: any) { onMessage({ tone: 'err', text: e?.message ?? 'Could not remove.' }) }
                          }}
                          className="text-xs text-neutral-mid hover:text-red-600"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
