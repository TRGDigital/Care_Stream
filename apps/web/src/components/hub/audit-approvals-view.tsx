'use client'

import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { Loader2, FileCheck2, ChevronLeft, Check, X, ClipboardCheck, History } from 'lucide-react'

type Item = { run_id: string; template_name: string; auditor_name: string; audit_month: string; submitted_at: string | null }
type Recent = { run_id: string; template_name: string; approved_by: string; approved_at: string | null; audit_month: string }
type Detail = Awaited<ReturnType<ReturnType<typeof createApiClient>['me']['auditApprovalDetail']>>['report']

const monthLabel = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

function answerLabel(q: Detail['sections'][number]['questions'][number]): { text: string; tone: string } {
  if (q.question_type === 'findings' || q.question_type === 'free_text') return { text: 'Findings', tone: 'text-neutral-mid' }
  if (q.answer_na) return { text: 'N/A', tone: 'text-neutral-mid' }
  if (q.answer_yn === true) return { text: 'Yes', tone: 'text-green-700' }
  if (q.answer_yn === false) return { text: 'No', tone: 'text-rose-700' }
  return { text: 'Not answered', tone: 'text-amber-600' }
}

export function AuditApprovalsView({ token, onChange }: { token: string; onChange?: () => void }) {
  const [list, setList]       = useState<Item[]>([])
  const [recent, setRecent]   = useState<Recent[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Item | null>(null)
  const [detail, setDetail]   = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy]       = useState(false)
  const [note, setNote]       = useState('')
  const [msg, setMsg]         = useState('')
  const [error, setError]     = useState('')

  function load() {
    setLoading(true)
    createApiClient(token).me.auditApprovals()
      .then(r => { setList(r.audits); setRecent(r.recent ?? []) }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [token])

  useEffect(() => {
    if (!selected) { setDetail(null); setNote(''); return }
    setDetailLoading(true); setError('')
    createApiClient(token).me.auditApprovalDetail(selected.run_id)
      .then(r => setDetail(r.report)).catch(e => setError(e.message ?? 'Could not load the audit.')).finally(() => setDetailLoading(false))
  }, [selected, token])

  async function approve() {
    if (!selected) return
    if (!confirm(`Approve "${selected.template_name}"? Your name and today's date are saved to the audit.`)) return
    setBusy(true); setError('')
    try {
      await createApiClient(token).me.approveAuditAsManager(selected.run_id)
      setMsg(`Approved "${selected.template_name}". Your sign-off is saved to the audit.`)
      setSelected(null); load(); onChange?.()
    } catch (e: any) { setError(e.message ?? 'Could not approve.') } finally { setBusy(false) }
  }
  async function reject() {
    if (!selected) return
    if (!note.trim()) { setError('Add a note so the auditor knows what to change.'); return }
    if (!confirm(`Send "${selected.template_name}" back to the auditor?`)) return
    setBusy(true); setError('')
    try {
      await createApiClient(token).me.rejectAuditAsManager(selected.run_id, note.trim())
      setMsg(`Sent "${selected.template_name}" back to the auditor with your note.`)
      setSelected(null); load(); onChange?.()
    } catch (e: any) { setError(e.message ?? 'Could not send back.') } finally { setBusy(false) }
  }

  if (loading) return <div className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-neutral-mid"><Loader2 size={18} className="animate-spin text-teal" /> Loading…</div>

  // ── Review a single audit ──
  if (selected) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-4xl">
          <button onClick={() => setSelected(null)} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-neutral-mid hover:text-teal"><ChevronLeft size={15} /> Back to audits</button>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-neutral-dark">{selected.template_name}</h2>
              <p className="mt-0.5 text-xs text-neutral-mid">
                {monthLabel(selected.audit_month)}{selected.auditor_name ? ` · completed by ${selected.auditor_name}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={reject} disabled={busy} className="inline-flex items-center gap-1.5 rounded-btn border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"><X size={14} /> Send back</button>
              <button onClick={approve} disabled={busy} className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">{busy ? <><Loader2 size={14} className="animate-spin" /> …</> : <><FileCheck2 size={14} /> Approve</>}</button>
            </div>
          </div>
          {error && <div className="mt-3 rounded-md border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

          {detailLoading || !detail ? (
            <div className="flex items-center gap-2 py-12 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading audit…</div>
          ) : (
            <div className="mt-4 space-y-5">
              {detail.sections.map((s, si) => (
                <div key={si} className="rounded-lg border border-gray-100 bg-white p-4">
                  <h3 className="text-sm font-bold text-neutral-dark">{s.title}</h3>
                  <ul className="mt-2 divide-y divide-gray-50">
                    {s.questions.map(q => {
                      const a = answerLabel(q)
                      return (
                        <li key={q.id} className="flex items-start justify-between gap-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm text-neutral-dark">{q.question}</p>
                            {q.outcome_text && <p className="mt-0.5 text-xs text-neutral-mid"><span className="font-medium">Findings:</span> {q.outcome_text}</p>}
                            {q.actions_text && <p className="mt-0.5 text-xs text-neutral-mid"><span className="font-medium">Actions:</span> {q.actions_text}</p>}
                          </div>
                          <span className={`shrink-0 text-sm font-semibold ${a.tone}`}>{a.text}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}

              {(detail.strengths || detail.improvements || detail.ai_recommendations) && (
                <div className="space-y-3 rounded-lg border border-gray-100 bg-white p-4">
                  {detail.strengths && <div><p className="text-xs font-bold uppercase tracking-wide text-neutral-mid">Strengths</p><p className="mt-0.5 whitespace-pre-line text-sm text-neutral-dark">{detail.strengths}</p></div>}
                  {detail.improvements && <div><p className="text-xs font-bold uppercase tracking-wide text-neutral-mid">Areas to improve</p><p className="mt-0.5 whitespace-pre-line text-sm text-neutral-dark">{detail.improvements}</p></div>}
                  {detail.ai_recommendations && <div><p className="text-xs font-bold uppercase tracking-wide text-neutral-mid">AI recommendations</p><p className="mt-0.5 whitespace-pre-line text-sm text-neutral-dark">{detail.ai_recommendations}</p></div>}
                </div>
              )}

              {/* Send-back note */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <label className="text-sm font-medium text-neutral-dark">Note to the auditor (needed to send back)</label>
                <p className="mt-0.5 text-xs text-neutral-mid">If anything needs correcting, add a note and press Send back. The audit reopens for the auditor to amend and re-submit.</p>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                  placeholder="e.g. Please re-check section 2 and add actions for the two No answers…"
                  className="mt-2 w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── List ──
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-lg font-bold text-neutral-dark">Audits to approve</h2>
        <p className="mt-1 text-sm text-neutral-mid">Completed audits sent to you for sign-off. Review the answers, then approve them or send them back to the auditor.</p>
        {msg && <div className="mt-4 flex items-center gap-2 rounded-md border border-green-100 bg-green-50 px-4 py-2.5 text-sm text-green-800"><Check size={15} /> {msg}</div>}
        {list.length === 0 ? (
          <div className="mt-6 rounded-card border border-gray-100 bg-white px-6 py-10 text-center">
            <ClipboardCheck size={26} className="mx-auto text-teal" />
            <p className="mt-2 text-sm font-medium text-neutral-dark">Nothing to approve</p>
            <p className="text-sm text-neutral-mid">You&rsquo;re all caught up. Completed audits awaiting your approval will appear here.</p>
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {list.map(a => (
              <li key={a.run_id}>
                <button onClick={() => setSelected(a)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50/40 px-4 py-3 text-left hover:bg-teal-50">
                  <div className="flex min-w-0 items-center gap-3">
                    <ClipboardCheck size={16} className="shrink-0 text-teal" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-dark">{a.template_name}</p>
                      <p className="text-xs text-neutral-mid">{monthLabel(a.audit_month)}{a.auditor_name ? ` · ${a.auditor_name}` : ''}{a.submitted_at ? ` · submitted ${new Date(a.submitted_at).toLocaleDateString('en-GB')}` : ''}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-btn bg-teal px-3 py-1.5 text-xs font-medium text-white">Review</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Recently approved — visibility of the trail */}
        {recent.length > 0 && (
          <div className="mt-9">
            <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-dark"><History size={15} className="text-neutral-mid" /> Recently approved</h3>
            <p className="mt-1 text-sm text-neutral-mid">Audits you&rsquo;ve signed off. Your name and the date are saved to each one.</p>
            <ul className="mt-4 space-y-2">
              {recent.map(a => (
                <li key={a.run_id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ClipboardCheck size={16} className="shrink-0 text-neutral-mid" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-dark">{a.template_name}</p>
                      <p className="text-xs text-neutral-mid">{monthLabel(a.audit_month)}{a.approved_at ? ` · approved ${new Date(a.approved_at).toLocaleDateString('en-GB')}` : ''}{a.approved_by ? ` · ${a.approved_by}` : ''}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-btn border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">Approved</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
