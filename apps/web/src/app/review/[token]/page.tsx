'use client'

// Public, password-protected external review + sign-off page for a standard training
// module. No CareStream login required. Renders the frozen snapshot read-only, then
// captures the reviewer's decision + signature.

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Lock, ShieldCheck, AlertTriangle, Lightbulb, Loader2, FileText } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const FREQ_LABEL: Record<string, string> = { annual: 'Annual', biennial: 'Every 2 years', triennial: 'Every 3 years', once: 'One-off', adhoc: 'Ad-hoc' }

async function post(path: string, body: any) {
  const res = await fetch(`${API_URL}/public/training-review${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json?.success === false) throw new Error(json?.error?.message ?? 'Something went wrong.')
  return json.data ?? json
}

export default function ReviewPage() {
  const token = String(useParams()?.token ?? '')
  const [password, setPassword] = useState('')
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function unlock() {
    setBusy(true); setError('')
    try { setData(await post(`/${token}/unlock`, { password: password.trim() })) }
    catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  if (!data) {
    return (
      <Shell>
        <div className="mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <Lock size={28} className="mx-auto mb-3 text-teal" />
          <h1 className="text-lg font-bold text-neutral-dark">Training review</h1>
          <p className="mt-1 text-sm text-neutral-mid">Enter the password you were given to view this training module for review.</p>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && unlock()} placeholder="Password" className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-sm outline-none focus:border-teal" />
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          <button onClick={unlock} disabled={busy || !password.trim()} className="mt-3 w-full rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy ? 'Unlocking…' : 'Unlock'}</button>
        </div>
      </Shell>
    )
  }

  return <Reviewer token={token} password={password} data={data} />
}

function Reviewer({ token, password, data }: { token: string; password: string; data: any }) {
  const s = data.snapshot ?? {}
  const lc = s.learning_content ?? {}
  const sections: any[] = Array.isArray(lc.sections) ? lc.sections : []
  const outcomes: string[] = Array.isArray(lc.outcomes) ? lc.outcomes : []
  const questions: any[] = Array.isArray(s.questions) ? s.questions : []
  const standards: any[] = Array.isArray(s.standards) ? s.standards : []
  const refs: any[] = Array.isArray(s.policy_refs) ? s.policy_refs : []
  const hours = s.duration_minutes ? (s.duration_minutes / 60).toFixed(1) : null

  const [decided, setDecided] = useState(data.status !== 'pending')
  const [name, setName] = useState(data.reviewer_name ?? '')
  const [role, setRole] = useState('')
  const [org, setOrg] = useState('')
  const [email, setEmail] = useState('')
  const [comments, setComments] = useState('')
  const [confirm1, setConfirm1] = useState(false)
  const [itemFb, setItemFb] = useState<Record<string, { status: 'approved' | 'changes_requested'; note: string; label: string }>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const changeItems = Object.values(itemFb).filter(v => v.status === 'changes_requested')
  const anyChange = changeItems.length > 0

  async function submit(decision: 'approved' | 'changes_requested') {
    if (!name.trim() || !role.trim()) { setError('Please add your name and role.'); return }
    if (decision === 'approved' && !confirm1) { setError('Please confirm the statement to approve.'); return }
    if (decision === 'changes_requested' && !anyChange && !comments.trim()) { setError('Flag the section(s)/question(s) that need changes, or add an overall comment.'); return }
    const item_feedback = Object.entries(itemFb).map(([ref, v]) => ({ ref, label: v.label, status: v.status, note: v.note }))
    setBusy(true); setError('')
    try { await post(`/${token}/decision`, { password, decision, reviewer_name: name.trim(), reviewer_role: role.trim(), reviewer_org: org.trim(), reviewer_email: email.trim(), comments: comments.trim(), item_feedback }); setDecided(true) }
    catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">Training module for review</p>
          <h1 className="mt-0.5 text-2xl font-bold text-neutral-dark">{s.name}</h1>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-mid">
            <span>{FREQ_LABEL[s.frequency] ?? s.frequency}</span>
            {s.duration_minutes ? <span>· {s.duration_minutes} min (≈{hours} CPD h)</span> : null}
            <span>· pass mark {s.pass_mark}%</span>
            <span>· {questions.length} questions</span>
            {s.requires_practical && <span className="text-amber-600">· practical also required</span>}
          </p>
        </div>

        {lc.summary && <Card title="Overview"><p className="text-sm text-neutral-dark">{lc.summary}</p></Card>}

        {outcomes.length > 0 && <Card title="Learning outcomes"><ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-dark">{outcomes.map((o, i) => <li key={i}>{o}</li>)}</ol></Card>}

        {sections.map((sec, i) => (
          <Card key={i} title={`Section ${i + 1}: ${sec.heading || ''}`}>
            {sec.body && <p className="text-sm leading-relaxed text-neutral-dark">{sec.body}</p>}
            {sec.scenario?.situation && (
              <div className="mt-3 rounded-lg border border-teal/20 bg-teal-light/20 p-3 text-sm">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal"><Lightbulb size={12} /> Scenario</p>
                <p className="text-neutral-dark">{sec.scenario.situation}</p>
                {sec.scenario.prompt && <p className="mt-1 font-medium text-neutral-dark">{sec.scenario.prompt}</p>}
                {sec.scenario.answer && <p className="mt-1 text-neutral-mid"><span className="font-semibold text-teal">Answer: </span>{sec.scenario.answer}</p>}
              </div>
            )}
            {sec.check?.question && (
              <div className="mt-3 text-sm">
                <p className="font-medium text-neutral-dark">Check: {sec.check.question}</p>
                <ul className="mt-1 space-y-0.5">{(sec.check.options ?? []).map((o: string, oi: number) => <li key={oi} className={oi === sec.check.correct ? 'font-medium text-green-600' : 'text-neutral-mid'}>{oi === sec.check.correct ? '✓ ' : '• '}{o}</li>)}</ul>
              </div>
            )}
            {!decided && <ItemReview refId={`section:${i}`} label={`Section ${i + 1}: ${sec.heading || ''}`} fb={itemFb} setFb={setItemFb} />}
          </Card>
        ))}

        <Card title={`Assessment questions (${questions.length})`}>
          <div className="space-y-3">
            {questions.map((q, qi) => (
              <div key={qi} className="border-b border-gray-50 pb-3 text-sm last:border-0">
                <p className="font-medium text-neutral-dark">{qi + 1}. {q.text}</p>
                <ul className="mt-1 space-y-0.5">{(q.options ?? []).map((o: string, oi: number) => <li key={oi} className={oi === q.correct ? 'font-medium text-green-600' : 'text-neutral-mid'}>{oi === q.correct ? '✓ ' : '• '}{o}</li>)}</ul>
                {!decided && <ItemReview refId={`question:${qi}`} label={`Question ${qi + 1}`} fb={itemFb} setFb={setItemFb} />}
              </div>
            ))}
          </div>
        </Card>

        {standards.length > 0 && <Card title="Mapped standards"><ul className="flex flex-wrap gap-1.5">{standards.map((st, i) => <li key={i} className="rounded-full bg-teal-light/40 px-2 py-0.5 text-xs text-teal-dark">{st.label}</li>)}</ul></Card>}
        {refs.length > 0 && <Card title="Evidence base"><ul className="list-disc space-y-0.5 pl-5 text-sm text-neutral-dark">{refs.map((r, i) => <li key={i}>{r.title}{r.section ? ` — ${r.section}` : ''}</li>)}</ul></Card>}

        {/* Sign-off */}
        {decided ? (
          <div className="rounded-2xl border border-green-200 bg-green-50/60 p-6 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500" />
            <p className="font-semibold text-neutral-dark">Thank you — your review has been recorded.</p>
            <p className="mt-1 text-sm text-neutral-mid">You can close this page. CareStream has been notified of your decision.</p>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-teal/30 bg-white p-6 shadow-sm">
            <p className="mb-1 flex items-center gap-1.5 text-base font-bold text-neutral-dark"><ShieldCheck size={18} className="text-teal" /> Your review &amp; sign-off</p>
            <p className="mb-4 text-xs text-neutral-mid">Please review the content above, then record your decision. Your name and role are kept as the reviewer of record.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Your name *"><input value={name} onChange={e => setName(e.target.value)} className={INPUT} /></Field>
              <Field label="Your role / title *"><input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. RGN, Clinical Lead" className={INPUT} /></Field>
              <Field label="Organisation"><input value={org} onChange={e => setOrg(e.target.value)} className={INPUT} /></Field>
              <Field label="Email"><input value={email} onChange={e => setEmail(e.target.value)} className={INPUT} /></Field>
            </div>
            <div className="mt-3">
              <Field label="Comments (required if requesting changes)"><textarea value={comments} onChange={e => setComments(e.target.value)} rows={3} className={INPUT} /></Field>
            </div>
            {anyChange && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs font-medium text-amber-700">You&apos;ve requested changes on {changeItems.length} item{changeItems.length === 1 ? '' : 's'} — submit with &ldquo;Request changes&rdquo;.</p>}
            <label className="mt-3 flex items-start gap-2 text-xs text-neutral-dark"><input type="checkbox" checked={confirm1} onChange={e => setConfirm1(e.target.checked)} className="mt-0.5 accent-teal" /> I confirm I have reviewed this module and that the content is accurate, safe and appropriate for the stated learning outcomes.</label>
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => submit('approved')} disabled={busy || anyChange} title={anyChange ? 'You have items flagged for change' : ''} className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Approve</button>
              <button onClick={() => submit('changes_requested')} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-50 disabled:opacity-50"><AlertTriangle size={14} /> Request changes</button>
            </div>
          </div>
        )}

        <p className="pb-8 text-center text-[11px] text-neutral-mid"><FileText size={11} className="mr-1 inline" /> CareStream — independent training review</p>
      </div>
    </Shell>
  )
}

const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal'

// Per-item Approve / Request-change control shown under each section and question.
function ItemReview({ refId, label, fb, setFb }: { refId: string; label: string; fb: Record<string, any>; setFb: (fn: (p: any) => any) => void }) {
  const cur = fb[refId]
  const set = (status: 'approved' | 'changes_requested') => setFb(p => ({ ...p, [refId]: { status, note: p[refId]?.note ?? '', label } }))
  return (
    <div className="mt-2.5 border-t border-gray-100 pt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-neutral-mid">Your review:</span>
        <button onClick={() => set('approved')} className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${cur?.status === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-100 text-neutral-mid hover:bg-gray-200'}`}>✓ Approve</button>
        <button onClick={() => set('changes_requested')} className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${cur?.status === 'changes_requested' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-neutral-mid hover:bg-gray-200'}`}>✎ Request change</button>
      </div>
      {cur?.status === 'changes_requested' && (
        <textarea value={cur.note} onChange={e => setFb(p => ({ ...p, [refId]: { ...p[refId], note: e.target.value } }))} rows={2} placeholder="Describe the change needed…" className="mt-1.5 w-full rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-2 text-sm outline-none focus:border-amber-400" />
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-neutral-mid">{label}</span>{children}</label>
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="mb-2 text-sm font-semibold text-teal-dark">{title}</p>{children}</div>
}
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-light px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-color.png" alt="CareStream" className="h-20 w-auto object-contain" />
      </div>
      {children}
    </div>
  )
}
